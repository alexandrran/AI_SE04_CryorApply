# CryorApply Backend

FastAPI service for CV upload, text extraction, and AI-based CV feedback.

## Local Run

From the repository root:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Add your Gemini key to `.env`:

```text
GEMINI_API_KEY="your-gemini-api-key"
```

Then start the backend:

```bash
cd Source/backend
uvicorn app.main:app --reload
```

On Windows PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Add your Gemini key to `.env`, then:

```powershell
cd Source/backend
uvicorn app.main:app --reload
```

## Current Endpoints

- `GET /health` checks that the API is running.
- `POST /api/cv/review` accepts a PDF/DOCX CV file or pasted CV text and returns structured feedback.
- `POST /api/cv/questions` generates CV-specific follow-up questions before rebuilding.
- `POST /api/cv/rebuild` rebuilds a CV into a clean ATS-friendly structure.
- `POST /api/cover-letter` generates a cover letter from the CV and job description.
- `POST /api/cv/generate` builds a structured CV from form input.
- `GET /api/diagnostics` reports safe runtime diagnostics such as whether a Gemini key is configured.

## Current Processing Flow

1. The API receives a CV file, pasted CV text, or CV builder form data.
2. The backend validates file name, file type, and size where an upload is used.
3. PDF files are parsed with `pypdf`.
4. DOCX files are parsed with `python-docx`.
5. If no file is uploaded, the backend reviews the pasted `cv_text` field.
6. Optional `job_description` text is used for role matching.
7. Extracted or pasted text is sent to Gemini when `GEMINI_API_KEY` is configured.
8. If Gemini is unavailable or no API key is configured, the backend uses rule-based fallbacks.
9. The API returns structured JSON for the frontend to render review results, rebuilt CVs, cover letters, and PDF exports.

The current AI integration is designed for the Gemini API free tier. The
`GEMINI_MODEL` environment variable can be used to override the default model.
