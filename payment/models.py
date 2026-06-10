from django.db import models
from booking.models import Booking


class Payment(models.Model):
    METHOD_CASH = 'cash'
    METHOD_CARD = 'card'
    METHOD_MOBILE = 'mobile_banking'
    METHOD_CHOICES = [
        (METHOD_CASH, 'Cash'),
        (METHOD_CARD, 'Card'),
        (METHOD_MOBILE, 'Mobile Banking'),
    ]

    booking = models.OneToOneField(
        Booking, on_delete=models.CASCADE, related_name='payment'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(
        max_length=20, choices=METHOD_CHOICES,
        default=METHOD_CASH, blank=True
    )
    paid = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True, blank=True)
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payment'
        ordering = ['-created_at']

    def __str__(self):
        status = "Paid" if self.paid else "Pending"
        return f"Payment #{self.pk} — {self.booking} [{status}]"