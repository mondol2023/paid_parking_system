from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404

from booking.models import Booking
from .models import ParkingLot, Slot
from .serializers import ParkingLotSerializer, NearestLotSerializer, SlotSerializer
from .utils import get_nearest_lots

# Caps on the nearest-lot search so one request cannot ask the DB for the
# whole table or serialize an unbounded result set.
MAX_SEARCH_RADIUS_KM = 100.0
MAX_SEARCH_LIMIT = 50


class ParkingLotListCreateView(APIView):
    """
    GET  /api/parking-lots/        — list all active lots
    POST /api/parking-lots/        — create a lot (admin only)
    """
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def get(self, request):
        lots = ParkingLot.objects.filter(is_active=True).prefetch_related('slots', 'rates')
        serializer = ParkingLotSerializer(lots, many=True)
        data = serializer.data
        return Response({'count': len(data), 'results': data})

    def post(self, request):
        serializer = ParkingLotSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ParkingLotDetailView(APIView):
    """
    GET    /api/parking-lots/<pk>/   — retrieve a lot
    PUT    /api/parking-lots/<pk>/   — update (admin only)
    DELETE /api/parking-lots/<pk>/   — soft delete (admin only)
    """
    def get_permissions(self):
        if self.request.method in ('PUT', 'DELETE'):
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def get(self, request, pk):
        lot = get_object_or_404(ParkingLot, pk=pk, is_active=True)
        serializer = ParkingLotSerializer(lot)
        return Response(serializer.data)

    def put(self, request, pk):
        lot = get_object_or_404(ParkingLot, pk=pk)
        serializer = ParkingLotSerializer(lot, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def delete(self, request, pk):
        lot = get_object_or_404(ParkingLot, pk=pk)

        # Vehicles are still parked here; deactivating would hide the lot while
        # its bookings stay open and can never be checked out.
        if Booking.objects.filter(slot__lot=lot, is_active=True).exists():
            return Response(
                {'error': 'Lot has active bookings. Check them out before deactivating.'},
                status=status.HTTP_409_CONFLICT
            )

        lot.is_active = False
        lot.save(update_fields=['is_active', 'updated_at'])
        return Response({'message': 'Lot deactivated.'}, status=status.HTTP_200_OK)


class NearestLotsView(APIView):
    """
    GET /api/parking-lots/nearest/?lat=23.8103&lng=90.4125&radius=5&limit=10

    Uses Haversine algorithm to find nearest active lots with available slots.
    Query params:
        lat     — user latitude  (required)
        lng     — user longitude (required)
        radius  — search radius in km (default 10)
        limit   — max results (default 10)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # --- Validate query params ---
        try:
            lat = float(request.query_params['lat'])
            lng = float(request.query_params['lng'])
        except (KeyError, ValueError):
            return Response(
                {'error': 'lat and lng are required numeric query params.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Parsed inside the guard too: a non-numeric radius/limit used to raise
        # ValueError outside the try and surface as a 500.
        try:
            radius = float(request.query_params.get('radius', 10))
            limit = int(request.query_params.get('limit', 10))
        except ValueError:
            return Response(
                {'error': 'radius and limit must be numeric.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            return Response(
                {'error': 'Invalid coordinates range.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if radius <= 0 or limit <= 0:
            return Response(
                {'error': 'radius and limit must be greater than zero.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        radius = min(radius, MAX_SEARCH_RADIUS_KM)
        limit = min(limit, MAX_SEARCH_LIMIT)

        # --- Run Haversine search ---
        nearest = get_nearest_lots(lat, lng, radius_km=radius, limit=limit)

        # --- Annotate each lot with distance and serialize ---
        results = []
        for lot, distance_km in nearest:
            lot.distance_km = distance_km          # inject before serialization
            results.append(lot)

        serializer = NearestLotSerializer(results, many=True)
        # One envelope for both outcomes: the empty case used to omit `count`
        # and `search`, so a client reading either key crashed on "no results".
        payload = {
            'count': len(results),
            'search': {'lat': lat, 'lng': lng, 'radius_km': radius},
            'results': serializer.data,
        }
        if not results:
            payload['message'] = 'No parking lots found within the given radius.'
        return Response(payload)


class LotSlotsView(APIView):
    """
    GET /api/parking-lots/<pk>/slots/   — list all slots in a lot
    POST /api/parking-lots/<pk>/slots/  — add a slot (admin only)
    """
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def get(self, request, pk):
        lot = get_object_or_404(ParkingLot, pk=pk, is_active=True)
        only_available = request.query_params.get('available') == 'true'
        slots = lot.slots.filter(is_available=True) if only_available else lot.slots.all()
        serializer = SlotSerializer(slots, many=True)
        return Response({'lot': lot.name, 'slots': serializer.data})

    @transaction.atomic
    def post(self, request, pk):
        lot = get_object_or_404(ParkingLot, pk=pk, is_active=True)
        serializer = SlotSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Nested atomic: an IntegrityError marks the enclosing transaction
            # unusable, so the failing INSERT needs its own savepoint to roll
            # back to before we can keep querying and return a 409.
            with transaction.atomic():
                serializer.save(lot=lot)
        except IntegrityError:
            # unique_together ('lot', 'slot_number') — report the clash instead
            # of letting the DB error become a 500.
            return Response(
                {'slot_number': ['This slot number already exists in the lot.']},
                status=status.HTTP_409_CONFLICT
            )

        # keep total_slots in sync
        lot.total_slots = lot.slots.count()
        lot.save(update_fields=['total_slots', 'updated_at'])
        return Response(serializer.data, status=status.HTTP_201_CREATED)