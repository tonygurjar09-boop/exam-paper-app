"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, Download, Printer, ArrowLeft, ArrowRight, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

const KIND_LABELS = {
  mcq: "वस्तुनिष्ठ प्रश्न",
  fill: "रिक्त स्थान की पूर्ति",
  match: "सही मिलान कीजिए",
  veryshort: "अतिलघुत्तरात्मक प्रश्न",
  short: "लघुत्तरात्मक प्रश्न",
  essay: "निबंधात्मक प्रश्न",
};

const STEPS = ["सेटअप", "अध्याय चुनें", "AI जनरेट + संपादन", "अंतिम समीक्षा"];

const HALFYEARLY_SECTIONS = [
  { id: "s1", kind: "mcq", count: 10, marks: 1 },
  { id: "s2", kind: "fill", count: 5, marks: 1 },
  { id: "s3", kind: "match", count: 5, marks: 1 },
  { id: "s4", kind: "veryshort", count: 10, marks: 1 },
  { id: "s5", kind: "short", count: 6, marks: 2 },
  { id: "s6", kind: "essay", count: 2, marks: 4 },
];
const UNIT_TEST_SECTIONS = [
  { id: "u1", kind: "mcq", count: 5, marks: 1 },
  { id: "u2", kind: "short", count: 1, marks: 2 },
  { id: "u3", kind: "essay", count: 1, marks: 3 },
];
const DEFAULT_SECTIONS = HALFYEARLY_SECTIONS;
const EXAM_TYPE_PRESETS = {
  "अर्धवार्षिक परीक्षा": HALFYEARLY_SECTIONS,
  "वार्षिक परीक्षा": HALFYEARLY_SECTIONS,
  "प्रथम यूनिट टेस्ट (10 अंक)": UNIT_TEST_SECTIONS,
  "द्वितीय यूनिट टेस्ट (10 अंक)": UNIT_TEST_SECTIONS,
  "तृतीय यूनिट टेस्ट (10 अंक)": UNIT_TEST_SECTIONS,
};

const EXAM_TYPES = [
  "अर्धवार्षिक परीक्षा",
  "प्रथम यूनिट टेस्ट (10 अंक)",
  "द्वितीय यूनिट टेस्ट (10 अंक)",
  "तृतीय यूनिट टेस्ट (10 अंक)",
  "वार्षिक परीक्षा",
  "अन्य (खुद लिखें)",
];

function romanToDevanagari(n) {
  const map = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
  return String(n).split("").map((d) => map[+d] || d).join("");
}

export default function ExamPaperGenerator() {
  const [step, setStep] = useState(0);
  const [header, setHeader] = useState({
    school: "",
    exam: "अर्धवार्षिक परीक्षा",
    className: "",
    subject: "",
    time: "3 घंटे",
    date: "",
    difficulty: "मिश्रित (Mixed)",
  });
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [chapters, setChapters] = useState([]);
  const [chapterInput, setChapterInput] = useState("");
  const [chapterMode, setChapterMode] = useState("simple");
  const [questions, setQuestions] = useState(() => Object.fromEntries(DEFAULT_SECTIONS.map((s) => [s.id, []])));
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [regeneratingId, setRegeneratingId] = useState(null);

  const totalMarks = useMemo(() => sections.reduce((sum, s) => sum + s.count * s.marks, 0), [sections]);
  const totalQuestions = useMemo(() => sections.reduce((sum, s) => sum + s.count, 0), [sections]);
  const checkedChapters = chapters.filter((c) => c.checked).map((c) => c.name);
  const allocatedMarks = chapters.filter((c) => c.checked).reduce((sum, c) => sum + (Number(c.marks) || 0), 0);

  function updateSection(id, patch) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function addSection() {
    const id = "s" + Date.now();
    setSections((prev) => [...prev, { id, kind: "short", count: 1, marks: 1 }]);
    setQuestions((prev) => ({ ...prev, [id]: [] }));
  }
  function removeSection(id) {
    setSections((prev) => prev.filter((s) => s.id !== id));
    setQuestions((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function addChapter() {
    if (!chapterInput.trim()) return;
    setChapters((prev) => [...prev, { id: "c" + Date.now(), name: chapterInput.trim(), checked: true, marks: 0 }]);
    setChapterInput("");
  }
  function updateChapterMarks(id, marks) {
    setChapters((prev) => prev.map((c) => (c.id === id ? { ...c, marks } : c)));
  }
  function toggleChapter(id) {
    setChapters((prev) => prev.map((c) => (c.id === id ? { ...c, checked: !c.checked } : c)));
  }
  function removeChapter(id) {
    setChapters((prev) => prev.filter((c) => c.id !== id));
  }

  function applyGenerated(parsed, onlySectionId) {
    setQuestions((prev) => {
      const next = { ...prev };
      const targetSections = onlySectionId ? sections.filter((s) => s.id === onlySectionId) : sections;
      targetSections.forEach((s) => {
        next[s.id] = [];
      });
      parsed.forEach((item) => {
        const section = targetSections.find((s) => s.kind === item.kind) || (!onlySectionId && sections.find((s) => s.kind === item.kind));
        if (!section) return;
        const q =
          item.kind === "mcq"
            ? { text: item.text || "", options: item.options?.length === 4 ? item.options : ["", "", "", ""] }
            : item.kind === "match"
            ? { pairs: item.pairs?.length ? item.pairs : [{ left: "", right: "" }] }
            : item.kind === "essay"
            ? { text: item.text || "", orText: item.orText || "" }
            : { text: item.text || "" };
        next[section.id] = [...(next[section.id] || []), q];
      });
      return next;
    });
  }

  async function callGenerate(sectionsForRequest) {
    const resp = await fetch("/api/generate-paper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        className: header.className,
        difficulty: header.difficulty,
        subject: header.subject,
        chapters: checkedChapters,
        chapterMarks: chapterMode === "advanced" ? chapters.filter((c) => c.checked).map((c) => ({ name: c.name, marks: Number(c.marks) || 0 })) : null,
        sections: sectionsForRequest.map((s) => ({ kind: s.kind, count: s.count, marks: s.marks })),
      }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || "अज्ञात त्रुटि");
    return data.questions;
  }

  async function handleGenerateAll() {
    setGenerateError("");
    setGenerating(true);
    try {
      const parsed = await callGenerate(sections);
      applyGenerated(parsed);
      setStep(2);
    } catch (err) {
      setGenerateError(err?.message || "जनरेट करने में समस्या आई");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRegenerateSection(section) {
    setRegeneratingId(section.id);
    setGenerateError("");
    try {
      const parsed = await callGenerate([section]);
      applyGenerated(parsed, section.id);
    } catch (err) {
      setGenerateError(err?.message || "इस सेक्शन को दोबारा बनाने में समस्या आई");
    } finally {
      setRegeneratingId(null);
    }
  }

  function updateQuestion(sectionId, idx, patch) {
    setQuestions((prev) => {
      const list = [...(prev[sectionId] || [])];
      list[idx] = { ...list[idx], ...patch };
      return { ...prev, [sectionId]: list };
    });
  }
  function removeQuestion(sectionId, idx) {
    setQuestions((prev) => {
      const list = [...(prev[sectionId] || [])];
      list.splice(idx, 1);
      return { ...prev, [sectionId]: list };
    });
  }

  const printRefCb = (node) => { window.__printRef = node; };
  function handlePrint() {
    const content = window.__printRef?.innerHTML || "";
    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>${header.subject || "प्रश्न पत्र"}</title>
      <style>
        body{font-family:'Noto Sans Devanagari',Georgia,serif;padding:28px;color:#111;}
        h2,h3{text-align:center;margin:2px 0;}
        .qp-header{border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:16px;}
        .qp-meta{display:flex;justify-content:space-between;font-size:14px;margin-top:8px;}
        .qp-section-title{font-weight:bold;margin-top:18px;margin-bottom:6px;border-bottom:1px dashed #888;padding-bottom:4px;}
        .qp-q{margin:8px 0;font-size:14px;line-height:1.6;}
        .qp-opts{display:grid;grid-template-columns:1fr 1fr;gap:2px 16px;margin-left:20px;font-size:13px;}
        .qp-pair-row{display:flex;gap:24px;margin-left:20px;font-size:13px;}
        table{border-collapse:collapse;margin-left:20px;}
        td{padding:2px 12px;font-size:13px;}
      </style></head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }
  function handleDownloadWord() {
    const content = window.__printRef?.innerHTML || "";
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset="utf-8"><title>Question Paper</title></head>
    <body style="font-family:'Nirmala UI','Mangal',serif;">${content}</body></html>`;
    const blob = new Blob(["\ufeff", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${header.subject || "prashn-patra"}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900 pb-24">
      <div className="max-w-3xl mx-auto px-4 pt-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-full bg-red-700 text-white flex items-center justify-center font-serif text-lg shadow-sm">
            {romanToDevanagari(totalMarks)}
          </div>
          <div>
            <h1 className="font-serif text-xl font-bold text-slate-900">प्रश्न पत्र निर्माता</h1>
            <p className="text-xs text-slate-500">कुल अंक {totalMarks} · कुल प्रश्न {totalQuestions}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${i <= step ? "bg-slate-900 text-white" : "bg-stone-200 text-slate-500"}`}>
                {i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i <= step ? "text-slate-900" : "text-slate-400"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`h-px flex-1 ${i < step ? "bg-slate-900" : "bg-stone-200"}`} />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-6">
            <div className="bg-white border border-stone-200 rounded-lg p-5 space-y-3">
              <h2 className="font-serif font-semibold text-slate-800 mb-2">प्रश्न पत्र का शीर्षक विवरण</h2>
              <div className="grid grid-cols-2 gap-3">
                <Field label="स्कूल का नाम" value={header.school} onChange={(v) => setHeader((h) => ({ ...h, school: v }))} full />
                <label className="block text-xs text-slate-500 col-span-2">
                  परीक्षा का प्रकार
                  <select
                    value={EXAM_TYPES.includes(header.exam) ? header.exam : "अन्य (खुद लिखें)"}
                    onChange={(e) => {
                      const val = e.target.value;
                      setHeader((h) => ({ ...h, exam: val === "अन्य (खुद लिखें)" ? "" : val }));
                      if (EXAM_TYPE_PRESETS[val]) {
                        setSections(EXAM_TYPE_PRESETS[val]);
                        setQuestions(Object.fromEntries(EXAM_TYPE_PRESETS[val].map((s) => [s.id, []])));
                      }
                    }}
                    className="mt-1 w-full border border-stone-300 rounded px-3 py-2 text-sm text-slate-800"
                  >
                    {EXAM_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
                  </select>
                  {!EXAM_TYPES.includes(header.exam) && (
                    <input
                      value={header.exam}
                      onChange={(e) => setHeader((h) => ({ ...h, exam: e.target.value }))}
                      placeholder="परीक्षा का नाम लिखें"
                      className="mt-2 w-full border border-stone-300 rounded px-3 py-2 text-sm"
                    />
                  )}
                </label>
                <Field label="कक्षा" value={header.className} onChange={(v) => setHeader((h) => ({ ...h, className: v }))} />
                <Field label="विषय" value={header.subject} onChange={(v) => setHeader((h) => ({ ...h, subject: v }))} />
                <Field label="समय" value={header.time} onChange={(v) => setHeader((h) => ({ ...h, time: v }))} />
                <label className="block text-xs text-slate-500">
                  कठिनाई स्तर (Difficulty)
                  <select
                    value={header.difficulty}
                    onChange={(e) => setHeader((h) => ({ ...h, difficulty: e.target.value }))}
                    className="mt-1 w-full border border-stone-300 rounded px-3 py-2 text-sm text-slate-800"
                  >
                    <option>आसान (Easy)</option>
                    <option>मध्यम (Medium)</option>
                    <option>कठिन (Hard)</option>
                    <option>मिश्रित (Mixed)</option>
                  </select>
                </label>
                <Field label="तिथि" value={header.date} onChange={(v) => setHeader((h) => ({ ...h, date: v }))} />
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif font-semibold text-slate-800">प्रश्न संरचना (ब्लू प्रिंट)</h2>
                <button onClick={addSection} className="text-xs flex items-center gap-1 text-slate-600 hover:text-slate-900">
                  <Plus size={14} /> सेक्शन जोड़ें
                </button>
              </div>
              <div className="space-y-2">
                {sections.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-sm bg-stone-50 rounded-md px-3 py-2">
                    <select value={s.kind} onChange={(e) => updateSection(s.id, { kind: e.target.value })} className="flex-1 bg-transparent outline-none text-slate-800 font-medium">
                      {Object.entries(KIND_LABELS).map(([k, l]) => (<option key={k} value={k}>{l}</option>))}
                    </select>
                    <input type="number" value={s.count} min={0} onChange={(e) => updateSection(s.id, { count: +e.target.value })} className="w-14 border border-stone-300 rounded px-2 py-1 text-center" />
                    <span className="text-slate-400 text-xs">प्रश्न ×</span>
                    <input type="number" value={s.marks} min={0} onChange={(e) => updateSection(s.id, { marks: +e.target.value })} className="w-12 border border-stone-300 rounded px-2 py-1 text-center" />
                    <span className="text-slate-400 text-xs">अंक</span>
                    <button onClick={() => removeSection(s.id)} className="text-stone-400 hover:text-red-600"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
              <div className="text-right text-sm font-semibold text-slate-700 mt-3">कुल: {totalQuestions} प्रश्न · {totalMarks} अंक</div>
            </div>

            <StepNav onNext={() => setStep(1)} nextLabel="आगे बढ़ें" />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-white border border-stone-200 rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif font-semibold text-slate-800">कौन से अध्याय कवर करने हैं?</h2>
                <div className="flex text-xs rounded-full border border-stone-300 overflow-hidden">
                  <button onClick={() => setChapterMode("simple")} className={`px-3 py-1 ${chapterMode === "simple" ? "bg-slate-900 text-white" : "text-slate-600"}`}>Simple</button>
                  <button onClick={() => setChapterMode("advanced")} className={`px-3 py-1 ${chapterMode === "advanced" ? "bg-slate-900 text-white" : "text-slate-600"}`}>Advanced</button>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                {chapterMode === "simple"
                  ? "बस चैप्टर चुनो — AI खुद मार्क्स बैलेंस कर देगा"
                  : `हर चैप्टर के लिए marks खुद तय करो (लक्ष्य: कुल ${totalMarks} अंक)`}
              </p>
              <div className="flex gap-2 mb-3">
                <input
                  value={chapterInput}
                  onChange={(e) => setChapterInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addChapter()}
                  placeholder="अध्याय का नाम लिखें और Enter दबाएं"
                  className="flex-1 border border-stone-300 rounded px-3 py-2 text-sm"
                />
                <button onClick={addChapter} className="bg-slate-900 text-white rounded-md px-4 text-sm">जोड़ें</button>
              </div>
              {chapters.length === 0 && <p className="text-xs text-slate-400">अभी तक कोई अध्याय नहीं जोड़ा गया</p>}
              <div className="space-y-1.5">
                {chapters.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm bg-stone-50 rounded-md px-3 py-2">
                    <input type="checkbox" checked={c.checked} onChange={() => toggleChapter(c.id)} className="accent-slate-900" />
                    <span className="flex-1">{c.name}</span>
                    {chapterMode === "advanced" && c.checked && (
                      <>
                        <input
                          type="number"
                          min={0}
                          value={c.marks}
                          onChange={(e) => updateChapterMarks(c.id, e.target.value)}
                          className="w-16 border border-stone-300 rounded px-2 py-1 text-center text-xs"
                        />
                        <span className="text-xs text-slate-400">अंक</span>
                      </>
                    )}
                    <button onClick={() => removeChapter(c.id)} className="text-stone-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </label>
                ))}
              </div>
              {chapterMode === "advanced" && chapters.some((c) => c.checked) && (
                <div className={`text-right text-xs font-semibold mt-2 ${allocatedMarks === totalMarks ? "text-emerald-600" : "text-amber-600"}`}>
                  कुल आवंटित: {allocatedMarks} / {totalMarks} अंक
                </div>
              )}
            </div>

            {generateError && <p className="text-xs text-red-600">{generateError}</p>}

            <StepNav
              onBack={() => setStep(0)}
              onNext={handleGenerateAll}
              nextLabel={generating ? "जनरेट हो रहा है..." : "AI से पेपर जनरेट करें"}
              nextDisabled={generating || checkedChapters.length === 0 || !header.className || !header.subject}
            />
          </div>
        )}

        {step === 2 && (
          <EditStep
            sections={sections}
            activeIdx={activeSectionIdx}
            setActiveIdx={setActiveSectionIdx}
            questions={questions}
            updateQuestion={updateQuestion}
            removeQuestion={removeQuestion}
            onRegenerate={handleRegenerateSection}
            regeneratingId={regeneratingId}
            generateError={generateError}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <ReviewStep
            header={header}
            sections={sections}
            questions={questions}
            printRefCb={printRefCb}
            onBack={() => setStep(2)}
            onPrint={handlePrint}
            onDownloadWord={handleDownloadWord}
          />
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, full }) {
  return (
    <label className={`block text-xs text-slate-500 ${full ? "col-span-2" : ""}`}>
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full border border-stone-300 rounded px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900" />
    </label>
  );
}

function StepNav({ onBack, onNext, nextLabel = "आगे", nextDisabled, hideNext }) {
  return (
    <div className="flex justify-between pt-2">
      {onBack ? (
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 px-4 py-2">
          <ArrowLeft size={16} /> पीछे
        </button>
      ) : <span />}
      {!hideNext && (
        <button onClick={onNext} disabled={nextDisabled} className="flex items-center gap-1 text-sm bg-slate-900 text-white rounded-md px-5 py-2 disabled:opacity-40">
          {nextLabel} <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}

function EditStep({ sections, activeIdx, setActiveIdx, questions, updateQuestion, removeQuestion, onRegenerate, regeneratingId, generateError, onBack, onNext }) {
  const section = sections[activeIdx];
  const list = questions[section?.id] || [];
  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {sections.map((s, i) => (
          <button key={s.id} onClick={() => setActiveIdx(i)} className={`shrink-0 text-xs px-3 py-1.5 rounded-full border ${i === activeIdx ? "bg-slate-900 text-white border-slate-900" : "border-stone-300 text-slate-600"}`}>
            {KIND_LABELS[s.kind]} ({(questions[s.id] || []).length}/{s.count})
          </button>
        ))}
      </div>

      <div className="bg-white border border-stone-200 rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-serif font-semibold">{KIND_LABELS[section.kind]}</h3>
          <button
            onClick={() => onRegenerate(section)}
            disabled={regeneratingId === section.id}
            className="text-xs flex items-center gap-1 text-slate-600 border border-stone-300 rounded-md px-2 py-1"
          >
            {regeneratingId === section.id ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} इस सेक्शन को फिर से बनाओ
          </button>
        </div>
        {list.length === 0 && <p className="text-xs text-slate-400">कोई प्रश्न नहीं — "फिर से बनाओ" दबाएं</p>}
        {list.map((q, idx) => (
          <QuestionEditor key={idx} kind={section.kind} q={q} idx={idx} onChange={(patch) => updateQuestion(section.id, idx, patch)} onRemove={() => removeQuestion(section.id, idx)} />
        ))}
      </div>

      {generateError && <p className="text-xs text-red-600">{generateError}</p>}

      <StepNav onBack={onBack} onNext={onNext} nextLabel="अंतिम समीक्षा" />
    </div>
  );
}

function QuestionEditor({ kind, q, idx, onChange, onRemove }) {
  if (kind === "mcq") {
    return (
      <div className="border border-stone-200 rounded-md p-3 space-y-2">
        <div className="flex gap-2">
          <span className="text-xs text-slate-400 mt-2">{idx + 1}.</span>
          <textarea value={q.text} onChange={(e) => onChange({ text: e.target.value })} className="flex-1 border border-stone-300 rounded px-2 py-1.5 text-sm" rows={2} />
          <button onClick={onRemove} className="text-stone-400 hover:text-red-600 mt-2"><Trash2 size={15} /></button>
        </div>
        <div className="grid grid-cols-2 gap-2 ml-6">
          {q.options.map((opt, oi) => (
            <input key={oi} value={opt} onChange={(e) => { const opts = [...q.options]; opts[oi] = e.target.value; onChange({ options: opts }); }} className="border border-stone-300 rounded px-2 py-1 text-sm" />
          ))}
        </div>
      </div>
    );
  }
  if (kind === "match") {
    return (
      <div className="border border-stone-200 rounded-md p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">जोड़े (pairs)</span>
          <button onClick={onRemove} className="text-stone-400 hover:text-red-600"><Trash2 size={15} /></button>
        </div>
        {q.pairs.map((p, pi) => (
          <div key={pi} className="flex gap-2 ml-2">
            <input value={p.left} onChange={(e) => { const pairs = [...q.pairs]; pairs[pi] = { ...pairs[pi], left: e.target.value }; onChange({ pairs }); }} className="flex-1 border border-stone-300 rounded px-2 py-1 text-sm" />
            <input value={p.right} onChange={(e) => { const pairs = [...q.pairs]; pairs[pi] = { ...pairs[pi], right: e.target.value }; onChange({ pairs }); }} className="flex-1 border border-stone-300 rounded px-2 py-1 text-sm" />
          </div>
        ))}
      </div>
    );
  }
  if (kind === "essay") {
    return (
      <div className="border border-stone-200 rounded-md p-3 space-y-2">
        <div className="flex gap-2">
          <span className="text-xs text-slate-400 mt-2">{idx + 1}.</span>
          <textarea value={q.text} onChange={(e) => onChange({ text: e.target.value })} className="flex-1 border border-stone-300 rounded px-2 py-1.5 text-sm" rows={2} />
          <button onClick={onRemove} className="text-stone-400 hover:text-red-600 mt-2"><Trash2 size={15} /></button>
        </div>
        <div className="flex gap-2 ml-6 items-start">
          <span className="text-xs text-slate-400 mt-2">अथवा</span>
          <textarea value={q.orText} onChange={(e) => onChange({ orText: e.target.value })} className="flex-1 border border-stone-300 rounded px-2 py-1.5 text-sm" rows={2} />
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2 border border-stone-200 rounded-md p-3">
      <span className="text-xs text-slate-400 mt-2">{idx + 1}.</span>
      <textarea value={q.text} onChange={(e) => onChange({ text: e.target.value })} className="flex-1 border border-stone-300 rounded px-2 py-1.5 text-sm" rows={kind === "fill" ? 1 : 2} />
      <button onClick={onRemove} className="text-stone-400 hover:text-red-600 mt-2"><Trash2 size={15} /></button>
    </div>
  );
}

function ReviewStep({ header, sections, questions, printRefCb, onBack, onPrint, onDownloadWord }) {
  let qNumber = 0;
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-md px-3 py-2 flex items-center gap-2">
        <CheckCircle2 size={14} /> नीचे पूरा पेपर देख लें, गलती हो तो पिछले स्टेप में जाकर ठीक करें
      </div>

      <div ref={printRefCb} className="bg-white border border-stone-200 rounded-lg p-6 font-serif text-sm">
        <div className="qp-header text-center border-b-2 border-slate-900 pb-3 mb-4">
          <h2 className="text-lg font-bold">{header.school || "विद्यालय का नाम"}</h2>
          <h3 className="text-base">{header.exam}</h3>
          <div className="qp-meta flex justify-between text-xs mt-2">
            <span>कक्षा: {header.className || "—"}</span>
            <span>विषय: {header.subject || "—"}</span>
          </div>
          <div className="qp-meta flex justify-between text-xs mt-1">
            <span>समय: {header.time}</span>
            <span>पूर्णांक: {sections.reduce((s, x) => s + x.count * x.marks, 0)}</span>
          </div>
        </div>

        {sections.map((s) => {
          const list = questions[s.id] || [];
          return (
            <div key={s.id} className="mb-4">
              <div className="qp-section-title font-semibold border-b border-dashed border-stone-400 pb-1 mb-2">
                {KIND_LABELS[s.kind]} ({s.marks} अंक प्रत्येक)
              </div>
              {list.length === 0 && <p className="text-xs text-slate-400">कोई प्रश्न नहीं जोड़ा गया</p>}
              {s.kind === "match" && list.map((q, i) => (
                <table key={i} className="qp-pair-row ml-4 mb-2">
                  <tbody>
                    {q.pairs.map((p, pi) => (<tr key={pi}><td>{pi + 1}. {p.left}</td><td>{pi + 1}. {p.right}</td></tr>))}
                  </tbody>
                </table>
              ))}
              {s.kind === "mcq" && list.map((q, i) => {
                qNumber++;
                return (
                  <div key={i} className="qp-q">
                    {qNumber}. {q.text}
                    <div className="qp-opts grid grid-cols-2 ml-5 text-xs">
                      {q.options.map((o, oi) => (<span key={oi}>({String.fromCharCode(97 + oi)}) {o}</span>))}
                    </div>
                  </div>
                );
              })}
              {s.kind === "essay" && list.map((q, i) => {
                qNumber++;
                return (
                  <div key={i} className="qp-q">
                    {qNumber}. {q.text}
                    {q.orText && <div className="ml-5 text-xs mt-1">अथवा<br />{q.orText}</div>}
                  </div>
                );
              })}
              {["fill", "veryshort", "short"].includes(s.kind) && list.map((q, i) => {
                qNumber++;
                return <div key={i} className="qp-q">{qNumber}. {q.text}</div>;
              })}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 justify-between pt-2">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 px-4 py-2">
          <ArrowLeft size={16} /> पीछे
        </button>
        <div className="flex gap-2">
          <button onClick={onPrint} className="flex items-center gap-1 text-sm border border-slate-900 text-slate-900 rounded-md px-4 py-2">
            <Printer size={16} /> PDF / प्रिंट
          </button>
          <button onClick={onDownloadWord} className="flex items-center gap-1 text-sm bg-slate-900 text-white rounded-md px-4 py-2">
            <Download size={16} /> Word डाउनलोड
          </button>
        </div>
      </div>
    </div>
  );
}
