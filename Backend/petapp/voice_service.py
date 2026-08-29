from __future__ import annotations

import re
from typing import Dict, Optional

from django.conf import settings


SUPPORTED_LANGUAGES = {
    'en': 'English',
    'fr': 'Français',
    'de': 'Deutsch',
    'pt': 'Português',
    'ru': 'Русский',
    'sw': 'Swahili',
}


def normalize_language(language: Optional[str]) -> str:
    if not language:
        return 'en'
    value = language.strip().lower()
    return value if value in SUPPORTED_LANGUAGES else 'en'


class VoiceBotService:
    """Lightweight conversational layer for the pet adoption assistant.

    This service intentionally works without external API keys by default so the
    project remains usable in local development. When Google Cloud credentials are
    configured, the same interface can be swapped for actual Speech-to-Text and
    Text-to-Speech providers.
    """

    @staticmethod
    def greeting_for_user(user, language: Optional[str] = None) -> str:
        lang = normalize_language(language or getattr(user, 'preferred_language', 'en'))
        name = (user.get_full_name() or user.username or 'friend').strip() or 'friend'

        messages = {
            'en': f"Hello {name}! I’m your pet adoption guide. I can help you find a companion that fits your lifestyle.",
            'fr': f"Bonjour {name} ! Je suis votre guide pour l’adoption. Je peux vous aider à trouver un compagnon qui correspond à votre style de vie.",
            'de': f"Hallo {name}! Ich bin dein Tieradoptions-Assistent. Ich helfe dir dabei, einen passenden Begleiter zu finden.",
            'pt': f"Olá {name}! Sou o seu guia de adoção de pets. Posso ajudar a encontrar um companheiro que combine com o seu estilo de vida.",
            'ru': f"Привет, {name}! Я ваш помощник по усыновлению животных. Я помогу найти компаньона, который подходит вашему образу жизни.",
            'sw': f"Hujambo {name}! Mimi ni msaidizi wako wa kupenda wanyama. Naweza kukusaidia kupata mwenzi anayefaa maisha yako.",
        }

        return messages.get(lang, messages['en'])

    @staticmethod
    def generate_reply(message: str, user=None, pet_name: Optional[str] = None, language: Optional[str] = None) -> Dict[str, str]:
        text = (message or '').strip()
        lang = normalize_language(language)
        lowered = text.lower()

        if not text:
            reply = "I’m here to help. Tell me what kind of pet or personality you are looking for."
            return {'reply': reply, 'intent': 'clarify', 'language': lang}

        if any(word in lowered for word in ['calm', 'quiet', 'gentle', 'relaxed']):
            suggestion = "A calm companion may be a great match if you prefer a peaceful home and a low-key routine."
        elif any(word in lowered for word in ['energetic', 'active', 'playful', 'runs', 'walk']):
            suggestion = "An energetic pet may suit a home with regular play, walks, and lots of activity."
        elif any(word in lowered for word in ['dog', 'puppy', 'cat', 'kitten']):
            suggestion = "I can narrow the match by energy level, age, home size, and temperament."
        elif any(word in lowered for word in ['young', 'baby', 'puppy', 'kitten']):
            suggestion = "You may want to consider age, training level, and care needs before deciding."
        elif any(word in lowered for word in ['adopt', 'match', 'compatible', 'good fit']):
            suggestion = "Let’s compare your lifestyle and the pet’s personality to find the strongest compatibility."
        elif any(word in lowered for word in ['hello', 'hi', 'hey']):
            suggestion = "I can help with pet matching, adoption questions, or finding the best fit for your home."
        else:
            suggestion = "I can help you compare personality traits, activity level, and home needs to narrow the best match."

        if pet_name:
            suggestion = f"For {pet_name}, {suggestion.lower()}"

        localized = {
            'en': suggestion,
            'fr': "Pour trouver un meilleur ajustement, je compare le style de vie, l’énergie et la personnalité de votre animal idéal.",
            'de': "Ich vergleiche Ihren Lebensstil, die Energie und die Persönlichkeit, um die beste Passform zu finden.",
            'pt': "Para encontrar a melhor combinação, comparo o seu estilo de vida, energia e personalidade com as necessidades do pet.",
            'ru': "Чтобы подобрать идеальную пару, я сопоставляю ваш образ жизни, уровень энергии и характер питомца.",
            'sw': "Ili kupata mwenzi aliye sawa, ninaangalia mtindo wa maisha yako, nguvu za mwili na tabia ya mnyama.",
        }

        reply = localized.get(lang, localized['en'])
        return {'reply': reply, 'intent': 'assistant_reply', 'language': lang}

    @staticmethod
    def build_voice_response(user, message: str, pet_name: Optional[str] = None, language: Optional[str] = None) -> Dict[str, str]:
        lang = normalize_language(language or getattr(user, 'preferred_language', 'en'))
        greeting = VoiceBotService.greeting_for_user(user, lang)
        bot_response = VoiceBotService.generate_reply(message, user=user, pet_name=pet_name, language=lang)
        return {
            'greeting': greeting,
            'reply': bot_response['reply'],
            'intent': bot_response['intent'],
            'language': lang,
        }
