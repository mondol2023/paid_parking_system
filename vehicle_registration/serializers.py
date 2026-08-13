from rest_framework import serializers
from .models import VehicleRegistration

"""
class VehicleRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleRegistration
        fields = '__all__'
"""



class VehicleRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleRegistration
        fields = '__all__'
        # `owner` is assigned from request.user by the view; accepting it from
        # the request body would let a client register a vehicle to someone else.
        read_only_fields = ['owner', 'created_at', 'updated_at']
        extra_kwargs = {
            # Replaced by validate_vehicle_license() below, which is
            # case-insensitive and aware of deactivated records.
            'vehicle_license': {'validators': []},
        }

    def validate_vehicle_license(self, value):
        """Normalise to uppercase and enforce the model's unique constraint."""
        value = value.strip().upper()
        if not value:
            raise serializers.ValidationError('License plate is required.')

        qs = VehicleRegistration.objects.filter(vehicle_license__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        existing = qs.first()
        if existing is not None:
            if not existing.is_active:
                raise serializers.ValidationError(
                    f'License "{value}" belongs to a deactivated registration. '
                    'Reactivate that record instead of creating a new one.'
                )
            raise serializers.ValidationError(
                f'Vehicle with license "{value}" is already registered.'
            )
        return value

    def validate_driver_phone(self, value):
        value = value.strip()
        if not value.lstrip('+').isdigit():
            raise serializers.ValidationError('Phone must contain digits only.')
        return value

    def validate(self, attrs):
        for field in ('vehicle_length', 'vehicle_width', 'vehicle_height'):
            value = attrs.get(field)
            if value is not None and value <= 0:
                raise serializers.ValidationError(
                    {field: 'Dimension must be greater than zero.'}
                )
        return attrs