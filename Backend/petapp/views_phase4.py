from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Conversation, ConversationMessage, CustomUser, Pet
from .voice_service import VoiceBotService


class VoiceGreetingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        language = request.query_params.get('language') or request.user.preferred_language
        greeting = VoiceBotService.greeting_for_user(request.user, language)

        return Response({
            'language': language,
            'greeting': greeting,
            'supported_languages': ['en', 'fr', 'de', 'pt', 'ru', 'sw'],
        }, status=status.HTTP_200_OK)


class VoiceChatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        message = (request.data.get('message') or '').strip()
        language = request.data.get('language') or request.user.preferred_language
        pet_id = request.data.get('pet_id')

        if not message:
            return Response({'detail': 'Message is required.'}, status=status.HTTP_400_BAD_REQUEST)

        pet = None
        conversation = None
        if pet_id:
            pet = get_object_or_404(Pet, id=pet_id)
            if pet.owner_id and request.user.id == pet.owner_id:
                adopter = request.user
                rehomer = request.user
            else:
                adopter = request.user
                rehomer = pet.owner if pet.owner_id else request.user

            conversation, _ = Conversation.objects.get_or_create(
                pet=pet,
                adopter=adopter,
                rehomer=rehomer,
            )

            ConversationMessage.objects.create(
                conversation=conversation,
                sender=request.user,
                body=message,
            )

        response = VoiceBotService.build_voice_response(
            request.user,
            message=message,
            pet_name=getattr(pet, 'name', None),
            language=language,
        )

        if conversation is not None:
            ConversationMessage.objects.create(
                conversation=conversation,
                sender=getattr(request.user, 'organization', None) or request.user,
                body=response['reply'],
            )
            conversation.save(update_fields=['updated_at'])

        return Response({
            'language': response['language'],
            'greeting': response['greeting'],
            'reply': response['reply'],
            'intent': response['intent'],
            'conversation_id': conversation.id if conversation else None,
            'pet_id': pet.id if pet else None,
        }, status=status.HTTP_200_OK)


class VoiceTranscriptionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        text = (request.data.get('text') or '').strip()
        audio_url = request.data.get('audio_url') or ''

        transcript = text or audio_url
        if not transcript:
            return Response({'detail': 'Text or audio URL is required.'}, status=status.HTTP_400_BAD_REQUEST)

        normalized = transcript.strip()
        return Response({
            'transcript': normalized,
            'normalized': normalized,
            'language': request.data.get('language') or request.user.preferred_language,
        }, status=status.HTTP_200_OK)


class VoiceSettingsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({
            'supported_languages': [
                {'code': code, 'name': name}
                for code, name in sorted(VoiceBotService.__dict__.get('SUPPORTED_LANGUAGES', {}).items())
            ]
        }, status=status.HTTP_200_OK)
