from __future__ import annotations

from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny

from .models import Notification, RehomerReview
from .serializers import RehomerReviewSerializer
from .views import create_notification


class RehomerReviewCreateView(generics.CreateAPIView):
    serializer_class = RehomerReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        review = serializer.save()

        actor_name = (
            review.reviewer.get_full_name().strip()
            or review.reviewer.username
            or review.reviewer.email
        )
        create_notification(
            recipient=review.rehomer,
            actor=review.reviewer,
            pet=review.pet,
            application=review.application,
            type=Notification.REVIEW_SUBMITTED,
            title=f"New review for {review.pet.name}",
            message=f"{actor_name} left a {review.rating}-star review after adopting {review.pet.name}.",
        )


class RehomerReviewListView(generics.ListAPIView):
    serializer_class = RehomerReviewSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = RehomerReview.objects.select_related('pet', 'reviewer', 'rehomer')

        rehomer_id = self.request.query_params.get('rehomer_id')
        pet_id = self.request.query_params.get('pet_id')

        if not rehomer_id and not pet_id:
            raise ValidationError('Provide a rehomer_id or pet_id query parameter.')

        if rehomer_id:
            queryset = queryset.filter(rehomer_id=rehomer_id)
        if pet_id:
            queryset = queryset.filter(pet_id=pet_id)

        return queryset.order_by('-created_at')
