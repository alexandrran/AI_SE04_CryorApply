import React, { memo, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform
} from "framer-motion";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Download,
  FileDown,
  FileText,
  HelpCircle,
  Keyboard,
  ListChecks,
  Mail,
  PenLine,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  UploadCloud,
  Wand2,
  X
} from "lucide-react";
import "./styles.css";

// In production (Vercel) the API is served from the same origin, so use a
// relative path. In local dev the Vite server (5173) talks to uvicorn (8000).
// Override with VITE_API_BASE_URL when needed.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? "http://127.0.0.1:8000" : "");

const STEPS = [
  { id: "cv", label: "Your CV", hint: "Upload or paste" },
  { id: "role", label: "Target role", hint: "Optional match" },
  { id: "result", label: "Review", hint: "Score and fixes" }
];

const EASE = [0.16, 1, 0.3, 1];

const panelVariants = {
  initial: { opacity: 0, y: 18, filter: "blur(4px)" },
  enter: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -14, filter: "blur(4px)" }
};

const listContainer = {
  enter: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } }
};

const listItem = {
  initial: { opacity: 0, y: 16 },
  enter: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 120, damping: 18 }
  }
};

function toneFor(score) {
  if (score >= 80) return "good";
  if (score >= 60) return "mid";
  return "low";
}

// Isolated, memoized count-up + ring so the animation never re-renders the
// surrounding layout.
const ScoreRing = memo(function ScoreRing({ value, size = 168, label }) {
  const radius = size / 2 - 12;
  const circumference = 2 * Math.PI * radius;
  const count = useMotionValue(0);
  const offset = useTransform(
    count,
    (v) => circumference - (v / 100) * circumference
  );
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.2, ease: EASE });
    const unsubscribe = count.on("change", (v) => setDisplay(Math.round(v)));
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [value, count]);

  const tone = toneFor(value);

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--ring-track)"
          strokeWidth="12"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={`ring-arc tone-${tone}`}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: offset }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="score-ring-value">
        <strong className={`tone-text-${tone}`}>{display}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
});

const Meter = memo(function Meter({ score }) {
  return (
    <div className="meter" aria-hidden="true">
      <motion.div
        className={`tone-bg-${toneFor(score)}`}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: score / 100 }}
        transition={{ type: "spring", stiffness: 90, damping: 18, delay: 0.15 }}
      />
    </div>
  );
});

function Stepper({ activeIndex }) {
  return (
    <nav className="stepper" aria-label="Progress">
      {STEPS.map((step, index) => {
        const state =
          index < activeIndex ? "done" : index === activeIndex ? "active" : "todo";
        return (
          <div className={`step ${state}`} key={step.id}>
            <div className="step-dot">
              {state === "done" ? <Check size={15} strokeWidth={2.5} /> : index + 1}
              {state === "active" ? (
                <motion.span
                  className="step-pulse"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                />
              ) : null}
            </div>
            <div className="step-copy">
              <strong>{step.label}</strong>
              <span>{step.hint}</span>
            </div>
            {index < STEPS.length - 1 ? <span className="step-line" /> : null}
          </div>
        );
      })}
    </nav>
  );
}

function ErrorNote({ message }) {
  if (!message) return null;
  return (
    <motion.p
      className="error-message"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <AlertCircle size={18} />
      {message}
    </motion.p>
  );
}

function App() {
  const fileInputRef = useRef(null);
  const [step, setStep] = useState("cv");
  const [selectedFile, setSelectedFile] = useState(null);
  const [cvText, setCvText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [reviewResult, setReviewResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [scoreDelta, setScoreDelta] = useState(null);
  const [appliedRewriteKeys, setAppliedRewriteKeys] = useState([]);
  const [applyingRewriteKey, setApplyingRewriteKey] = useState("");
  const [rebuiltCv, setRebuiltCv] = useState(null);
  const [cvQuestions, setCvQuestions] = useState([]);
  const [questionAnswers, setQuestionAnswers] = useState({});
  const cvDocRef = useRef(null);

  // Cover letter state
  const [coverLetterJobDesc, setCoverLetterJobDesc] = useState("");
  const [coverLetterResult, setCoverLetterResult] = useState(null);

  // Builder state
  const [builderForm, setBuilderForm] = useState({
    full_name: "",
    target_role: "",
    email: "",
    phone: "",
    location: "",
    links: "",
    summary: "",
    skills: "",
    job_description: "",
    experience: [{ title: "", organization: "", period: "", raw: "" }],
    education: [{ school: "", program: "", period: "", details: "" }],
    projects: [{ name: "", raw: "" }],
    languages: "",
    certifications: ""
  });

  const activeIndex = ["result", "questioning", "questions", "rebuilding", "rebuilt"].includes(step)
    ? 2
    : step === "role" || step === "analyzing"
      ? 1
      : 0;

  const openFilePicker = () => fileInputRef.current?.click();

  const acceptFile = (file) => {
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx"].includes(extension)) {
      setErrorMessage("Only PDF and DOCX files are supported.");
      return;
    }
    setErrorMessage("");
    setSelectedFile(file);
    setCvText("");
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    acceptFile(event.dataTransfer.files?.[0]);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const goToRole = () => {
    if (!selectedFile && !cvText.trim()) {
      setErrorMessage("Upload a CV file or paste CV text to continue.");
      return;
    }
    setErrorMessage("");
    setStep("role");
  };

  const runReview = async ({ cvTextOverride, source = "manual" } = {}) => {
    const pastedCvText = (cvTextOverride ?? cvText).trim();
    const pastedJobDescription = jobDescription.trim();
    const previousScore = reviewResult?.overall_score;

    const formData = new FormData();
    if (selectedFile && !cvTextOverride) {
      formData.append("file", selectedFile);
    } else {
      formData.append("cv_text", pastedCvText);
    }
    if (pastedJobDescription) {
      formData.append("job_description", pastedJobDescription);
    }

    setErrorMessage("");
    setStep("analyzing");

    try {
      const response = await fetch(`${API_BASE_URL}/api/cv/review`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(
          error?.detail ?? "CV review failed. Check that the backend is running."
        );
      }

      const result = await response.json();
      setReviewResult(result);
      if (source === "rewrite" && typeof previousScore === "number") {
        setScoreDelta({
          before: previousScore,
          after: result.overall_score,
          change: result.overall_score - previousScore
        });
      } else {
        setScoreDelta(null);
      }
      setStep("result");
    } catch (error) {
      setErrorMessage(error.message);
      setStep("role");
    } finally {
      setApplyingRewriteKey("");
    }
  };

  const startOver = () => {
    setStep("cv");
    setReviewResult(null);
    setErrorMessage("");
    setScoreDelta(null);
    setAppliedRewriteKeys([]);
    setApplyingRewriteKey("");
    setRebuiltCv(null);
    setCvQuestions([]);
    setQuestionAnswers({});
    setCoverLetterResult(null);
    setCoverLetterJobDesc("");
  };

  // ---- Cover letter ----
  const generateCoverLetter = async () => {
    if (!coverLetterJobDesc.trim()) {
      setErrorMessage("Paste a job description to generate the cover letter.");
      return;
    }
    if (!selectedFile && !cvText.trim()) {
      setErrorMessage("Add your CV first (upload or paste) before generating a cover letter.");
      return;
    }
    setErrorMessage("");
    setStep("generating-cover-letter");
    try {
      const formData = new FormData();
      if (selectedFile) formData.append("file", selectedFile);
      else formData.append("cv_text", cvText.trim());
      formData.append("job_description", coverLetterJobDesc.trim());
      const res = await fetch(`${API_BASE_URL}/api/cover-letter`, { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail ?? "Cover letter generation failed.");
      }
      setCoverLetterResult(await res.json());
      setStep("cover-letter-result");
    } catch (err) {
      setErrorMessage(err.message);
      setStep("cover-letter");
    }
  };

  // ---- CV Builder ----
  const updateBuilderList = (field, index, key, value) => {
    setBuilderForm((prev) => {
      const arr = prev[field].map((item, i) =>
        i === index ? { ...item, [key]: value } : item
      );
      return { ...prev, [field]: arr };
    });
  };

  const addBuilderListItem = (field, template) => {
    setBuilderForm((prev) => ({ ...prev, [field]: [...prev[field], { ...template }] }));
  };

  const removeBuilderListItem = (field, index) => {
    setBuilderForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const generateBuilderCv = async () => {
    if (!builderForm.full_name.trim() && !builderForm.experience[0]?.raw.trim() && !builderForm.education[0]?.school.trim()) {
      setErrorMessage("Add at least your name and some details to build a CV.");
      return;
    }
    setErrorMessage("");
    setStep("rebuilding");
    try {
      const payload = {
        full_name: builderForm.full_name,
        target_role: builderForm.target_role,
        contact: {
          email: builderForm.email,
          phone: builderForm.phone,
          location: builderForm.location,
          links: builderForm.links.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean)
        },
        summary: builderForm.summary,
        skills: builderForm.skills.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean),
        job_description: builderForm.job_description,
        experience: builderForm.experience.filter((e) => e.title || e.raw).map((e) => ({
          title: e.title, organization: e.organization, period: e.period, raw: e.raw
        })),
        education: builderForm.education.filter((e) => e.school || e.program).map((e) => ({
          school: e.school, program: e.program, period: e.period, details: e.details
        })),
        projects: builderForm.projects.filter((p) => p.name || p.raw).map((p) => ({
          name: p.name, raw: p.raw
        })),
        languages: builderForm.languages.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean),
        certifications: builderForm.certifications.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean)
      };
      const res = await fetch(`${API_BASE_URL}/api/cv/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail ?? "CV generation failed.");
      }
      setRebuiltCv(await res.json());
      setStep("rebuilt");
    } catch (err) {
      setErrorMessage(err.message);
      setStep("builder");
    }
  };

  const appendCvInput = (formData) => {
    if (selectedFile) {
      formData.append("file", selectedFile);
    } else {
      formData.append("cv_text", cvText.trim());
    }
    if (jobDescription.trim()) {
      formData.append("job_description", jobDescription.trim());
    }
    return formData;
  };

  const loadQuestions = async () => {
    setErrorMessage("");
    setStep("questioning");

    try {
      const response = await fetch(`${API_BASE_URL}/api/cv/questions`, {
        method: "POST",
        body: appendCvInput(new FormData())
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.detail ?? "Could not prepare questions for this CV.");
      }

      const data = await response.json();
      setCvQuestions(data.questions ?? []);
      setQuestionAnswers({});
      setStep("questions");
    } catch (error) {
      setErrorMessage(error.message);
      setStep("result");
    }
  };

  const rebuildCv = async () => {
    const answers = cvQuestions
      .map((question) => ({
        question: question.question,
        answer: (questionAnswers[question.id] ?? "").trim()
      }))
      .filter((entry) => entry.answer);

    const formData = appendCvInput(new FormData());
    if (answers.length) {
      formData.append("answers", JSON.stringify(answers));
    }

    setErrorMessage("");
    setStep("rebuilding");

    try {
      const response = await fetch(`${API_BASE_URL}/api/cv/rebuild`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(
          error?.detail ?? "Could not rebuild the CV. Check that the backend is running."
        );
      }

      setRebuiltCv(await response.json());
      setStep("rebuilt");
    } catch (error) {
      setErrorMessage(error.message);
      setStep("questions");
    }
  };

  // Pixel-perfect export: rasterize the exact preview node the user sees, then
  // paginate it across A4 pages so the PDF matches the web 1:1.
  const downloadRebuiltCv = async () => {
    const node = cvDocRef.current;
    if (!node || !rebuiltCv) return;

    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // Fit the whole CV onto a single A4 page (scale down if it is taller).
      let renderW = pageW;
      let renderH = (canvas.height * renderW) / canvas.width;
      if (renderH > pageH) {
        renderH = pageH;
        renderW = (canvas.width * renderH) / canvas.height;
      }
      const offsetX = (pageW - renderW) / 2;
      const offsetY = 0;

      pdf.addImage(imgData, "PNG", offsetX, offsetY, renderW, renderH);

      // Overlay real, clickable PDF links on top of the rasterized anchors.
      const nodeRect = node.getBoundingClientRect();
      const scaleX = renderW / nodeRect.width;
      const scaleY = renderH / nodeRect.height;
      node.querySelectorAll("a[href]").forEach((anchor) => {
        const rect = anchor.getBoundingClientRect();
        pdf.link(
          offsetX + (rect.left - nodeRect.left) * scaleX,
          offsetY + (rect.top - nodeRect.top) * scaleY,
          rect.width * scaleX,
          rect.height * scaleY,
          { url: anchor.href }
        );
      });

      const safeName = (rebuiltCv.full_name || "cv")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      pdf.save(`${safeName || "cryorapply"}-cv.pdf`);
    } catch (error) {
      setErrorMessage("Could not create the CV PDF in this browser.");
    }
  };

  const applyRewrite = async (item) => {
    if (!cvText.trim()) {
      setErrorMessage("Apply rewrites works with pasted CV text. Paste the CV text first, then run the review again.");
      return;
    }

    const rewriteKey = `${item.section}-${item.before}-${item.after}`;
    const updatedText = applyRewriteToCvText(cvText, item);

    if (updatedText === cvText) {
      setErrorMessage("Could not find a matching CV line to rewrite without changing the CV structure.");
      return;
    }

    setErrorMessage("");
    setApplyingRewriteKey(rewriteKey);
    setAppliedRewriteKeys((keys) => Array.from(new Set([...keys, rewriteKey])));
    setCvText(updatedText);
    clearSelectedFile();
    await runReview({ cvTextOverride: updatedText, source: "rewrite" });
  };

  const downloadReport = () => {
    if (!reviewResult) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 16;
    const maxWidth = pageWidth - margin * 2;
    let y = 18;

    const addText = (text, size = 11, style = "normal", gap = 7) => {
      doc.setFont("helvetica", style);
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, maxWidth);
      if (y + lines.length * gap > pageHeight - margin) {
        doc.addPage();
        y = 18;
      }
      doc.text(lines, margin, y);
      y += lines.length * gap;
    };

    addText("CryorApply CV Review Report", 18, "bold", 9);
    addText(`File: ${reviewResult.filename}`, 10);
    addText(`Overall score: ${reviewResult.overall_score}/100`, 14, "bold", 8);
    addText(reviewResult.summary, 11);

    if (reviewResult.job_match) {
      addText("Job Match", 14, "bold", 8);
      addText(`Match score: ${reviewResult.job_match.match_score}/100`);
      addText(`Strong matches: ${reviewResult.job_match.strong_matches.join(", ") || "None yet"}`);
      addText(`Missing keywords: ${reviewResult.job_match.missing_keywords.join(", ") || "None detected"}`);
      addText(reviewResult.job_match.recommendation);
    }

    if (reviewResult.priority_fixes?.length) {
      addText("Priority Fixes", 14, "bold", 8);
      reviewResult.priority_fixes.forEach((fix, index) => addText(`${index + 1}. ${fix}`));
    }

    addText("Category Feedback", 14, "bold", 8);
    reviewResult.feedback.forEach((item) => {
      addText(`${item.category}: ${item.score}/100`, 12, "bold");
      addText(item.message);
      item.suggestions.forEach((suggestion) => addText(`- ${suggestion}`));
    });

    if (reviewResult.rewrite_suggestions?.length) {
      addText("Rewrite Suggestions", 14, "bold", 8);
      reviewResult.rewrite_suggestions.forEach((item) => {
        addText(item.section, 12, "bold");
        addText(`Before: ${item.before}`);
        addText(`After: ${item.after}`);
        addText(`Why: ${item.reason}`);
      });
    }

    try {
      const pdfBlob = doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `cryorapply-cv-review-${timestamp}.pdf`;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setErrorMessage("Could not create the PDF report in this browser.");
    }
  };

  return (
    <div className="shell">
      <aside className="rail">
        <div className="rail-glow" aria-hidden="true" />
        <div className="brand">
          <span className="brand-mark">
            <Sparkles size={18} strokeWidth={2} />
          </span>
          <div>
            <strong>CryorApply</strong>
            <span>AI CV review</span>
          </div>
        </div>

        <Stepper activeIndex={activeIndex} />

        <p className="rail-foot">
          Built for students and first job seekers. Get a structured score and
          concrete fixes before you apply.
        </p>
      </aside>

      <main className="stage">
        <AnimatePresence mode="wait">
          {step === "cv" ? (
            <motion.section
              key="cv"
              className="panel"
              variants={panelVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              transition={{ duration: 0.4, ease: EASE }}
            >
              <header className="panel-head">
                <p className="eyebrow">Step 1</p>
                <h1>Add your CV</h1>
                <p className="lead">
                  Drop a PDF or DOCX file, or paste the text directly. Nothing is
                  stored after the review.
                </p>
              </header>

              <div className="mode-tabs">
                <button className="mode-tab active" type="button">
                  <FileText size={16} /> Review CV
                </button>
                <button className="mode-tab" type="button" onClick={() => { setErrorMessage(""); setStep("cover-letter"); }}>
                  <Mail size={16} /> Cover Letter
                </button>
                <button className="mode-tab" type="button" onClick={() => { setErrorMessage(""); setStep("builder"); }}>
                  <Plus size={16} /> Build from scratch
                </button>
              </div>

              <input
                ref={fileInputRef}
                className="file-input"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => acceptFile(event.target.files?.[0])}
              />

              <motion.button
                type="button"
                className={`dropzone ${isDragging ? "is-drag" : ""} ${selectedFile ? "is-ready" : ""}`}
                onClick={openFilePicker}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                whileTap={{ scale: 0.99 }}
              >
                <motion.span
                  className="dropzone-icon"
                  animate={{ y: isDragging ? -6 : 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 14 }}
                >
                  {selectedFile ? <CheckCircle2 size={30} /> : <UploadCloud size={30} />}
                </motion.span>
                <strong>{selectedFile ? selectedFile.name : "Drop CV here or browse"}</strong>
                <span>{selectedFile ? "Ready for review" : "PDF or DOCX, up to 10 MB"}</span>
              </motion.button>

              {selectedFile ? (
                <button className="text-link" type="button" onClick={clearSelectedFile}>
                  <X size={14} /> Remove file and paste text instead
                </button>
              ) : null}

              <label className="field-block">
                <span>
                  <Keyboard size={16} /> Or paste CV text
                </span>
                <textarea
                  value={cvText}
                  onChange={(event) => {
                    setCvText(event.target.value);
                    if (event.target.value) clearSelectedFile();
                  }}
                  placeholder="Paste your CV text here if you prefer not to upload a file."
                  rows={5}
                  disabled={Boolean(selectedFile)}
                />
              </label>

              <ErrorNote message={errorMessage} />

              <div className="panel-actions end">
                <button className="primary" type="button" onClick={goToRole}>
                  Continue <ArrowRight size={18} />
                </button>
              </div>
            </motion.section>
          ) : null}

          {step === "role" ? (
            <motion.section
              key="role"
              className="panel"
              variants={panelVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              transition={{ duration: 0.4, ease: EASE }}
            >
              <header className="panel-head">
                <p className="eyebrow">Step 2</p>
                <h1>Target role</h1>
                <p className="lead">
                  Paste a job description to score how well your CV matches it. You
                  can skip this and review the CV on its own.
                </p>
              </header>

              <label className="field-block">
                <span>
                  <BriefcaseBusiness size={16} /> Job description (optional)
                </span>
                <textarea
                  value={jobDescription}
                  onChange={(event) => setJobDescription(event.target.value)}
                  placeholder="Paste an internship or junior role description for match scoring."
                  rows={8}
                />
              </label>

              <ErrorNote message={errorMessage} />

              <div className="panel-actions between">
                <button className="ghost" type="button" onClick={() => setStep("cv")}>
                  <ArrowLeft size={18} /> Back
                </button>
                <button className="primary" type="button" onClick={() => runReview()}>
                  Analyze CV <ArrowRight size={18} />
                </button>
              </div>
            </motion.section>
          ) : null}

          {step === "analyzing" ? (
            <motion.section
              key="analyzing"
              className="panel"
              variants={panelVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              transition={{ duration: 0.4, ease: EASE }}
            >
              <header className="panel-head">
                <p className="eyebrow">
                  <motion.span
                    className="dot-live"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                  />
                  Analyzing
                </p>
                <h1>Reading your CV</h1>
                <p className="lead">Scoring structure, skills, experience, and role fit.</p>
              </header>

              <div className="skeleton-result">
                <div className="skeleton ring" />
                <div className="skeleton-grid">
                  {[0, 1, 2, 3].map((index) => (
                    <div className="skeleton card" key={index} />
                  ))}
                </div>
              </div>
            </motion.section>
          ) : null}

          {step === "result" && reviewResult ? (
            <motion.section
              key="result"
              className="panel result"
              variants={panelVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              transition={{ duration: 0.4, ease: EASE }}
            >
              <header className="result-head">
                <div>
                  <p className="eyebrow">
                    <FileText size={14} /> {reviewResult.filename}
                  </p>
                  <h1>Your CV review</h1>
                </div>
                <div className="result-head-actions">
                  <button className="ghost" type="button" onClick={startOver}>
                    <RotateCcw size={16} /> Start over
                  </button>
                  <button className="ghost" type="button" onClick={downloadReport}>
                    <Download size={16} /> Review report
                  </button>
                  <button className="primary" type="button" onClick={loadQuestions}>
                    <Wand2 size={16} /> Rebuild my CV
                  </button>
                </div>
              </header>

              <div className="score-hero">
                <ScoreRing value={reviewResult.overall_score} label="Overall" />
                <div>
                  <p>{reviewResult.summary}</p>
                  {scoreDelta ? (
                    <motion.div
                      className={`score-delta ${scoreDelta.change >= 0 ? "positive" : "negative"}`}
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 160, damping: 18 }}
                    >
                      <Sparkles size={16} />
                      <strong>
                        {scoreDelta.change >= 0 ? "+" : ""}
                        {scoreDelta.change}
                      </strong>
                      <span>
                        Re-scored from {scoreDelta.before} to {scoreDelta.after}
                      </span>
                    </motion.div>
                  ) : null}
                </div>
              </div>

              <ErrorNote message={errorMessage} />

              <motion.div
                className="feedback-grid"
                variants={listContainer}
                initial="initial"
                animate="enter"
              >
                {reviewResult.feedback.map((item) => (
                  <motion.article className="feedback-card" key={item.category} variants={listItem}>
                    <div className="feedback-header">
                      <h2>{item.category}</h2>
                      <span className={`tone-text-${toneFor(item.score)}`}>{item.score}</span>
                    </div>
                    <Meter score={item.score} />
                    <p>{item.message}</p>
                    {item.suggestions.length > 0 ? (
                      <ul className="suggestion-list">
                        {item.suggestions.map((suggestion) => (
                          <li key={suggestion}>{suggestion}</li>
                        ))}
                      </ul>
                    ) : null}
                  </motion.article>
                ))}
              </motion.div>

              <div className="insight-layout">
                {reviewResult.job_match ? (
                  <motion.article
                    className="insight-panel"
                    variants={listItem}
                    initial="initial"
                    animate="enter"
                  >
                    <div className="section-heading">
                      <BriefcaseBusiness size={20} />
                      <h2>Job match</h2>
                    </div>
                    <div className={`match-score tone-text-${toneFor(reviewResult.job_match.match_score)}`}>
                      {reviewResult.job_match.match_score}%
                    </div>
                    <p>{reviewResult.job_match.recommendation}</p>
                    <div className="keyword-columns">
                      <div>
                        <strong>Strong matches</strong>
                        <ul>
                          {(reviewResult.job_match.strong_matches.length
                            ? reviewResult.job_match.strong_matches
                            : ["Add a job description for matching"]
                          ).map((keyword) => (
                            <li key={keyword}>{keyword}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <strong>Missing keywords</strong>
                        <ul>
                          {(reviewResult.job_match.missing_keywords.length
                            ? reviewResult.job_match.missing_keywords
                            : ["No missing keywords detected"]
                          ).map((keyword) => (
                            <li key={keyword}>{keyword}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.article>
                ) : null}

                {reviewResult.priority_fixes?.length ? (
                  <motion.article
                    className="insight-panel"
                    variants={listItem}
                    initial="initial"
                    animate="enter"
                  >
                    <div className="section-heading">
                      <ListChecks size={20} />
                      <h2>Priority fixes</h2>
                    </div>
                    <ol className="priority-list">
                      {reviewResult.priority_fixes.map((fix) => (
                        <li key={fix}>{fix}</li>
                      ))}
                    </ol>
                  </motion.article>
                ) : null}

                {reviewResult.rewrite_suggestions?.length ? (
                  <motion.article
                    className="insight-panel rewrite-panel"
                    variants={listItem}
                    initial="initial"
                    animate="enter"
                  >
                    <div className="section-heading">
                      <PenLine size={20} />
                      <h2>Rewrite suggestions</h2>
                    </div>
                    <div className="rewrite-list">
                      {reviewResult.rewrite_suggestions.map((item) => (
                        <div className="rewrite-item" key={`${item.section}-${item.before}`}>
                          {(() => {
                            const rewriteKey = `${item.section}-${item.before}-${item.after}`;
                            const isApplied = appliedRewriteKeys.includes(rewriteKey);
                            const isApplying = applyingRewriteKey === rewriteKey;
                            const canApply = Boolean(cvText.trim());

                            return (
                              <>
                          <strong>{item.section}</strong>
                          <p><span>Before:</span> {item.before}</p>
                          <p><span>After:</span> {item.after}</p>
                          <small>{item.reason}</small>
                                <button
                                  className={`apply-rewrite ${isApplied ? "is-applied" : ""}`}
                                  type="button"
                                  onClick={() => applyRewrite(item)}
                                  disabled={!canApply || Boolean(applyingRewriteKey)}
                                  title={
                                    canApply
                                      ? "Apply this text rewrite and re-score the CV"
                                      : "Apply rewrites requires pasted CV text"
                                  }
                                >
                                  {isApplying ? (
                                    <>
                                      <Sparkles size={15} /> Re-scoring...
                                    </>
                                  ) : isApplied ? (
                                    <>
                                      <Check size={15} /> Applied
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles size={15} /> Apply + re-score
                                    </>
                                  )}
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  </motion.article>
                ) : null}
              </div>
            </motion.section>
          ) : null}

          {step === "questioning" ? (
            <motion.section
              key="questioning"
              className="panel"
              variants={panelVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              transition={{ duration: 0.4, ease: EASE }}
            >
              <header className="panel-head">
                <p className="eyebrow">
                  <motion.span
                    className="dot-live"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                  />
                  Preparing
                </p>
                <h1>Finding what to improve</h1>
                <p className="lead">
                  Reading your CV to ask a few targeted questions before the rebuild.
                </p>
              </header>
              <div className="question-skeletons">
                {[0, 1, 2].map((index) => (
                  <div className="skeleton question" key={index} />
                ))}
              </div>
            </motion.section>
          ) : null}

          {step === "questions" ? (
            <motion.section
              key="questions"
              className="panel"
              variants={panelVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              transition={{ duration: 0.4, ease: EASE }}
            >
              <header className="panel-head">
                <p className="eyebrow">
                  <HelpCircle size={14} /> A few questions
                </p>
                <h1>Make it stronger</h1>
                <p className="lead">
                  Answer what you can based on your CV. Skip anything that does not
                  apply. Your answers are woven into the rebuilt CV.
                </p>
              </header>

              <motion.div
                className="question-list"
                variants={listContainer}
                initial="initial"
                animate="enter"
              >
                {cvQuestions.map((question) => (
                  <motion.label className="question-item" key={question.id} variants={listItem}>
                    <span className="question-text">{question.question}</span>
                    {question.reason ? (
                      <span className="question-reason">{question.reason}</span>
                    ) : null}
                    <textarea
                      value={questionAnswers[question.id] ?? ""}
                      onChange={(event) =>
                        setQuestionAnswers((answers) => ({
                          ...answers,
                          [question.id]: event.target.value
                        }))
                      }
                      placeholder={question.placeholder || "Your answer (optional)"}
                      rows={2}
                    />
                  </motion.label>
                ))}
              </motion.div>

              <ErrorNote message={errorMessage} />

              <div className="panel-actions between">
                <button className="ghost" type="button" onClick={() => setStep("result")}>
                  <ArrowLeft size={18} /> Back
                </button>
                <button className="primary" type="button" onClick={rebuildCv}>
                  <Wand2 size={18} /> Rebuild my CV
                </button>
              </div>
            </motion.section>
          ) : null}

          {step === "rebuilding" ? (
            <motion.section
              key="rebuilding"
              className="panel"
              variants={panelVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              transition={{ duration: 0.4, ease: EASE }}
            >
              <header className="panel-head">
                <p className="eyebrow">
                  <motion.span
                    className="dot-live"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                  />
                  Rebuilding
                </p>
                <h1>Rewriting your CV</h1>
                <p className="lead">
                  Restructuring your content into a clean, ATS-friendly template.
                </p>
              </header>
              <div className="skeleton doc" />
            </motion.section>
          ) : null}

          {step === "rebuilt" && rebuiltCv ? (
            <motion.section
              key="rebuilt"
              className="panel result"
              variants={panelVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              transition={{ duration: 0.4, ease: EASE }}
            >
              <header className="result-head">
                <div>
                  <p className="eyebrow">
                    <Wand2 size={14} /> Rebuilt with CryorApply
                  </p>
                  <h1>Your new CV</h1>
                </div>
                <div className="result-head-actions">
                  <button className="ghost" type="button" onClick={() => setStep(reviewResult ? "result" : "builder")}>
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button className="primary" type="button" onClick={downloadRebuiltCv}>
                    <FileDown size={16} /> Download CV (PDF)
                  </button>
                </div>
              </header>

              <ErrorNote message={errorMessage} />

              {rebuiltCv.notes?.length ? (
                <div className="cv-notes">
                  <strong>Before you send it</strong>
                  <ul>
                    {rebuiltCv.notes.map((note, index) => (
                      <li key={index}>{note}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                <CvDocument cv={rebuiltCv} ref={cvDocRef} />
              </motion.div>
            </motion.section>
          ) : null}

          {/* ── Cover letter ── */}
          {step === "cover-letter" ? (
            <motion.section
              key="cover-letter"
              className="panel"
              variants={panelVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              transition={{ duration: 0.4, ease: EASE }}
            >
              <header className="panel-head">
                <p className="eyebrow"><Mail size={14} /> Cover Letter</p>
                <h1>Generate cover letter</h1>
                <p className="lead">
                  Your CV is already loaded. Paste the job description and we will
                  write a tailored letter using only facts from your CV.
                </p>
              </header>

              <div className="mode-tabs">
                <button className="mode-tab" type="button" onClick={() => { setErrorMessage(""); setStep("cv"); }}>
                  <FileText size={16} /> Review CV
                </button>
                <button className="mode-tab active" type="button">
                  <Mail size={16} /> Cover Letter
                </button>
                <button className="mode-tab" type="button" onClick={() => { setErrorMessage(""); setStep("builder"); }}>
                  <Plus size={16} /> Build from scratch
                </button>
              </div>

              {!selectedFile && !cvText.trim() ? (
                <div className="info-banner">
                  <AlertCircle size={16} />
                  <span>Go to <strong>Review CV</strong> tab and add your CV first, then come back here.</span>
                </div>
              ) : null}

              <label className="field-block">
                <span><BriefcaseBusiness size={16} /> Job description</span>
                <textarea
                  value={coverLetterJobDesc}
                  onChange={(e) => setCoverLetterJobDesc(e.target.value)}
                  placeholder="Paste the full job posting or a short description of the role."
                  rows={8}
                />
              </label>

              <ErrorNote message={errorMessage} />

              <div className="panel-actions end">
                <button
                  className="primary"
                  type="button"
                  onClick={generateCoverLetter}
                  disabled={!selectedFile && !cvText.trim()}
                >
                  <Mail size={18} /> Generate cover letter
                </button>
              </div>
            </motion.section>
          ) : null}

          {step === "generating-cover-letter" ? (
            <motion.section
              key="generating-cover-letter"
              className="panel"
              variants={panelVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              transition={{ duration: 0.4, ease: EASE }}
            >
              <header className="panel-head">
                <p className="eyebrow">
                  <motion.span
                    className="dot-live"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                  />
                  Writing
                </p>
                <h1>Crafting your cover letter</h1>
                <p className="lead">Tailoring it to the role using your CV facts.</p>
              </header>
              <div className="skeleton doc" />
            </motion.section>
          ) : null}

          {step === "cover-letter-result" && coverLetterResult ? (
            <motion.section
              key="cover-letter-result"
              className="panel result"
              variants={panelVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              transition={{ duration: 0.4, ease: EASE }}
            >
              <header className="result-head">
                <div>
                  <p className="eyebrow"><Mail size={14} /> Cover Letter</p>
                  <h1>Your cover letter</h1>
                </div>
                <div className="result-head-actions">
                  <button className="ghost" type="button" onClick={() => setStep("cover-letter")}>
                    <ArrowLeft size={16} /> Edit
                  </button>
                  <button
                    className="primary"
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(coverLetterResult.cover_letter).catch(() => {});
                    }}
                  >
                    <Check size={16} /> Copy text
                  </button>
                </div>
              </header>

              <ErrorNote message={errorMessage} />

              {coverLetterResult.highlights?.length ? (
                <div className="cv-notes">
                  <strong>What was mapped from your CV</strong>
                  <ul>
                    {coverLetterResult.highlights.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <motion.div
                className="cover-letter-body"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                <pre>{coverLetterResult.cover_letter}</pre>
                <p className="cover-letter-meta">{coverLetterResult.word_count} words</p>
              </motion.div>
            </motion.section>
          ) : null}

          {/* ── CV Builder ── */}
          {step === "builder" ? (
            <motion.section
              key="builder"
              className="panel"
              variants={panelVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              transition={{ duration: 0.4, ease: EASE }}
            >
              <header className="panel-head">
                <p className="eyebrow"><Plus size={14} /> CV Builder</p>
                <h1>Build your CV from scratch</h1>
                <p className="lead">
                  Fill in what you have — rough notes are fine. Gemini will turn
                  them into polished, ATS-friendly bullet points.
                </p>
              </header>

              <div className="mode-tabs">
                <button className="mode-tab" type="button" onClick={() => { setErrorMessage(""); setStep("cv"); }}>
                  <FileText size={16} /> Review CV
                </button>
                <button className="mode-tab" type="button" onClick={() => { setErrorMessage(""); setStep("cover-letter"); }}>
                  <Mail size={16} /> Cover Letter
                </button>
                <button className="mode-tab active" type="button">
                  <Plus size={16} /> Build from scratch
                </button>
              </div>

              <div className="builder-form">
                {/* Basics */}
                <div className="builder-section">
                  <h3>Basics</h3>
                  <div className="builder-row-2">
                    <label className="field-block">
                      <span>Full name</span>
                      <input
                        value={builderForm.full_name}
                        onChange={(e) => setBuilderForm((p) => ({ ...p, full_name: e.target.value }))}
                        placeholder="Aisha Karimova"
                      />
                    </label>
                    <label className="field-block">
                      <span>Target role</span>
                      <input
                        value={builderForm.target_role}
                        onChange={(e) => setBuilderForm((p) => ({ ...p, target_role: e.target.value }))}
                        placeholder="Junior Frontend Developer"
                      />
                    </label>
                  </div>
                  <div className="builder-row-3">
                    <label className="field-block">
                      <span>Email</span>
                      <input
                        type="email"
                        value={builderForm.email}
                        onChange={(e) => setBuilderForm((p) => ({ ...p, email: e.target.value }))}
                        placeholder="you@example.com"
                      />
                    </label>
                    <label className="field-block">
                      <span>Phone</span>
                      <input
                        value={builderForm.phone}
                        onChange={(e) => setBuilderForm((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="+7 701 555 0142"
                      />
                    </label>
                    <label className="field-block">
                      <span>Location</span>
                      <input
                        value={builderForm.location}
                        onChange={(e) => setBuilderForm((p) => ({ ...p, location: e.target.value }))}
                        placeholder="Almaty, KZ"
                      />
                    </label>
                  </div>
                  <label className="field-block">
                    <span>Links (GitHub, LinkedIn, portfolio — one per line or comma-separated)</span>
                    <textarea
                      value={builderForm.links}
                      onChange={(e) => setBuilderForm((p) => ({ ...p, links: e.target.value }))}
                      placeholder="github.com/yourname&#10;linkedin.com/in/yourname"
                      rows={2}
                    />
                  </label>
                </div>

                {/* Summary */}
                <div className="builder-section">
                  <h3>About you (optional rough notes)</h3>
                  <label className="field-block">
                    <span>Target job description (helps tailor the language)</span>
                    <textarea
                      value={builderForm.job_description}
                      onChange={(e) => setBuilderForm((p) => ({ ...p, job_description: e.target.value }))}
                      placeholder="Paste a job description to tailor the CV language."
                      rows={3}
                    />
                  </label>
                  <label className="field-block">
                    <span>Skills (comma-separated)</span>
                    <textarea
                      value={builderForm.skills}
                      onChange={(e) => setBuilderForm((p) => ({ ...p, skills: e.target.value }))}
                      placeholder="JavaScript, React, Git, SQL"
                      rows={2}
                    />
                  </label>
                </div>

                {/* Experience */}
                <div className="builder-section">
                  <h3>Experience</h3>
                  {builderForm.experience.map((exp, i) => (
                    <div className="builder-list-item" key={i}>
                      <div className="builder-row-2">
                        <label className="field-block">
                          <span>Job title</span>
                          <input
                            value={exp.title}
                            onChange={(e) => updateBuilderList("experience", i, "title", e.target.value)}
                            placeholder="Sales Assistant"
                          />
                        </label>
                        <label className="field-block">
                          <span>Organization</span>
                          <input
                            value={exp.organization}
                            onChange={(e) => updateBuilderList("experience", i, "organization", e.target.value)}
                            placeholder="Company name"
                          />
                        </label>
                      </div>
                      <div className="builder-row-2">
                        <label className="field-block">
                          <span>Period</span>
                          <input
                            value={exp.period}
                            onChange={(e) => updateBuilderList("experience", i, "period", e.target.value)}
                            placeholder="Jun 2024 – present"
                          />
                        </label>
                        <label className="field-block">
                          <span>What you did (rough notes)</span>
                          <input
                            value={exp.raw}
                            onChange={(e) => updateBuilderList("experience", i, "raw", e.target.value)}
                            placeholder="helped customers, tracked stock in excel"
                          />
                        </label>
                      </div>
                      {builderForm.experience.length > 1 ? (
                        <button className="remove-btn" type="button" onClick={() => removeBuilderListItem("experience", i)}>
                          <Trash2 size={14} /> Remove
                        </button>
                      ) : null}
                    </div>
                  ))}
                  <button className="add-btn" type="button" onClick={() => addBuilderListItem("experience", { title: "", organization: "", period: "", raw: "" })}>
                    <Plus size={14} /> Add position
                  </button>
                </div>

                {/* Education */}
                <div className="builder-section">
                  <h3>Education</h3>
                  {builderForm.education.map((edu, i) => (
                    <div className="builder-list-item" key={i}>
                      <div className="builder-row-2">
                        <label className="field-block">
                          <span>School / University</span>
                          <input
                            value={edu.school}
                            onChange={(e) => updateBuilderList("education", i, "school", e.target.value)}
                            placeholder="KBTU"
                          />
                        </label>
                        <label className="field-block">
                          <span>Program / Degree</span>
                          <input
                            value={edu.program}
                            onChange={(e) => updateBuilderList("education", i, "program", e.target.value)}
                            placeholder="BSc Computer Science"
                          />
                        </label>
                      </div>
                      <div className="builder-row-2">
                        <label className="field-block">
                          <span>Period</span>
                          <input
                            value={edu.period}
                            onChange={(e) => updateBuilderList("education", i, "period", e.target.value)}
                            placeholder="2023 – 2027"
                          />
                        </label>
                        <label className="field-block">
                          <span>Details (GPA, honours, etc.)</span>
                          <input
                            value={edu.details}
                            onChange={(e) => updateBuilderList("education", i, "details", e.target.value)}
                            placeholder="GPA 3.6"
                          />
                        </label>
                      </div>
                      {builderForm.education.length > 1 ? (
                        <button className="remove-btn" type="button" onClick={() => removeBuilderListItem("education", i)}>
                          <Trash2 size={14} /> Remove
                        </button>
                      ) : null}
                    </div>
                  ))}
                  <button className="add-btn" type="button" onClick={() => addBuilderListItem("education", { school: "", program: "", period: "", details: "" })}>
                    <Plus size={14} /> Add education
                  </button>
                </div>

                {/* Projects */}
                <div className="builder-section">
                  <h3>Projects</h3>
                  {builderForm.projects.map((proj, i) => (
                    <div className="builder-list-item" key={i}>
                      <div className="builder-row-2">
                        <label className="field-block">
                          <span>Project name</span>
                          <input
                            value={proj.name}
                            onChange={(e) => updateBuilderList("projects", i, "name", e.target.value)}
                            placeholder="Weather App"
                          />
                        </label>
                        <label className="field-block">
                          <span>What you built (rough notes)</span>
                          <input
                            value={proj.raw}
                            onChange={(e) => updateBuilderList("projects", i, "raw", e.target.value)}
                            placeholder="react app showing forecast from a public api"
                          />
                        </label>
                      </div>
                      {builderForm.projects.length > 1 ? (
                        <button className="remove-btn" type="button" onClick={() => removeBuilderListItem("projects", i)}>
                          <Trash2 size={14} /> Remove
                        </button>
                      ) : null}
                    </div>
                  ))}
                  <button className="add-btn" type="button" onClick={() => addBuilderListItem("projects", { name: "", raw: "" })}>
                    <Plus size={14} /> Add project
                  </button>
                </div>

                {/* Languages & Certs */}
                <div className="builder-section">
                  <h3>Languages &amp; Certifications</h3>
                  <div className="builder-row-2">
                    <label className="field-block">
                      <span>Languages (comma-separated)</span>
                      <input
                        value={builderForm.languages}
                        onChange={(e) => setBuilderForm((p) => ({ ...p, languages: e.target.value }))}
                        placeholder="Kazakh, Russian, English"
                      />
                    </label>
                    <label className="field-block">
                      <span>Certifications (comma-separated)</span>
                      <input
                        value={builderForm.certifications}
                        onChange={(e) => setBuilderForm((p) => ({ ...p, certifications: e.target.value }))}
                        placeholder="Google UX Design Certificate"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <ErrorNote message={errorMessage} />

              <div className="panel-actions end">
                <button className="primary" type="button" onClick={generateBuilderCv}>
                  <Sparkles size={18} /> Generate my CV
                </button>
              </div>
            </motion.section>
          ) : null}
        </AnimatePresence>
      </main>
    </div>
  );
}

function normalizeHref(link) {
  const value = String(link).trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (/^mailto:|^tel:/i.test(value)) return value;
  if (value.includes("@")) return `mailto:${value}`;
  return `https://${value}`;
}

const CvDocument = React.forwardRef(function CvDocument({ cv }, ref) {
  const contact = cv.contact || {};
  const contactNodes = [];
  if (contact.email) {
    contactNodes.push(
      <a key="email" href={`mailto:${contact.email}`}>{contact.email}</a>
    );
  }
  if (contact.phone) {
    contactNodes.push(
      <a key="phone" href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>{contact.phone}</a>
    );
  }
  if (contact.location) {
    contactNodes.push(<span key="location">{contact.location}</span>);
  }
  (contact.links || []).forEach((link, index) => {
    contactNodes.push(
      <a key={`link-${index}`} href={normalizeHref(link)} target="_blank" rel="noreferrer">
        {link}
      </a>
    );
  });

  return (
    <div className="cv-doc" ref={ref}>
      <header className="cv-doc-head">
        <h2>{cv.full_name || "Your Name"}</h2>
        {cv.headline ? <p className="cv-headline">{cv.headline}</p> : null}
        {contactNodes.length ? (
          <p className="cv-contact">
            {contactNodes.map((node, index) => (
              <React.Fragment key={index}>
                {index > 0 ? <span className="cv-contact-sep">•</span> : null}
                {node}
              </React.Fragment>
            ))}
          </p>
        ) : null}
      </header>

      {cv.summary ? (
        <section className="cv-section">
          <h3>Summary</h3>
          <p>{cv.summary}</p>
        </section>
      ) : null}

      {cv.skills?.length ? (
        <section className="cv-section">
          <h3>Skills</h3>
          <div className="cv-chips">
            {cv.skills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        </section>
      ) : null}

      {cv.experience?.length ? (
        <section className="cv-section">
          <h3>Experience</h3>
          {cv.experience.map((entry, index) => (
            <div className="cv-entry" key={`${entry.title}-${index}`}>
              <div className="cv-entry-head">
                <strong>{[entry.title, entry.organization].filter(Boolean).join(" — ")}</strong>
                {entry.period ? <span>{entry.period}</span> : null}
              </div>
              {entry.bullets?.length ? (
                <ul>
                  {entry.bullets.map((bullet, bulletIndex) => (
                    <li key={bulletIndex}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {cv.education?.length ? (
        <section className="cv-section">
          <h3>Education</h3>
          {cv.education.map((entry, index) => (
            <div className="cv-entry" key={`${entry.school}-${index}`}>
              <div className="cv-entry-head">
                <strong>{[entry.program, entry.school].filter(Boolean).join(" — ")}</strong>
                {entry.period ? <span>{entry.period}</span> : null}
              </div>
              {entry.details ? <p>{entry.details}</p> : null}
            </div>
          ))}
        </section>
      ) : null}

      {cv.projects?.length ? (
        <section className="cv-section">
          <h3>Projects</h3>
          {cv.projects.map((entry, index) => (
            <div className="cv-entry" key={`${entry.name}-${index}`}>
              <div className="cv-entry-head">
                <strong>{entry.name}</strong>
              </div>
              {entry.bullets?.length ? (
                <ul>
                  {entry.bullets.map((bullet, bulletIndex) => (
                    <li key={bulletIndex}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {cv.languages?.length ? (
        <section className="cv-section">
          <h3>Languages</h3>
          <p>{cv.languages.join(", ")}</p>
        </section>
      ) : null}

      {cv.certifications?.length ? (
        <section className="cv-section">
          <h3>Certifications</h3>
          <ul>
            {cv.certifications.map((cert, index) => (
              <li key={index}>{cert}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
});

function applyRewriteToCvText(cvText, rewrite) {
  const before = rewrite.before?.trim();
  const after = rewrite.after?.trim();

  if (!before || !after) {
    return cvText;
  }

  if (cvText.includes(before)) {
    return cvText.replace(before, after);
  }

  const lines = cvText.split("\n");
  const beforeTokens = tokenize(before);
  let bestIndex = -1;
  let bestScore = 0;

  lines.forEach((line, index) => {
    const lineTokens = tokenize(line);
    if (lineTokens.length === 0) return;

    const sharedTokens = beforeTokens.filter((token) => lineTokens.includes(token));
    const score = sharedTokens.length / Math.max(beforeTokens.length, 1);

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  if (bestIndex === -1 || bestScore < 0.35) {
    return cvText;
  }

  const indentation = lines[bestIndex].match(/^\s*[-•*]?\s*/)?.[0] ?? "";
  lines[bestIndex] = `${indentation}${after}`;
  return lines.join("\n");
}

function tokenize(text) {
  return text
    .toLowerCase()
    .match(/[a-z0-9+#.-]{3,}/g)
    ?.filter((token) => !["the", "and", "with", "for", "that", "this", "your"].includes(token)) ?? [];
}

createRoot(document.getElementById("root")).render(<App />);
