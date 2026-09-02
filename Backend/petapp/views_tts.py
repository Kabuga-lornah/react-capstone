from __future__ import annotations

import hashlib
import uuid

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .tts_service import TtsError, TtsUnavailable, synthesize_speech, VOICE_BY_LANGUAGE

SPEECH_CACHE_DIR = "speech"


class SpeakView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        text = str(request.data.get("text") or "").strip()

        if not text:
            return Response(
                {"detail": "text is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        language = str(
            request.data.get("language") or request.user.preferred_language or "en"
        ).strip().lower()

        if language not in VOICE_BY_LANGUAGE:
            language = "en"

        cache_key = hashlib.sha1(f"{language}:{text}".encode("utf-8")).hexdigest()
        filename = f"{SPEECH_CACHE_DIR}/{cache_key}.mp3"
        file_path = settings.MEDIA_ROOT / filename

        if not file_path.exists():
            try:
                audio_bytes = synthesize_speech(text, language)
            except TtsUnavailable as error:
                return Response({"detail": str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            except TtsError as error:
                return Response({"detail": str(error)}, status=status.HTTP_502_BAD_GATEWAY)

            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_bytes(audio_bytes)

        audio_url = request.build_absolute_uri(f"{settings.MEDIA_URL}{filename}")

        return Response({"audio_url": audio_url}, status=status.HTTP_200_OK)
