from __future__ import annotations

import base64
import binascii
import mimetypes
import uuid

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

MAX_UPLOAD_BYTES = 8 * 1024 * 1024
ALLOWED_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}


class ImageUploadView(APIView):
    """Accepts a base64-encoded image and stores it under MEDIA_ROOT.

    Used anywhere the app needs a plain hosted URL for a photo (pet listing
    photos, vaccination/deworming/neutering proof) without a dedicated model.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        raw_image = request.data.get("image_base64")
        mime_type = str(request.data.get("mime_type") or "image/jpeg").lower()

        if not raw_image:
            return Response(
                {"detail": "image_base64 is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if mime_type not in ALLOWED_MIME_TYPES:
            return Response(
                {"detail": "Unsupported image type. Use JPEG, PNG, or WEBP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if "," in raw_image:
            raw_image = raw_image.split(",", 1)[1]

        try:
            image_bytes = base64.b64decode(raw_image, validate=True)
        except (binascii.Error, ValueError):
            return Response(
                {"detail": "image_base64 is not valid base64 image data."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not image_bytes or len(image_bytes) > MAX_UPLOAD_BYTES:
            return Response(
                {"detail": "Image must be smaller than 8MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        extension = mimetypes.guess_extension(mime_type) or ".jpg"
        filename = f"uploads/{request.user.id}/{uuid.uuid4().hex}{extension}"
        file_path = settings.MEDIA_ROOT / filename
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(image_bytes)

        image_url = request.build_absolute_uri(f"{settings.MEDIA_URL}{filename}")

        return Response({"url": image_url}, status=status.HTTP_201_CREATED)
