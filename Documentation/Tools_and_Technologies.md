# Tools and Technologies

## Project

CryorApply is an AI-based CV reviewer and career assistant for students and
beginner job seekers. The application helps users review a CV, compare it with a
job description, apply improvement suggestions, rebuild the CV, generate a cover
letter, and download PDF outputs.

## Current Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React | Builds the user interface and interactive workflow |
| Frontend build tool | Vite | Runs the local development server and builds the frontend for production |
| Styling | CSS | Custom responsive design and page styling |
| Animation | Framer Motion | Smooth transitions, loading states, and score animations |
| Icons | Lucide React | UI icons for buttons, modes, and workflow actions |
| PDF export | jsPDF | Generates downloadable PDF reports and rebuilt CV PDFs |
| Backend | Python, FastAPI | REST API, validation, file processing, and AI orchestration |
| Backend server | Uvicorn | Runs the FastAPI backend locally |
| Data validation | Pydantic | Defines and validates structured API responses |
| PDF text extraction | pypdf | Extracts readable text from PDF CV files |
| DOCX text extraction | python-docx | Extracts readable text from DOCX CV files |
| File upload handling | python-multipart | Supports multipart form-data uploads |
| AI provider | Google Gemini API | Generates CV feedback, job matching, rewrites, rebuilt CVs, and cover letters |
| Environment variables | python-dotenv | Loads local Gemini API configuration from `.env` / `.env.local` |
| Deployment | Vercel | Hosts the Vite frontend and FastAPI backend in one project |
| Version control | Git and GitHub | Source control, team collaboration, and automatic Vercel deployment |

## Frontend

The frontend is located in `Source/frontend`.

It provides:

- CV upload and pasted text input.
- Job description input.
- AI review result page.
- Score and job match display.
- Rewrite suggestions with apply-and-re-score flow.
- Interactive CV rebuild flow.
- Cover letter generator panel.
- CV builder from scratch.
- PDF report and CV downloads.

Main commands:

```bash
cd Source/frontend
npm install
npm run dev
```

For production build:

```bash
npm run build
```

## Backend

The backend is located in `Source/backend`.

It provides these main endpoints:

```text
GET  /health
GET  /api/diagnostics
POST /api/cv/review
POST /api/cv/questions
POST /api/cv/rebuild
POST /api/cover-letter
POST /api/cv/generate
```

Backend responsibilities:

- Validate uploaded PDF/DOCX files.
- Extract text from PDF and DOCX CVs.
- Accept pasted CV text when no file is uploaded.
- Send CV text and job descriptions to Gemini.
- Return structured JSON responses to the frontend.
- Use rule-based fallback logic when Gemini is unavailable.

Main local command:

```bash
cd Source/backend
uvicorn app.main:app --reload
```

## AI Integration

The project uses Google Gemini API as a pre-trained AI model. The team does not
train a custom model from scratch.

Gemini is used for:

- CV review and scoring.
- Feedback by category.
- Job description matching.
- Missing keyword detection.
- Rewrite suggestions.
- Follow-up questions before CV rebuild.
- ATS-friendly CV rebuild.
- Cover letter generation.
- CV generation from builder input.

The backend expects the following environment variable:

```text
GEMINI_API_KEY
```

Optional:

```text
GEMINI_MODEL
```

The default model is:

```text
gemini-2.5-flash
```

## Deployment

The project is deployed on Vercel:

```text
https://ai-se-04-cryor-apply.vercel.app
```

Deployment files:

- `vercel.json`
- `api/index.py`
- `requirements.txt`
- `.vercelignore`

The Vite frontend is built as static files, while the FastAPI backend runs as a
Python serverless function. GitHub integration automatically triggers a new
Vercel deployment when changes are pushed to `main`.

## Security Notes

Local secret files are not committed:

- `.env`
- `.env.local`
- `.venv/`

`.vercelignore` also prevents local secrets and development folders from being
uploaded by Vercel CLI.

## Future Improvements

The following technologies were considered during planning but are not part of
the current final implementation:

- Supabase Auth for user accounts.
- Supabase PostgreSQL for saved review history.
- Supabase Storage for uploaded CV files.
- OCR for scanned PDF files.
- Automated end-to-end testing.

These are future improvements rather than current delivered features.
