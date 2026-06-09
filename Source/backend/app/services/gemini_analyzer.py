import json
import os
from pathlib import Path

from google import genai
from dotenv import load_dotenv

from app.schemas import CvReviewResponse, StructuredCv

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


def build_cv_rebuild_prompt(cv_text: str, job_description: str) -> str:
    job_context = job_description or "No job description was provided."

    return f"""
You are an expert CV writer for students and beginner job seekers.

Restructure the CV text below into a clean, professional, ATS-friendly CV.

Strict rules:
- Use ONLY real facts from the source CV. Never invent employers, job titles,
  dates, degrees, metrics, or contact details.
- If a detail is missing, leave that field empty rather than guessing.
- Rewrite weak or vague phrasing into concise bullet points that start with
  strong action verbs (Built, Designed, Implemented, Analyzed, Led).
- Extract contact info (email, phone, location, links) when present in the text.
- Write a short professional summary of 2 to 3 sentences. Tailor it to the
  target job description when one is provided.
- Organize content into the provided structure: summary, skills, experience,
  education, projects, languages, certifications.
- In "notes", list honest, short warnings about weak or missing areas
  (for example: no measurable results, no projects section, thin experience).

Keep the tone clear, supportive, and professional.

Target job description:
{job_context}

Source CV text:
{cv_text}
"""
