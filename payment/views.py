from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from booking.models import Booking
from .models import Payment
from .serializers import PaymentSerializer, PaymentConfirmSerializer


def owned_payments(user):
    """
    Payments the given user may see. Ownership runs booking -> vehicle -> owner,
    so a payment for someone else's booking 404s instead of being readable.
    """
    queryset = Payment.objects.select_related(
        'booking', 'booking__vehicle', 'booking__slot', 'booking__slot__lot'
    )
    if user.is_staff:
        return queryset
    return queryset.filter(booking__vehicle__owner=user)


class PaymentDetailView(APIView):
    """
    GET /api/payments/<booking_id>/
    Retrieve payment info for a booking.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, booking_id):
        payment = get_object_or_404(owned_payments(request.user), booking_id=booking_id)
        serializer = PaymentSerializer(payment)
        return Response(serializer.data)


class PaymentConfirmView(APIView):
    """
    POST /api/payments/<booking_id>/pay/
    Body: { payment_method, transaction_id (optional) }

    Marks payment as paid. Booking must be completed (checked out) first.
    """
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, booking_id):
        # Validate the body before touching the row, then lock the payment for
        # the rest of the transaction: without the lock two simultaneous
        # requests both read paid=False and both settle the same booking.
        serializer = PaymentConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        payment = get_object_or_404(
            owned_payments(request.user).select_for_update(of=('self',)),
            booking_id=booking_id,
        )

        if payment.paid:
            return Response(
                {'error': 'Payment already completed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Must checkout before paying
        if payment.booking.status != Booking.STATUS_COMPLETED:
            return Response(
                {'error': 'Please complete checkout before payment.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        payment.paid = True
        payment.paid_at = timezone.now()
        payment.payment_method = serializer.validated_data['payment_method']
        # The column is null=True: store NULL rather than '' when no reference
        # was supplied, so "no transaction id" has exactly one representation.
        payment.transaction_id = serializer.validated_data.get('transaction_id') or None
        payment.save(update_fields=['paid', 'paid_at', 'payment_method', 'transaction_id', 'updated_at'])

        return Response({
            'message': 'Payment successful.',
            'payment_id': payment.pk,
            'booking_id': booking_id,
            'amount': payment.amount,
            'payment_method': payment.payment_method,
            'paid_at': payment.paid_at,
        })


class PaymentHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payments = owned_payments(request.user).order_by('-created_at')

        serializer = PaymentSerializer(payments, many=True)
        data = serializer.data
        # len(data) reuses the rows already fetched instead of issuing a second
        # COUNT query (and cannot disagree with the list it reports on).
        return Response({'count': len(data), 'results': data})