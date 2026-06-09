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
    CvQuestion,
    CvQuestionsResponse,
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


def generate_cv_questions(
    filename: str,
    cv_text: str,
    job_description: str | None = None,
) -> CvQuestionsResponse:
    """Rule-based follow-up questions based on gaps detected in the CV."""
    lower = cv_text.lower()
    has_link = bool(URL_RE.search(cv_text))
    has_numbers = bool(re.search(r"\d+%?\b", cv_text))

    questions: list[CvQuestion] = []

    if "linkedin" not in lower:
        questions.append(
            CvQuestion(
                id="linkedin",
                question="What is your LinkedIn profile URL?",
                reason="A LinkedIn link lets recruiters verify and contact you quickly.",
                placeholder="linkedin.com/in/your-name",
            )
        )
    if "github" not in lower:
        questions.append(
            CvQuestion(
                id="github",
                question="Do you have a GitHub profile? Paste the link if so.",
                reason="For technical roles, GitHub shows your real code and projects.",
                placeholder="github.com/yourname",
            )
        )
    if not has_link:
        questions.append(
            CvQuestion(
                id="portfolio",
                question="Do you have a portfolio website or live project links?",
                reason="Live links let employers see your work directly.",
                placeholder="myportfolio.com",
            )
        )
    if not has_numbers:
        questions.append(
            CvQuestion(
                id="metrics",
                question="Can you add numbers to one of your achievements?",
                reason="Quantified results (users, %, time saved) make a CV far stronger.",
                placeholder="e.g. built a tool used by 200+ students",
            )
        )
    if not any(keyword in lower for keyword in ("project", "portfolio")):
        questions.append(
            CvQuestion(
                id="projects",
                question="Describe one project you are proud of: what you built and which tools you used.",
                reason="A strong project section makes up for limited work experience.",
                placeholder="e.g. a React weather app using a public API",
            )
        )
    if not any(keyword in lower for keyword in ("experience", "internship", "work")):
        questions.append(
            CvQuestion(
                id="experience",
                question="Any internships, part-time jobs, volunteering, or team roles to add?",
                reason="Even non-technical experience shows responsibility and teamwork.",
                placeholder="e.g. volunteered organizing a student event",
            )
        )

    questions.append(
        CvQuestion(
            id="target",
            question="What role or internship are you targeting next?",
            reason="Tailoring the CV to a specific role makes it much stronger.",
            placeholder="e.g. Junior Frontend Developer",
        )
    )

    return CvQuestionsResponse(filename=filename, questions=questions[:6])
