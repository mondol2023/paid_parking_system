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
        read_only_fields = ['created_at', 'updated_at']

    def validate_vehicle_license(self, value):
        """Ensure license plate is unique among active vehicles."""
        qs = VehicleRegistration.objects.filter(
            vehicle_license__iexact=value,
            is_active=True
        )
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                f'Vehicle with license "{value}" is already registered.'
            )
        return value.upper()   

    def validate_driver_phone(self, value):
        if not value.lstrip('+').isdigit():
            raise serializers.ValidationError('Phone must contain digits only.')
        return value