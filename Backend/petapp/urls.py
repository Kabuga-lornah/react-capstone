from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    ApplicationApproveView,
    ApplicationRejectView,
    AdoptionApplicationCreateView,
    MyApplicationsListView,
    MyPetListView,
    NotificationListView,
    NotificationMarkReadView,
    NotificationUnreadCountView,
    PetCreateView,
    PetDetailView,
    PetListView,
    AuthHeartbeatView,
    ProfileView,
    ReceivedApplicationsListView,
    RegisterView,
    RehomerVerificationSubmitView,
    WishlistDeleteView,
    WishlistListCreateView,
)

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/token/', TokenObtainPairView.as_view(), name='token-obtain-pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/me/', ProfileView.as_view(), name='auth-me'),
    path('auth/profile/', ProfileView.as_view(), name='auth-profile'),
    path('auth/heartbeat/', AuthHeartbeatView.as_view(), name='auth-heartbeat'),
    path('rehomer/verification/submit/', RehomerVerificationSubmitView.as_view(), name='rehomer-verification-submit'),

    path('pets/', PetListView.as_view(), name='pet-list'),
    path('pets/my/', MyPetListView.as_view(), name='pet-my-list'),
    path('pets/create/', PetCreateView.as_view(), name='pet-create'),
    path('pets/<int:pk>/', PetDetailView.as_view(), name='pet-detail'),

    path('applications/create/', AdoptionApplicationCreateView.as_view(), name='application-create'),
    path('applications/my/', MyApplicationsListView.as_view(), name='application-my-list'),
    path('applications/received/', ReceivedApplicationsListView.as_view(), name='application-received-list'),
    path('applications/<int:pk>/approve/', ApplicationApproveView.as_view(), name='application-approve'),
    path('applications/<int:pk>/reject/', ApplicationRejectView.as_view(), name='application-reject'),

    path('wishlist/', WishlistListCreateView.as_view(), name='wishlist-list-create'),
    path('wishlist/<int:pk>/', WishlistDeleteView.as_view(), name='wishlist-delete'),
    path('notifications/', NotificationListView.as_view(), name='notification-list'),
    path('notifications/unread-count/', NotificationUnreadCountView.as_view(), name='notification-unread-count'),
    path('notifications/<int:pk>/read/', NotificationMarkReadView.as_view(), name='notification-mark-read'),
]
