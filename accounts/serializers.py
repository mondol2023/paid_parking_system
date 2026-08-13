from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers


class RegisterSerializer(serializers.ModelSerializer):
    # No field-level validators here: password strength has to be checked in
    # validate() with the half-built user, otherwise UserAttributeSimilarity-
    # Validator gets user=None and silently passes every password.
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    password2 = serializers.CharField(
        write_only=True, label="Confirm password", style={'input_type': 'password'}
    )
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'password', 'password2']

    def validate_email(self, value):
        # Django's User.email carries no unique constraint, so duplicates are
        # accepted by default and break any "recover by email" flow.
        normalized = value.strip().lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return normalized

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})

        # Unsaved instance purely so the similarity/common-password validators
        # can compare the password against the username and email.
        candidate = User(
            username=attrs.get('username', ''),
            email=attrs.get('email', ''),
            first_name=attrs.get('first_name', ''),
            last_name=attrs.get('last_name', ''),
        )
        try:
            validate_password(attrs['password'], user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'password': list(exc.messages)})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        return User.objects.create_user(password=password, **validated_data)


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined']
        # username is the login identifier; changing it through the profile
        # endpoint would invalidate the credentials the client holds.
        read_only_fields = ['date_joined', 'username']

    def validate_email(self, value):
        normalized = value.strip().lower()
        queryset = User.objects.filter(email__iexact=normalized)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return normalized