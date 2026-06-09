# CryorApply - AI CV Reviewer

## Introduction Brief

CryorApply is an AI-based web application for students and beginner job seekers. The project helps users check their CV before applying for jobs or internships. The main idea is to make CV improvement easier and faster for people who do not have much experience with job applications.

## Problem Statement

Many students and beginner job seekers find it hard to make a good CV. They often do not know what information to include, how to describe their skills, or how to make the CV look professional. Because of this, their CVs may look weak and they may have fewer chances to get a job interview.

## Team and Roles

### Alexandr An - Team Lead / Backend Developer

Responsible for coordinating the team, tracking deadlines, managing GitHub updates, preparing weekly progress notes, backend development, API endpoints, CV upload and processing, and backend support for database and AI service integration.

### Konstantin Shevtsov - AI & Testing Specialist / Frontend Developer

Responsible for AI prompt design, testing CV review quality, preparing sample CVs, improving feedback structure, and helping with frontend development, including user flow and results page integration.

### Mikhail Makarchuk - Frontend Developer / UI/UX Designer

Responsible for designing and developing the user interface, CV upload page, authentication screens, result page layout, and making the website easy to use.

### Maksim Pinchuk - Backend Developer / Data Integration

Responsible for backend logic, PDF/DOCX text extraction, Supabase database and storage integration, authentication backend support, and shared backend implementation tasks with Alexandr An.

# Daily Logs

| Date | Team Member | Updates |
|------|------|------|
| 03 May 2026 | Maksim Pinchuk | Created the initial README file with project details and team roles |
| 03 May 2026 | Alexandr An | Created the GitHub repository for the project |
| 03 May 2026 | Alexandr An | Designed and prepared the project mind map |
| 05 May 2026 | Mikhail Makarchuk | Created the MS Teams group for the project |
| 05 May 2026 | Mikhail Makarchuk | Designed and uploaded the project logo |
| 16 May 2026 | Maksim Pinchuk | Added repository folders: Data, Documentation, Logs, and Source |
| 16 May 2026 | Alexandr An | Created Daily Logs and added them to the README file |
| 16 May 2026 | Konstantin Shevtsov | Prepared the System Design document and workflow structure |
| 18 May 2026 | Alexandr An | Added Problem Analysis and Datasets document |
| 18 May 2026 | Maksim Pinchuk | Added Tools and Technologies document |
| 29 May 2026 | Alexandr An | Updated team roles and responsibilities: Alexandr as Team Lead and Backend, created and added Progress Presentation |
| 29 May 2026 | Maksim Pinchuk | Initialized the backend application, added core project files and dependencies |
| 29 May 2026 | Mikhail Makarchuk | Created and added the frontend part |
| 29 May 2026 | Konstantin Shevtsov | Add API contract and AI prompt documentation |
| 5 June 2026 | Maksim Pinchuk | Extend CORS for frontend on ports 5173 and 5174 and implement rule-based CV analysis and scoring|
| 5 June 2026 | Mikhail Makarchuk | Implemented and styled the CV review upload flow with backend integration, validation, and dynamic result rendering.|
| 5 June 2026 | Alexandr An | Add CV text extraction validation |

## Deploy to Vercel (serverless)

The app runs on Vercel as a single project: the Vite frontend is built into
static files and the FastAPI backend runs as a Python serverless function.

Relevant files:

- `vercel.json` builds the frontend, declares the Python function, and routes
  `/api/*` and `/health` to the backend.
- `api/index.py` is the serverless entry point; it re-exports the existing
  FastAPI app from `Source/backend/app/main.py` (no code duplication).
- `requirements.txt` (repo root) provides the Python dependencies.

Steps:

1. Push the repository to GitHub and import it in Vercel (no framework preset
   needed — `vercel.json` configures the build).
2. In Vercel project settings, add environment variables:
   - `GEMINI_API_KEY` — your Gemini API key (without it, the backend falls back
     to the rule-based analyzer).
   - `GEMINI_MODEL` — optional, defaults to `gemini-2.5-flash`.
3. Deploy. The frontend is served from the project root and calls the API at the
   same origin (`/api/cv/review`, `/health`), so no extra configuration is
   required.

For local development, see `Source/backend/README.md` (backend) and run
`npm run dev` in `Source/frontend` (frontend on port 5173, backend on 8000).

## GitHub Setup

The GitHub repository for the project has been created and is available at:

https://github.com/alexandrran/AI_SE04_CryorApply

## Mind Map

<img width="3421" height="8336" alt="NotebookLM Mind Map (2)" src="https://github.com/user-attachments/assets/47d5d86a-7ec9-4cbd-8fdb-446381ec6b51" />

