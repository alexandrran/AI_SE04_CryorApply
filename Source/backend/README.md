# CryorApply Backend

FastAPI service for CV upload, text extraction, and AI-based CV feedback.

## Local Run

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export GEMINI_API_KEY="your-gemini-api-key"
uvicorn app.main:app --reload
```

On Windows PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:GEMINI_API_KEY="your-gemini-api-key"
uvicorn app.main:app --reload
```

## Current Endpoints

- `GET /health` checks that the API is running.
- `POST /api/cv/review` accepts a PDF/DOCX CV file or pasted CV text and returns structured feedback.

## Current Processing Flow

1. The API receives a CV file through multipart form data.
2. The backend validates the file name, file type, and size.
3. PDF files are parsed with `pypdf`.
4. DOCX files are parsed with `python-docx`.
5. If no file is uploaded, the backend reviews the pasted `cv_text` field.
6. Optional `job_description` text is used for role matching.
7. Extracted or pasted text is reviewed with Gemini when `GEMINI_API_KEY` is configured.
8. If Gemini is unavailable or no API key is configured, the backend uses the rule-based analyzer as a fallback.
9. The API returns a JSON response with an overall score, category feedback, job match, priority fixes, rewrite suggestions, and next steps.

The current AI integration is designed for the Gemini API free tier. The
`GEMINI_MODEL` environment variable can be used to override the default model.
