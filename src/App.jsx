import { useState, useRef, useEffect } from "react";

/* ──────────────────────────────────────────────
   IS Standards knowledge — baked into system prompt
   so the AI always has reference context
   ────────────────────────────────────────────── */
const IS_STANDARDS_KNOWLEDGE = `
You are SiteCheck AI — a construction quality analyst for Indian real-estate sites.
You have expert knowledge of the following Indian Standards and must use them to evaluate any uploaded test report or site reading:

## IS 516:1959 — Methods of Tests for Strength of Concrete (Reaffirmed 2004)

### Scope
Tests for compressive strength, flexural strength, and modulus of elasticity of cement concrete.

### Key Requirements
- **Cube Moulds**: 150 mm size conforming to IS 10086:1982
- **Cylindrical Moulds**: 150 mm diameter, 300 mm height conforming to IS 10086:1982
- **Tamping Bar**: conforming to 6.1(a) of IS 10086:1982
- **Beam Moulds**: conforming to IS 10086:1982

### Specimen Preparation
- Maximum nominal aggregate size ≤ 38 mm
- Materials brought to room temp 27 ± 3°C before testing
- Cement mixed thoroughly, aggregates air-dried and separated into fine/coarse (Sieve 480)
- Proportioning by weight, accuracy 0.1% of total batch weight
- 10% excess concrete after moulding

### Compression Test (Clause 5)
- 150 mm cubes, or 150 mm dia × 300 mm cylinders
- Specimen cured in water at 27 ± 2°C, tested at specified age (typically 7 and 28 days)
- Load rate: 14 N/mm²/min (140 kg/cm²/min) — applied steadily without shock
- Compressive strength = Maximum load / Cross-sectional area
- Average of 3 specimens taken; individual result must not deviate >15% from average

### Flexural Test (Clause 7)
- Beam size: 150 × 150 × 700 mm (for aggregate ≤ 38 mm)
- Two-point (third-point) loading, span = 3× depth (typically 600 mm for 150 mm beams)
- Load rate: such that extreme fibre stress increases at 0.7 N/mm²/min
- Flexural strength = PL / bd² (if fracture in middle third)
- Flexural strength = 3Pa / bd² (if fracture outside middle third, a = distance from nearest support)
- Discard if fracture is more than 5% of span outside middle third

### Modulus of Elasticity (Clause 8)
- 150 mm dia × 300 mm height cylinders
- Tested per IS 516 clause 8

## IS 13311 (Part 2):1992 — Non-Destructive Testing of Concrete — Rebound Hammer

### Scope
Object, principle, apparatus, procedure for rebound hammer test. For assessing:
- Likely compressive strength (with correlation curves)
- Uniformity of concrete
- Quality vs standard requirements
- Relative quality of different elements

### Apparatus
- Spring-controlled mass in tubular housing
- Impact energy: **2.25 Nm** for normal weight concrete, 0.75 Nm for lightweight, 30 Nm for mass concrete
- Testing anvil: Brinell hardness ~5000 N/mm²

### Procedure (Clause 6)
- Surface must be **smooth, clean, dry**; loosely adhering scale rubbed off with grinding wheel
- Point of impact **≥ 20 mm** from any edge or shape discontinuity
- Hammer held **at right angles** to surface
- Test can be horizontal, vertically up, or vertically down (rebound number differs for same concrete)
- **6 readings** at each point of observation, around all accessible faces
- Average after deleting outliers per **IS 8900:1978**
- At least **9 readings** on each of the two vertical faces (as-cast)
- Points must be ≥ 20 mm apart, each point impacted only once

### Calibration (Clause 5.2)
- Correlation between compressive strength and rebound number obtained on **150 mm cubes** in compression testing machine
- Fixed load ~7 N/mm² while taking rebound readings
- Wet cured specimens: removed from storage, kept in lab atmosphere 24 hours before testing
- Correlation between wet-tested and dry-tested cubes must be established
- Only vertical faces of cube (as-cast) should be tested

### Influence Factors (Clause 7)
- **Cement type**: High alumina → 100% higher strength; Supersulphated → 50% lower
- **Aggregate type**: Gravels vs crushed rock → different correlations; lightweight needs special calibration
- **Surface condition**: Open texture/honeycombed/no-fines → unsuitable. Trowelled/floated → harder than moulded
- **Moisture**: Wet surface → underestimates by ~20% vs dry
- **Age**: Effect can be ignored between 3 days and 3 months
- **Carbonation**: Can cause overestimate up to 50%

### Interpretation (Clause 8)
- Accuracy: **± 25 percent**
- Rebound indices indicate strength only to a limited depth from surface
- NOT a substitute for compression test
- Used for uniformity assessment and comparing one element to another

## Common Concrete Grade Requirements (IS 456:2000 reference)
- M15: 15 N/mm² at 28 days  |  M20: 20 N/mm²  |  M25: 25 N/mm²
- M30: 30 N/mm²  |  M35: 35 N/mm²  |  M40: 40 N/mm²
- 7-day strength is typically 65-70% of 28-day strength
`;

const AUTO_ANALYZE_PROMPT = `Analyze this uploaded site test report / reading document. Provide a comprehensive compliance analysis in this exact format:

### Document Summary
Brief description of what this document contains.

### Test Results Extracted
List all test values, readings, specimen details, dates found in the document.

### IS Code Compliance Check
For each test result, check against the relevant IS standard:
- Compare values against IS 516:1959 requirements (for compression/flexural tests)
- Compare against IS 13311 Part 2:1992 requirements (for rebound hammer readings)
- Flag any values that are below grade requirements
- Check if procedures described match IS code procedures

### Verdict
- **PASS / FAIL / NEEDS ATTENTION** for each parameter
- Overall quality assessment

### Recommendations
Specific actions if any readings are concerning.

Be precise — cite clause numbers from the IS codes. If the document is not a test report, describe what it contains and how it relates to construction quality.`;

/* ──────────────────────────────────────────────
   Styles — mobile-first
   ────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@300;400;500&display=swap');

  :root {
    --bg: #0d0d0d;
    --surface: #161616;
    --surface2: #1e1e1e;
    --border: #2a2a2a;
    --accent: #c8a96e;
    --accent2: #8fbe8f;
    --text: #e8e2d9;
    --muted: #666;
    --user-bubble: #1a2a1a;
    --ai-bubble: #1c1c1c;
    --danger: #e08080;
    --pass: #8fbe8f;
    --fail: #e08080;
    --warn: #d4a94a;
  }

  * { box-sizing: border-box; }

  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
    font-family: 'IBM Plex Sans', sans-serif;
  }

  /* ── TOP BAR ── */
  .top-bar {
    padding: 12px 16px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }
  .logo-mark {
    width: 36px; height: 36px;
    background: rgba(200,169,110,0.15);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; flex-shrink: 0;
  }
  .logo-text { flex: 1; }
  .logo-title {
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    color: var(--accent);
  }
  .logo-sub {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    color: var(--muted);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .top-actions { display: flex; gap: 8px; }
  .icon-btn {
    background: none; border: 1px solid var(--border);
    color: var(--muted); padding: 6px 10px; border-radius: 8px;
    cursor: pointer; font-size: 12px;
    font-family: 'IBM Plex Mono', monospace;
    letter-spacing: 0.05em; transition: all 0.2s;
  }
  .icon-btn:hover { border-color: var(--accent); color: var(--accent); }

  /* ── FILE INFO BAR ── */
  .file-bar {
    padding: 8px 16px;
    background: var(--surface2);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
    animation: slideDown 0.2s ease;
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .file-bar-icon { font-size: 16px; }
  .file-bar-info { flex: 1; overflow: hidden; }
  .file-bar-name {
    font-size: 12px; font-weight: 500; color: var(--text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .file-bar-size {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px; color: var(--muted);
  }
  .file-bar-status {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px; letter-spacing: 0.08em;
    padding: 3px 10px; border-radius: 20px; text-transform: uppercase;
    display: flex; align-items: center; gap: 4px;
    flex-shrink: 0;
  }
  .file-bar-status.analyzing {
    background: rgba(200,169,110,0.12);
    color: var(--accent);
  }
  .file-bar-status.ready {
    background: rgba(143,190,143,0.1);
    color: var(--accent2);
  }
  .file-bar-status .dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: currentColor; animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; } 50% { opacity: 0.3; }
  }
  .remove-btn {
    background: none; border: none; color: var(--muted);
    cursor: pointer; font-size: 16px; padding: 2px 4px;
    border-radius: 4px; line-height: 1;
  }
  .remove-btn:hover { color: var(--danger); }

  /* ── UPLOAD SCREEN ── */
  .upload-screen {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 32px 24px; gap: 24px; text-align: center;
  }
  .upload-hero { font-size: 64px; opacity: 0.7; }
  .upload-title {
    font-family: 'Playfair Display', serif;
    font-size: 26px; color: var(--text); line-height: 1.3;
  }
  .upload-desc {
    font-size: 14px; color: var(--muted); max-width: 320px; line-height: 1.8;
  }

  .upload-btn {
    position: relative; overflow: hidden;
    background: var(--accent); color: #0d0d0d;
    border: none; border-radius: 14px;
    padding: 16px 40px; font-size: 16px; font-weight: 500;
    cursor: pointer; font-family: 'IBM Plex Sans', sans-serif;
    transition: transform 0.1s, opacity 0.2s;
    box-shadow: 0 4px 20px rgba(200,169,110,0.25);
  }
  .upload-btn:hover { opacity: 0.9; transform: scale(1.02); }
  .upload-btn:active { transform: scale(0.98); }
  .upload-btn input[type="file"] {
    position: absolute; inset: 0; opacity: 0; cursor: pointer;
    width: 100%; height: 100%;
  }

  .drop-area {
    border: 1.5px dashed var(--border);
    border-radius: 14px; padding: 24px;
    width: 100%; max-width: 340px;
    transition: border-color 0.2s, background 0.2s;
    cursor: pointer; position: relative;
  }
  .drop-area.drag-over {
    border-color: var(--accent);
    background: rgba(200,169,110,0.04);
  }
  .drop-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px; color: var(--muted);
    letter-spacing: 0.06em;
  }
  .drop-label span { color: var(--accent); }

  .standards-badge {
    display: flex; align-items: center; gap: 8px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; color: var(--muted);
    letter-spacing: 0.05em;
    padding: 8px 14px; border-radius: 8px;
    background: var(--surface2);
    border: 1px solid var(--border);
  }
  .standards-badge .check { color: var(--accent2); }

  /* ── MESSAGES ── */
  .messages-area {
    flex: 1; overflow-y: auto;
    padding: 16px; display: flex;
    flex-direction: column; gap: 16px;
    scroll-behavior: smooth;
  }
  .messages-area::-webkit-scrollbar { width: 3px; }
  .messages-area::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

  .message {
    display: flex; gap: 10px;
    animation: msgIn 0.2s ease;
  }
  @keyframes msgIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .message.user { flex-direction: row-reverse; align-self: flex-end; max-width: 85%; }
  .message.ai { align-self: flex-start; max-width: 95%; }

  .avatar {
    width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 9px; flex-shrink: 0;
    font-family: 'IBM Plex Mono', monospace; font-weight: 500;
  }
  .message.user .avatar {
    background: rgba(200,169,110,0.15);
    color: var(--accent);
    border: 1px solid rgba(200,169,110,0.3);
  }
  .message.ai .avatar {
    background: var(--surface2);
    color: var(--accent2);
    border: 1px solid var(--border);
  }

  .bubble {
    padding: 12px 16px; border-radius: 12px;
    font-size: 14px; line-height: 1.75;
  }
  .message.user .bubble {
    background: var(--user-bubble);
    border: 1px solid rgba(143,190,143,0.15);
    color: #d4e8d4;
    border-radius: 12px 4px 12px 12px;
  }
  .message.ai .bubble {
    background: var(--ai-bubble);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: 4px 12px 12px 12px;
  }

  .bubble p { margin-bottom: 10px; }
  .bubble p:last-child { margin-bottom: 0; }
  .bubble strong { color: var(--accent); font-weight: 500; }
  .bubble h3 {
    font-family: 'Playfair Display', serif;
    font-size: 15px; color: var(--accent);
    margin-bottom: 8px; margin-top: 4px; font-weight: 600;
  }
  .bubble ul, .bubble ol { padding-left: 20px; margin-bottom: 10px; }
  .bubble li { margin-bottom: 5px; }
  .bubble code {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    background: rgba(255,255,255,0.06);
    padding: 2px 6px; border-radius: 4px;
    color: var(--accent2);
  }

  /* Typing */
  .typing { display: flex; gap: 4px; padding: 4px 2px; align-items: center; }
  .typing span {
    width: 6px; height: 6px; background: var(--muted);
    border-radius: 50%; animation: bounce 1.2s infinite;
  }
  .typing span:nth-child(2) { animation-delay: 0.2s; }
  .typing span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes bounce {
    0%, 100% { transform: translateY(0); opacity: 0.4; }
    50% { transform: translateY(-5px); opacity: 1; }
  }

  .stream-cursor::after {
    content: ''; animation: blink 0.8s infinite;
    color: var(--accent); margin-left: 2px;
  }
  @keyframes blink {
    0%, 100% { opacity: 1; } 50% { opacity: 0; }
  }

  .error-bubble {
    background: rgba(200, 60, 60, 0.08);
    border: 1px solid rgba(200, 60, 60, 0.2);
    color: var(--danger);
    padding: 12px 16px; border-radius: 8px; font-size: 13px;
  }

  /* ── INPUT AREA ── */
  .input-area {
    padding: 12px 16px 16px;
    border-top: 1px solid var(--border);
    background: var(--surface);
    flex-shrink: 0;
  }
  .input-area.safe-bottom {
    padding-bottom: max(16px, env(safe-area-inset-bottom));
  }
  .input-wrapper {
    display: flex; gap: 8px; align-items: flex-end;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 12px; padding: 10px 12px;
    transition: border-color 0.2s;
  }
  .input-wrapper:focus-within { border-color: rgba(200,169,110,0.4); }
  .input-wrapper textarea {
    flex: 1; background: none; border: none; outline: none;
    color: var(--text);
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 15px; line-height: 1.5;
    resize: none; min-height: 22px; max-height: 120px;
    overflow-y: auto; scrollbar-width: none;
  }
  .input-wrapper textarea::placeholder { color: var(--muted); }

  .input-actions { display: flex; gap: 6px; flex-shrink: 0; }

  .send-btn, .attach-btn, .mic-btn {
    width: 36px; height: 36px; border-radius: 8px;
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; flex-shrink: 0;
    transition: opacity 0.2s, transform 0.1s;
    line-height: 1;
  }
  .send-btn {
    background: var(--accent); color: #0d0d0d; font-weight: bold;
  }
  .send-btn:hover:not(:disabled) { opacity: 0.85; transform: scale(1.05); }
  .send-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  .attach-btn {
    background: var(--surface); color: var(--muted);
    border: 1px solid var(--border); position: relative; overflow: hidden;
  }
  .attach-btn:hover { color: var(--accent); border-color: var(--accent); }
  .attach-btn input[type="file"] {
    position: absolute; inset: 0; opacity: 0; cursor: pointer;
  }

  .mic-btn {
    background: var(--surface); color: var(--muted);
    border: 1px solid var(--border);
  }
  .mic-btn:hover { color: var(--accent); border-color: var(--accent); }
  .mic-btn.recording {
    background: rgba(200, 60, 60, 0.15);
    border-color: var(--danger);
    color: var(--danger);
    animation: pulse 1.5s infinite;
  }

  .input-hint {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px; color: var(--muted);
    margin-top: 6px; letter-spacing: 0.05em;
    text-align: center;
  }

  /* ── INSTALL BANNER ── */
  .install-banner {
    padding: 10px 16px;
    background: rgba(200,169,110,0.08);
    border-bottom: 1px solid rgba(200,169,110,0.15);
    display: flex; align-items: center; gap: 10px;
    flex-shrink: 0; animation: slideDown 0.3s ease;
  }
  .install-banner-text {
    flex: 1; font-size: 12px; color: var(--text);
  }
  .install-btn {
    background: var(--accent); color: #0d0d0d;
    border: none; border-radius: 6px;
    padding: 5px 14px; font-size: 11px; font-weight: 500;
    cursor: pointer; font-family: 'IBM Plex Sans', sans-serif;
    white-space: nowrap;
  }
  .dismiss-btn {
    background: none; border: none; color: var(--muted);
    cursor: pointer; font-size: 16px; padding: 2px;
  }

  /* ── DESKTOP ── */
  @media (min-width: 768px) {
    .messages-area { padding: 24px 32px; }
    .input-area { padding: 16px 32px 20px; }
    .message.ai { max-width: 75%; }
    .top-bar { padding: 16px 32px; }
    .file-bar { padding: 10px 32px; }
  }
`;

/* ──────────────────────────────────────────────
   Text formatting (markdown-lite)
   ────────────────────────────────────────────── */
function formatText(text) {
  const lines = text.split("\n");
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith("### ")) {
      elements.push(<h3 key={i}>{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h3 key={i}>{line.slice(3)}</h3>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const items = [];
      while (i < lines.length && (/^[-*] /.test(lines[i]))) {
        items.push(<li key={i}>{renderInline(lines[i].slice(2))}</li>);
        i++;
      }
      elements.push(<ul key={`ul-${i}`}>{items}</ul>);
      continue;
    } else if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(<li key={i}>{renderInline(lines[i].replace(/^\d+\.\s/, ""))}</li>);
        i++;
      }
      elements.push(<ol key={`ol-${i}`}>{items}</ol>);
      continue;
    } else {
      elements.push(<p key={i}>{renderInline(line)}</p>);
    }
    i++;
  }
  return elements;
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i}>{part.slice(1, -1)}</code>;
    return part;
  });
}

/* ──────────────────────────────────────────────
   Main App
   ────────────────────────────────────────────── */
export default function App() {
  const [file, setFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  // PWA install prompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Setup speech recognition
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-IN";
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => prev + transcript);
        setIsRecording(false);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setShowInstall(false);
    setInstallPrompt(null);
  };

  const toggleMic = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  // Handle file upload — triggers auto-analysis
  const handleFile = (f) => {
    if (!f || f.type !== "application/pdf") return;
    setFile(f);
    setMessages([]);
    setStreaming("");
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result.split(",")[1];
      setFileData(base64);
      // Auto-analyze immediately
      autoAnalyze(base64);
    };
    reader.readAsDataURL(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  // Auto-analyze on upload — no typing needed
  const autoAnalyze = async (base64Data) => {
    const userMsg = { role: "user", content: "[Auto-analysis triggered on upload]" };
    setMessages([userMsg]);
    setLoading(true);
    setStreaming("");

    try {
      const apiMessages = [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64Data,
              },
            },
            { type: "text", text: AUTO_ANALYZE_PROMPT },
          ],
        },
      ];

      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          system: IS_STANDARDS_KNOWLEDGE,
          messages: apiMessages,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error?.message || `API error ${resp.status}`);
      }

      const data = await resp.json();
      const aiText =
        data.content?.[0]?.text || "Sorry, I could not analyze this document.";

      // Stream the response for better UX
      let idx = 0;
      const interval = setInterval(() => {
        idx += 6;
        if (idx >= aiText.length) {
          setStreaming("");
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: aiText },
          ]);
          setLoading(false);
          clearInterval(interval);
        } else {
          setStreaming(aiText.slice(0, idx));
        }
      }, 8);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `__error__${err.message}` },
      ]);
      setLoading(false);
      setStreaming("");
    }
  };

  // Follow-up chat
  const sendMessage = async (text) => {
    if (!text.trim() || !fileData || loading) return;

    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);
    setStreaming("");

    try {
      // Build API messages — attach PDF only on the first real user message
      const apiMessages = [];
      let pdfAttached = false;
      for (const m of newMessages) {
        if (m.content === "[Auto-analysis triggered on upload]") {
          // Replace the auto-trigger message with actual PDF + prompt
          apiMessages.push({
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: fileData,
                },
              },
              { type: "text", text: AUTO_ANALYZE_PROMPT },
            ],
          });
          pdfAttached = true;
        } else {
          apiMessages.push({ role: m.role, content: m.content });
        }
      }

      // If somehow PDF wasn't attached yet, attach it on first user message
      if (!pdfAttached && apiMessages.length > 0) {
        const first = apiMessages[0];
        if (first.role === "user" && typeof first.content === "string") {
          apiMessages[0] = {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: fileData,
                },
              },
              { type: "text", text: first.content },
            ],
          };
        }
      }

      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          system: IS_STANDARDS_KNOWLEDGE,
          messages: apiMessages,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error?.message || `API error ${resp.status}`);
      }

      const data = await resp.json();
      const aiText =
        data.content?.[0]?.text || "Sorry, I could not generate a response.";

      let idx = 0;
      const interval = setInterval(() => {
        idx += 5;
        if (idx >= aiText.length) {
          setStreaming("");
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: aiText },
          ]);
          setLoading(false);
          clearInterval(interval);
        } else {
          setStreaming(aiText.slice(0, idx));
        }
      }, 8);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `__error__${err.message}` },
      ]);
      setLoading(false);
      setStreaming("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const autoResize = (e) => {
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  };

  const clearAll = () => {
    setFile(null);
    setFileData(null);
    setMessages([]);
    setStreaming("");
    setInput("");
  };

  const hasFile = !!file;
  const hasMessages = messages.length > 0;

  return (
    <>
      <style>{STYLES}</style>
      <div
        className="app"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {/* ── INSTALL BANNER ── */}
        {showInstall && (
          <div className="install-banner">
            <span style={{ fontSize: 20 }}>📲</span>
            <span className="install-banner-text">
              Install SiteCheck AI for quick access on site
            </span>
            <button className="install-btn" onClick={handleInstall}>
              Install
            </button>
            <button
              className="dismiss-btn"
              onClick={() => setShowInstall(false)}
            >
              ×
            </button>
          </div>
        )}

        {/* ── TOP BAR ── */}
        <div className="top-bar">
          <div className="logo-mark">🏗️</div>
          <div className="logo-text">
            <div className="logo-title">SiteCheck AI</div>
            <div className="logo-sub">IS Code Compliance Analyzer</div>
          </div>
          <div className="top-actions">
            {hasMessages && (
              <button className="icon-btn" onClick={clearAll}>
                New
              </button>
            )}
          </div>
        </div>

        {/* ── FILE INFO BAR ── */}
        {hasFile && (
          <div className="file-bar">
            <span className="file-bar-icon">📑</span>
            <div className="file-bar-info">
              <div className="file-bar-name">{file.name}</div>
              <div className="file-bar-size">
                {(file.size / 1024).toFixed(1)} KB
              </div>
            </div>
            <div
              className={`file-bar-status ${loading ? "analyzing" : "ready"}`}
            >
              <span className="dot" />
              {loading ? "Analyzing" : "Ready"}
            </div>
            <button className="remove-btn" onClick={clearAll} title="Remove">
              ×
            </button>
          </div>
        )}

        {/* ── MAIN CONTENT ── */}
        {!hasFile ? (
          /* Upload Screen */
          <div className={`upload-screen ${dragOver ? "drag-over" : ""}`}>
            <div className="upload-hero">🏗️</div>
            <div className="upload-title">
              Upload your site
              <br />
              test report
            </div>
            <div className="upload-desc">
              Drop a PDF from your construction site — concrete cube test,
              rebound hammer readings, or any lab report. AI will instantly
              analyze it against IS codes.
            </div>

            <button className="upload-btn">
              📄 Select PDF
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => handleFile(e.target.files[0])}
              />
            </button>

            <div
              className={`drop-area ${dragOver ? "drag-over" : ""}`}
              onClick={() =>
                document.querySelector(".upload-btn input").click()
              }
            >
              <div className="drop-label">
                or <span>drag & drop</span> your PDF here
              </div>
            </div>

            <div className="standards-badge">
              <span className="check">✓</span>
              IS 516:1959 &nbsp;·&nbsp; IS 13311-2:1992 &nbsp;loaded
            </div>
          </div>
        ) : (
          /* Chat Area */
          <>
            <div className="messages-area">
              {messages.map((msg, i) =>
                msg.content === "[Auto-analysis triggered on upload]" ? (
                  <div key={i} className="message user">
                    <div className="avatar">YOU</div>
                    <div className="bubble">
                      📄 Uploaded <strong>{file?.name}</strong> for analysis
                    </div>
                  </div>
                ) : (
                  <div
                    key={i}
                    className={`message ${msg.role === "user" ? "user" : "ai"}`}
                  >
                    <div className="avatar">
                      {msg.role === "user" ? "YOU" : "AI"}
                    </div>
                    <div className="bubble">
                      {msg.role === "assistant" ? (
                        msg.content.startsWith("__error__") ? (
                          <div className="error-bubble">
                            ⚠ {msg.content.slice(9)}
                          </div>
                        ) : (
                          formatText(msg.content)
                        )
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                )
              )}

              {streaming && (
                <div className="message ai">
                  <div className="avatar">AI</div>
                  <div className="bubble stream-cursor">
                    {formatText(streaming)}
                  </div>
                </div>
              )}

              {loading && !streaming && (
                <div className="message ai">
                  <div className="avatar">AI</div>
                  <div className="bubble">
                    <div className="typing">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ── INPUT ── */}
            <div className="input-area safe-bottom">
              <div className="input-wrapper">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    autoResize(e);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a follow-up question..."
                  disabled={loading}
                  rows={1}
                />
                <div className="input-actions">
                  {/* Mic button */}
                  {recognitionRef.current && (
                    <button
                      className={`mic-btn ${isRecording ? "recording" : ""}`}
                      onClick={toggleMic}
                      title={isRecording ? "Stop recording" : "Voice input"}
                    >
                      🎤
                    </button>
                  )}
                  {/* Attach another file */}
                  <button className="attach-btn" title="Upload new PDF">
                    📎
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleFile(e.target.files[0])}
                    />
                  </button>
                  {/* Send */}
                  <button
                    className="send-btn"
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || loading}
                  >
                    ↑
                  </button>
                </div>
              </div>
              <div className="input-hint">
                IS 516 · IS 13311 standards loaded · Voice or type your question
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
