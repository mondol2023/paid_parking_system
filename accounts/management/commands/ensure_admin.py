"""Idempotently guarantee that a full-privilege administrator exists.

`createsuperuser --noinput` fails when the account is already there, which makes
it awkward in deploy scripts and container entrypoints. This command reports the
existing administrators instead, and only creates one when none exist.

Credentials come from the environment (the same variables the stock Django
command reads) so nothing secret ever lands in the repository:

    DJANGO_SUPERUSER_USERNAME   default: admin
    DJANGO_SUPERUSER_EMAIL      default: admin@example.com
    DJANGO_SUPERUSER_PASSWORD   required when an account has to be created
"""
import os

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction


class Command(BaseCommand):
    help = 'Create a superuser if the project has none, or report the existing ones.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            default=os.getenv('DJANGO_SUPERUSER_USERNAME', 'admin'),
            help='Username to create or promote. Defaults to $DJANGO_SUPERUSER_USERNAME.',
        )
        parser.add_argument(
            '--email',
            default=os.getenv('DJANGO_SUPERUSER_EMAIL', 'admin@example.com'),
            help='Email for the account. Defaults to $DJANGO_SUPERUSER_EMAIL.',
        )
        parser.add_argument(
            '--promote',
            action='store_true',
            help='Grant staff + superuser rights to an existing --username account.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        User = get_user_model()
        username = options['username']

        existing = User.objects.filter(is_superuser=True, is_active=True)
        if existing.exists() and not options['promote']:
            names = ', '.join(existing.values_list(User.USERNAME_FIELD, flat=True))
            self.stdout.write(self.style.SUCCESS(f'Administrator already exists: {names}'))
            return

        user = User.objects.filter(**{User.USERNAME_FIELD: username}).first()
        if user is not None:
            # The account is there but lacks rights (or --promote was passed):
            # raise it to a full administrator without touching its password.
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
            user.save(update_fields=['is_staff', 'is_superuser', 'is_active'])
            self.stdout.write(self.style.SUCCESS(
                f'Promoted "{username}" to a full administrator.'
            ))
            return

        password = os.getenv('DJANGO_SUPERUSER_PASSWORD')
        if not password:
            raise CommandError(
                'No administrator exists and DJANGO_SUPERUSER_PASSWORD is not set. '
                'Export it (or run "manage.py createsuperuser") and try again.'
            )

        candidate = User(**{User.USERNAME_FIELD: username, 'email': options['email']})
        try:
            # Validate before hashing so a weak deploy-time password is rejected
            # by the same rules the registration API enforces.
            validate_password(password, user=candidate)
        except ValidationError as exc:
            raise CommandError('DJANGO_SUPERUSER_PASSWORD rejected: ' + ' '.join(exc.messages))

        User.objects.create_superuser(
            **{User.USERNAME_FIELD: username},
            email=options['email'],
            password=password,
        )
        self.stdout.write(self.style.SUCCESS(
            f'Created administrator "{username}" with staff and superuser rights.'
        ))
