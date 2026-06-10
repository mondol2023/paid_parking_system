from django.contrib import admin

from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'vehicle', 'slot', 'check_in',
        'check_out', 'status', 'actual_hours', 'is_active',
    ]
    list_filter = ['status', 'is_active']
    search_fields = ['vehicle__vehicle_license', 'slot__slot_number']
    readonly_fields = ['check_in', 'check_out', 'created_at', 'updated_at', 'actual_hours']
    ordering = ['-created_at']