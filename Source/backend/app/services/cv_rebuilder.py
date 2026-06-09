"""Rule-based CV restructuring used when Gemini is not configured.

This is a lightweight fallback: it extracts contact details, detects skills, and
keeps the original content as bullet points. It does not rewrite wording the way
the Gemini path does, so it adds a note telling the user how to get the full
AI rewrite.
"""

import re

from app.schemas import (
    CvContact,
    CvExperienceEntry,
    StructuredCv,
)
from app.services.cv_analyzer import TECHNICAL_KEYWORDS

EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_RE = re.compile(r"\+?\d[\d\s().-]{7,}\d")
URL_RE = re.compile(
    r"(?:https?://|www\.)[^\s,;]+|[\w-]+\.(?:com|io|dev|me|org|net)(?:/[^\s,;]*)?",
    re.IGNORECASE,
)
BULLET_RE = re.compile(r"^\s*[-•*]\s+")


def rebuild_cv_text(
    filename: str,
    cv_text: str,
    job_description: str | None = None,
) -> StructuredCv:
    lines = [line.strip() for line in cv_text.splitlines() if line.strip()]
    text = "\n".join(lines)
    lower = text.lower()

    email_match = EMAIL_RE.search(text)
    phone_match = PHONE_RE.search(text)
    links = []
    for raw in URL_RE.findall(text):
        cleaned = raw.rstrip(").,;")
        if cleaned and cleaned not in links and "@" not in cleaned:
            links.append(cleaned)

    full_name = next(
        (line for line in lines if "@" not in line and not PHONE_RE.search(line)),
        "Your Name",
    )

    skills = [keyword for keyword in TECHNICAL_KEYWORDS if keyword in lower]

    bullets = [BULLET_RE.sub("", line) for line in lines if BULLET_RE.match(line)]
    experience = (
        [CvExperienceEntry(title="Experience", bullets=bullets[:10])]
        if bullets
        else []
    )

    return StructuredCv(
        filename=filename,
        full_name=full_name,
        headline="",
        contact=CvContact(
            email=email_match.group(0) if email_match else "",
            phone=phone_match.group(0).strip() if phone_match else "",
            location="",
            links=links[:3],
        ),
        summary=(
            "Motivated candidate seeking junior or internship roles. "
            "Connect a Gemini API key for a fully rewritten, tailored summary."
        ),
        skills=skills,
        experience=experience,
        education=[],
        projects=[],
        languages=[],
        certifications=[],
        notes=[
            "This CV was restructured with the rule-based fallback. "
            "Add a GEMINI_API_KEY to rewrite the wording and detect sections automatically.",
        ],
    )
