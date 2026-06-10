from django.contrib import admin
from .models import VehicleRegistration

@admin.register(VehicleRegistration)
class VehicleRegistrationAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'vehicle_name',
        'vehicle_model',
        'vehicle_license',
        'vehicle_type',
        'vehicle_image',
        'vehicle_length',   
        'vehicle_width',
        'vehicle_height',
        'driver_name',
        'driver_phone',
        'driver_license',
        'owner_name',
        'owner_phone',
        'is_active',
        'created_at',
    ]
    list_filter = ['vehicle_type', 'is_active']
    search_fields = ['vehicle_license', 'driver_name', 'owner_name']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    
"""
    list_display = [
        'vehicle_license', 'vehicle_model', 'vehicle_type',
        'driver_name', 'driver_phone', 'is_active', 'created_at',
    ]
"""