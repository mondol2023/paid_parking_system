from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'booking', 'amount', 'payment_method',
        'paid', 'paid_at', 'transaction_id',
    ]
    list_filter = ['paid', 'payment_method']
    search_fields = ['booking__vehicle__vehicle_license', 'transaction_id']
    readonly_fields = ['created_at', 'updated_at', 'paid_at']
    ordering = ['-created_at']