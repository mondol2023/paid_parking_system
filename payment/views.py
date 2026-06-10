from django.utils import timezone
from django.shortcuts import get_object_or_404

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import Payment
from .serializers import PaymentSerializer, PaymentConfirmSerializer


class PaymentDetailView(APIView):
    """
    GET /api/payments/<booking_id>/
    Retrieve payment info for a booking.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, booking_id):
        payment = get_object_or_404(Payment, booking_id=booking_id)
        serializer = PaymentSerializer(payment)
        return Response(serializer.data)


class PaymentConfirmView(APIView):
    """
    POST /api/payments/<booking_id>/pay/
    Body: { payment_method, transaction_id (optional) }

    Marks payment as paid. Booking must be completed (checked out) first.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, booking_id):
        payment = get_object_or_404(Payment, booking_id=booking_id)

        if payment.paid:
            return Response(
                {'error': 'Payment already completed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Must checkout before paying
        if payment.booking.status != 'completed':
            return Response(
                {'error': 'Please complete checkout before payment.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = PaymentConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        payment.paid = True
        payment.paid_at = timezone.now()
        payment.payment_method = serializer.validated_data['payment_method']
        payment.transaction_id = serializer.validated_data.get('transaction_id', '')
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
        payments = Payment.objects.select_related(
            'booking', 'booking__vehicle', 'booking__slot'
        ).order_by('-created_at')

        serializer = PaymentSerializer(payments, many=True)
        return Response({'count': payments.count(), 'results': serializer.data})