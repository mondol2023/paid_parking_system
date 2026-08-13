"""
from rest_framework import serializers
from .models import Booking

class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = '__all__'

"""

from decimal import Decimal

from rest_framework import serializers
from .models import Booking
from vehicle_registration.serializers import VehicleRegistrationSerializer
from parking_lot.serializers import SlotSerializer

# Upper bound on a single reservation (~30 days). Guards against a client
# posting an absurd duration that produces a nonsensical estimated amount.
MAX_RESERVE_HOURS = Decimal('720')


class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = [
            'id', 'vehicle', 'slot', 'check_in', 'check_out',
            'reserve_time', 'status', 'is_active',
            'created_at', 'updated_at',
        ]
        # `is_active` drives checkout/soft-delete state; a client must not be
        # able to resurrect or retire a booking by posting it.
        read_only_fields = [
            'check_out', 'status', 'is_active', 'created_at', 'updated_at',
        ]

    def validate_vehicle(self, value):
        """A user may only book a vehicle they registered."""
        request = self.context.get('request')
        if request is None:
            raise serializers.ValidationError('Request context is required.')

        user = request.user
        if not user.is_staff and value.owner_id != user.pk:
            # Same message for "not yours" and "does not exist" so the endpoint
            # cannot be used to enumerate other users' vehicle IDs.
            raise serializers.ValidationError('Vehicle not found.')
        if not value.is_active:
            raise serializers.ValidationError('Vehicle registration is inactive.')
        return value

    def validate_reserve_time(self, value):
        if value <= 0:
            raise serializers.ValidationError('Reserved hours must be greater than zero.')
        if value > MAX_RESERVE_HOURS:
            raise serializers.ValidationError(
                f'Reserved hours cannot exceed {MAX_RESERVE_HOURS}.'
            )
        return value

    def validate(self, attrs):
        vehicle = attrs.get('vehicle')
        # One vehicle cannot occupy two slots at once.
        if vehicle is not None and self.instance is None:
            if Booking.objects.filter(vehicle=vehicle, is_active=True).exists():
                raise serializers.ValidationError(
                    {'vehicle': 'This vehicle already has an active booking.'}
                )
        return attrs


class BookingDetailSerializer(BookingSerializer):
    vehicle = VehicleRegistrationSerializer(read_only=True)
    slot = SlotSerializer(read_only=True)
    actual_hours = serializers.ReadOnlyField()

    class Meta(BookingSerializer.Meta):
        fields = BookingSerializer.Meta.fields + ['actual_hours']