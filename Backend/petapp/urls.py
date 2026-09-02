from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AdminDashboardView,
    AdminPetListView,
    AdminRehomerReviewView,
    AdminUserListView,
    AppTokenObtainPairView,
    ApplicationApproveView,
    ApplicationRejectView,
    ApplicationWithdrawView,
    ApplicationVisitPlanAcceptView,
    ApplicationVisitPlanView,
    AdoptionApplicationCreateView,
    MyApplicationsListView,
    MyPetListView,
    CommunityCommentCreateView,
    CommunityCommentReactionView,
    CommunityPostListCreateView,
    CommunityPostReactionView,
    CommunityPostRepostView,
    ConversationDetailView,
    ConversationListCreateView,
    ConversationMessageCreateView,
    NotificationListView,
    NotificationMarkReadView,
    NotificationUnreadCountView,
    PetCreateView,
    PetDetailView,
    PetListView,
    AuthHeartbeatView,
    GoogleAuthView,
    ProfileView,
    ReceivedApplicationsListView,
    RegisterView,
    RehomerVerificationSubmitView,
    WishlistDeleteView,
    WishlistListCreateView,
)
from .views_reviews import RehomerReviewCreateView, RehomerReviewListView
from .views_soni import SoniChatView
from .views_tts import SpeakView
from .views_uploads import ImageUploadView
from .views_visualization import PetRoomVisualizationView
from .views_vets import NearbyVetClinicsView

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/google/', GoogleAuthView.as_view(), name='auth-google'),
    path('auth/token/', AppTokenObtainPairView.as_view(), name='token-obtain-pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/me/', ProfileView.as_view(), name='auth-me'),
    path('auth/profile/', ProfileView.as_view(), name='auth-profile'),
    path('auth/heartbeat/', AuthHeartbeatView.as_view(), name='auth-heartbeat'),
    path('conversations/', ConversationListCreateView.as_view(), name='conversation-list-create'),
    path('conversations/<int:pk>/', ConversationDetailView.as_view(), name='conversation-detail'),
    path('conversations/<int:pk>/messages/', ConversationMessageCreateView.as_view(), name='conversation-message-create'),
    path('admin/dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('admin/users/', AdminUserListView.as_view(), name='admin-users'),
    path('admin/pets/', AdminPetListView.as_view(), name='admin-pets'),
    path('admin/rehomer-reviews/<int:pk>/', AdminRehomerReviewView.as_view(), name='admin-rehomer-review'),
    path('rehomer/verification/submit/', RehomerVerificationSubmitView.as_view(), name='rehomer-verification-submit'),

    path('pets/', PetListView.as_view(), name='pet-list'),
    path('pets/my/', MyPetListView.as_view(), name='pet-my-list'),
    path('pets/create/', PetCreateView.as_view(), name='pet-create'),
    path('pets/<int:pk>/', PetDetailView.as_view(), name='pet-detail'),
    path('pets/<int:pk>/visualize-room/', PetRoomVisualizationView.as_view(), name='pet-visualize-room'),
    path('vets/nearby/', NearbyVetClinicsView.as_view(), name='vets-nearby'),
    path('uploads/image/', ImageUploadView.as_view(), name='image-upload'),
    path('voice/speak/', SpeakView.as_view(), name='voice-speak'),
    path('soni/chat/', SoniChatView.as_view(), name='soni-chat'),

    path('applications/create/', AdoptionApplicationCreateView.as_view(), name='application-create'),
    path('applications/my/', MyApplicationsListView.as_view(), name='application-my-list'),
    path('applications/received/', ReceivedApplicationsListView.as_view(), name='application-received-list'),
    path('applications/<int:pk>/visit-plan/', ApplicationVisitPlanView.as_view(), name='application-visit-plan'),
    path('applications/<int:pk>/visit-plan/accept/', ApplicationVisitPlanAcceptView.as_view(), name='application-visit-plan-accept'),
    path('applications/<int:pk>/approve/', ApplicationApproveView.as_view(), name='application-approve'),
    path('applications/<int:pk>/reject/', ApplicationRejectView.as_view(), name='application-reject'),
    path('applications/<int:pk>/withdraw/', ApplicationWithdrawView.as_view(), name='application-withdraw'),

    path('reviews/', RehomerReviewListView.as_view(), name='rehomer-review-list'),
    path('reviews/create/', RehomerReviewCreateView.as_view(), name='rehomer-review-create'),

    path('wishlist/', WishlistListCreateView.as_view(), name='wishlist-list-create'),
    path('wishlist/<int:pk>/', WishlistDeleteView.as_view(), name='wishlist-delete'),
    path('notifications/', NotificationListView.as_view(), name='notification-list'),
    path('notifications/unread-count/', NotificationUnreadCountView.as_view(), name='notification-unread-count'),
    path('notifications/<int:pk>/read/', NotificationMarkReadView.as_view(), name='notification-mark-read'),
    path('community/posts/', CommunityPostListCreateView.as_view(), name='community-post-list-create'),
    path('community/posts/<int:pk>/comments/', CommunityCommentCreateView.as_view(), name='community-comment-create'),
    path('community/posts/<int:pk>/reaction/', CommunityPostReactionView.as_view(), name='community-post-reaction'),
    path('community/posts/<int:pk>/repost/', CommunityPostRepostView.as_view(), name='community-post-repost'),
    path('community/comments/<int:pk>/reaction/', CommunityCommentReactionView.as_view(), name='community-comment-reaction'),
    
    # Phase 3: Matching, Quiz, and Personality Endpoints
    path('', include('petapp.urls_phase3')),

    # Phase 4: Voice and conversational assistant endpoints
    path('voice/', include('petapp.urls_phase4')),
]
