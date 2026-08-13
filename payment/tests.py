"""Regression tests for payment ownership, settlement order and idempotency."""
from decimal import Decimal

from django.contrib.auth.models import User
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from booking.models import Booking
from parking_lot.models import ParkingLot, Slot
from vehicle_registration.tests import NO_THROTTLE, make_vehicle

from .models import Payment


@NO_THROTTLE
class PaymentApiTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user('alice', 'alice@example.com', 'pw-alice-123')
        self.bob = User.objects.create_user('bob', 'bob@example.com', 'pw-bob-123')

        self.lot = ParkingLot.objects.create(
            name='Central', address='x', latitude='23.810000', longitude='90.412500'
        )
        self.alice_payment = self.make_payment(self.alice, 'ALICE-1', 'A1')
        self.bob_payment = self.make_payment(self.bob, 'BOB-1', 'A2')

        self.client.force_authenticate(self.alice)

    def make_payment(self, owner, plate, slot_number):
        vehicle = make_vehicle(owner, plate)
        slot = Slot.objects.create(lot=self.lot, slot_number=slot_number, is_available=False)
        booking = Booking.objects.create(
            vehicle=vehicle, slot=slot, reserve_time=Decimal('2.00')
        )
        return Payment.objects.create(booking=booking, amount=Decimal('20.00'))

    def complete(self, payment):
        booking = payment.booking
        booking.status = Booking.STATUS_COMPLETED
        booking.save(update_fields=['status'])

    def pay(self, payment, **body):
        return self.client.post(
            reverse('payment-confirm', args=[payment.booking_id]),
            dict({'payment_method': Payment.METHOD_CARD}, **body),
            format='json',
        )

    def test_another_users_payment_is_not_readable(self):
        url = reverse('payment-detail', args=[self.bob_payment.booking_id])
        self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND)

    def test_another_users_payment_cannot_be_settled(self):
        self.complete(self.bob_payment)
        response = self.pay(self.bob_payment)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.bob_payment.refresh_from_db()
        self.assertFalse(self.bob_payment.paid)

    def test_payment_before_checkout_is_rejected(self):
        response = self.pay(self.alice_payment)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.alice_payment.refresh_from_db()
        self.assertFalse(self.alice_payment.paid)

    def test_payment_after_checkout_succeeds(self):
        self.complete(self.alice_payment)
        response = self.pay(self.alice_payment, transaction_id='TX-1')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.alice_payment.refresh_from_db()
        self.assertTrue(self.alice_payment.paid)
        self.assertIsNotNone(self.alice_payment.paid_at)
        self.assertEqual(self.alice_payment.payment_method, Payment.METHOD_CARD)
        self.assertEqual(self.alice_payment.transaction_id, 'TX-1')

    def test_double_payment_is_rejected(self):
        self.complete(self.alice_payment)
        self.assertEqual(self.pay(self.alice_payment).status_code, status.HTTP_200_OK)
        second = self.pay(self.alice_payment)
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

    def test_blank_transaction_id_is_stored_as_null(self):
        self.complete(self.alice_payment)
        self.assertEqual(
            self.pay(self.alice_payment, transaction_id='').status_code,
            status.HTTP_200_OK,
        )
        self.alice_payment.refresh_from_db()
        self.assertIsNone(self.alice_payment.transaction_id)

    def test_invalid_payment_method_is_a_400(self):
        self.complete(self.alice_payment)
        response = self.pay(self.alice_payment, payment_method='bitcoin')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('payment_method', response.data)

    def test_history_is_scoped_to_the_owner(self):
        response = self.client.get(reverse('payment-history'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], self.alice_payment.pk)

    def test_staff_sees_every_payment(self):
        staff = User.objects.create_user('root', 'root@example.com', 'pw-root-123', is_staff=True)
        self.client.force_authenticate(staff)
        response = self.client.get(reverse('payment-history'))
        self.assertEqual(response.data['count'], 2)
