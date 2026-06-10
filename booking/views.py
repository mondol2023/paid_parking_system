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
        serializer = BookingSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        slot_id = serializer.validated_data['slot'].id

        # Lock the row to prevent double-booking (SELECT FOR UPDATE)
        try:
            slot = Slot.objects.select_for_update().get(pk=slot_id)
        except Slot.DoesNotExist:
            return Response({'error': 'Slot not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not slot.is_available:
            return Response({'error': 'Slot is already booked.'}, status=status.HTTP_409_CONFLICT)

        # Create booking
        booking = serializer.save()

        # Mark slot unavailable
        slot.is_available = False
        slot.save(update_fields=['is_available'])

        # Calculate estimated amount and create pending payment
        vehicle_type = booking.vehicle.vehicle_type
        rate_obj = ParkingRate.objects.filter(
            lot=slot.lot, vehicle_type=vehicle_type
        ).first() or ParkingRate.objects.filter(
            lot__isnull=True, vehicle_type=vehicle_type
        ).first()

        estimated_amount = 0
        if rate_obj:
            estimated_amount = rate_obj.rate_per_hour * booking.reserve_time

        Payment.objects.create(
            booking=booking,
            amount=estimated_amount,
            paid=False,
        )

        return Response(
            BookingDetailSerializer(booking).data,
            status=status.HTTP_201_CREATED
        )


class BookingDetailView(APIView):
    """
    GET /api/bookings/<pk>/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        booking = get_object_or_404(Booking, pk=pk, is_active=True)
        serializer = BookingDetailSerializer(booking)
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
        booking = get_object_or_404(Booking, pk=pk, is_active=True)

        if booking.status == Booking.STATUS_COMPLETED:
            return Response({'error': 'Booking already checked out.'}, status=status.HTTP_400_BAD_REQUEST)

        # Set checkout time
        booking.check_out = timezone.now()
        booking.status = Booking.STATUS_COMPLETED
        booking.is_active = False
        booking.save(update_fields=['check_out', 'status', 'is_active', 'updated_at'])

        # Free the slot
        slot = booking.slot
        slot.is_available = True
        slot.save(update_fields=['is_available'])

        # Recalculate final amount
        vehicle_type = booking.vehicle.vehicle_type
        rate_obj = ParkingRate.objects.filter(
            lot=slot.lot, vehicle_type=vehicle_type
        ).first() or ParkingRate.objects.filter(
            lot__isnull=True, vehicle_type=vehicle_type
        ).first()

        final_amount = 0
        if rate_obj:
            final_amount = round(float(rate_obj.rate_per_hour) * booking.actual_hours, 2)

        # Update payment with final amount
        payment = booking.payment
        payment.amount = final_amount
        payment.save(update_fields=['amount'])

        return Response({
            'message': 'Checkout successful.',
            'booking_id': booking.pk,
            'actual_hours': booking.actual_hours,
            'final_amount': final_amount,
            'payment_id': payment.pk,
            'paid': payment.paid,
        })


class BookingListView(APIView):
    """
    GET /api/bookings/    — list user's own bookings
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bookings = Booking.objects.filter(is_active=True).select_related(
            'vehicle', 'slot', 'slot__lot'
        )
        serializer = BookingDetailSerializer(bookings, many=True)
        return Response(serializer.data)