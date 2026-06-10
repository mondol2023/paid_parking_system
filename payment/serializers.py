from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id', 'booking', 'amount', 'payment_method',
            'paid', 'paid_at', 'transaction_id',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['paid', 'paid_at', 'amount', 'created_at', 'updated_at']


class PaymentConfirmSerializer(serializers.Serializer):
    payment_method = serializers.ChoiceField(choices=Payment.METHOD_CHOICES)
    transaction_id = serializers.CharField(max_length=100, required=False, allow_blank=True)