from django.contrib import admin

from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'vehicle', 'owner', 'lot', 'slot', 'check_in',
        'check_out', 'status', 'actual_hours', 'is_active',
    ]
    list_filter = ['status', 'is_active', 'slot__lot']
    # Each row renders the vehicle, its owner and the slot's lot: without this
    # the changelist runs three extra queries per booking.
    list_select_related = ['vehicle', 'vehicle__owner', 'slot', 'slot__lot']
    search_fields = [
        'vehicle__vehicle_license', 'slot__slot_number',
        'vehicle__owner__username', 'vehicle__owner__email',
    ]
    readonly_fields = ['check_in', 'check_out', 'created_at', 'updated_at', 'actual_hours']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']

    @admin.display(description='Owner', ordering='vehicle__owner__username')
    def owner(self, obj):
        return obj.vehicle.owner or '—'

    @admin.display(description='Lot', ordering='slot__lot__name')
    def lot(self, obj):
        return obj.slot.lot.name
