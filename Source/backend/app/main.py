from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import CvReviewResponse
from app.services.cv_analyzer import analyze_cv_text
from app.services.text_extractor import extract_text_from_upload

app = FastAPI(
    title="CryorApply API",
    description="API for uploading CVs and generating AI-based feedback.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/cv/review", response_model=CvReviewResponse)
async def review_cv(file: UploadFile = File(...)) -> CvReviewResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="CV file is required.")

    if not file.filename.lower().endswith((".pdf", ".docx")):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")

    cv_text = await extract_text_from_upload(file)
    return analyze_cv_text(filename=file.filename, cv_text=cv_text)
