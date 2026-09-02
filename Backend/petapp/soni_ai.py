from __future__ import annotations

from typing import Dict, List, Tuple

import requests
from django.conf import settings

from .models import Pet

GEMINI_ENDPOINT = (
    "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
)
MAX_PETS_IN_PROMPT = 40
MAX_HISTORY_TURNS = 6

LANGUAGE_NAMES = {
    "en": "English",
    "sw": "Swahili",
    "fr": "French",
    "pt": "Portuguese",
    "ru": "Russian",
}


class SoniUnavailable(Exception):
    """Raised when no Gemini credentials are configured."""


class SoniError(Exception):
    """Raised when Gemini fails to produce a reply."""


def _describe_pet(pet: Pet) -> str:
    species = pet.custom_species or pet.get_species_display()
    traits = ", ".join(pet.personality_traits[:4]) if pet.personality_traits else "unknown personality"
    bits = [
        f"{pet.name} ({species}",
        f"breed: {pet.breed}" if pet.breed else "",
        f"age: {pet.age}" if pet.age else "",
        f"gender: {pet.gender}" if pet.gender else "",
        f"location: {pet.location or pet.city}" if (pet.location or pet.city) else "",
    ]
    header = ", ".join(part for part in bits if part) + ")"
    description = (pet.description or "").strip()[:200]
    return f"- {header}. Personality: {traits}.{(' ' + description) if description else ''}"


def _build_system_instruction(language: str, pets: List[Pet]) -> str:
    language_name = LANGUAGE_NAMES.get(language, "English")
    pet_lines = "\n".join(_describe_pet(pet) for pet in pets) or "(No pets are currently available.)"

    return (
        "You are Soni, a warm, upbeat, knowledgeable AI adoption guide inside a pet adoption "
        "app called My Furry Friends. You help people find a pet to adopt and answer questions "
        "about pet care, adoption, and the animals listed in this app.\n\n"
        f"Always reply in {language_name}, in 2 to 4 short sentences, since your reply is read "
        "aloud - keep it conversational, warm, and easy to follow out loud.\n\n"
        "When you recommend a pet, you MUST only mention pets from the AVAILABLE PETS list "
        "below, and refer to them by their exact name. Never invent a pet that isn't listed. "
        "If nothing in the list fits what the person wants, say so honestly and suggest they "
        "check back later or tell you something else they're open to.\n\n"
        "If someone asks something unrelated to pets, you can answer briefly and kindly, then "
        "gently steer back to helping them find or care for a pet.\n\n"
        f"AVAILABLE PETS:\n{pet_lines}"
    )


def _call_gemini(api_key: str, model: str, system_instruction: str, contents: List[Dict]) -> requests.Response:
    return requests.post(
        GEMINI_ENDPOINT.format(model=model),
        headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
        json={
            "system_instruction": {"parts": [{"text": system_instruction}]},
            "contents": contents,
            "generationConfig": {"temperature": 0.7, "maxOutputTokens": 300},
        },
        timeout=20,
    )


def chat_with_soni(
    message: str,
    history: List[Dict[str, str]],
    language: str = "en",
) -> Tuple[str, List[Pet]]:
    api_key = getattr(settings, "GEMINI_API_KEY", "")

    if not api_key:
        raise SoniUnavailable(
            "Soni's full conversation ability isn't configured on the server. Set the "
            "GEMINI_API_KEY environment variable."
        )

    message = (message or "").strip()

    if not message:
        raise SoniError("No message was provided.")

    available_pets = list(
        Pet.objects.filter(status=Pet.AVAILABLE).order_by("-created_at")[:MAX_PETS_IN_PROMPT]
    )
    system_instruction = _build_system_instruction(language, available_pets)

    contents = []
    for turn in history[-MAX_HISTORY_TURNS:]:
        role = "model" if turn.get("role") == "model" else "user"
        text = str(turn.get("text") or "").strip()
        if text:
            contents.append({"role": role, "parts": [{"text": text}]})

    contents.append({"role": "user", "parts": [{"text": message}]})

    model = getattr(settings, "GEMINI_TEXT_MODEL", "gemini-2.5-flash")

    try:
        response = _call_gemini(api_key, model, system_instruction, contents)
    except requests.RequestException as error:
        raise SoniError(f"Could not reach Soni's AI service: {error}") from error

    if response.status_code != 200:
        raise SoniError(f"Soni's AI service returned an error (status {response.status_code}).")

    payload = response.json()
    candidates = payload.get("candidates") or []

    reply_text = ""
    for candidate in candidates:
        for part in candidate.get("content", {}).get("parts", []):
            if part.get("text"):
                reply_text += part["text"]

    reply_text = reply_text.strip()

    if not reply_text:
        raise SoniError("Soni's AI service did not return a reply.")

    reply_lower = reply_text.lower()
    referenced_pets = [pet for pet in available_pets if pet.name.lower() in reply_lower][:3]

    return reply_text, referenced_pets
