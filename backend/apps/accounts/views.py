"""Accounts views — authentication and user management."""

from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import PasswordResetRequest, User
from .serializers import (
    ApprovalSerializer,
    ChangePasswordSerializer,
    LoginSerializer,
    PasswordResetRequestSerializer,
    PasswordResetResolveSerializer,
    RegistrationSerializer,
    TokenSerializer,
    UserCreateSerializer,
    UserSerializer,
)
from .permissions import IsAdminUser


class LoginView(APIView):
    """
    POST /api/auth/login/
    Authenticate with email + password, returns JWT tokens and user data.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        token_data = TokenSerializer.get_token_data(user)

        return Response(token_data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Blacklist the refresh token to invalidate the session.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"detail": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {"detail": "Successfully logged out."},
                status=status.HTTP_200_OK,
            )
        except TokenError:
            return Response(
                {"detail": "Invalid or expired token."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/auth/profile/  — Get current user's profile
    PUT  /api/auth/profile/  — Update current user's profile
    """

    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """
    POST /api/auth/change-password/
    Change the authenticated user's password.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": "Password changed successfully."},
            status=status.HTTP_200_OK,
        )


class UserListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/auth/users/  — List all users (Admin only)
    POST /api/auth/users/  — Create a new user (Admin only)
    """

    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = User.objects.all().order_by("email")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return UserCreateSerializer
        return UserSerializer


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/auth/users/<id>/  — Get user details (Admin only)
    PUT    /api/auth/users/<id>/  — Update user (Admin only)
    DELETE /api/auth/users/<id>/  — Delete user (Admin only)
    """

    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = User.objects.all()
    serializer_class = UserSerializer


class RegistrationView(generics.CreateAPIView):
    """
    POST /api/auth/register/
    Public endpoint for new employee self-registration.
    Account is created with is_approved=False until admin approves.
    """

    permission_classes = [AllowAny]
    serializer_class = RegistrationSerializer


class PendingApprovalsView(generics.ListAPIView):
    """
    GET /api/auth/pending-approvals/
    List all unapproved users (Admin only).
    """

    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = UserSerializer
    queryset = User.objects.filter(is_approved=False).order_by("date_joined")


class ApproveUserView(APIView):
    """
    POST /api/auth/users/<pk>/approve/
    Approve or reject a user account (Admin only).
    Body: { "action": "approve" | "reject" }
    """

    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if user.is_approved:
            return Response(
                {"detail": "User is already approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if request.data.get("action") == "reject":
            user.delete()
            return Response(
                {"detail": "User registration rejected and deleted."},
                status=status.HTTP_200_OK,
            )

        serializer = ApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user, request.user)
        return Response(
            {"detail": "User approved successfully.", "user": UserSerializer(user).data},
            status=status.HTTP_200_OK,
        )


class PasswordResetRequestView(generics.CreateAPIView):
    """
    POST /api/auth/password-reset-requests/
    Employee requests an admin password reset.
    """

    permission_classes = [AllowAny]
    serializer_class = PasswordResetRequestSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        # Always return success to avoid email enumeration
        return Response(
            {"detail": "If an account exists with that email, a reset request has been submitted for admin review."},
            status=status.HTTP_201_CREATED,
        )


class PasswordResetRequestListView(generics.ListAPIView):
    """
    GET /api/auth/password-reset-requests/
    List all pending password reset requests (Admin only).
    """

    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = PasswordResetRequestSerializer

    def get_queryset(self):
        status_filter = self.request.query_params.get("status", "PENDING")
        return PasswordResetRequest.objects.filter(status=status_filter).order_by("-requested_at")


class PasswordResetResolveView(APIView):
    """
    POST /api/auth/password-reset-requests/<pk>/resolve/
    Admin approves or rejects a password reset request.
    Body: { "action": "approve", "new_password": "..." }
    """

    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        try:
            reset_request = PasswordResetRequest.objects.get(pk=pk)
        except PasswordResetRequest.DoesNotExist:
            return Response(
                {"detail": "Reset request not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if reset_request.status != PasswordResetRequest.Status.PENDING:
            return Response(
                {"detail": f"This request has already been {reset_request.get_status_display().lower()}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = PasswordResetResolveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(reset_request, request.user)
        return Response(
            {"detail": f"Password reset request {serializer.validated_data['action']}d."},
            status=status.HTTP_200_OK,
        )
