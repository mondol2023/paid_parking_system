from django.contrib import admin
from .models import ParkingLot, Slot, ParkingRate


class SlotInline(admin.TabularInline):
    model = Slot
    extra = 0
    fields = ['slot_number', 'size', 'is_available']


class ParkingRateInline(admin.TabularInline):
    model = ParkingRate
    extra = 0
    fields = ['vehicle_type', 'rate_per_hour']


@admin.register(ParkingLot)
class ParkingLotAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'address', 'latitude', 'longitude',
        'total_slots', 'available_slots_count', 'is_active',
    ]
    list_filter = ['is_active']
    search_fields = ['name', 'address']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [ParkingRateInline, SlotInline]

    def get_queryset(self, request):
        # available_slots_count reads the prefetch cache when there is one, so
        # the changelist costs one extra query instead of one per lot.
        return super().get_queryset(request).prefetch_related('slots')


@admin.register(Slot)
class SlotAdmin(admin.ModelAdmin):
    list_display = ['slot_number', 'lot', 'size', 'is_available']
    list_filter = ['is_available', 'size', 'lot']
    list_select_related = ['lot']
    search_fields = ['slot_number', 'lot__name']


@admin.register(ParkingRate)
class ParkingRateAdmin(admin.ModelAdmin):
    list_display = ['lot', 'vehicle_type', 'rate_per_hour']
    list_filter = ['vehicle_type', 'lot']
    list_select_related = ['lot']
    search_fields = ['lot__name']