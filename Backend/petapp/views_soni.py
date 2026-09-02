from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import PetSerializer
from .soni_ai import SoniError, SoniUnavailable, chat_with_soni


class SoniChatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        message = str(request.data.get("message") or "").strip()

        if not message:
            return Response(
                {"detail": "message is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        history = request.data.get("history")
        if not isinstance(history, list):
            history = []

        language = str(
            request.data.get("language") or request.user.preferred_language or "en"
        ).strip().lower()

        try:
            reply_text, referenced_pets = chat_with_soni(message, history, language)
        except SoniUnavailable as error:
            return Response({"detail": str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except SoniError as error:
            return Response({"detail": str(error)}, status=status.HTTP_502_BAD_GATEWAY)

        pets_data = PetSerializer(referenced_pets, many=True, context={"request": request}).data

        return Response(
            {"reply": reply_text, "referenced_pets": pets_data},
            status=status.HTTP_200_OK,
        )
