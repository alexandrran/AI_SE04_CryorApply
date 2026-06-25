import json
import logging
import os

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import (
    CoverLetterResponse,
    CvBuilderInput,
    CvQuestionsResponse,
    CvReviewResponse,
    StructuredCv,
)
from app.services.cv_analyzer import analyze_cv_text
from app.services.cv_rebuilder import (
    URL_RE,
    build_cv_from_input,
    generate_cover_letter,
    generate_cv_questions,
    rebuild_cv_text,
)
from app.services.gemini_analyzer import (
    analyze_cv_with_gemini,
    build_cv_from_input_with_gemini,
    generate_cover_letter_with_gemini,
    generate_cv_questions_with_gemini,
    rebuild_cv_with_gemini,
)
from app.services.text_extractor import extract_text_from_upload

MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024

logger = logging.getLogger("cryorapply")

app = FastAPI(
    title="CryorApply API",
    description="API for uploading CVs and generating AI-based feedback.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def resolve_cv_text(
    file: UploadFile | None,
    cv_text: str | None,
) -> tuple[str, str]:
    """Return ``(filename, cv_text)`` from an upload or pasted text.

    Validates the file type and size, extracts text from PDF/DOCX uploads, and
    falls back to the pasted ``cv_text``. Raises ``HTTPException`` on bad input.
    """
    pasted_cv_text = (cv_text or "").strip()
    filename = "pasted-cv.txt"

    if file and file.filename:
        filename = file.filename

        if not file.filename.lower().endswith((".pdf", ".docx")):
            raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")

        if file.size and file.size > MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(status_code=413, detail="CV file must be 10 MB or smaller.")

        try:
            pasted_cv_text = await extract_text_from_upload(file)
        except Exception as error:
            raise HTTPException(
                status_code=422,
                detail="Could not extract text from this CV file.",
            ) from error

    if not pasted_cv_text:
        raise HTTPException(
            status_code=400,
            detail="Upload a PDF/DOCX file or paste CV text before starting the review.",
        )

    if not pasted_cv_text.strip():
        raise HTTPException(status_code=422, detail="No readable CV text was found in the file.")

    return filename, pasted_cv_text


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/diagnostics")
def diagnostics() -> dict[str, object]:
    """Temporary debug endpoint: confirms whether the Gemini key reaches the
    running function. Returns booleans/metadata only, never the key value.
    Remove once the deployment is verified."""
    try:
        import importlib.metadata as importlib_metadata

        genai_version = importlib_metadata.version("google-genai")
    except Exception:
        genai_version = "unknown"

    return {
        "gemini_key_present": bool(os.getenv("GEMINI_API_KEY")),
        "gemini_model": os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        "google_genai_version": genai_version,
    }


@app.post("/api/cv/review", response_model=CvReviewResponse)
async def review_cv(
    file: UploadFile | None = File(None),
    cv_text: str | None = Form(None),
    job_description: str | None = Form(None),
) -> CvReviewResponse:
    filename, resolved_text = await resolve_cv_text(file, cv_text)

    try:
        ai_review = analyze_cv_with_gemini(
            filename=filename,
            cv_text=resolved_text,
            job_description=job_description,
        )
    except Exception:
        logger.exception("Gemini review failed; using rule-based fallback")
        ai_review = None

    if ai_review:
        return ai_review

    return analyze_cv_text(
        filename=filename,
        cv_text=resolved_text,
        job_description=job_description,
    )


def merge_extra_links(cv: StructuredCv, extra_links: list[str]) -> StructuredCv:
    """Guarantee user-provided links appear in the CV contact, deduplicated."""
    existing = list(cv.contact.links)
    seen = {link.strip().lower().rstrip("/") for link in existing}

    for link in extra_links:
        key = link.strip().lower().rstrip("/")
        if key and key not in seen:
            existing.append(link.strip())
            seen.add(key)

    cv.contact.links = existing
    return cv


def parse_answers(raw_answers: str | None) -> list[dict]:
    """Parse the answers JSON form field into a list of question/answer dicts."""
    if not raw_answers:
        return []
    try:
        data = json.loads(raw_answers)
    except (ValueError, TypeError):
        logger.warning("Could not parse answers JSON; ignoring")
        return []

    if not isinstance(data, list):
        return []

    parsed = []
    for item in data:
        if not isinstance(item, dict):
            continue
        answer = str(item.get("answer", "")).strip()
        if answer:
            parsed.append(
                {"question": str(item.get("question", "")).strip(), "answer": answer}
            )
    return parsed


@app.post("/api/cv/questions", response_model=CvQuestionsResponse)
async def cv_questions(
    file: UploadFile | None = File(None),
    cv_text: str | None = Form(None),
    job_description: str | None = Form(None),
) -> CvQuestionsResponse:
    """Generate follow-up questions tailored to gaps in the user's CV."""
    filename, resolved_text = await resolve_cv_text(file, cv_text)

    try:
        questions = generate_cv_questions_with_gemini(
            filename=filename,
            cv_text=resolved_text,
            job_description=job_description,
        )
    except Exception:
        logger.exception("Gemini question generation failed; using rule-based fallback")
        questions = None

    if not questions:
        questions = generate_cv_questions(
            filename=filename,
            cv_text=resolved_text,
            job_description=job_description,
        )

    return questions


@app.post("/api/cv/rebuild", response_model=StructuredCv)
async def rebuild_cv(
    file: UploadFile | None = File(None),
    cv_text: str | None = Form(None),
    job_description: str | None = Form(None),
    answers: str | None = Form(None),
) -> StructuredCv:
    """Restructure the user's CV into a clean, ATS-friendly template, using the
    user's answers to tailored follow-up questions to strengthen it."""
    filename, resolved_text = await resolve_cv_text(file, cv_text)
    parsed_answers = parse_answers(answers)
    extra_links = [
        match.rstrip(").,;")
        for item in parsed_answers
        for match in URL_RE.findall(item["answer"])
    ]

    try:
        rebuilt = rebuild_cv_with_gemini(
            filename=filename,
            cv_text=resolved_text,
            job_description=job_description,
            answers=parsed_answers,
        )
    except Exception:
        logger.exception("Gemini rebuild failed; using rule-based fallback")
        rebuilt = None

    if not rebuilt:
        rebuilt = rebuild_cv_text(
            filename=filename,
            cv_text=resolved_text,
            job_description=job_description,
            ai_configured=bool(os.getenv("GEMINI_API_KEY")),
        )

    return merge_extra_links(rebuilt, extra_links)


@app.post("/api/cover-letter", response_model=CoverLetterResponse)
async def cover_letter(
    file: UploadFile | None = File(None),
    cv_text: str | None = Form(None),
    job_description: str | None = Form(None),
) -> CoverLetterResponse:
    """Generate a cover letter tailored to the CV and a target role."""
    if not (job_description or "").strip():
        raise HTTPException(
            status_code=400,
            detail="A job description is required to write a cover letter.",
        )

    _, resolved_text = await resolve_cv_text(file, cv_text)

    try:
        letter = generate_cover_letter_with_gemini(
            cv_text=resolved_text,
            job_description=job_description,
        )
    except Exception:
        logger.exception("Gemini cover letter failed; using template fallback")
        letter = None

    if not letter:
        letter = generate_cover_letter(
            cv_text=resolved_text,
            job_description=job_description,
        )

    return letter


@app.post("/api/cv/generate", response_model=StructuredCv)
def generate_cv(payload: CvBuilderInput) -> StructuredCv:
    """Build a polished CV from scratch using the build-from-scratch form."""
    if not payload.full_name.strip() and not payload.experience and not payload.education:
        raise HTTPException(
            status_code=400,
            detail="Add at least your name and some details to build a CV.",
        )

    try:
        built = build_cv_from_input_with_gemini(payload)
    except Exception:
        logger.exception("Gemini CV build failed; using rule-based fallback")
        built = None

    if not built:
        built = build_cv_from_input(payload)

    return merge_extra_links(built, list(payload.contact.links))
