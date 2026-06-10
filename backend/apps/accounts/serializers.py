"""Accounts serializers — authentication and user profile."""

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import PasswordResetRequest, User


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user profile data."""

    full_name = serializers.SerializerMethodField()
    employee_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "phone",
            "profile_picture",
            "employee_id",
            "is_active",
            "is_approved",
            "date_joined",
        ]
        read_only_fields = ["id", "date_joined", "full_name", "employee_id", "is_approved"]

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_employee_id(self, obj):
        if obj.employee:
            return obj.employee.employee_id
        return None


class LoginSerializer(serializers.Serializer):
    """Serializer for email/password login."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        user = authenticate(
            request=self.context.get("request"),
            username=email,
            password=password,
        )

        if not user:
            raise serializers.ValidationError(
                "Invalid email or password. Please try again."
            )

        if not user.is_active:
            raise serializers.ValidationError(
                "This account has been deactivated. Contact your administrator."
            )

        if not user.is_approved:
            raise serializers.ValidationError(
                "Your account is pending admin approval. Please wait for an administrator to activate your account."
            )

        attrs["user"] = user
        return attrs


class TokenSerializer(serializers.Serializer):
    """Serializer that returns JWT tokens along with user data."""

    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)
    user = UserSerializer(read_only=True)

    @classmethod
    def get_token_data(cls, user):
        refresh = RefreshToken.for_user(user)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
        }


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing user password."""

    old_password = serializers.CharField(
        write_only=True, style={"input_type": "password"}
    )
    new_password = serializers.CharField(
        write_only=True, style={"input_type": "password"}
    )
    confirm_password = serializers.CharField(
        write_only=True, style={"input_type": "password"}
    )

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "New passwords do not match."}
            )
        validate_password(attrs["new_password"], self.context["request"].user)
        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save()
        return user


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new user accounts (admin)."""

    password = serializers.CharField(
        write_only=True, style={"input_type": "password"}
    )

    class Meta:
        model = User
        fields = [
            "email",
            "first_name",
            "last_name",
            "role",
            "phone",
            "password",
        ]

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.is_approved = True  # admin-created accounts auto-approved
        user.save()
        return user


class RegistrationSerializer(serializers.ModelSerializer):
    """Serializer for public self-registration (requires admin approval)."""

    password = serializers.CharField(
        write_only=True, style={"input_type": "password"}
    )
    confirm_password = serializers.CharField(
        write_only=True, style={"input_type": "password"}
    )

    class Meta:
        model = User
        fields = [
            "email",
            "first_name",
            "last_name",
            "phone",
            "password",
            "confirm_password",
        ]

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("confirm_password"):
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.is_approved = False
        user.save()
        return user


class ApprovalSerializer(serializers.Serializer):
    """Serializer for approving or rejecting a user."""

    action = serializers.ChoiceField(choices=["approve", "reject"])

    def save(self, user, admin_user):
        action = self.validated_data["action"]
        if action == "approve":
            user.is_approved = True
            user.approved_by = admin_user
            user.approved_at = timezone.now()
            user.save()
        return user


class PasswordResetRequestSerializer(serializers.ModelSerializer):
    """Serializer for employees to request a password reset."""

    email = serializers.EmailField(write_only=True, required=False)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = PasswordResetRequest
        fields = [
            "id",
            "email",
            "user_email",
            "user_name",
            "notes",
            "status",
            "requested_at",
            "resolved_at",
        ]
        read_only_fields = ["id", "user_email", "user_name", "requested_at", "resolved_at", "status"]

    def get_user_name(self, obj):
        return obj.user.get_full_name()

    def validate_email(self, value):
        try:
            user = User.objects.get(email=value, is_active=True)
        except User.DoesNotExist:
            raise serializers.ValidationError(
                "No active account found with this email address."
            )
        self.context["target_user"] = user
        return value

    def create(self, validated_data):
        user = self.context["target_user"]
        return PasswordResetRequest.objects.create(
            user=user, notes=validated_data.get("notes", "")
        )


class PasswordResetResolveSerializer(serializers.Serializer):
    """Serializer for admin to approve or reject a password reset request."""

    action = serializers.ChoiceField(choices=["approve", "reject"])
    new_password = serializers.CharField(
        write_only=True, required=False, style={"input_type": "password"}
    )

    def validate(self, attrs):
        if attrs["action"] == "approve" and not attrs.get("new_password"):
            raise serializers.ValidationError(
                {"new_password": "New password is required when approving."}
            )
        if attrs.get("new_password"):
            validate_password(attrs["new_password"])
        return attrs

    def save(self, reset_request, admin_user):
        action = self.validated_data["action"]
        reset_request.status = (
            PasswordResetRequest.Status.APPROVED
            if action == "approve"
            else PasswordResetRequest.Status.REJECTED
        )
        reset_request.resolved_by = admin_user
        reset_request.resolved_at = timezone.now()
        reset_request.save()

        if action == "approve":
            reset_request.user.set_password(self.validated_data["new_password"])
            reset_request.user.save()

        return reset_request
