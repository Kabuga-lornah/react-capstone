from django.urls import path

from .views_phase4 import VoiceGreetingView, VoiceChatView, VoiceTranscriptionView, VoiceSettingsView

urlpatterns = [
    path('voice/greeting/', VoiceGreetingView.as_view(), name='voice-greeting'),
    path('voice/chat/', VoiceChatView.as_view(), name='voice-chat'),
    path('voice/transcribe/', VoiceTranscriptionView.as_view(), name='voice-transcribe'),
    path('voice/settings/', VoiceSettingsView.as_view(), name='voice-settings'),
]
