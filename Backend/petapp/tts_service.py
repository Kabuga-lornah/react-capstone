from __future__ import annotations

import base64

import requests
from django.conf import settings

SYNTHESIZE_URL = "https://texttospeech.googleapis.com/v1/text:synthesize"
MAX_TEXT_LENGTH = 2000


class TtsUnavailable(Exception):
    """Raised when no Google Cloud Text-to-Speech credentials are configured."""


class TtsError(Exception):
    """Raised when the Text-to-Speech API fails."""


# A preferred high-quality (Neural2/WaveNet) voice per language, with the
# language code alone kept as a fallback in case a specific voice name is
# retired or unavailable in a given Cloud project/region.
VOICE_BY_LANGUAGE = {
    "en": {"languageCode": "en-US", "name": "en-US-Neural2-F"},
    "sw": {"languageCode": "sw-KE", "name": "sw-KE-Standard-A"},
    "fr": {"languageCode": "fr-FR", "name": "fr-FR-Neural2-C"},
    "pt": {"languageCode": "pt-PT", "name": "pt-PT-Wavenet-A"},
    "ru": {"languageCode": "ru-RU", "name": "ru-RU-Wavenet-E"},
    "de": {"languageCode": "de-DE", "name": "de-DE-Neural2-F"},
    "zh": {"languageCode": "cmn-CN", "name": "cmn-CN-Wavenet-A"},
}


def _get_api_key() -> str:
    return (
        getattr(settings, "GOOGLE_CLOUD_TTS_API_KEY", "")
        or getattr(settings, "GOOGLE_PLACES_API_KEY", "")
    )


def _call_synthesize(api_key: str, text: str, voice: dict) -> requests.Response:
    return requests.post(
        SYNTHESIZE_URL,
        params={"key": api_key},
        json={
            "input": {"text": text},
            "voice": voice,
            "audioConfig": {"audioEncoding": "MP3"},
        },
        timeout=15,
    )


def synthesize_speech(text: str, language: str = "en") -> bytes:
    api_key = _get_api_key()

    if not api_key:
        raise TtsUnavailable(
            "Soni's voice isn't configured on the server. Set GOOGLE_CLOUD_TTS_API_KEY "
            "(or enable the Text-to-Speech API on GOOGLE_PLACES_API_KEY)."
        )

    text = (text or "").strip()[:MAX_TEXT_LENGTH]

    if not text:
        raise TtsError("No text was provided to speak.")

    voice = VOICE_BY_LANGUAGE.get(language, VOICE_BY_LANGUAGE["en"])

    try:
        response = _call_synthesize(api_key, text, voice)

        if response.status_code != 200:
            # The named voice may not exist in this project/region. Fall back
            # to letting Google pick any available voice for the language.
            response = _call_synthesize(
                api_key,
                text,
                {"languageCode": voice["languageCode"], "ssmlGender": "FEMALE"},
            )
    except requests.RequestException as error:
        raise TtsError(f"Could not reach the Text-to-Speech service: {error}") from error

    if response.status_code != 200:
        raise TtsError(
            f"The Text-to-Speech service returned an error (status {response.status_code})."
        )

    audio_content = response.json().get("audioContent")

    if not audio_content:
        raise TtsError("The Text-to-Speech service did not return audio.")

    return base64.b64decode(audio_content)
