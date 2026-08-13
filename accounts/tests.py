"""Registration validation, profile scoping, auth throttling and admin access."""
import os
from decimal import Decimal
from io import StringIO
from unittest import mock

from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.management import CommandError, call_command
from django.test import TestCase
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.throttling import ScopedRateThrottle

from booking.models import Booking
from parking_lot.models import ParkingLot, Slot
from payment.models import Payment
from vehicle_registration.tests import make_vehicle

# SimpleRateThrottle.THROTTLE_RATES is bound to DEFAULT_THROTTLE_RATES once at
# import time, so override_settings(REST_FRAMEWORK=...) cannot change a rate for
# a view that declares throttle_classes itself. Patch the dict directly instead.
LOOSE_THROTTLE = mock.patch.dict(ScopedRateThrottle.THROTTLE_RATES, {'auth': '1000/min'})
STRICT_THROTTLE = mock.patch.dict(ScopedRateThrottle.THROTTLE_RATES, {'auth': '3/min'})


def registration_payload(**overrides):
    return dict({
        'username': 'alice',
        'email': 'Alice@Example.com',
        'first_name': 'Alice',
        'last_name': 'Ahmed',
        'password': 'v3ry-str0ng-passphrase',
        'password2': 'v3ry-str0ng-passphrase',
    }, **overrides)


class ThrottleCacheMixin:
    def setUp(self):
        super().setUp()
        # DRF keeps rate-limit history in the default cache, which is shared
        # across tests in one process; stale counters make the suite order
        # dependent.
        cache.clear()
        self.addCleanup(cache.clear)


@LOOSE_THROTTLE
class RegistrationTests(ThrottleCacheMixin, APITestCase):
    def setUp(self):
        super().setUp()
        self.url = reverse('auth-register')

    def register(self, **overrides):
        return self.client.post(self.url, registration_payload(**overrides), format='json')

    def test_registration_succeeds_and_normalises_the_email(self):
        response = self.register()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username='alice')
        self.assertEqual(user.email, 'alice@example.com')
        # The response must never echo the password back.
        self.assertNotIn('password', response.data['user'])
        self.assertTrue(user.check_password('v3ry-str0ng-passphrase'))

    def test_password_is_hashed_not_stored_in_clear(self):
        self.register()
        user = User.objects.get(username='alice')
        self.assertNotEqual(user.password, 'v3ry-str0ng-passphrase')
        self.assertTrue(user.password.startswith('pbkdf2_'))

    def test_mismatched_passwords_are_rejected(self):
        response = self.register(password2='something-else-entirely')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)
        self.assertFalse(User.objects.exists())

    def test_password_similar_to_the_username_is_rejected(self):
        # Proves validate_password() receives the candidate user: with user=None
        # UserAttributeSimilarityValidator silently passes anything.
        response = self.register(
            username='alicejohnson',
            password='alicejohnson',
            password2='alicejohnson',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)
        self.assertFalse(User.objects.exists())

    def test_common_and_short_passwords_are_rejected(self):
        for weak in ('password', 'abc12'):
            with self.subTest(password=weak):
                response = self.register(password=weak, password2=weak)
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn('password', response.data)

    def test_duplicate_email_is_rejected_case_insensitively(self):
        self.assertEqual(self.register().status_code, status.HTTP_201_CREATED)
        response = self.register(username='bob', email='ALICE@example.com')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
        self.assertEqual(User.objects.count(), 1)

    def test_duplicate_username_is_rejected(self):
        self.assertEqual(self.register().status_code, status.HTTP_201_CREATED)
        response = self.register(email='other@example.com')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)

    def test_email_is_required(self):
        payload = registration_payload()
        payload.pop('email')
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_a_registered_user_can_log_in(self):
        self.register()
        response = self.client.post(
            reverse('auth-login'),
            {'username': 'alice', 'password': 'v3ry-str0ng-passphrase'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)


@LOOSE_THROTTLE
class ProfileTests(ThrottleCacheMixin, APITestCase):
    def setUp(self):
        super().setUp()
        self.alice = User.objects.create_user('alice', 'alice@example.com', 'pw-alice-123')
        self.bob = User.objects.create_user('bob', 'bob@example.com', 'pw-bob-123')
        self.url = reverse('auth-profile')
        self.client.force_authenticate(self.alice)

    def test_profile_requires_authentication(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_returns_the_requesting_user(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'alice')

    def test_username_cannot_be_changed_through_the_profile(self):
        response = self.client.put(self.url, {'username': 'root'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.alice.refresh_from_db()
        self.assertEqual(self.alice.username, 'alice')

    def test_email_cannot_be_changed_to_one_already_taken(self):
        response = self.client.put(self.url, {'email': 'bob@example.com'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
        self.alice.refresh_from_db()
        self.assertEqual(self.alice.email, 'alice@example.com')

    def test_keeping_your_own_email_is_not_a_duplicate(self):
        response = self.client.put(
            self.url, {'email': 'alice@example.com', 'first_name': 'Alicia'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.alice.refresh_from_db()
        self.assertEqual(self.alice.first_name, 'Alicia')


@STRICT_THROTTLE
class AuthThrottleTests(ThrottleCacheMixin, APITestCase):
    def test_repeated_logins_are_throttled(self):
        User.objects.create_user('alice', 'alice@example.com', 'pw-alice-123')
        url = reverse('auth-login')
        body = {'username': 'alice', 'password': 'wrong-password'}

        for _ in range(3):
            self.assertEqual(
                self.client.post(url, body, format='json').status_code,
                status.HTTP_401_UNAUTHORIZED,
            )
        self.assertEqual(
            self.client.post(url, body, format='json').status_code,
            status.HTTP_429_TOO_MANY_REQUESTS,
        )

    def test_repeated_registrations_are_throttled(self):
        url = reverse('auth-register')
        for index in range(3):
            self.client.post(
                url,
                registration_payload(username=f'user{index}', email=f'user{index}@example.com'),
                format='json',
            )
        response = self.client.post(
            url,
            registration_payload(username='user9', email='user9@example.com'),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)


class EnsureAdminCommandTests(TestCase):
    def run_command(self, **kwargs):
        out = StringIO()
        call_command('ensure_admin', stdout=out, **kwargs)
        return out.getvalue()

    def test_an_administrator_is_created_when_none_exists(self):
        with mock.patch.dict('os.environ', {'DJANGO_SUPERUSER_PASSWORD': 'v3ry-str0ng-passphrase'}):
            output = self.run_command(username='root', email='root@example.com')

        admin_user = User.objects.get(username='root')
        self.assertTrue(admin_user.is_superuser)
        self.assertTrue(admin_user.is_staff)
        self.assertTrue(admin_user.is_active)
        self.assertTrue(admin_user.check_password('v3ry-str0ng-passphrase'))
        self.assertIn('Created administrator', output)

    def test_running_twice_does_not_create_a_second_administrator(self):
        with mock.patch.dict('os.environ', {'DJANGO_SUPERUSER_PASSWORD': 'v3ry-str0ng-passphrase'}):
            self.run_command(username='root', email='root@example.com')
            output = self.run_command(username='root', email='root@example.com')

        self.assertEqual(User.objects.filter(is_superuser=True).count(), 1)
        self.assertIn('already exists', output)

    def test_missing_password_is_an_error_not_a_blank_account(self):
        environ = {k: v for k, v in os.environ.items() if k != 'DJANGO_SUPERUSER_PASSWORD'}
        with mock.patch.dict(os.environ, environ, clear=True):
            with self.assertRaises(CommandError):
                self.run_command(username='root', email='root@example.com')
        self.assertFalse(User.objects.exists())

    def test_a_weak_password_is_rejected(self):
        with mock.patch.dict('os.environ', {'DJANGO_SUPERUSER_PASSWORD': 'password'}):
            with self.assertRaises(CommandError):
                self.run_command(username='root', email='root@example.com')
        self.assertFalse(User.objects.exists())

    def test_promote_grants_full_rights_without_changing_the_password(self):
        member = User.objects.create_user('alice', 'alice@example.com', 'pw-alice-123')
        output = self.run_command(username='alice', promote=True)

        member.refresh_from_db()
        self.assertTrue(member.is_superuser)
        self.assertTrue(member.is_staff)
        self.assertTrue(member.check_password('pw-alice-123'))
        self.assertIn('Promoted', output)


class AdminDashboardTests(TestCase):
    def setUp(self):
        self.admin_user = User.objects.create_superuser(
            'root', 'root@example.com', 'pw-root-12345'
        )
        self.url = reverse('admin:index')

    def test_a_regular_user_cannot_reach_the_dashboard(self):
        User.objects.create_user('alice', 'alice@example.com', 'pw-alice-123')
        self.client.login(username='alice', password='pw-alice-123')
        response = self.client.get(self.url)
        # The admin bounces non-staff back to its own login page.
        self.assertEqual(response.status_code, 302)
        self.assertIn('/admin/login/', response['Location'])

    def test_the_dashboard_renders_metrics_for_an_administrator(self):
        self.client.force_login(self.admin_user)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        dashboard = response.context['dashboard']
        self.assertEqual(dashboard['users']['total'], 1)
        self.assertEqual(dashboard['users']['superusers'], 1)
        self.assertContains(response, 'At a glance')
        self.assertContains(response, 'Revenue collected')

    def test_the_dashboard_survives_an_empty_database(self):
        # Sum() returns NULL with no rows; the money figures must still format.
        self.client.force_login(self.admin_user)
        dashboard = self.client.get(self.url).context['dashboard']
        self.assertEqual(dashboard['payments']['revenue'], Decimal('0.00'))
        self.assertEqual(dashboard['payments']['outstanding'], Decimal('0.00'))
        self.assertEqual(dashboard['slots']['occupancy_pct'], 0)

    def test_the_dashboard_counts_live_records(self):
        lot = ParkingLot.objects.create(
            name='Central', address='x', latitude='23.810000', longitude='90.412500'
        )
        Slot.objects.create(lot=lot, slot_number='A1')
        taken_slot = Slot.objects.create(lot=lot, slot_number='A2', is_available=False)
        alice = User.objects.create_user('alice', 'alice@example.com', 'pw-alice-123')
        booking = Booking.objects.create(
            vehicle=make_vehicle(alice, 'ALICE-1'),
            slot=taken_slot,
            reserve_time=Decimal('2.00'),
        )
        Payment.objects.create(booking=booking, amount=Decimal('20.00'), paid=True)

        self.client.force_login(self.admin_user)
        dashboard = self.client.get(self.url).context['dashboard']

        self.assertEqual(dashboard['lots']['active'], 1)
        self.assertEqual(dashboard['slots']['available'], 1)
        self.assertEqual(dashboard['slots']['occupied'], 1)
        self.assertEqual(dashboard['slots']['occupancy_pct'], 50.0)
        self.assertEqual(dashboard['bookings']['active'], 1)
        self.assertEqual(dashboard['payments']['revenue'], Decimal('20.00'))
        self.assertEqual(dashboard['payments']['outstanding'], Decimal('0.00'))
        self.assertEqual(list(dashboard['recent_bookings']), [booking])
        self.assertEqual([row.booking_count for row in dashboard['busiest_lots']], [1])
