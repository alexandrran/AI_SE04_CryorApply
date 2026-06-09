import re

from app.schemas import CvReviewResponse, FeedbackItem, JobMatch, RewriteSuggestion

SECTION_KEYWORDS = {
    "education": ["education", "degree", "university", "college", "school"],
    "skills": ["skills", "technical skills", "technologies", "tools"],
    "experience": ["experience", "employment", "work history", "internship"],
    "projects": ["projects", "portfolio", "coursework", "capstone"],
}

TECHNICAL_KEYWORDS = [
    "python",
    "javascript",
    "typescript",
    "react",
    "fastapi",
    "sql",
    "git",
    "api",
    "html",
    "css",
    "figma",
    "testing",
]

ACTION_VERBS = [
    "built",
    "created",
    "developed",
    "designed",
    "implemented",
    "improved",
    "managed",
    "tested",
    "analyzed",
    "collaborated",
]

STOP_WORDS = {
    "about",
    "with",
    "from",
    "this",
    "that",
    "will",
    "your",
    "have",
    "using",
    "work",
    "role",
    "team",
    "candidate",
    "experience",
    "skills",
}


def analyze_cv_text(
    filename: str,
    cv_text: str,
    job_description: str | None = None,
) -> CvReviewResponse:
    """Rule-based CV review until the AI provider integration is added."""
    normalized_text = cv_text.lower()
    word_count = len(re.findall(r"\b\w+\b", normalized_text))
    sections = {
        name: any(keyword in normalized_text for keyword in keywords)
        for name, keywords in SECTION_KEYWORDS.items()
    }
    found_keywords = [
        keyword for keyword in TECHNICAL_KEYWORDS if keyword in normalized_text
    ]
    action_verb_count = sum(
        1 for verb in ACTION_VERBS if re.search(rf"\b{verb}\b", normalized_text)
    )
    measurable_result_count = len(re.findall(r"\b\d+[%+]?\b", normalized_text))
    bullet_count = normalized_text.count("•") + len(re.findall(r"^\s*[-*]", cv_text, re.MULTILINE))

    structure_score = calculate_score(
        46
        + sum(sections.values()) * 10
        + min(bullet_count, 6) * 2
        + (8 if word_count >= 120 else 0)
    )
    skills_score = calculate_score(
        48
        + (18 if sections["skills"] else 0)
        + min(len(found_keywords), 8) * 4
    )
    experience_score = calculate_score(
        46
        + (14 if sections["experience"] else 0)
        + (14 if sections["projects"] else 0)
        + min(action_verb_count, 5) * 4
        + min(measurable_result_count, 3) * 4
    )
    formatting_score = calculate_score(
        58
        + (12 if bullet_count >= 3 else 0)
        + (12 if 120 <= word_count <= 900 else 0)
        + (8 if "\t" not in cv_text else 0)
    )
    overall_score = round(
        (structure_score + skills_score + experience_score + formatting_score) / 4
    )
    job_match = build_job_match(normalized_text, job_description or "")
    priority_fixes = build_priority_fixes(
        sections,
        found_keywords,
        measurable_result_count,
        job_match,
    )

    return CvReviewResponse(
        filename=filename,
        overall_score=overall_score,
        summary=build_summary(overall_score, sections, found_keywords),
        feedback=[
            FeedbackItem(
                category="Structure",
                score=structure_score,
                message=build_structure_message(sections),
                suggestions=build_structure_suggestions(sections),
            ),
            FeedbackItem(
                category="Skills",
                score=skills_score,
                message=build_skills_message(found_keywords),
                suggestions=build_skills_suggestions(sections["skills"], found_keywords),
            ),
            FeedbackItem(
                category="Experience",
                score=experience_score,
                message=build_experience_message(action_verb_count, measurable_result_count),
                suggestions=build_experience_suggestions(
                    sections["experience"],
                    sections["projects"],
                    measurable_result_count,
                ),
            ),
            FeedbackItem(
                category="Formatting",
                score=formatting_score,
                message=build_formatting_message(word_count, bullet_count),
                suggestions=build_formatting_suggestions(word_count, bullet_count),
            ),
        ],
        next_steps=build_next_steps(sections, found_keywords, measurable_result_count),
        priority_fixes=priority_fixes,
        rewrite_suggestions=build_rewrite_suggestions(sections, found_keywords),
        job_match=job_match,
    )


def calculate_score(value: int) -> int:
    return max(0, min(100, value))


def build_summary(
    overall_score: int,
    sections: dict[str, bool],
    found_keywords: list[str],
) -> str:
    missing_sections = [
        section.title() for section, is_present in sections.items() if not is_present
    ]

    if overall_score >= 80:
        return (
            "The CV has a strong base for junior applications, with clear sections "
            f"and relevant keywords such as {', '.join(found_keywords[:4])}."
        )

    if missing_sections:
        return (
            "The CV is readable, but it needs stronger structure and clearer evidence. "
            f"Missing or weak sections: {', '.join(missing_sections)}."
        )

    return (
        "The CV has the main sections in place, but it should show more specific "
        "skills, project outcomes, and role-related keywords."
    )


def build_structure_message(sections: dict[str, bool]) -> str:
    present_count = sum(sections.values())
    return (
        f"The CV includes {present_count} of 4 expected sections: education, skills, "
        "experience, and projects."
    )


def build_structure_suggestions(sections: dict[str, bool]) -> list[str]:
    suggestions = []
    for section, is_present in sections.items():
        if not is_present:
            suggestions.append(f"Add a clear {section.title()} section.")

    if not suggestions:
        suggestions.append("Keep the strongest skills and projects near the top.")

    return suggestions


def build_skills_message(found_keywords: list[str]) -> str:
    if found_keywords:
        return f"Detected technical keywords: {', '.join(found_keywords[:6])}."

    return "The CV does not show many recognizable technical keywords yet."


def build_skills_suggestions(has_skills_section: bool, found_keywords: list[str]) -> list[str]:
    suggestions = []

    if not has_skills_section:
        suggestions.append("Create a dedicated Skills section.")

    if len(found_keywords) < 4:
        suggestions.append(
            "Add role-specific tools, programming languages, frameworks, and platforms."
        )

    suggestions.append("Match important keywords from the target internship or junior job description.")
    return suggestions


def build_experience_message(action_verb_count: int, measurable_result_count: int) -> str:
    return (
        f"Detected {action_verb_count} action-oriented keywords and "
        f"{measurable_result_count} measurable result indicators."
    )


def build_experience_suggestions(
    has_experience_section: bool,
    has_projects_section: bool,
    measurable_result_count: int,
) -> list[str]:
    suggestions = []

    if not has_experience_section:
        suggestions.append("Add internships, part-time work, volunteering, or team responsibilities.")

    if not has_projects_section:
        suggestions.append("Add academic or personal projects if work experience is limited.")

    if measurable_result_count == 0:
        suggestions.append("Use numbers where possible, such as users, grades, time saved, or project size.")

    suggestions.append("Start bullet points with action verbs and describe the result.")
    return suggestions


def build_formatting_message(word_count: int, bullet_count: int) -> str:
    return f"Extracted about {word_count} words and detected {bullet_count} bullet-style lines."


def build_formatting_suggestions(word_count: int, bullet_count: int) -> list[str]:
    suggestions = []

    if word_count < 120:
        suggestions.append("Add more detail about education, skills, and project outcomes.")
    elif word_count > 900:
        suggestions.append("Shorten the CV so it stays focused for junior applications.")

    if bullet_count < 3:
        suggestions.append("Use concise bullet points to make the CV easier to scan.")

    suggestions.append("Keep formatting simple and ATS-friendly.")
    return suggestions


def build_next_steps(
    sections: dict[str, bool],
    found_keywords: list[str],
    measurable_result_count: int,
) -> list[str]:
    next_steps = []

    if not sections["skills"]:
        next_steps.append("Add a dedicated Skills section with specific technical keywords.")

    if not sections["projects"]:
        next_steps.append("Add projects with technologies used, your role, and outcomes.")

    if len(found_keywords) < 4:
        next_steps.append("Compare the CV with a target job description and add missing keywords.")

    if measurable_result_count == 0:
        next_steps.append("Rewrite experience bullets to include measurable results.")

    if not next_steps:
        next_steps.append("Tailor this CV to one specific internship or junior role before applying.")

    return next_steps


def build_job_match(cv_text: str, job_description: str) -> JobMatch:
    if not job_description.strip():
        return JobMatch(
            match_score=0,
            strong_matches=[],
            missing_keywords=[],
            recommendation="Add a target job description to calculate a CV-to-role match score.",
        )

    job_keywords = extract_keywords(job_description)
    if not job_keywords:
        return JobMatch(
            match_score=0,
            strong_matches=[],
            missing_keywords=[],
            recommendation="The job description is too short to calculate a reliable match score.",
        )

    strong_matches = [keyword for keyword in job_keywords if keyword in cv_text]
    missing_keywords = [keyword for keyword in job_keywords if keyword not in cv_text]
    match_score = round((len(strong_matches) / len(job_keywords)) * 100)

    return JobMatch(
        match_score=match_score,
        strong_matches=strong_matches[:8],
        missing_keywords=missing_keywords[:8],
        recommendation=build_job_match_recommendation(match_score),
    )


def extract_keywords(text: str) -> list[str]:
    words = re.findall(r"\b[a-zA-Z][a-zA-Z0-9+#.-]{2,}\b", text.lower())
    keywords = []

    for word in words:
        normalized_word = word.strip(".,:;()[]{}")
        if len(normalized_word) < 4 or normalized_word in STOP_WORDS:
            continue

        if normalized_word not in keywords:
            keywords.append(normalized_word)

    return keywords[:24]


def build_job_match_recommendation(match_score: int) -> str:
    if match_score >= 75:
        return "The CV is well aligned with the target role. Tailor the summary and project bullets for extra impact."

    if match_score >= 45:
        return "The CV has partial alignment. Add missing role keywords and connect them to projects or experience."

    return "The CV needs stronger tailoring before applying to this role."


def build_priority_fixes(
    sections: dict[str, bool],
    found_keywords: list[str],
    measurable_result_count: int,
    job_match: JobMatch,
) -> list[str]:
    fixes = []

    if job_match.missing_keywords:
        fixes.append(
            "Add missing job keywords where they honestly match your skills: "
            + ", ".join(job_match.missing_keywords[:4])
            + "."
        )

    if not sections["projects"]:
        fixes.append("Add a Projects section with technologies used, your role, and outcomes.")

    if measurable_result_count == 0:
        fixes.append("Rewrite experience and project bullets with measurable results.")

    if len(found_keywords) < 4:
        fixes.append("Expand the Skills section with specific tools, languages, and frameworks.")

    if not sections["experience"]:
        fixes.append("Add internship, team project, volunteering, or coursework experience.")

    if not fixes:
        fixes.append("Tailor the top projects and summary to the exact target role.")

    return fixes[:3]


def build_rewrite_suggestions(
    sections: dict[str, bool],
    found_keywords: list[str],
) -> list[RewriteSuggestion]:
    suggestions = [
        RewriteSuggestion(
            section="Projects",
            before="Worked on a student project.",
            after=(
                "Built a student web application using "
                f"{', '.join(found_keywords[:3]) or 'relevant technologies'}, focusing on clear user flow and structured results."
            ),
            reason="The rewritten version shows technologies, ownership, and project purpose.",
        ),
        RewriteSuggestion(
            section="Experience",
            before="Helped with team tasks.",
            after="Collaborated in a team to implement, test, and document a working software prototype.",
            reason="The rewritten version uses action verbs and explains the contribution.",
        ),
    ]

    if not sections["skills"]:
        suggestions.append(
            RewriteSuggestion(
                section="Skills",
                before="Good computer skills.",
                after="Skills: Python, React, FastAPI, SQL, Git, testing, teamwork.",
                reason="Specific skill names are easier for recruiters and ATS tools to match.",
            )
        )

    return suggestions[:3]
