from __future__ import annotations

import base64
import binascii
import mimetypes
import uuid

from django.conf import settings
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Pet
from .visualization_service import (
    VisualizationError,
    VisualizationUnavailable,
    generate_pet_in_room,
)

MAX_ROOM_IMAGE_BYTES = 8 * 1024 * 1024
ALLOWED_ROOM_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}


class PetRoomVisualizationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        pet = generics.get_object_or_404(Pet, pk=pk)

        raw_image = request.data.get("room_image_base64")
        mime_type = str(request.data.get("mime_type") or "image/jpeg").lower()

        if not raw_image:
            return Response(
                {"detail": "room_image_base64 is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if mime_type not in ALLOWED_ROOM_MIME_TYPES:
            return Response(
                {"detail": "Unsupported image type. Use JPEG, PNG, or WEBP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if "," in raw_image:
            raw_image = raw_image.split(",", 1)[1]

        try:
            room_image_bytes = base64.b64decode(raw_image, validate=True)
        except (binascii.Error, ValueError):
            return Response(
                {"detail": "room_image_base64 is not valid base64 image data."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not room_image_bytes or len(room_image_bytes) > MAX_ROOM_IMAGE_BYTES:
            return Response(
                {"detail": "Room photo must be smaller than 8MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result_bytes, result_mime_type = generate_pet_in_room(
                pet, room_image_bytes, mime_type
            )
        except VisualizationUnavailable as error:
            return Response({"detail": str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except VisualizationError as error:
            return Response({"detail": str(error)}, status=status.HTTP_502_BAD_GATEWAY)

        extension = mimetypes.guess_extension(result_mime_type) or ".png"
        filename = f"room_visualizations/{uuid.uuid4().hex}{extension}"
        file_path = settings.MEDIA_ROOT / filename
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(result_bytes)

        image_url = request.build_absolute_uri(f"{settings.MEDIA_URL}{filename}")

        return Response({"image_url": image_url, "pet_id": pet.id}, status=status.HTTP_200_OK)
