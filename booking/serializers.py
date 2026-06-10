"""
from rest_framework import serializers
from .models import Booking

class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = '__all__'

"""

from rest_framework import serializers
from .models import Booking
from vehicle_registration.serializers import VehicleRegistrationSerializer
from parking_lot.serializers import SlotSerializer


class BookingSerializer(serializers.ModelSerializer):       
    class Meta:
        model = Booking
        fields = [
            'id', 'vehicle', 'slot', 'check_in', 'check_out',
            'reserve_time', 'status', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['check_out', 'status', 'created_at', 'updated_at']


class BookingDetailSerializer(BookingSerializer):
    vehicle = VehicleRegistrationSerializer(read_only=True)
    slot = SlotSerializer(read_only=True)
    actual_hours = serializers.ReadOnlyField()

    class Meta(BookingSerializer.Meta):
        fields = BookingSerializer.Meta.fields + ['actual_hours']