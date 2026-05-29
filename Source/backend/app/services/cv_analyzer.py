from app.schemas import CvReviewResponse, FeedbackItem


def analyze_cv_text(filename: str, cv_text: str) -> CvReviewResponse:
    """Temporary deterministic analysis until the real AI integration is added."""
    has_project = "project" in cv_text.lower()
    has_skills = "skills" in cv_text.lower()

    return CvReviewResponse(
        filename=filename,
        overall_score=76 if has_project and has_skills else 68,
        summary=(
            "The CV has a workable structure for a junior candidate, but it needs "
            "stronger evidence of skills, project outcomes, and role-specific keywords."
        ),
        feedback=[
            FeedbackItem(
                category="Structure",
                score=82,
                message="The CV should be easy to scan and ordered around the target role.",
                suggestions=[
                    "Keep education, skills, projects, and experience as separate sections.",
                    "Move the strongest technical projects closer to the top.",
                ],
            ),
            FeedbackItem(
                category="Skills",
                score=74 if has_skills else 62,
                message="Skills are useful only when they are specific and connected to evidence.",
                suggestions=[
                    "Group skills by programming languages, frameworks, tools, and soft skills.",
                    "Match important keywords from the internship or junior job description.",
                ],
            ),
            FeedbackItem(
                category="Experience",
                score=70 if has_project else 58,
                message="Beginner CVs should prove potential through projects and measurable work.",
                suggestions=[
                    "Add bullet points with action verbs and measurable outcomes.",
                    "Include coursework, team projects, hackathons, or volunteering if work experience is limited.",
                ],
            ),
            FeedbackItem(
                category="Formatting",
                score=86,
                message="The document should stay clean, consistent, and ATS-friendly.",
                suggestions=[
                    "Use consistent spacing, headings, and bullet formatting.",
                    "Avoid complex tables or graphics that can break text extraction.",
                ],
            ),
        ],
        next_steps=[
            "Implement real PDF and DOCX text extraction.",
            "Connect this response format to the frontend results page.",
            "Replace deterministic feedback with AI-generated structured JSON.",
        ],
    )
