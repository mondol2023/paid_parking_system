"""Admin site with a metrics dashboard on the index page.

The stock admin index only lists models, so an administrator has to open each
changelist to learn anything about the state of the system. `index()` is the one
place these aggregates are needed, so they are computed there rather than in
`each_context()` — that runs on every admin page and would tax every request.
"""
from decimal import Decimal

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.db.models import Count, Q, Sum

from booking.models import Booking
from parking_lot.models import ParkingLot, Slot
from payment.models import Payment
from vehicle_registration.models import VehicleRegistration

ZERO = Decimal('0.00')


class ParkingAdminSite(admin.AdminSite):
    site_header = 'Paid Parking System administration'
    site_title = 'Paid Parking admin'
    index_title = 'Operations dashboard'
    # A separate name: a template called "admin/index.html" that extends
    # "admin/index.html" would recurse.
    index_template = 'admin/dashboard_index.html'

    def index(self, request, extra_context=None):
        context = dict(extra_context or {}, dashboard=self.get_dashboard_metrics())
        return super().index(request, context)

    def get_dashboard_metrics(self):
        """Every section of the dashboard, as one aggregate query per model."""
        User = get_user_model()

        users = User.objects.aggregate(
            total=Count('pk'),
            staff=Count('pk', filter=Q(is_staff=True)),
            superusers=Count('pk', filter=Q(is_superuser=True)),
            inactive=Count('pk', filter=Q(is_active=False)),
        )
        vehicles = VehicleRegistration.objects.aggregate(
            total=Count('pk'),
            active=Count('pk', filter=Q(is_active=True)),
            unowned=Count('pk', filter=Q(owner__isnull=True)),
        )
        lots = ParkingLot.objects.aggregate(
            total=Count('pk'),
            active=Count('pk', filter=Q(is_active=True)),
        )
        slots = Slot.objects.aggregate(
            total=Count('pk'),
            available=Count('pk', filter=Q(is_available=True)),
        )
        bookings = Booking.objects.aggregate(
            total=Count('pk'),
            active=Count('pk', filter=Q(status=Booking.STATUS_ACTIVE, is_active=True)),
            completed=Count('pk', filter=Q(status=Booking.STATUS_COMPLETED)),
            cancelled=Count('pk', filter=Q(status=Booking.STATUS_CANCELLED)),
        )
        payments = Payment.objects.aggregate(
            total=Count('pk'),
            settled=Count('pk', filter=Q(paid=True)),
            revenue=Sum('amount', filter=Q(paid=True)),
            outstanding=Sum('amount', filter=Q(paid=False)),
        )
        # Sum() is NULL on an empty set; the template formats money, not None.
        payments['revenue'] = payments['revenue'] or ZERO
        payments['outstanding'] = payments['outstanding'] or ZERO

        occupied = slots['total'] - slots['available']
        slots['occupied'] = occupied
        slots['occupancy_pct'] = round(occupied * 100 / slots['total'], 1) if slots['total'] else 0

        return {
            'users': users,
            'vehicles': vehicles,
            'lots': lots,
            'slots': slots,
            'bookings': bookings,
            'payments': payments,
            'recent_bookings': (
                Booking.objects
                .select_related('vehicle', 'vehicle__owner', 'slot', 'slot__lot')
                .order_by('-created_at')[:10]
            ),
            'recent_payments': (
                Payment.objects
                .select_related('booking', 'booking__vehicle')
                .order_by('-created_at')[:10]
            ),
            'busiest_lots': (
                ParkingLot.objects
                .filter(is_active=True)
                .annotate(booking_count=Count('slots__bookings'))
                .order_by('-booking_count')[:5]
            ),
        }
