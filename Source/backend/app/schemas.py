from pydantic import BaseModel, Field


class FeedbackItem(BaseModel):
    category: str
    score: int = Field(ge=0, le=100)
    message: str
    suggestions: list[str]


class JobMatch(BaseModel):
    match_score: int = Field(ge=0, le=100)
    strong_matches: list[str] = Field(default_factory=list)
    missing_keywords: list[str] = Field(default_factory=list)
    recommendation: str


class RewriteSuggestion(BaseModel):
    section: str
    before: str
    after: str
    reason: str


class CvReviewResponse(BaseModel):
    filename: str
    overall_score: int = Field(ge=0, le=100)
    summary: str
    feedback: list[FeedbackItem]
    next_steps: list[str]
    priority_fixes: list[str] = Field(default_factory=list)
    rewrite_suggestions: list[RewriteSuggestion] = Field(default_factory=list)
    job_match: JobMatch | None = None


class CvContact(BaseModel):
    email: str = ""
    phone: str = ""
    location: str = ""
    links: list[str] = Field(default_factory=list)


class CvExperienceEntry(BaseModel):
    title: str
    organization: str = ""
    period: str = ""
    bullets: list[str] = Field(default_factory=list)


class CvEducationEntry(BaseModel):
    school: str
    program: str = ""
    period: str = ""
    details: str = ""


class CvProjectEntry(BaseModel):
    name: str
    bullets: list[str] = Field(default_factory=list)


class StructuredCv(BaseModel):
    """A cleaned, re-templated CV produced from the user's original CV."""

    filename: str
    full_name: str
    headline: str = ""
    contact: CvContact = Field(default_factory=CvContact)
    summary: str = ""
    skills: list[str] = Field(default_factory=list)
    experience: list[CvExperienceEntry] = Field(default_factory=list)
    education: list[CvEducationEntry] = Field(default_factory=list)
    projects: list[CvProjectEntry] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)
