from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.shortcuts import get_object_or_404

from .models import ParkingLot, Slot
from .serializers import ParkingLotSerializer, NearestLotSerializer, SlotSerializer
from .utils import get_nearest_lots


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
        return Response(serializer.data)

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

    def delete(self, request, pk):
        lot = get_object_or_404(ParkingLot, pk=pk)
        lot.is_active = False
        lot.save()
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

        radius = float(request.query_params.get('radius', 10))
        limit = int(request.query_params.get('limit', 10))

        if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            return Response(
                {'error': 'Invalid coordinates range.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # --- Run Haversine search ---
        nearest = get_nearest_lots(lat, lng, radius_km=radius, limit=limit)

        if not nearest:
            return Response(
                {'message': 'No parking lots found within the given radius.', 'results': []},
                status=status.HTTP_200_OK
            )

        # --- Annotate each lot with distance and serialize ---
        results = []
        for lot, distance_km in nearest:
            lot.distance_km = distance_km          # inject before serialization
            results.append(lot)

        serializer = NearestLotSerializer(results, many=True)
        return Response({
            'count': len(results),
            'search': {'lat': lat, 'lng': lng, 'radius_km': radius},
            'results': serializer.data,
        })


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

    def post(self, request, pk):
        lot = get_object_or_404(ParkingLot, pk=pk)
        serializer = SlotSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(lot=lot)
            # keep total_slots in sync
            lot.total_slots = lot.slots.count()
            lot.save(update_fields=['total_slots'])
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)