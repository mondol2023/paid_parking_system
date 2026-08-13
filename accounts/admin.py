"""User admin showing each account's rights and its footprint in the system."""
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin
from django.db.models import Count
from django.urls import reverse
from django.utils.html import format_html

User = get_user_model()

# The stock admin registers auth.User at import time; swap in the richer one.
admin.site.unregister(User)


@admin.register(User)
class ParkingUserAdmin(UserAdmin):
    list_display = UserAdmin.list_display + ('is_active', 'vehicle_count', 'booking_count')
    list_filter = UserAdmin.list_filter + ('date_joined',)
    ordering = ('-date_joined',)

    def get_queryset(self, request):
        # Annotate once instead of counting per row in the changelist.
        return super().get_queryset(request).annotate(
            _vehicle_count=Count('vehicles', distinct=True),
            _booking_count=Count('vehicles__bookings', distinct=True),
        )

    @admin.display(description='Vehicles', ordering='_vehicle_count')
    def vehicle_count(self, obj):
        if not obj._vehicle_count:
            return 0
        url = reverse('admin:vehicle_registration_vehicleregistration_changelist')
        return format_html('<a href="{}?owner__id__exact={}">{}</a>',
                           url, obj.pk, obj._vehicle_count)

    @admin.display(description='Bookings', ordering='_booking_count')
    def booking_count(self, obj):
        return obj._booking_count
