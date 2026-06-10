"""Accounts URL patterns."""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ApproveUserView,
    ChangePasswordView,
    LoginView,
    LogoutView,
    PasswordResetRequestListView,
    PasswordResetRequestView,
    PasswordResetResolveView,
    PendingApprovalsView,
    RegistrationView,
    UserDetailView,
    UserListCreateView,
    UserProfileView,
)

urlpatterns = [
    path("login/", LoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("profile/", UserProfileView.as_view(), name="user-profile"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("register/", RegistrationView.as_view(), name="auth-register"),
    path("users/", UserListCreateView.as_view(), name="user-list"),
    path("users/<int:pk>/", UserDetailView.as_view(), name="user-detail"),
    path("users/<int:pk>/approve/", ApproveUserView.as_view(), name="user-approve"),
    path("pending-approvals/", PendingApprovalsView.as_view(), name="pending-approvals"),
    path(
        "password-reset-requests/",
        PasswordResetRequestView.as_view(),
        name="password-reset-request",
    ),
    path(
        "password-reset-requests/list/",
        PasswordResetRequestListView.as_view(),
        name="password-reset-request-list",
    ),
    path(
        "password-reset-requests/<int:pk>/resolve/",
        PasswordResetResolveView.as_view(),
        name="password-reset-resolve",
    ),
]
