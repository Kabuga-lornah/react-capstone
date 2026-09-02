from __future__ import annotations

import re
from typing import Dict, List, Tuple

import requests
from django.conf import settings

from .models import Pet

MAX_MESSAGE_LENGTH = 1000
RECOMMEND_TAG_PATTERN = re.compile(r"\n?RECOMMEND:\s*(.+)\s*$", re.IGNORECASE)

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


def _build_system_instruction(language: str, pets: List[Pet], user_name: str, is_new_conversation: bool) -> str:
    language_name = LANGUAGE_NAMES.get(language, "English")
    pet_lines = "\n".join(_describe_pet(pet) for pet in pets) or "(No pets are currently available.)"
    greeting_note = (
        f"You may address them by name ({user_name}) naturally, but don't force it into every reply."
        if user_name
        else "You don't know their name yet - you can ask for it once, naturally, but don't push it."
    )

    return (
        "You are Soni, a warm, upbeat, emotionally attentive AI adoption guide inside a pet "
        "adoption app called My Furry Friends. You are talking with a specific person right now, "
        f"not a general audience. {greeting_note}\n\n"
        f"Always reply in {language_name}, in 2 to 4 short sentences, since your reply is read "
        "aloud - keep it conversational, warm, and easy to follow out loud. Avoid sounding like a "
        "search engine reading out a list; talk like a thoughtful friend who happens to know every "
        "pet in the shelter personally.\n\n"
        "BE A MATCHMAKER, NOT A SEARCH BOX: if someone's request is broad or you don't yet know "
        "enough to make a genuinely good recommendation (their living space, experience with pets, "
        "other pets or kids at home, activity level), ask ONE short, natural follow-up question "
        "before recommending, instead of dumping options immediately. Once you do know enough, "
        "commit to a specific recommendation with a real reason tied to what they told you - don't "
        "keep asking questions forever.\n\n"
        "When you recommend a pet, you MUST only mention pets from the AVAILABLE PETS list "
        "below, and refer to them by their exact name. Never invent a pet that isn't listed, and "
        "never invent details about a pet that aren't given below. If nothing in the list fits "
        "what the person wants, say so honestly and suggest they check back later or tell you "
        "something else they're open to.\n\n"
        "This app also has a few other features you can mention when it's genuinely relevant "
        "(not every message): a personality-matching quiz, a tool that shows how a specific pet "
        "would look in the adopter's own room using their camera, and a nearby-vet-clinics finder. "
        "Only bring these up naturally, when they'd actually help - e.g. suggest the quiz if someone "
        "is torn between several pets, or the room tool once they seem set on one pet.\n\n"
        "If, and only if, your reply actively recommends one or more specific pets from the list, "
        "add one final line after your spoken reply, in this exact machine-readable format and "
        "nothing else on that line: RECOMMEND: Name1, Name2 (their exact names, comma-separated, "
        "no more than 3). Omit this line entirely if you aren't recommending a specific pet in this "
        "reply (for example, if you're only asking a follow-up question).\n\n"
        "If someone asks something unrelated to pets, you can answer briefly and kindly, then "
        "gently steer back to helping them find or care for a pet."
        + (
            " This is the very start of the conversation - keep your first reply especially "
            "short and inviting.\n\n"
            if is_new_conversation
            else "\n\n"
        )
        + f"AVAILABLE PETS:\n{pet_lines}"
    )


def _call_gemini(api_key: str, model: str, system_instruction: str, contents: List[Dict]) -> requests.Response:
    return requests.post(
        GEMINI_ENDPOINT.format(model=model),
        headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
        json={
            "system_instruction": {"parts": [{"text": system_instruction}]},
            "contents": contents,
            "generationConfig": {"temperature": 0.75, "maxOutputTokens": 400},
        },
        timeout=20,
    )


def _trim_to_last_sentence(text: str) -> str:
    """If a reply was cut off mid-sentence (hit the token limit), trim back to
    the last complete sentence so we never speak or display a dangling half
    thought."""
    for punctuation in (".", "!", "?", "。"):
        index = text.rfind(punctuation)
        if index != -1:
            return text[: index + 1].strip()

    return text.strip()


def chat_with_soni(
    message: str,
    history: List[Dict[str, str]],
    language: str = "en",
    user=None,
) -> Tuple[str, List[Pet]]:
    api_key = getattr(settings, "GEMINI_API_KEY", "")

    if not api_key:
        raise SoniUnavailable(
            "Soni's full conversation ability isn't configured on the server. Set the "
            "GEMINI_API_KEY environment variable."
        )

    message = (message or "").strip()[:MAX_MESSAGE_LENGTH]

    if not message:
        raise SoniError("No message was provided.")

    available_pets = list(
        Pet.objects.filter(status=Pet.AVAILABLE).order_by("-created_at")[:MAX_PETS_IN_PROMPT]
    )
    user_name = (getattr(user, "first_name", "") or "").strip()
    is_new_conversation = len(history) == 0
    system_instruction = _build_system_instruction(language, available_pets, user_name, is_new_conversation)

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
    finish_reason = ""
    for candidate in candidates:
        finish_reason = candidate.get("finishReason", finish_reason)
        for part in candidate.get("content", {}).get("parts", []):
            if part.get("text"):
                reply_text += part["text"]

    reply_text = reply_text.strip()

    if not reply_text:
        raise SoniError("Soni's AI service did not return a reply.")

    if finish_reason == "MAX_TOKENS":
        reply_text = _trim_to_last_sentence(reply_text) or reply_text

    reply_text, referenced_pets = _extract_recommendations(reply_text, available_pets)

    return reply_text, referenced_pets


def _extract_recommendations(reply_text: str, available_pets: List[Pet]) -> Tuple[str, List[Pet]]:
    """Pull out the RECOMMEND: tag Soni is asked to append when she names a
    specific pet, and strip it from the text that gets shown or spoken.
    Falls back to scanning the reply for pet names if the model didn't
    follow the tag format, so a recommendation is never silently dropped."""
    tag_match = RECOMMEND_TAG_PATTERN.search(reply_text)

    if tag_match:
        visible_text = reply_text[: tag_match.start()].strip()
        named = [name.strip().lower() for name in tag_match.group(1).split(",") if name.strip()]
        referenced = [pet for pet in available_pets if pet.name.lower() in named][:3]
        return (visible_text or reply_text), referenced

    reply_lower = reply_text.lower()
    referenced = [pet for pet in available_pets if pet.name.lower() in reply_lower][:3]
    return reply_text, referenced
