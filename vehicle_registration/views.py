"""
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from .models import VehicleRegistration  

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import VehicleRegistrationSerializer
from django.shortcuts import get_object_or_404

@csrf_exempt  
def vehicle_registration(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body.decode('utf-8'))

            vehicle_type = data.get('vehicle_type')
            vehicle_name = data.get('vehicle_name')
            vehicle_model = data.get('vehicle_model')
            vehicle_license = data.get('vehicle_license')
            vehicle_length = data.get('vehicle_length')
            vehicle_width = data.get('vehicle_width')
            vehicle_height = data.get('vehicle_height')
            driver_name = data.get('driver_name')
            driver_phone = data.get('driver_phone')
            driver_license = data.get('driver_license')
            owner_name = data.get('owner_name')
            owner_phone = data.get('owner_phone')

            
            VehicleRegistration.objects.create(
                vehicle_type=vehicle_type,
                vehicle_name=vehicle_name,
                vehicle_model=vehicle_model,
                vehicle_license=vehicle_license,
                vehicle_length=vehicle_length,
                vehicle_width=vehicle_width,
                vehicle_height=vehicle_height,
                driver_name=driver_name,
                driver_phone=driver_phone,
                driver_license=driver_license,
                owner_name=owner_name,
                owner_phone=owner_phone
            )

            return JsonResponse({
                'message': 'Vehicle registered successfully!',
                'data': data
            }, status=201)

        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

    return JsonResponse({'error': 'Only POST method is allowed'}, status=405)


class VehicleRegistrationAPIView(APIView):
    def get(self, request, pk=None):
        if pk:
            try:
                obj = VehicleRegistration.objects.get(pk=pk, is_active=True)
            except VehicleRegistration.MultipleObjectsReturned:
                return Response({'error': 'Multiple objects found'}, status=status.HTTP_400_BAD_REQUEST)
            except VehicleRegistration.DoesNotExist:
                return Response({'error': 'Object not found'}, status=status.HTTP_404_NOT_FOUND)
            
            serializer = VehicleRegistrationSerializer(obj)
            return Response(serializer.data)
        
        query_set = VehicleRegistration.objects.all().filter(is_active=True)
        serializer = VehicleRegistrationSerializer(query_set, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = VehicleRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors)


    def put(self, request, pk):
        obj = get_object_or_404(VehicleRegistration, pk=pk)
        serializer = VehicleRegistrationSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors)

    def delete(self, request, pk):
        obj = get_object_or_404(VehicleRegistration, pk=pk)
        obj.is_active = False
        obj.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

"""
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import VehicleRegistration
from .serializers import VehicleRegistrationSerializer


def owned_vehicles(user):
    """
    Vehicles the given user is allowed to see. Staff see everything; regular
    users only see their own. Used by every vehicle lookup so that an object
    belonging to another user is a 404, never a 200.
    """
    queryset = VehicleRegistration.objects.filter(is_active=True)
    if user.is_staff:
        return queryset
    return queryset.filter(owner=user)


class VehicleRegistrationListCreateView(APIView):

    permission_classes = [IsAuthenticated]
    # MultiPartParser + FormParser to support vehicle_image upload
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        vehicle_type = request.query_params.get('type')
        queryset = owned_vehicles(request.user)
        if vehicle_type:
            valid_types = dict(VehicleRegistration.VEHICLE_TYPE_CHOICES)
            if vehicle_type not in valid_types:
                return Response(
                    {'error': f'Unknown vehicle type. Choose one of: {", ".join(valid_types)}.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            queryset = queryset.filter(vehicle_type=vehicle_type)

        serializer = VehicleRegistrationSerializer(
            queryset, many=True, context={'request': request}
        )
        data = serializer.data
        return Response({'count': len(data), 'results': data})

    def post(self, request):
        serializer = VehicleRegistrationSerializer(
            data=request.data, context={'request': request}
        )
        if serializer.is_valid():
            serializer.save(owner=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VehicleRegistrationDetailView(APIView):

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self, pk):
        return get_object_or_404(owned_vehicles(self.request.user), pk=pk)

    def get(self, request, pk):
        vehicle = self.get_object(pk)
        serializer = VehicleRegistrationSerializer(
            vehicle, context={'request': request}
        )
        return Response(serializer.data)

    def put(self, request, pk):
        vehicle = self.get_object(pk)
        serializer = VehicleRegistrationSerializer(
            vehicle, data=request.data, partial=True, context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        vehicle = self.get_object(pk)

        # Deactivating a vehicle mid-stay would orphan the booking and leave the
        # slot permanently occupied.
        if vehicle.bookings.filter(is_active=True).exists():
            return Response(
                {'error': 'Vehicle has an active booking. Check out before deactivating.'},
                status=status.HTTP_409_CONFLICT
            )

        vehicle.is_active = False
        vehicle.save(update_fields=['is_active', 'updated_at'])
        return Response(
            {'message': 'Vehicle deactivated.'},
            status=status.HTTP_200_OK
        )


class VehicleSearchView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):
        license_plate = request.query_params.get('license', '').strip()
        if not license_plate:
            return Response(
                {'error': 'license query param is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        vehicles = owned_vehicles(request.user).filter(
            vehicle_license__icontains=license_plate
        )
        serializer = VehicleRegistrationSerializer(
            vehicles, many=True, context={'request': request}
        )
        data = serializer.data
        return Response({'count': len(data), 'results': data})