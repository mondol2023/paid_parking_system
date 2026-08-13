from django.contrib import admin

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'booking', 'vehicle_license', 'owner', 'amount',
        'payment_method', 'paid', 'paid_at', 'transaction_id',
    ]
    list_filter = ['paid', 'payment_method']
    list_select_related = ['booking', 'booking__vehicle', 'booking__vehicle__owner']
    search_fields = [
        'booking__vehicle__vehicle_license', 'transaction_id',
        'booking__vehicle__owner__username',
    ]
    readonly_fields = ['created_at', 'updated_at', 'paid_at']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']

    @admin.display(description='Vehicle', ordering='booking__vehicle__vehicle_license')
    def vehicle_license(self, obj):
        return obj.booking.vehicle.vehicle_license

    @admin.display(description='Owner', ordering='booking__vehicle__owner__username')
    def owner(self, obj):
        return obj.booking.vehicle.owner or '—'
