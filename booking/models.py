"""
from django.db import models
from vehicle_registration.models import VehicleRegistration

# Create your models here.
from django.utils import timezone
class Booking(models.Model):
    vehicle = models.ForeignKey(VehicleRegistration, on_delete=models.CASCADE)
    slot = models.ForeignKey(slot, on_delete=models.CASCADE)
    check_in = models.DateTimeField(default=timezone.now)
    reserve_time = models.DecimalField(max_digits=10)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.vehicle} booked {self.slot}"
    
    


class Payment(models.Model):
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_time = models.DateTimeField(auto_now_add=True)
    paid = models.BooleanField(default=False)

    def __str__(self):
        return f"Payment for {self.booking} - ₹{self.amount}"


class ParkingRate(models.Model):
    vehicle_type = models.CharField(max_length=50, unique=True)
    rate_per_hour = models.DecimalField(max_digits=6, decimal_places=2)

    def __str__(self):
        return f"{self.vehicle_type}: {self.rate_per_hour}/hr"


class slot(models.Model):
    number = models.CharField(max_length=100)
    is_available = models.BooleanField(default=False)
    vehicle_registration = models.ForeignKey(vehicle_registration, on_delete=models.CASCADE, blank = True, null = True)

    def __str__(self):
        return self.number
"""
from django.db import models
from django.utils import timezone
from vehicle_registration.models import VehicleRegistration
from parking_lot.models import Slot, ParkingLot, ParkingRate


class Booking(models.Model):
    STATUS_ACTIVE = 'active'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Active'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    vehicle = models.ForeignKey(
        VehicleRegistration, on_delete=models.CASCADE, related_name='bookings'
    )
    slot = models.ForeignKey(                          # FIX: Slot defined in parking_lot
        Slot, on_delete=models.CASCADE, related_name='bookings'
    )
    check_in = models.DateTimeField(default=timezone.now)
    check_out = models.DateTimeField(null=True, blank=True)
    reserve_time = models.DecimalField(max_digits=10, decimal_places=2, help_text="Reserved hours")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'booking'
        ordering = ['-created_at']

    def __str__(self):
        return f"Booking #{self.pk} — {self.vehicle} @ {self.slot}"

    @property
    def actual_hours(self):
        """Hours elapsed since check-in (or till check-out if completed)."""
        end = self.check_out or timezone.now()
        delta = end - self.check_in
        return round(delta.total_seconds() / 3600, 4)