"""Regression tests for booking ownership, slot contention and money maths."""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from parking_lot.models import ParkingLot, ParkingRate, Slot
from payment.models import Payment
from vehicle_registration.models import VehicleRegistration
from vehicle_registration.tests import NO_THROTTLE, make_vehicle

from .models import Booking


@NO_THROTTLE
class BookingApiTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user('alice', 'alice@example.com', 'pw-alice-123')
        self.bob = User.objects.create_user('bob', 'bob@example.com', 'pw-bob-123')
        self.alice_vehicle = make_vehicle(self.alice, 'ALICE-1')
        self.bob_vehicle = make_vehicle(self.bob, 'BOB-1')

        self.lot = ParkingLot.objects.create(
            name='Central', address='x', latitude='23.810000', longitude='90.412500'
        )
        self.slot = Slot.objects.create(lot=self.lot, slot_number='A1')
        self.other_slot = Slot.objects.create(lot=self.lot, slot_number='A2')
        ParkingRate.objects.create(
            lot=self.lot, vehicle_type=VehicleRegistration.CAR, rate_per_hour=Decimal('12.35')
        )
        self.client.force_authenticate(self.alice)

    def book(self, vehicle, slot, hours='2.00'):
        return self.client.post(
            reverse('booking-create'),
            {'vehicle': vehicle.pk, 'slot': slot.pk, 'reserve_time': hours},
            format='json',
        )

    def test_cannot_book_another_users_vehicle(self):
        response = self.book(self.bob_vehicle, self.slot)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('vehicle', response.data)
        self.assertFalse(Booking.objects.exists())

    def test_estimated_amount_uses_exact_decimal_maths(self):
        response = self.book(self.alice_vehicle, self.slot, hours='3.00')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        payment = Payment.objects.get(booking_id=response.data['id'])
        # 12.35 * 3 — a float would land on 37.049999999999997.
        self.assertEqual(payment.amount, Decimal('37.05'))

    def test_booking_marks_the_slot_unavailable_and_blocks_a_second_booking(self):
        self.assertEqual(self.book(self.alice_vehicle, self.slot).status_code,
                         status.HTTP_201_CREATED)
        self.slot.refresh_from_db()
        self.assertFalse(self.slot.is_available)

        second_vehicle = make_vehicle(self.alice, 'ALICE-2')
        clash = self.book(second_vehicle, self.slot)
        self.assertEqual(clash.status_code, status.HTTP_409_CONFLICT)

    def test_a_vehicle_cannot_hold_two_active_bookings(self):
        self.assertEqual(self.book(self.alice_vehicle, self.slot).status_code,
                         status.HTTP_201_CREATED)
        second = self.book(self.alice_vehicle, self.other_slot)
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('vehicle', second.data)

    def test_non_positive_reserve_time_is_rejected(self):
        response = self.book(self.alice_vehicle, self.slot, hours='0.00')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('reserve_time', response.data)

    def test_booking_in_an_inactive_lot_is_refused(self):
        self.lot.is_active = False
        self.lot.save(update_fields=['is_active'])
        response = self.book(self.alice_vehicle, self.slot)
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_detail_and_list_are_scoped_to_the_owner(self):
        bob_booking = Booking.objects.create(
            vehicle=self.bob_vehicle, slot=self.other_slot, reserve_time=Decimal('2.00')
        )
        self.book(self.alice_vehicle, self.slot)

        detail = self.client.get(reverse('booking-detail', args=[bob_booking.pk]))
        self.assertEqual(detail.status_code, status.HTTP_404_NOT_FOUND)

        listing = self.client.get(reverse('booking-list'))
        self.assertEqual(listing.data['count'], 1)
        self.assertNotIn(bob_booking.pk, [row['id'] for row in listing.data['results']])


@NO_THROTTLE
class BookingCheckoutTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user('alice', 'alice@example.com', 'pw-alice-123')
        self.vehicle = make_vehicle(self.alice, 'ALICE-1')
        self.lot = ParkingLot.objects.create(
            name='Central', address='x', latitude='23.810000', longitude='90.412500'
        )
        self.slot = Slot.objects.create(lot=self.lot, slot_number='A1', is_available=False)
        ParkingRate.objects.create(
            lot=self.lot, vehicle_type=VehicleRegistration.CAR, rate_per_hour=Decimal('10.00')
        )
        self.booking = Booking.objects.create(
            vehicle=self.vehicle,
            slot=self.slot,
            reserve_time=Decimal('2.00'),
            check_in=timezone.now() - timedelta(hours=2),
        )
        Payment.objects.create(booking=self.booking, amount=Decimal('20.00'))
        self.client.force_authenticate(self.alice)

    def test_checkout_completes_the_booking_and_frees_the_slot(self):
        response = self.client.post(reverse('booking-checkout', args=[self.booking.pk]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.booking.refresh_from_db()
        self.slot.refresh_from_db()
        self.assertEqual(self.booking.status, Booking.STATUS_COMPLETED)
        self.assertFalse(self.booking.is_active)
        self.assertIsNotNone(self.booking.check_out)
        self.assertTrue(self.slot.is_available)
        self.assertAlmostEqual(float(response.data['final_amount']), 20.0, delta=0.1)

    def test_second_checkout_is_rejected(self):
        url = reverse('booking-checkout', args=[self.booking.pk])
        self.assertEqual(self.client.post(url).status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.post(url).status_code, status.HTTP_400_BAD_REQUEST)

    def test_checkout_never_overwrites_a_settled_amount(self):
        payment = Payment.objects.get(booking=self.booking)
        payment.paid = True
        payment.amount = Decimal('20.00')
        payment.save(update_fields=['paid', 'amount'])

        self.client.post(reverse('booking-checkout', args=[self.booking.pk]))
        payment.refresh_from_db()
        self.assertEqual(payment.amount, Decimal('20.00'))

    def test_cannot_check_out_another_users_booking(self):
        bob = User.objects.create_user('bob', 'bob@example.com', 'pw-bob-123')
        self.client.force_authenticate(bob)
        response = self.client.post(reverse('booking-checkout', args=[self.booking.pk]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, Booking.STATUS_ACTIVE)
