"""
from django.shortcuts import render

# Create your views here.
def Booking(request):
    if request.method == 'POST':
        booking = booking(
            vehicle_license=request.POST.get('vehicle_license'),
            booking_slot=request.POST.get('slot'),
            check_in=request.POST.get('check_in'),
            reserve_time=request.POST.get('reserve_time'),
            vehicle_model=request.POST.get('vehicle_model'),
            vehicle_registration_number=request.POST.get('vehicle_registration_number'),
        )
        booking.save()
        return redirect('profile')
    return render(request, 'booking.html')

"""
from decimal import Decimal, ROUND_HALF_UP

from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db import transaction

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import Booking
from .serializers import BookingSerializer, BookingDetailSerializer
from parking_lot.models import Slot, ParkingRate
from payment.models import Payment

MONEY = Decimal('0.01')


def owned_bookings(user, active_only=True):
    """
    Bookings the given user may see. Ownership is derived through the vehicle's
    owner, so an out-of-scope pk 404s instead of leaking another user's stay.
    """
    queryset = Booking.objects.select_related('vehicle', 'slot', 'slot__lot')
    if active_only:
        queryset = queryset.filter(is_active=True)
    if user.is_staff:
        return queryset
    return queryset.filter(vehicle__owner=user)


def rate_for(lot, vehicle_type):
    """Lot-specific rate if configured, otherwise the global fallback rate."""
    return (
        ParkingRate.objects.filter(lot=lot, vehicle_type=vehicle_type).first()
        or ParkingRate.objects.filter(lot__isnull=True, vehicle_type=vehicle_type).first()
    )


def to_money(value):
    """Round a Decimal to 2 places the way currency is normally rounded."""
    return value.quantize(MONEY, rounding=ROUND_HALF_UP)


class BookingCreateView(APIView):
    """
    POST /api/bookings/
    Body: { vehicle, slot, reserve_time }

    - Checks slot is available
    - Creates booking atomically (slot marked unavailable)
    - Creates a pending Payment record
    """
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        # The request goes into the context so the serializer can verify that
        # the submitted vehicle actually belongs to the caller.
        serializer = BookingSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        slot_id = serializer.validated_data['slot'].id

        # Lock the row to prevent double-booking (SELECT FOR UPDATE)
        try:
            slot = Slot.objects.select_for_update().select_related('lot').get(pk=slot_id)
        except Slot.DoesNotExist:
            return Response({'error': 'Slot not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not slot.is_available:
            return Response({'error': 'Slot is already booked.'}, status=status.HTTP_409_CONFLICT)

        if not slot.lot.is_active:
            return Response(
                {'error': 'Parking lot is not accepting bookings.'},
                status=status.HTTP_409_CONFLICT
            )

        # Create booking
        booking = serializer.save()

        # Mark slot unavailable
        slot.is_available = False
        slot.save(update_fields=['is_available'])

        # Calculate estimated amount and create pending payment. reserve_time is
        # a DecimalField, so the whole computation stays in Decimal.
        rate_obj = rate_for(slot.lot, booking.vehicle.vehicle_type)
        estimated_amount = (
            to_money(rate_obj.rate_per_hour * booking.reserve_time)
            if rate_obj else Decimal('0.00')
        )

        Payment.objects.create(
            booking=booking,
            amount=estimated_amount,
            paid=False,
        )

        return Response(
            BookingDetailSerializer(booking, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


class BookingDetailView(APIView):
    """
    GET /api/bookings/<pk>/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        booking = get_object_or_404(owned_bookings(request.user), pk=pk)
        serializer = BookingDetailSerializer(booking, context={'request': request})
        return Response(serializer.data)


class BookingCheckoutView(APIView):
    """
    POST /api/bookings/<pk>/checkout/

    - Sets check_out timestamp
    - Recalculates final payment based on actual hours
    - Frees the slot
    - Marks booking completed
    """
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        # Lock the booking row itself (of='self' keeps the lock off the joined
        # vehicle/slot rows) so two concurrent checkouts cannot both proceed.
        booking = get_object_or_404(
            owned_bookings(request.user, active_only=False).select_for_update(of=('self',)),
            pk=pk,
        )

        if booking.status == Booking.STATUS_COMPLETED:
            return Response({'error': 'Booking already checked out.'}, status=status.HTTP_400_BAD_REQUEST)

        if booking.status == Booking.STATUS_CANCELLED:
            return Response({'error': 'Booking was cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

        # Set checkout time
        booking.check_out = timezone.now()
        booking.status = Booking.STATUS_COMPLETED
        booking.is_active = False
        booking.save(update_fields=['check_out', 'status', 'is_active', 'updated_at'])

        # Free the slot under its own lock — the create path locks the same row.
        slot = Slot.objects.select_for_update().select_related('lot').get(pk=booking.slot_id)
        slot.is_available = True
        slot.save(update_fields=['is_available'])

        # Recalculate final amount. actual_hours is a float property, so it is
        # converted via str() to avoid binary-float noise entering the Decimal.
        rate_obj = rate_for(slot.lot, booking.vehicle.vehicle_type)
        actual_hours = booking.actual_hours
        computed_amount = (
            to_money(rate_obj.rate_per_hour * Decimal(str(actual_hours)))
            if rate_obj else Decimal('0.00')
        )

        # A booking always gets a Payment at creation time; get_or_create covers
        # rows created before that guarantee existed instead of raising a 500.
        payment, _ = Payment.objects.get_or_create(
            booking=booking,
            defaults={'amount': computed_amount, 'paid': False},
        )

        # Never rewrite the amount of a payment that has already been settled.
        if not payment.paid:
            payment.amount = computed_amount
            payment.save(update_fields=['amount', 'updated_at'])

        return Response({
            'message': 'Checkout successful.',
            'booking_id': booking.pk,
            'actual_hours': actual_hours,
            'final_amount': payment.amount,
            'payment_id': payment.pk,
            'paid': payment.paid,
        })


class BookingListView(APIView):
    """
    GET /api/bookings/    — list user's own bookings
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bookings = owned_bookings(request.user)
        serializer = BookingDetailSerializer(
            bookings, many=True, context={'request': request}
        )
        data = serializer.data
        return Response({'count': len(data), 'results': data})