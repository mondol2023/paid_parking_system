from rest_framework import serializers
from .models import ParkingLot, Slot, ParkingRate


class ParkingRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParkingRate
        fields = ['id', 'vehicle_type', 'rate_per_hour']


class SlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = Slot
        fields = ['id', 'slot_number', 'size', 'is_available']


class ParkingLotSerializer(serializers.ModelSerializer):
    rates = ParkingRateSerializer(many=True, read_only=True)
    available_slots_count = serializers.ReadOnlyField()

    class Meta:
        model = ParkingLot
        fields = [
            'id', 'name', 'address',
            'latitude', 'longitude',
            'total_slots', 'available_slots_count',
            'rates', 'is_active',
            'created_at', 'updated_at',
        ]


class NearestLotSerializer(ParkingLotSerializer):
    """Extends ParkingLotSerializer with distance_km field."""
    distance_km = serializers.FloatField(read_only=True)

    class Meta(ParkingLotSerializer.Meta):
        fields = ParkingLotSerializer.Meta.fields + ['distance_km']