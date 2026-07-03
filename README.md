# CryorApply - AI CV Reviewer

## Introduction Brief

CryorApply is an AI-based web application for students and beginner job seekers. The project helps users check their CV before applying for jobs or internships. The main idea is to make CV improvement easier and faster for people who do not have much experience with job applications.

## Problem Statement

Many students and beginner job seekers find it hard to make a good CV. They often do not know what information to include, how to describe their skills, or how to make the CV look professional. Because of this, their CVs may look weak and they may have fewer chances to get a job interview.

## Current Implemented Features

- AI CV review for uploaded PDF/DOCX files or pasted CV text.
- Optional job description matching with missing keywords and role-fit feedback.
- Rewrite suggestions with an apply-and-re-score loop for pasted CV text.
- Interactive CV rebuild with tailored follow-up questions.
- ATS-friendly rebuilt CV preview with text-based PDF download.
- Cover letter generator based on the CV and target job description.
- CV builder from scratch for users who do not already have a CV.
- Vercel deployment with the Vite frontend and FastAPI backend in one project.

Production demo:

https://ai-se-04-cryor-apply.vercel.app

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
| 9 June 2026 | Konstantin Shevtsov | Add Vercel serverless deployment: wrap FastAPI in a Python function, build frontend as static, route API via vercel.json |
| 9 June 2026 | Konstantin Shevtsov | Redesign frontend into a step-by-step wizard (CV, target role, review) with framer-motion animations, animated score ring, skeleton loading, and a refreshed visual style |
| 9 June 2026 | Alexandr An | Added apply rewrites and re-score flow: users can apply suggested CV text improvements, re-run the review, and see the score change without changing the CV structure |
| 9 June 2026 | Konstantin Shevtsov | Added Rebuild CV feature: new POST /api/cv/rebuild endpoint restructures an uploaded PDF/DOCX or pasted CV into a clean ATS-friendly template (Gemini with rule-based fallback), with a live preview and downloadable PDF; documented in API.md |
| 9 June 2026 | Konstantin Shevtsov | Made Rebuild CV interactive and Harvard-based: new POST /api/cv/questions generates CV-specific follow-up questions whose answers feed the rebuild; rewriting now follows Harvard Career Services resume rules; added diagnostics endpoint and error logging for the Gemini fallback |
| 9 June 2026 | Maksim Pinchuk | Added Cover Letter generator (POST /api/cover-letter) and CV Builder from scratch (POST /api/cv/generate) with Gemini integration and rule-based fallbacks; added frontend panels for both features with mode tabs; added rebuilt CV PDF export support |
| 25 June 2026 | Konstantin Shevtsov | QA pass over all main features (CV review, questions, rebuild, cover letter, builder) across rule-based and Gemini paths; fixed broken stylesheet wiring (main.jsx imported an accidental duplicate `null.css` instead of the maintained `src/styles.css`, so style edits were silently ignored) and removed the stray file; backend now also loads `.env.local` so the Gemini key works in local dev, with the repeated env-loading deduplicated into a `_load_env()` helper; fixed the Analyze CV button passing the click event as options to `runReview` |
| 03 July 2026 | Alexandr An | Final presentation polish: replaced rebuilt CV export with a text-based PDF instead of a screenshot image, added `.vercelignore` to protect local secrets during deployment, verified production Vercel deployment, and updated documentation for the final demo |

## Deploy to Vercel (serverless)

The app runs on Vercel as a single project: the Vite frontend is built into
static files and the FastAPI backend runs as a Python serverless function.

Relevant files:

- `vercel.json` builds the frontend, declares the Python function, and routes
  `/api/*` and `/health` to the backend.
- `api/index.py` is the serverless entry point; it re-exports the existing
  FastAPI app from `Source/backend/app/main.py` (no code duplication).
- `requirements.txt` (repo root) provides the Python dependencies.
- `.vercelignore` prevents local secrets and development folders from being
  uploaded by Vercel CLI.

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
