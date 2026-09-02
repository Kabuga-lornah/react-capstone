from __future__ import annotations

import base64
from typing import Optional, Tuple

import requests
from django.conf import settings


class VisualizationUnavailable(Exception):
    """Raised when the server has no image-generation credentials configured."""


class VisualizationError(Exception):
    """Raised when the image-generation provider fails or returns no image."""


GEMINI_ENDPOINT = (
    "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
)


def _pet_description(pet) -> str:
    traits = ", ".join(pet.personality_traits[:4]) if pet.personality_traits else ""
    species = pet.custom_species or pet.get_species_display() or pet.species
    parts = [
        f"{pet.name}, a {pet.age or 'young'} {pet.gender or ''} {species}".replace("  ", " "),
        f"breed: {pet.breed}" if pet.breed else "",
        f"personality: {traits}" if traits else "",
    ]
    return ", ".join(part.strip() for part in parts if part.strip())


def _fetch_reference_photo(pet) -> Optional[Tuple[bytes, str]]:
    main_image = pet.images.filter(is_main=True).first() or pet.images.first()
    url = getattr(main_image, "image_url", "") or pet.image_url

    if not url:
        return None

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
    except requests.RequestException:
        return None

    content_type = response.headers.get("content-type", "image/jpeg").split(";")[0]
    return response.content, content_type


def generate_pet_in_room(pet, room_image_bytes: bytes, room_mime_type: str) -> Tuple[bytes, str]:
    api_key = getattr(settings, "GEMINI_API_KEY", "")

    if not api_key:
        raise VisualizationUnavailable(
            "Visualization is not configured on the server. Set the GEMINI_API_KEY environment variable."
        )

    prompt = (
        "You are editing a real photo of a customer's living space. "
        f"Add {_pet_description(pet)} naturally into this exact room. "
        "Keep the room, furniture, lighting, and camera angle unchanged. "
        "Place the pet in a plausible spot (on the floor, a rug, or furniture it could actually use) "
        "with realistic scale, shadows, and lighting so it looks like it belongs in the photo. "
        "Return only the edited photo."
    )

    parts = [
        {"text": prompt},
        {
            "inline_data": {
                "mime_type": room_mime_type,
                "data": base64.b64encode(room_image_bytes).decode("ascii"),
            }
        },
    ]

    reference = _fetch_reference_photo(pet)
    if reference:
        reference_bytes, reference_mime_type = reference
        parts.append(
            {
                "inline_data": {
                    "mime_type": reference_mime_type,
                    "data": base64.b64encode(reference_bytes).decode("ascii"),
                }
            }
        )
        parts.append({"text": f"This second photo shows what {pet.name} actually looks like. Match their appearance."})

    model = getattr(settings, "GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image")
    url = GEMINI_ENDPOINT.format(model=model)

    try:
        response = requests.post(
            url,
            headers={
                "x-goog-api-key": api_key,
                "Content-Type": "application/json",
            },
            json={"contents": [{"parts": parts}]},
            timeout=60,
        )
    except requests.RequestException as error:
        raise VisualizationError(f"Could not reach the image generation service: {error}") from error

    if response.status_code != 200:
        raise VisualizationError(
            f"The image generation service returned an error (status {response.status_code})."
        )

    payload = response.json()
    candidates = payload.get("candidates") or []

    for candidate in candidates:
        for part in candidate.get("content", {}).get("parts", []):
            inline_data = part.get("inlineData") or part.get("inline_data")
            if inline_data and inline_data.get("data"):
                image_bytes = base64.b64decode(inline_data["data"])
                mime_type = inline_data.get("mimeType") or inline_data.get("mime_type") or "image/png"
                return image_bytes, mime_type

    raise VisualizationError("The image generation service did not return an image.")
