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
  Keyboard,
  ListChecks,
  PenLine,
  RotateCcw,
  Sparkles,
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

  const activeIndex =
    step === "result" || step === "rebuilding" || step === "rebuilt"
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
  };

  const rebuildCv = async () => {
    const formData = new FormData();
    if (selectedFile) {
      formData.append("file", selectedFile);
    } else {
      formData.append("cv_text", cvText.trim());
    }
    if (jobDescription.trim()) {
      formData.append("job_description", jobDescription.trim());
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
      setStep("result");
    }
  };

  const downloadRebuiltCv = () => {
    if (!rebuiltCv) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 48;
    const maxW = pageW - margin * 2;
    let y = margin;

    const ensure = (height) => {
      if (y + height > pageH - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const write = (text, options = {}) => {
      if (!text) return;
      const { size = 10, style = "normal", color = [38, 38, 42], gap = 14, indent = 0 } = options;
      doc.setFont("helvetica", style);
      doc.setFontSize(size);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.splitTextToSize(String(text), maxW - indent).forEach((row) => {
        ensure(gap);
        doc.text(row, margin + indent, y);
        y += gap;
      });
    };

    const heading = (text) => {
      y += 8;
      ensure(22);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(14, 147, 132);
      doc.text(text.toUpperCase(), margin, y);
      y += 5;
      doc.setDrawColor(14, 147, 132);
      doc.setLineWidth(0.8);
      doc.line(margin, y, pageW - margin, y);
      y += 12;
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(20, 20, 25);
    ensure(26);
    doc.text(rebuiltCv.full_name || "Your Name", margin, y);
    y += 22;
    if (rebuiltCv.headline) write(rebuiltCv.headline, { size: 12, color: [82, 82, 91], gap: 16 });

    const contact = rebuiltCv.contact || {};
    const contactBits = [contact.email, contact.phone, contact.location, ...(contact.links || [])].filter(Boolean);
    if (contactBits.length) write(contactBits.join("   -   "), { size: 9, color: [113, 113, 122], gap: 14 });

    if (rebuiltCv.summary) {
      heading("Summary");
      write(rebuiltCv.summary, { gap: 13 });
    }
    if (rebuiltCv.skills?.length) {
      heading("Skills");
      write(rebuiltCv.skills.join(",  "), { gap: 13 });
    }
    if (rebuiltCv.experience?.length) {
      heading("Experience");
      rebuiltCv.experience.forEach((entry) => {
        write([entry.title, entry.organization].filter(Boolean).join(" - "), { size: 10.5, style: "bold", gap: 14 });
        if (entry.period) write(entry.period, { size: 9, color: [120, 120, 130], gap: 12 });
        (entry.bullets || []).forEach((bullet) => write(`-  ${bullet}`, { gap: 13, indent: 8 }));
        y += 4;
      });
    }
    if (rebuiltCv.education?.length) {
      heading("Education");
      rebuiltCv.education.forEach((entry) => {
        write([entry.program, entry.school].filter(Boolean).join(" - "), { size: 10.5, style: "bold", gap: 14 });
        if (entry.period) write(entry.period, { size: 9, color: [120, 120, 130], gap: 12 });
        if (entry.details) write(entry.details, { gap: 13 });
        y += 4;
      });
    }
    if (rebuiltCv.projects?.length) {
      heading("Projects");
      rebuiltCv.projects.forEach((entry) => {
        write(entry.name, { size: 10.5, style: "bold", gap: 14 });
        (entry.bullets || []).forEach((bullet) => write(`-  ${bullet}`, { gap: 13, indent: 8 }));
        y += 4;
      });
    }
    if (rebuiltCv.languages?.length) {
      heading("Languages");
      write(rebuiltCv.languages.join(",  "), { gap: 13 });
    }
    if (rebuiltCv.certifications?.length) {
      heading("Certifications");
      rebuiltCv.certifications.forEach((cert) => write(`-  ${cert}`, { gap: 13, indent: 8 }));
    }

    try {
      const pdfBlob = doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      const safeName = (rebuiltCv.full_name || "cv")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      link.href = url;
      link.download = `${safeName || "cryorapply"}-cv.pdf`;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
                <button className="primary" type="button" onClick={runReview}>
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
                  <button className="primary" type="button" onClick={rebuildCv}>
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
                  <button className="ghost" type="button" onClick={() => setStep("result")}>
                    <ArrowLeft size={16} /> Back to review
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
                <CvDocument cv={rebuiltCv} />
              </motion.div>
            </motion.section>
          ) : null}
        </AnimatePresence>
      </main>
    </div>
  );
}

function CvDocument({ cv }) {
  const contact = cv.contact || {};
  const contactBits = [
    contact.email,
    contact.phone,
    contact.location,
    ...(contact.links || [])
  ].filter(Boolean);

  return (
    <div className="cv-doc">
      <header className="cv-doc-head">
        <h2>{cv.full_name || "Your Name"}</h2>
        {cv.headline ? <p className="cv-headline">{cv.headline}</p> : null}
        {contactBits.length ? <p className="cv-contact">{contactBits.join("   •   ")}</p> : null}
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
}

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
