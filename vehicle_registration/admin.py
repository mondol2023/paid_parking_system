from django.contrib import admin

from .models import VehicleRegistration


@admin.register(VehicleRegistration)
class VehicleRegistrationAdmin(admin.ModelAdmin):
    # `owner` drives every ownership check in the API, so it belongs in the
    # changelist; the raw image/dimension columns only made the table wider.
    list_display = [
        'id',
        'vehicle_license',
        'vehicle_model',
        'vehicle_type',
        'owner',
        'driver_name',
        'driver_phone',
        'is_active',
        'created_at',
    ]
    list_filter = ['vehicle_type', 'is_active', 'owner']
    list_select_related = ['owner']
    search_fields = [
        'vehicle_license', 'driver_name', 'owner_name',
        'owner__username', 'owner__email',
    ]
    autocomplete_fields = ['owner']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
