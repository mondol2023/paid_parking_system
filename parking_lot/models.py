from django.db import models


class ParkingLot(models.Model):
    name = models.CharField(max_length=150)
    address = models.TextField()
    # Geo coords for Haversine nearest-lot search
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    total_slots = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'parking_lot'
        ordering = ['name']

    def __str__(self):
        return self.name

    @property
    def available_slots_count(self):
        return self.slots.filter(is_available=True).count()


class ParkingRate(models.Model):
    """Rate per vehicle type per parking lot (or global if lot is null)."""
    CAR = "car"
    BUS = "bus"
    MINI_BUS = "mini_bus"
    BIKE = "bike"
    MICRO = "micro"
    TRUCK = "truck"
    VEHICLE_TYPE_CHOICES = [
        (CAR, "Car"), (BUS, "Bus"), (MINI_BUS, "Mini Bus"),
        (BIKE, "Bike"), (MICRO, "Micro"), (TRUCK, "Truck"),
    ]

    lot = models.ForeignKey(
        ParkingLot, on_delete=models.CASCADE,
        related_name='rates', null=True, blank=True
    )
    vehicle_type = models.CharField(max_length=30, choices=VEHICLE_TYPE_CHOICES)
    rate_per_hour = models.DecimalField(max_digits=8, decimal_places=2)

    class Meta:
        db_table = 'parking_rate'
        unique_together = ('lot', 'vehicle_type')

    def __str__(self):
        lot_name = self.lot.name if self.lot else "Global"
        return f"{lot_name} | {self.vehicle_type}: {self.rate_per_hour}/hr"


class Slot(models.Model):
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"
    SIZE_CHOICES = [(SMALL, "Small"), (MEDIUM, "Medium"), (LARGE, "Large")]

    lot = models.ForeignKey(ParkingLot, on_delete=models.CASCADE, related_name='slots')
    slot_number = models.CharField(max_length=20)
    size = models.CharField(max_length=10, choices=SIZE_CHOICES, default=MEDIUM)
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'parking_slot'
        unique_together = ('lot', 'slot_number')
        ordering = ['lot', 'slot_number']

    def __str__(self):
        return f"{self.lot.name} — {self.slot_number}"