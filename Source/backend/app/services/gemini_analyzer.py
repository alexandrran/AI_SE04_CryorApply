import json
import os
from pathlib import Path

from google import genai
from dotenv import load_dotenv

from app.schemas import CvQuestionsResponse, CvReviewResponse, StructuredCv

DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"
MAX_CV_TEXT_CHARS = 12000

CV_REVIEW_SCHEMA = {
    "type": "object",
    "properties": {
        "filename": {"type": "string"},
        "overall_score": {"type": "integer", "minimum": 0, "maximum": 100},
        "summary": {"type": "string"},
        "feedback": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "category": {"type": "string"},
                    "score": {"type": "integer", "minimum": 0, "maximum": 100},
                    "message": {"type": "string"},
                    "suggestions": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                },
                "required": ["category", "score", "message", "suggestions"],
            },
        },
        "next_steps": {
            "type": "array",
            "items": {"type": "string"},
        },
        "priority_fixes": {
            "type": "array",
            "items": {"type": "string"},
        },
        "rewrite_suggestions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "section": {"type": "string"},
                    "before": {"type": "string"},
                    "after": {"type": "string"},
                    "reason": {"type": "string"},
                },
                "required": ["section", "before", "after", "reason"],
            },
        },
        "job_match": {
            "type": "object",
            "properties": {
                "match_score": {"type": "integer", "minimum": 0, "maximum": 100},
                "strong_matches": {
                    "type": "array",
                    "items": {"type": "string"},
                },
                "missing_keywords": {
                    "type": "array",
                    "items": {"type": "string"},
                },
                "recommendation": {"type": "string"},
            },
            "required": ["match_score", "strong_matches", "missing_keywords", "recommendation"],
        },
    },
    "required": [
        "filename",
        "overall_score",
        "summary",
        "feedback",
        "next_steps",
        "priority_fixes",
        "rewrite_suggestions",
        "job_match",
    ],
}


def analyze_cv_with_gemini(
    filename: str,
    cv_text: str,
    job_description: str | None = None,
) -> CvReviewResponse | None:
    project_root = Path(__file__).resolve().parents[4]
    load_dotenv(project_root / ".env")
    load_dotenv()

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
    client = genai.Client(api_key=api_key)
    prompt = build_cv_review_prompt(
        filename,
        cv_text[:MAX_CV_TEXT_CHARS],
        (job_description or "").strip(),
    )

    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_json_schema": CV_REVIEW_SCHEMA,
        },
    )

    review = CvReviewResponse.model_validate_json(response.text)
    review.filename = filename
    return review


def build_cv_review_prompt(filename: str, cv_text: str, job_description: str) -> str:
    job_context = job_description or "No job description was provided."

    return f"""
You are an AI CV reviewer for students and beginner job seekers.

Review the extracted CV text and return practical, constructive feedback.
Focus on:
- structure
- skills
- experience and projects
- formatting and ATS readability
- junior or internship job readiness
- job description matching when a job description is provided

Use exactly four feedback categories:
1. Structure
2. Skills
3. Experience
4. Formatting

For every category, provide:
- score from 0 to 100
- short message
- 2 to 3 specific suggestions

Also provide:
- priority_fixes: the top 3 most important fixes, ordered by impact
- rewrite_suggestions: 2 to 3 concrete before/after rewrites using wording from the CV where possible
- job_match: match score, strong matches, missing keywords, and recommendation

If no job description is provided, set job_match.match_score to 0, keep strong_matches
and missing_keywords empty, and explain that a job description is needed for matching.

Keep the tone clear, supportive, and professional.
Do not invent personal information that is not in the CV.

Filename: {filename}

Target job description:
{job_context}

Extracted CV text:
{cv_text}
"""


CV_REBUILD_SCHEMA = {
    "type": "object",
    "properties": {
        "full_name": {"type": "string"},
        "headline": {"type": "string"},
        "contact": {
            "type": "object",
            "properties": {
                "email": {"type": "string"},
                "phone": {"type": "string"},
                "location": {"type": "string"},
                "links": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["email", "phone", "location", "links"],
        },
        "summary": {"type": "string"},
        "skills": {"type": "array", "items": {"type": "string"}},
        "experience": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "organization": {"type": "string"},
                    "period": {"type": "string"},
                    "bullets": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["title", "organization", "period", "bullets"],
            },
        },
        "education": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "school": {"type": "string"},
                    "program": {"type": "string"},
                    "period": {"type": "string"},
                    "details": {"type": "string"},
                },
                "required": ["school", "program", "period", "details"],
            },
        },
        "projects": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "bullets": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["name", "bullets"],
            },
        },
        "languages": {"type": "array", "items": {"type": "string"}},
        "certifications": {"type": "array", "items": {"type": "string"}},
        "notes": {"type": "array", "items": {"type": "string"}},
    },
    "required": [
        "full_name",
        "headline",
        "contact",
        "summary",
        "skills",
        "experience",
        "education",
        "projects",
        "languages",
        "certifications",
        "notes",
    ],
}


def rebuild_cv_with_gemini(
    filename: str,
    cv_text: str,
    job_description: str | None = None,
    answers: list[dict] | None = None,
) -> StructuredCv | None:
    project_root = Path(__file__).resolve().parents[4]
    load_dotenv(project_root / ".env")
    load_dotenv()

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
    client = genai.Client(api_key=api_key)
    prompt = build_cv_rebuild_prompt(
        cv_text[:MAX_CV_TEXT_CHARS],
        (job_description or "").strip(),
        answers or [],
    )

    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_json_schema": CV_REBUILD_SCHEMA,
        },
    )

    data = json.loads(response.text)
    data["filename"] = filename
    return StructuredCv.model_validate(data)


HARVARD_RESUME_RULES = """
Follow Harvard Career Services resume principles:
- Order sections by importance; within a section use reverse chronological order
  (most recent first). Never start a line or bullet with a date.
- Start every bullet with a strong action verb (Led, Built, Developed,
  Coordinated, Analyzed, Implemented). Use active voice, not passive.
- Be specific and fact-based, not general. Quantify results wherever possible
  (numbers, %, users, time saved, team size). Focus on accomplishments and
  outcomes, not just duties.
- Write to express, not to impress: no flowery language, no slang.
- Never use personal pronouns (I, we, you). No narrative sentences, no photos,
  no age/gender, no references list.
- Always include contact info (email, phone). Keep formatting consistent and the
  content tight enough to fit roughly one page.
- Tailor experiences and skills to the target role; do not force irrelevant
  connections.
"""


def build_cv_rebuild_prompt(
    cv_text: str,
    job_description: str,
    answers: list[dict] | None = None,
) -> str:
    job_context = job_description or "No job description was provided."

    pairs = [
        (str(item.get("question", "")).strip(), str(item.get("answer", "")).strip())
        for item in (answers or [])
    ]
    pairs = [(q, a) for q, a in pairs if a]
    answers_context = (
        "\n".join(f"Q: {question}\nA: {answer}" for question, answer in pairs)
        if pairs
        else "The user did not provide extra details."
    )

    return f"""
You are an expert CV writer for students and beginner job seekers.

Restructure the CV text below into a clean, professional, ATS-friendly CV that a
top university career center would be proud of.
{HARVARD_RESUME_RULES}
Additional strict rules:
- Use real facts from the source CV plus the user's answers below. Treat the
  answers as true new information and weave them in (add metrics, links, missing
  context, new projects). Never invent anything beyond the CV and the answers.
- If a detail is still missing, leave that field empty rather than guessing.
- Put any links from the answers (portfolio, LinkedIn, GitHub) into contact.links,
  keeping links already found in the CV text.
- Organize content into the provided structure: summary, skills, experience,
  education, projects, languages, certifications.
- In "notes", list honest, short warnings about anything still weak or missing.

User's answers to tailored follow-up questions:
{answers_context}

Target job description:
{job_context}

Source CV text:
{cv_text}
"""


CV_QUESTIONS_SCHEMA = {
    "type": "object",
    "properties": {
        "questions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "question": {"type": "string"},
                    "reason": {"type": "string"},
                    "placeholder": {"type": "string"},
                },
                "required": ["id", "question", "reason", "placeholder"],
            },
        },
    },
    "required": ["questions"],
}


def generate_cv_questions_with_gemini(
    filename: str,
    cv_text: str,
    job_description: str | None = None,
) -> CvQuestionsResponse | None:
    project_root = Path(__file__).resolve().parents[4]
    load_dotenv(project_root / ".env")
    load_dotenv()

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
    client = genai.Client(api_key=api_key)
    prompt = build_cv_questions_prompt(
        cv_text[:MAX_CV_TEXT_CHARS],
        (job_description or "").strip(),
    )

    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_json_schema": CV_QUESTIONS_SCHEMA,
        },
    )

    data = json.loads(response.text)
    data["filename"] = filename
    return CvQuestionsResponse.model_validate(data)


def build_cv_questions_prompt(cv_text: str, job_description: str) -> str:
    job_context = job_description or "No job description was provided."

    return f"""
You are an expert career coach following Harvard Career Services resume standards.

Read the CV below and write 4 to 6 specific follow-up questions whose answers
would make THIS CV significantly stronger. Every question must be grounded in
what is actually in (or missing from) this specific CV.

Ask about things like:
- Missing measurable outcomes: ask for concrete numbers on a real project or job
  that currently has none (users, %, revenue, time saved, team size).
- Missing links: if there is no portfolio, GitHub, or LinkedIn and it is relevant
  to the person's field, ask for it.
- Thin detail: if a listed skill, project, or role lacks detail, ask what was
  built and which tools/technologies were used.
- Missing sections: if there is no projects or experience section, ask for
  content to fill it (academic projects, internships, volunteering).
- Target role: if unclear, ask what role or internship they are targeting.

Rules:
- Do NOT ask anything already clearly answered in the CV.
- Reference the actual content when useful (e.g. name the project you mean).
- For each question return: a short slug "id", the "question", a one-line
  "reason" explaining why it helps, and a short example "placeholder" answer.

Target job description:
{job_context}

Source CV text:
{cv_text}
"""
