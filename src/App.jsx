import { useState, useRef, useEffect } from "react";
import html2pdf from "html2pdf.js";

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

## DATA AUTHENTICITY VERIFICATION FRAMEWORK

You MUST apply the following checks to every uploaded report to assess whether the raw data is genuine, fabricated, or manipulated. Be blunt — flag everything suspicious.

### 1. Statistical Consistency Checks
- **Suspiciously uniform readings**: If all cube test results or rebound numbers are nearly identical (e.g., 28.1, 28.2, 28.0, 28.1), flag as likely fabricated. Real concrete testing always has natural variation (typically 5-15% CoV for cubes, wider for rebound).
- **Coefficient of Variation (CoV)**: Calculate CoV for any set of readings. Cube tests: CoV < 2% is suspicious, CoV > 20% suggests poor quality control. Rebound hammer: CoV < 3% across multiple points is suspicious.
- **Perfect round numbers**: Real lab results rarely come out to exact round numbers (e.g., exactly 25.0, 30.0). Multiple round numbers = red flag.
- **All values barely passing**: If every single result is just 1-3% above the required grade strength, flag as suspicious — statistically unlikely for all specimens to cluster right above the threshold.

### 2. Procedural Compliance Checks
- **Specimen count**: IS 516 requires minimum 3 cubes per test age. Fewer = non-compliant.
- **Individual variation**: Per IS 516, individual result must not deviate >15% from average of 3. Check this.
- **Test ages**: Were specimens tested at correct ages (7-day, 28-day)? Check if dates on casting and testing are consistent. If 28-day test is done on day 25 or day 35, flag it.
- **Rebound hammer readings**: IS 13311-2 requires minimum 9 readings per face, 6 readings per observation point. Check if enough readings were taken.
- **Outlier removal**: Was IS 8900:1978 applied for outlier rejection in rebound data? If all readings kept with no outliers in a large set, suspicious.
- **Surface preparation**: Was surface condition noted? Wet/dry? Smooth/rough? Missing info = incomplete testing.
- **Hammer calibration**: Is there mention of anvil calibration check? If not, results are questionable.

### 3. Cross-Validation Checks
- **7-day vs 28-day correlation**: 7-day strength should be 65-70% of 28-day. If 7-day is higher than 28-day, data is clearly wrong. If ratio is outside 55-80%, flag for investigation.
- **Rebound number vs compressive strength**: If both are reported, check if they correlate reasonably. Rebound number 20-30 typically maps to 15-30 N/mm². A rebound of 20 with claimed strength of 40 N/mm² is contradictory.
- **Cube vs cylinder strength**: Cylinder strength is typically 0.8× cube strength. Cross-check if both are reported.
- **Consistency across elements**: If multiple structural elements (columns, beams, slabs) of same grade all show identical values, suspicious.

### 4. Document Integrity Checks
- **Missing information**: A legitimate lab report must have: lab name/NABL accreditation, project name, date of casting, date of testing, mix grade, specimen ID, testing machine details. Missing any = incomplete.
- **Lab accreditation**: Check if NABL accreditation number is mentioned. Unaccredited lab results are less reliable.
- **Signature and stamp**: Note if report appears to be unsigned or missing official stamps (if visible in scan).
- **Date consistency**: Casting date must precede testing date by the stated test age. Check arithmetic.
- **Mix design reference**: Is mix design or grade mentioned? Results without specifying target grade cannot be assessed.

### 5. Red Flags Summary
Rate the data authenticity as:
- **AUTHENTIC** — Natural variation, complete documentation, all cross-checks pass
- **QUESTIONABLE** — Some anomalies found, may need retesting or clarification
- **LIKELY FABRICATED** — Multiple statistical red flags, suspicious patterns, missing critical info
- **INSUFFICIENT DATA** — Not enough information in the document to verify
`;

const AUTO_ANALYZE_PROMPT = `Analyze this uploaded site test report / reading document. Generate a professional **Structural Quality Assessment Report** in the exact format below. Use numbered sections, proper headings, and structured data presentation like a real engineering consultancy report.

---

## STRUCTURAL QUALITY ASSESSMENT REPORT

**Project:** [Extract from document]
**Client:** [Extract from document]
**Structure Type:** [Extract from document]
**Date of Testing:** [Extract from document]
**Report Reference:** SiteCheck-AI/[auto-generate]
**Assessment By:** SiteCheck AI (IS Code Compliance Engine)
**Applicable Standards:** IS 516:1959, IS 13311 (Part 2):1992

---

## 1. EXECUTIVE SUMMARY

[2-3 paragraph summary: what tests were conducted, key findings, overall quality classification, and whether immediate action is needed. Be direct.]

---

## 2. TEST RESULTS AND RAW DATA

### 2.1 Rebound Hammer Test (As per IS 13311 Part 2)

[For each element tested, present as:]

**[Element Name] (e.g., Column C1)**
- Raw readings: [list all individual readings]
- Average (after outlier rejection per IS 8900:1978): [value]

[After all elements:]

**Rebound Hammer Interpretation**
- Rebound range: [min – max]
- Predominant range: [range]
- Estimated equivalent in-situ compressive strength: [value] MPa

### 2.2 Compression Test Results (As per IS 516:1959)

[If compression data exists, present as table:]

| Specimen ID | Grade | Age (days) | Load (kN) | Strength (N/mm²) | Required (N/mm²) | Status |
|---|---|---|---|---|---|---|

### 2.3 Flexural Test Results (As per IS 516:1959)

[If flexural data exists, present similarly]

### 2.4 Ultrasonic Pulse Velocity (If present)

[Present raw readings and IS 516 classification: Excellent/Good/Medium/Doubtful]

---

## 3. IS CODE COMPLIANCE CHECK

### 3.1 Procedural Compliance
[Check each against IS code requirements — specimen sizes, load rates, number of readings, surface preparation, curing conditions. Cite clause numbers.]

### 3.2 Strength Compliance
[Compare each result against grade requirements. State PASS/FAIL for each.]

### 3.3 Testing Protocol Compliance
[Were minimum specimens tested? Correct ages? Proper equipment? Calibration mentioned?]

---

## 4. DATA AUTHENTICITY VERIFICATION

### 4.1 Statistical Analysis
- Coefficient of Variation (CoV) for each data set: [calculate]
- Distribution pattern: [natural/suspicious/uniform]
- Round number frequency: [assessment]
- Threshold clustering: [are values suspiciously close to pass marks?]

### 4.2 Cross-Validation
- 7-day vs 28-day ratio: [if applicable]
- Rebound number vs compressive strength correlation: [consistent/contradictory]
- Inter-element consistency: [natural variation or copy-paste pattern?]

### 4.3 Document Completeness
- Lab name and accreditation: [present/missing]
- Testing machine details: [present/missing]
- Specimen identification: [present/missing]
- Date arithmetic check: [casting → testing dates consistent?]
- Signatures/stamps: [noted/not visible]

### 4.4 Authenticity Rating
**[AUTHENTIC / QUESTIONABLE / LIKELY FABRICATED / INSUFFICIENT DATA]**
[Specific reasons for the rating]

---

## 5. COMBINED ASSESSMENT AND VERDICT

| Parameter | Result | IS Requirement | Status |
|---|---|---|---|
| [parameter] | [value] | [requirement with clause] | **PASS/FAIL/NEEDS ATTENTION** |

**Overall Quality Classification:** [Excellent/Good/Medium/Doubtful/Poor]
**Data Authenticity Confidence:** [High/Medium/Low]
**Structural Safety Assessment:** [Safe/Needs Monitoring/Needs Strengthening/Unsafe]

---

## 6. RECOMMENDATIONS

### 6.1 Immediate Actions
[Priority actions needed, if any]

### 6.2 Further Testing Required
[Specific retests or additional tests recommended]

### 6.3 Strengthening Measures
[If applicable — grouting, jacketing, FRP wrapping, etc.]

### 6.4 Monitoring Plan
[Long-term monitoring recommendations]

---

**Disclaimer:** This AI-generated assessment is based on the uploaded document and IS code knowledge. It should be reviewed by a qualified structural engineer before any action is taken. SiteCheck AI is a decision-support tool, not a replacement for professional engineering judgment.

---

Be precise — cite clause numbers from IS codes. Do not soften findings. If the document is not a test report, describe what it contains and adapt the report format accordingly.`;

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

  /* ── REPORT STYLES (in-chat) ── */
  .report-hr {
    border: none;
    border-top: 1.5px solid var(--border);
    margin: 16px 0;
  }
  .report-section-heading {
    font-family: 'Playfair Display', serif;
    font-size: 16px;
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 4px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin: 20px 0 10px 0;
    font-weight: 600;
  }
  .report-subsection-heading {
    font-family: 'Playfair Display', serif;
    font-size: 14px;
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 3px;
    margin: 14px 0 8px 0;
    font-weight: 600;
  }
  .report-table-wrapper {
    overflow-x: auto;
    margin: 10px 0;
    -webkit-overflow-scrolling: touch;
  }
  .report-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    min-width: 400px;
  }
  .report-table th {
    background: rgba(200,169,110,0.12);
    border: 1px solid var(--border);
    padding: 6px 10px;
    font-weight: 600;
    text-align: left;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--accent);
    white-space: nowrap;
  }
  .report-table td {
    border: 1px solid var(--border);
    padding: 5px 10px;
    color: var(--text);
  }
  .report-table tr:nth-child(even) {
    background: rgba(255,255,255,0.02);
  }

  /* Export button */
  .export-btn {
    display: inline-flex; align-items: center; gap: 6px;
    background: none;
    border: 1px solid var(--accent);
    color: var(--accent);
    padding: 6px 14px; border-radius: 8px;
    cursor: pointer; font-size: 11px;
    font-family: 'IBM Plex Mono', monospace;
    letter-spacing: 0.06em; text-transform: uppercase;
    transition: all 0.2s;
    margin: 8px 0;
  }
  .export-btn:hover {
    background: var(--accent);
    color: #0d0d0d;
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

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={i} className="report-hr" />);
      i++; continue;
    }

    // Section heading ## (report sections)
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="report-section-heading">
          {renderInline(line.slice(3))}
        </h2>
      );
      i++; continue;
    }

    // Subsection heading ###
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="report-subsection-heading">
          {renderInline(line.slice(4))}
        </h3>
      );
      i++; continue;
    }

    // Markdown table
    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableRows = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim().startsWith("|")) {
        const row = lines[i].trim();
        // Skip separator rows like |---|---|
        if (/^\|[\s-:|]+\|$/.test(row)) { i++; continue; }
        const cells = row.split("|").filter((c, idx, arr) => idx > 0 && idx < arr.length - 1).map(c => c.trim());
        tableRows.push(cells);
        i++;
      }
      if (tableRows.length > 0) {
        const header = tableRows[0];
        const body = tableRows.slice(1);
        elements.push(
          <div key={`table-${i}`} className="report-table-wrapper">
            <table className="report-table">
              <thead>
                <tr>{header.map((h, hi) => <th key={hi}>{renderInline(h)}</th>)}</tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{renderInline(cell)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Unordered list
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const items = [];
      while (i < lines.length && (/^[-*] /.test(lines[i]))) {
        items.push(<li key={i}>{renderInline(lines[i].slice(2))}</li>);
        i++;
      }
      elements.push(<ul key={`ul-${i}`}>{items}</ul>);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(<li key={i}>{renderInline(lines[i].replace(/^\d+\.\s/, ""))}</li>);
        i++;
      }
      elements.push(<ol key={`ol-${i}`}>{items}</ol>);
      continue;
    }

    // Regular paragraph
    elements.push(<p key={i}>{renderInline(line)}</p>);
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
   PDF Export
   ────────────────────────────────────────────── */
function exportReportAsPDF(reportContent, fileName) {
  const genDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

  const container = document.createElement("div");
  container.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;600;700&display=swap');

      * { margin: 0; padding: 0; box-sizing: border-box; }

      .pdf-page {
        font-family: 'Source Sans 3', 'Segoe UI', Arial, sans-serif;
        color: #1a1a1a;
        background: #fff;
        padding: 0;
        max-width: 210mm;
      }

      /* ── LETTERHEAD HEADER ── */
      .letterhead {
        padding: 30px 45px 0 45px;
      }
      .letterhead-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 6px;
      }
      .letterhead-logo {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .logo-icon {
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .logo-icon svg {
        width: 60px;
        height: 60px;
      }
      .letterhead-info {
        text-align: right;
      }
      .company-name {
        font-family: 'Playfair Display', serif;
        font-size: 24px;
        font-weight: 700;
        letter-spacing: 2px;
        text-transform: uppercase;
        color: #1a1a1a;
      }
      .company-details {
        font-size: 10px;
        color: #555;
        line-height: 1.6;
        margin-top: 2px;
      }
      .letterhead-line {
        height: 3px;
        background: linear-gradient(90deg, #1a1a1a 0%, #888 60%, transparent 100%);
        margin: 12px 0 0 0;
        border-radius: 2px;
      }

      /* ── REPORT BODY ── */
      .pdf-body {
        padding: 20px 45px 30px 45px;
      }

      .report-title {
        font-family: 'Playfair Display', serif;
        font-size: 18px;
        font-weight: 700;
        text-align: center;
        text-decoration: underline;
        text-underline-offset: 5px;
        text-transform: uppercase;
        letter-spacing: 2px;
        margin: 16px 0 24px 0;
        color: #1a1a1a;
      }

      h2 {
        font-family: 'Playfair Display', serif;
        font-size: 14px;
        font-weight: 700;
        text-transform: uppercase;
        text-decoration: underline;
        text-underline-offset: 4px;
        margin: 28px 0 14px 0;
        letter-spacing: 0.8px;
        color: #1a1a1a;
        page-break-after: avoid;
      }
      h3 {
        font-size: 12.5px;
        font-weight: 600;
        text-decoration: underline;
        text-underline-offset: 3px;
        margin: 18px 0 10px 0;
        color: #333;
        page-break-after: avoid;
      }

      p {
        font-size: 11px;
        line-height: 1.75;
        margin-bottom: 8px;
        text-align: justify;
      }
      strong { font-weight: 700; }

      ul, ol {
        padding-left: 22px;
        margin-bottom: 10px;
      }
      li {
        font-size: 11px;
        line-height: 1.75;
        margin-bottom: 4px;
      }

      hr {
        border: none;
        border-top: 1.5px solid #333;
        margin: 22px 0;
      }

      /* ── TABLES ── */
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 14px 0;
        font-size: 10px;
        page-break-inside: avoid;
      }
      th {
        background: #f2f2f2;
        border: 1px solid #999;
        padding: 7px 10px;
        font-weight: 700;
        text-align: left;
        text-transform: uppercase;
        font-size: 9.5px;
        letter-spacing: 0.4px;
        color: #333;
      }
      td {
        border: 1px solid #bbb;
        padding: 6px 10px;
        font-size: 10.5px;
      }
      tr:nth-child(even) { background: #f9f9f9; }

      code {
        font-family: 'Courier New', monospace;
        font-size: 10px;
        background: #f0f0f0;
        padding: 1px 4px;
        border-radius: 2px;
      }

      /* ── VERDICT COLORS ── */
      .pass { color: #1a7a1a; font-weight: 700; }
      .fail { color: #c0392b; font-weight: 700; }
      .warn { color: #b8860b; font-weight: 700; }

      /* ── FOOTER ── */
      .pdf-footer {
        margin-top: 36px;
        padding: 16px 0 0 0;
        border-top: 2px solid #333;
        font-size: 9px;
        color: #777;
        line-height: 1.7;
      }
      .pdf-footer .disclaimer-title {
        font-weight: 700;
        font-size: 9.5px;
        color: #555;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }
      .pdf-footer-bottom {
        display: flex;
        justify-content: space-between;
        margin-top: 12px;
        padding-top: 8px;
        border-top: 1px solid #ddd;
        font-size: 8.5px;
        color: #999;
      }
    </style>

    <div class="pdf-page">
      <!-- LETTERHEAD -->
      <div class="letterhead">
        <div class="letterhead-row">
          <div class="letterhead-logo">
            <div class="logo-icon">
              <svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
                <rect x="5" y="10" width="8" height="40" fill="#1a1a1a" transform="skewX(-10)"/>
                <rect x="18" y="10" width="8" height="40" fill="#1a1a1a" transform="skewX(-10)"/>
                <rect x="31" y="10" width="8" height="40" fill="#1a1a1a" transform="skewX(-10)"/>
                <line x1="0" y1="52" x2="60" y2="48" stroke="#1a1a1a" stroke-width="2"/>
              </svg>
            </div>
          </div>
          <div class="letterhead-info">
            <div class="company-name">SiteCheck AI</div>
            <div class="company-details">
              IS Code Compliance Analysis Engine<br/>
              Structural Quality Assessment Platform<br/>
              Ref. Standards: IS 516:1959 | IS 13311 (Part 2):1992
            </div>
          </div>
        </div>
        <div class="letterhead-line"></div>
      </div>

      <!-- BODY -->
      <div class="pdf-body">
        <div class="report-title">Structural Quality Assessment Report</div>

        ${markdownToHTML(reportContent)}

        <!-- FOOTER -->
        <div class="pdf-footer">
          <div class="disclaimer-title">Disclaimer</div>
          This AI-generated assessment is based on the uploaded document and IS code knowledge.
          It should be reviewed by a qualified structural engineer before any action is taken.
          SiteCheck AI is a decision-support tool, not a replacement for professional engineering judgment.
          The authenticity verification is based on statistical patterns and document analysis — it does not
          constitute a legal or forensic opinion.
          <div class="pdf-footer-bottom">
            <span>Generated by SiteCheck AI on ${genDate}</span>
            <span>IS 516:1959 | IS 13311-2:1992 | IS 456:2000</span>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  const opt = {
    margin: [5, 8, 10, 8],
    filename: fileName || "SiteCheck-Report.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] },
  };

  html2pdf().set(opt).from(container).save().then(() => {
    document.body.removeChild(container);
  });
}

function markdownToHTML(md) {
  let html = md;
  // Horizontal rules
  html = html.replace(/^---+$/gm, "<hr/>");
  // Tables
  html = html.replace(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)+)/gm, (match, headerLine, sepLine, bodyLines) => {
    const headers = headerLine.split("|").filter((c, i, a) => i > 0 && i < a.length - 1).map(c => `<th>${inlineToHTML(c.trim())}</th>`).join("");
    const rows = bodyLines.trim().split("\n").map(row => {
      const cells = row.split("|").filter((c, i, a) => i > 0 && i < a.length - 1).map(c => `<td>${inlineToHTML(c.trim())}</td>`).join("");
      return `<tr>${cells}</tr>`;
    }).join("");
    return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
  });
  // Headings
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  // Lists
  html = html.replace(/^[-*] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  // PASS/FAIL coloring
  html = html.replace(/\bPASS\b/g, '<span class="pass">PASS</span>');
  html = html.replace(/\bFAIL\b/g, '<span class="fail">FAIL</span>');
  // Paragraphs — wrap remaining lines
  html = html.replace(/^(?!<[huptlo]|<hr|<li|<table|<thead|<tbody|<tr|<td|<th|<ul|<\/)(.*\S.*)$/gm, "<p>$1</p>");
  return html;
}

function inlineToHTML(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\bPASS\b/g, '<span class="pass">PASS</span>')
    .replace(/\bFAIL\b/g, '<span class="fail">FAIL</span>');
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

              {/* Export PDF button — show when there's a completed AI report */}
              {!loading && messages.some((m) => m.role === "assistant" && !m.content.startsWith("__error__")) && (
                <button
                  className="export-btn"
                  onClick={() => {
                    const lastReport = [...messages].reverse().find(
                      (m) => m.role === "assistant" && !m.content.startsWith("__error__")
                    );
                    if (lastReport) {
                      const safeName = file?.name?.replace(/\.pdf$/i, "") || "report";
                      exportReportAsPDF(
                        lastReport.content,
                        `SiteCheck-${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`
                      );
                    }
                  }}
                >
                  📄 Export as PDF
                </button>
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
