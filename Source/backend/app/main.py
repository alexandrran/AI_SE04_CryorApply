from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import CvReviewResponse
from app.services.cv_analyzer import analyze_cv_text
from app.services.gemini_analyzer import analyze_cv_with_gemini
from app.services.text_extractor import extract_text_from_upload

MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024

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


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/cv/review", response_model=CvReviewResponse)
async def review_cv(
    file: UploadFile | None = File(None),
    cv_text: str | None = Form(None),
    job_description: str | None = Form(None),
) -> CvReviewResponse:
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

    try:
        ai_review = analyze_cv_with_gemini(
            filename=filename,
            cv_text=pasted_cv_text,
            job_description=job_description,
        )
    except Exception:
        ai_review = None

    if ai_review:
        return ai_review

    return analyze_cv_text(
        filename=filename,
        cv_text=pasted_cv_text,
        job_description=job_description,
    )
