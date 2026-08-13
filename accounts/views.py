from django.db import IntegrityError, transaction

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import RegisterSerializer, UserProfileSerializer


class RegisterView(APIView):
    permission_classes = [AllowAny]
    # Unauthenticated write endpoint: without a scope it would only get the
    # default anon rate, which is shared with every other public read.
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    user = serializer.save()
            except IntegrityError:
                # Two simultaneous signups can both pass the uniqueness check
                # and race to the INSERT; report the clash instead of a 500.
                return Response(
                    {'username': ['A user with that username already exists.']},
                    status=status.HTTP_409_CONFLICT
                )
            return Response(
                {
                    'message': 'Account created successfully.',
                    'user': UserProfileSerializer(user).data,
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ThrottledTokenObtainPairView(TokenObtainPairView):
    """
    Login with the same 'auth' scope as registration. The stock view is
    unauthenticated, so credential stuffing is otherwise unrestricted.
    """
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)