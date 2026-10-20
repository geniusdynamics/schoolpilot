# 03 — Curriculum & Assessment Engine

## 1. Requirements

| # | Requirement |
| --- | --- |
| C-1 | A school can run **several programmes at once** (e.g. CBE Junior School + 8-4-4 Forms 3–4 during Kenya's transition; British + national in an international school), each with its own levels, learning areas, calendar, grading and report cards. |
| C-2 | Everything curriculum-specific is **data in a versioned Curriculum Pack**; the engine has no knowledge of "KCSE", "Form", "EE", "A*" or "/20". |
| C-3 | Packs are **updatable without migrations of school data**: a new pack version applies from a chosen academic year; historical results keep the version they were computed with. |
| C-4 | Assessment supports **marks, rubric levels, competencies, descriptors, absent/exempt codes, components and coursework**, entered by the teachers allocated to that group. |
| C-5 | Results computation is **deterministic, explainable and re-runnable** ("why is this learner's mean grade B-?" shows the calculation). |
| C-6 | Aggregation supports **weighted means, coefficients (/20), best-N with group constraints, points, divisions, GPA, cumulative/annual averages**. |
| C-7 | Ranking/positions are **optional per programme and per report**, with explicit tie rules. |
| C-8 | Report cards are **template-driven per pack**, brandable per school, printable on A4/A5, exportable as PDF, distributable via portal/SMS link, and frozen once published. |
| C-9 | Promotion/progression rules are **declarative** (automatic, threshold-based, class-council) with a preview → approve → commit workflow. |
| C-10 | Every pack ships **conformance test vectors** that CI runs against the engine. |

## 2. Curriculum Pack format

### 2.1 Layout

```
packs/
  ke-cbe/
    pack.json              # metadata, version, issuer, effective dates, dependencies
    structure.json         # stages, levels, pathways, calendar template
    learning-areas.json    # learning areas, components, outcomes, competencies, combination rules
    assessment.json        # assessment schemes, grading scales, aggregations, ranking policy
    progression.json       # promotion/graduation rules
    reports/
      primary-term.report.json
      junior-school-term.report.json
    locales/
      en.json  sw.json     # labels, descriptors, comment-bank seeds
    tests/
      grading.vectors.json # conformance vectors
    README.md              # sources (KICD/KNEC/MoE documents), verification status, maintainers
```

Packs are plain JSON validated by a published JSON Schema (`packs/schema/pack.schema.json`).
They are loaded by a **pack registry**; the core ships a few, the community contributes
others through pull requests reviewed by maintainers with a cited source document.

### 2.2 `pack.json`

```json
{
  "code": "ke-cbe",
  "name": "Kenya Competency-Based Education (CBE)",
  "version": "2026.1.0",
  "country": "KE",
  "issuers": ["KICD", "KNEC", "Ministry of Education"],
  "effective_from": "2026-01-01",
  "supersedes": "ke-cbc@2024.2.0",
  "languages": ["en", "sw"],
  "requires_engine": ">=1.0.0",
  "sources": [
    { "title": "Basic Education Curriculum Framework", "issuer": "KICD", "url": "…", "retrieved": "2026-09-01" }
  ],
  "verification": { "status": "draft", "verified_by": [], "notes": "Bands must be checked against the current KNEC circular before release." }
}
```

### 2.3 Versioning and overrides
- Semantic version: **major** = structural change (levels/learning areas renamed), **minor** = new options/templates, **patch** = label/comment fixes.
- A programme pins `pack_code@version`. Upgrading is an explicit admin action with a diff preview, applied from a selected academic year.
- Schools may **override** within limits declared by the pack (`"overridable": ["grading_scales.kcse_subject.bands", "reports.*.branding"]`). Overrides are stored on the programme and shown on report footers ("School grading policy").

## 3. Structural model in a pack

```json
{
  "stages": [
    { "code": "PP",  "name": "Pre-primary",     "levels": ["PP1", "PP2"] },
    { "code": "LP",  "name": "Lower Primary",   "levels": ["G1", "G2", "G3"] },
    { "code": "UP",  "name": "Upper Primary",   "levels": ["G4", "G5", "G6"] },
    { "code": "JS",  "name": "Junior School",   "levels": ["G7", "G8", "G9"] },
    { "code": "SS",  "name": "Senior School",   "levels": ["G10", "G11", "G12"] }
  ],
  "levels": [
    { "code": "G7", "name": "Grade 7", "ordinal": 9, "typical_age": 12, "next": "G8",
      "national_assessment": null },
    { "code": "G9", "name": "Grade 9", "ordinal": 11, "next": "G10", "is_stage_exit": true,
      "national_assessment": "KJSEA" }
  ],
  "pathways": [
    { "code": "STEM", "name": "STEM", "levels": ["G10", "G11", "G12"] },
    { "code": "SS",   "name": "Social Sciences", "levels": ["G10", "G11", "G12"] },
    { "code": "ASS",  "name": "Arts & Sports Science", "levels": ["G10", "G11", "G12"] }
  ],
  "calendar_template": {
    "year_kind": "calendar_year",
    "periods": [
      { "kind": "term", "sequence": 1, "name": "Term 1", "typical": ["01-06", "04-04"], "half_term": true },
      { "kind": "term", "sequence": 2, "name": "Term 2", "typical": ["04-28", "08-01"], "half_term": true },
      { "kind": "term", "sequence": 3, "name": "Term 3", "typical": ["08-25", "10-31"], "half_term": false }
    ],
    "note": "Exact dates are published annually by the Ministry; the wizard pre-fills and the school confirms."
  }
}
```

Learning areas:

```json
{
  "learning_areas": [
    { "code": "ENG", "name": "English", "kind": "core", "group": "languages", "levels": ["G7","G8","G9"],
      "national_code": null,
      "components": [], "outcomes_ref": "outcomes/eng-js.json" },
    { "code": "KIS", "name": "Kiswahili", "kind": "core", "group": "languages",
      "alternatives": ["KSL"], "levels": ["G7","G8","G9"] }
  ],
  "competencies": [
    { "code": "CC", "name": "Communication and Collaboration", "kind": "core_competency" },
    { "code": "VAL-RESP", "name": "Responsibility", "kind": "value" }
  ],
  "combination_rules": [
    { "levels": ["G10","G11","G12"], "rule": "core_all", "of": ["ENG","KIS|KSL","MAT|EMAT","CSL","PE"] },
    { "levels": ["G10","G11","G12"], "rule": "electives", "count": 3, "from_pathway": true }
  ]
}
```

## 4. Assessment scheme

An **assessment scheme** says which assessments exist in a period, how they are scored,
and how they combine into a learning-area result.

```json
{
  "schemes": [
    {
      "code": "ng-terminal",
      "levels": ["JSS1","JSS2","JSS3","SS1","SS2","SS3"],
      "slots": [
        { "code": "CA1",  "label": "1st C.A.", "max": 20, "kind": "cat" },
        { "code": "CA2",  "label": "2nd C.A.", "max": 20, "kind": "cat" },
        { "code": "EXAM", "label": "Exam",     "max": 60, "kind": "end_term" }
      ],
      "learning_area_score": { "op": "sum", "of": ["CA1","CA2","EXAM"], "out_of": 100 },
      "grading_scale": "waec",
      "missing": { "CA1": "zero", "CA2": "zero", "EXAM": "incomplete" }
    },
    {
      "code": "ke-844-internal",
      "levels": ["F1","F2","F3","F4"],
      "slots": [
        { "code": "CAT", "label": "CATs", "kind": "cat", "multi": true, "combine": "mean", "scale_to": 30 },
        { "code": "ET",  "label": "End Term", "kind": "end_term", "scale_to": 70 }
      ],
      "learning_area_score": { "op": "sum", "of": ["CAT","ET"], "out_of": 100 },
      "component_policy": { "papers": "scale_each_then_sum", "out_of": 100 },
      "grading_scale": "kcse_subject",
      "overridable": ["slots.*.scale_to"]
    },
    {
      "code": "ke-cbe-formative",
      "levels": ["G1","G2","G3","G4","G5","G6"],
      "evidence": "rubric_observations",
      "observation_scale": "cbe_4_level",
      "term_judgement": { "op": "teacher_best_fit", "suggest": "mode_of_latest_per_outcome" },
      "summative_slots": [ { "code": "ET", "label": "End-of-term test", "max": 100, "maps_to": "cbe_4_level" } ],
      "report_shows": ["rubric_level", "descriptor", "teacher_comment"]
    }
  ]
}
```

Rules:
- **Scores are stored raw** (as entered, with `max_score`); scaling, rounding and grading happen in the engine.
- **Components** (papers) are combined per `component_policy`: `sum`, `scale_each_then_sum`, `weighted`, or `best_of`.
- **Missing-mark policy** per slot: `zero`, `exclude` (renormalise weights), `incomplete` (no grade; flagged), `carry_previous`.
- **Exempt** learners are excluded from the learning area's denominators and rankings.
- **Rounding**: specified at each stage (`{"stage": "learning_area_score", "precision": 0, "mode": "half_up"}`); default is round only for display and grade lookup.

### 4.1 Period → annual
```json
{ "annual": { "op": "weighted_mean", "of": { "T1": 0.3, "T2": 0.3, "T3": 0.4 }, "missing": "renormalise" } }
```
Alternatives: `mean`, `final_period_only`, `cumulative_sum`, `best_of`.

## 5. Grading scales

Kinds: `numeric_bands`, `rubric`, `letter`, `points`, `division`, `gpa`, `out_of_20`,
`descriptor`. A band has `{ code, label, min, max, points?, descriptor? }` with inclusive
`min` and exclusive upper bound handling declared once per scale (`"upper": "inclusive"`).

```json
{
  "code": "cbe_8_level",
  "kind": "numeric_bands",
  "input": "percent",
  "bands": [
    { "code": "EE1", "label": "Exceeding Expectations 1",  "min": 90, "max": 100, "points": 8 },
    { "code": "EE2", "label": "Exceeding Expectations 2",  "min": 75, "max": 89,  "points": 7 },
    { "code": "ME1", "label": "Meeting Expectations 1",    "min": 58, "max": 74,  "points": 6 },
    { "code": "ME2", "label": "Meeting Expectations 2",    "min": 41, "max": 57,  "points": 5 },
    { "code": "AE1", "label": "Approaching Expectations 1","min": 31, "max": 40,  "points": 4 },
    { "code": "AE2", "label": "Approaching Expectations 2","min": 21, "max": 30,  "points": 3 },
    { "code": "BE1", "label": "Below Expectations 1",      "min": 11, "max": 20,  "points": 2 },
    { "code": "BE2", "label": "Below Expectations 2",      "min": 1,  "max": 10,  "points": 1 }
  ],
  "verification": "Bands as commonly published for Junior School/KJSEA reporting; confirm against the current KNEC circular."
}
```

## 6. Aggregation (overall results)

Aggregations compute period-level results from learning-area results. They are composable
operators; each produces a value plus an **explanation trace** stored with the result.

| Operator | Purpose | Example use |
| --- | --- | --- |
| `sum` / `mean` | Totals and averages over learning areas | Nigeria total & average, internal means |
| `weighted_mean` (by `coefficient`) | Coefficient-weighted average | Francophone `moyenne` (/20) |
| `best_n` with `groups` constraints | Pick N results satisfying group rules | KCSE best 7 (3 compulsory + ≥2 sciences + ≥1 humanity + 1 other) |
| `points_mean` → `lookup` | Mean points then grade lookup | KCSE mean grade |
| `sum_points` → `lookup(division)` | Aggregate of grade points then division | Uganda PLE (4 subjects), Tanzania CSEE (best 7) |
| `gpa` | Credit-weighted grade points | Tertiary/American-style programmes |
| `count_where` | Counts of grades/levels | "Number of learning areas at ME or above" |
| `rubric_profile` | Distribution of rubric levels across outcomes | CBC term summary |

Examples:

```json
{
  "aggregations": [
    {
      "code": "kcse_mean_grade",
      "op": "best_n",
      "n": 7,
      "value": "points",
      "groups": [
        { "require_all": ["ENG", "KIS", "MAT"] },
        { "group": "sciences",   "min": 2 },
        { "group": "humanities", "min": 1 },
        { "fill_from": "any" }
      ],
      "then": { "op": "mean", "precision": 3 },
      "result_scale": "kcse_mean_grade"
    },
    {
      "code": "ple_division",
      "op": "sum",
      "over": ["ENG", "MTC", "SCI", "SST"],
      "value": "grade_points",
      "result_scale": "ple_divisions",
      "fail_if": { "any_grade": "F9", "in": ["ENG", "MTC"], "then_max_division": "IV" }
    },
    {
      "code": "moyenne_trimestrielle",
      "op": "weighted_mean",
      "value": "score_20",
      "weights": "coefficient",
      "precision": 2,
      "result_scale": "mentions_fr"
    }
  ]
}
```

The `fail_if` example shows the escape hatch for national special cases; every such rule
must cite its source in the pack README and have test vectors.

### 6.1 Ranking policy
```json
{ "ranking": { "enabled": false, "scope": "class_group", "by": "kcse_mean_grade.points", "ties": "competition_1224",
               "only_complete": true, "show_on_report": false, "show_out_of": true } }
```
- Default **off** for CBE programmes; schools may enable per report.
- Tie methods: `competition_1224`, `dense_1223`, `shared_average`.
- Learners with incomplete results are listed but not ranked when `only_complete`.

## 7. Progression and promotion

```json
{
  "progression": [
    { "levels": ["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8"], "rule": "automatic" },
    { "levels": ["G9"], "rule": "stage_transition", "to_stage": "SS", "requires": ["national_assessment_recorded", "pathway_placement"] },
    { "levels": ["JSS1", "JSS2", "SS1", "SS2"], "rule": "threshold",
      "conditions": [ { "metric": "annual.average", "gte": 40 }, { "metric": "annual.ENG", "gte": 40 }, { "metric": "annual.MAT", "gte": 40 } ],
      "else": "repeat_or_council" },
    { "levels": ["6e", "5e", "4e", "2nde", "1ere"], "rule": "class_council", "suggest": { "metric": "annual.moyenne", "gte": 10 } }
  ],
  "graduation": [ { "levels": ["G12", "F4", "Y13", "SS3", "Terminale"], "rule": "graduate" } ]
}
```

Workflow (04 §6): **compute suggestions → review per class (override with reason) → approve (head) → commit** (closes current enrolments, opens next-year enrolments in mapped class groups, carries fee balances forward, archives class lists). Fully reversible until the next year's first billing run.

## 8. Report cards

### 8.1 Template model
A template is a list of **blocks** rendered to HTML → PDF (print-CSS, A4 portrait default;
A5 and landscape options):

`header` (logo, school name, motto, contacts, term/year) · `learner` (name, admission no.,
level/class, house, photo, identifiers) · `attendance` (days open, present, absent) ·
`results_table` (columns configurable: components, slots, total, grade, points, position,
class mean, highest/lowest, teacher initials, remark) · `rubric_table` (learning area ×
strand/sub-strand × level, with descriptors) · `competencies` (core competencies & values
ratings) · `affective_psychomotor` (Nigeria/Ghana-style trait ratings) · `co_curricular`
(clubs, sports, community service learning) · `summary` (total, mean, mean grade,
division, average /20, mention, position N/M) · `comments` (class teacher, head, boarding,
guidance) · `progression` (promoted/repeat decision on final term) · `fees` (balance,
next term fees — optional and policy-controlled) · `calendar` (closing date, next opening
date) · `signatures` · `verification` (QR code linking to a signed verification URL).

### 8.2 Behaviour
- Generate per class group or level in bulk; preview before publishing; publish locks results and stores `report_card.snapshot`.
- Comments: per-learner free text with comment-bank suggestions by band; length limits per template; spell-check friendly.
- Distribution: print queue, PDF download, guardian portal, SMS with a short signed link, email.
- **Fee-arrears gating is a school policy setting, off by default**, with a warning that some jurisdictions prohibit withholding results.
- Multilingual: template labels come from the pack locale (`en`, `sw`, `fr`, `pt`, `ar`).
- Transcript: multi-year cumulative record per learner from frozen snapshots.

## 9. Mark entry and moderation

- Entry surfaces: **by teaching group** (a teacher's allocated groups only), **by learner** (class teacher view), **CSV/XLSX import** with template download, **mobile** (one learner per screen, swipe).
- Grid behaviour: keyboard navigation, paste from spreadsheet, per-cell validation (0 ≤ score ≤ max, rubric code list), status codes (`ABS`, `EXM`, `INC`), autosave with offline queue, conflict warning if two teachers edit the same cell.
- Workflow states per assessment × teaching group: `open → submitted → moderated → locked → published`. Edits after `locked` require exams-officer permission and a reason; history retained.
- Moderation tools: distribution chart, mean/SD by teaching group, scale-adjust (linear) with audit.
- CBC observation capture: pick outcome/sub-strand, choose level, optional evidence photo/note; bulk "whole group at ME" with exceptions.

## 10. Analysis

Subject means and grade distributions by group/level/teacher; trend over periods; value-added
(entry vs. current); competency heat-maps; at-risk learner lists (attendance + performance);
national-assessment readiness. Analysis respects the ranking policy (no positions where disabled).

## 11. National exams & exports (plug-ins)

| Country | Plug-in | Purpose |
| --- | --- | --- |
| Kenya | `ke-kemis` | Learner registry export/import (UPI/assessment numbers) |
| Kenya | `ke-knec-registration` | KPSEA/KJSEA/KCSE candidate registration files and subject entries |
| UK/Intl | `cambridge-entries`, `pearson-entries` | Entry lists in board formats; result import |
| Nigeria/Ghana | `waec-entries` | WASSCE/BECE candidate lists |
| Uganda | `ug-uneb` | PLE/UCE/UACE registration lists |

Exports are generated from the canonical model; formats live in the plug-in, not the core.

## 12. Conformance testing

Each pack provides vectors:

```json
{
  "vectors": [
    { "name": "KCSE best-7 with 3 sciences", "programme": "ke-844",
      "input": { "ENG": "B+", "KIS": "B", "MAT": "A-", "BIO": "B", "CHE": "C+", "PHY": "B-", "HIS": "A", "CRE": "B+", "BST": "C" },
      "expect": { "kcse_mean_grade": { "total_points": 69, "points": 9.857, "grade": "B+" },
                  "selected": ["ENG","KIS","MAT","BIO","PHY","HIS","CRE"] } }
  ]
}
```

CI runs all vectors of all packs on every engine change. A pack cannot be marked
`verified` without vectors traced to an official example.

---

## Appendix A — Kenya Competency-Based Education (`ke-cbe`)

**Status:** draft — verify every list and band against current KICD/KNEC/MoE documents before release.

| Item | Specification |
| --- | --- |
| Structure | 2-6-3-3: Pre-primary PP1–PP2; Lower Primary G1–3; Upper Primary G4–6; Junior School G7–9; Senior School G10–12. Junior School may be hosted in a primary school ("comprehensive school", PP1–G9) or a secondary school; Senior School in secondary schools. |
| Calendar | Calendar year, 3 terms with mid-term breaks; dates published annually. |
| Learning areas (illustrative seeds) | Lower Primary: Indigenous Language, Kiswahili/KSL, English, Mathematics, Religious Education (CRE/IRE/HRE), Environmental Activities, Creative Activities. Upper Primary: English, Kiswahili/KSL, Mathematics, Religious Education, Science & Technology, Agriculture & Nutrition, Social Studies, Creative Arts. Junior School: English, Kiswahili/KSL, Mathematics, Religious Education, Integrated Science, Agriculture, Social Studies, Pre-Technical Studies, Creative Arts & Sports. Senior School: core set (English, Kiswahili/KSL, Mathematics (core/essential), Community Service Learning, Physical Education) + 3 electives from the chosen pathway per KICD subject combinations. |
| Pathways | STEM; Social Sciences; Arts & Sports Science (G10–12), with tracks within pathways as published by KICD. |
| Competencies & values | Core competencies: Communication & Collaboration; Critical Thinking & Problem Solving; Creativity & Imagination; Citizenship; Digital Literacy; Learning to Learn; Self-efficacy. Values: Love, Responsibility, Respect, Unity, Peace, Patriotism, Social Justice, Integrity. |
| Formative assessment | Rubric observations per strand/sub-strand; projects, portfolios, practicals; school-based assessments (SBA) feeding national composites where KNEC requires. |
| Scales | Primary: 4-level rubric — EE (4) Exceeding, ME (3) Meeting, AE (2) Approaching, BE (1) Below Expectations. Junior/Senior School: 8-level scale EE1…BE2 with points 8…1 (bands in §5 example). |
| National assessments | KPSEA (end of G6), KJSEA (end of G9) with composite scoring from school-based and national components as published by KNEC; Senior School exit assessment per KNEC. The pack models these as `national_assessment` records with configurable composite weights; no weights are hard-coded. |
| Progression | Automatic within a stage; G9 → G10 requires pathway placement (record placement outcome and school). |
| Ranking | Disabled by default. |
| Reports | Primary term report: learning areas × rubric level + descriptor + teacher comment; core competencies & values; co-curricular; attendance. Junior School report: learning areas with % and 8-level code/points, summary points, comments. |
| Identifiers | `ke.upi` (KEMIS/NEMIS), `ke.assessment_number` (KNEC), `ke.birth_certificate`; staff `ke.tsc_number`, `ke.kra_pin`. |

## Appendix B — Kenya 8-4-4 Secondary (`ke-844`, transitional)

Runs alongside `ke-cbe` until the last KCSE cohort completes (final Form 1 intake January 2024 → KCSE 2027).

| Item | Specification |
| --- | --- |
| Levels | Form 1–4; streams are class groups. |
| Learning areas | KCSE subject list with KNEC codes and groups: compulsory (English 101, Kiswahili 102, Mathematics 121); sciences (Biology, Chemistry, Physics …); humanities (History & Government, Geography, CRE/IRE/HRE); applied/technical & languages (Business Studies, Agriculture, Computer Studies, Home Science, French, German, Music, Art & Design …). Codes to be listed in `learning-areas.json` from the KNEC catalogue. |
| Components | Papers per subject (e.g. Biology 1/2/3 with practical) with `max_score` and scaling policy. |
| Subject scale | 12-point: A 12, A- 11, B+ 10, B 9, B- 8, C+ 7, C 6, C- 5, D+ 4, D 3, D- 2, E 1. Mark→grade ranges are **school-set** (pack provides a common default, overridable). |
| Overall | Mean points over best 7 (3 compulsory + ≥2 sciences + ≥1 humanity + 1 other), mean grade by lookup; option "mean of all subjects taken" for internal reports. |
| Ranking | Optional (internal), off for publication of KCSE results. |
| Reports | Subject × CAT/ET/total/grade/points/teacher remark; mean grade, total points, deviation from previous term; position (if enabled). |

## Appendix C — British system (`gb-national`, `cambridge-intl`, `pearson-intl`)

| Item | Specification |
| --- | --- |
| Structure | EYFS (Nursery/FS1, Reception/FS2); KS1 (Y1–2); KS2 (Y3–6); KS3 (Y7–9); KS4 (Y10–11: GCSE/IGCSE); KS5 (Y12–13: AS/A-Level, or IB in other packs). |
| Calendar | Academic year Sep–Jul; Autumn, Spring, Summer terms, each with a half-term. Pack provides both northern (Sep) and southern (Jan) variants used by some African British-curriculum schools. |
| EYFS | 7 areas of learning, 17 Early Learning Goals; judgement "Emerging/Expected" at end of Reception; on-entry baseline and ongoing observations (rubric kind). |
| Primary/KS3 internal | Attainment against age-related expectations (e.g. Working towards / Expected / Greater depth) and effort/attitude ratings (1–4); optional standardised scores. |
| GCSE/IGCSE | Scales: 9–1 (England GCSE, Pearson Edexcel International GCSE, Cambridge 9–1 syllabuses); A*–G (Cambridge IGCSE); `U` ungraded. Components/coursework per syllabus. |
| A-Level | AS A–E; A-Level A*–E; UCAS tariff points (A* 56, A 48, B 40, C 32, D 24, E 16) as an optional aggregation. |
| Internal reporting | Current working grade, target grade, predicted grade, effort, homework, comments; reports per half-term or term. |
| Ranking | Off. |
| Sets | Ability sets and option blocks modelled as teaching groups; option-block constraints via combination rules. |

## Appendix D — Uganda (`ug-national`)

| Item | Specification |
| --- | --- |
| Structure | Nursery; Primary P1–P7 (PLE); Lower Secondary S1–S4 (competency-based curriculum since 2020; UCE); Upper Secondary S5–S6 (UACE). |
| Calendar | Calendar year, 3 terms. Currency UGX (0 decimals). |
| PLE | 4 subjects (English, Mathematics, Science, Social Studies) graded D1(1)…F9(9); aggregate 4–36 → Division I–IV / U per UNEB ranges. |
| Lower secondary | Competency-based achievement levels and project/continuous assessment per the new curriculum (pack must encode current UNEB reporting format — verify). |
| UACE | Principal subjects A–F with points (A 6, B 5, C 4, D 3, E 2, O 1, F 0); subsidiaries (General Paper, Sub-Math/ICT) contributing 1 point on pass. Combinations (e.g. PCM, BCM, HEG) as pathways. |
| Identifiers | `ug.lin` (Learner Identification Number), `ug.nin`. |

## Appendix E — Tanzania (`tz-national`)

| Item | Specification |
| --- | --- |
| Structure | Pre-primary; Standard I–VII (PSLE); Form I–IV (CSEE); Form V–VI (ACSEE) with combinations. Curriculum reforms in progress — pack must track the current structure. |
| Calendar | Calendar year, 2 terms with mid-term breaks. Language: Kiswahili (primary), English (secondary). Currency TZS. |
| CSEE | Subject grades A–F with points (A 1 … F 5 as published by NECTA); Division I–IV/0 from the best 7 subjects. |
| ACSEE | Principal subjects A–F; divisions from 3 principal subjects. |

## Appendix F — Rwanda (`rw-cbc`)

Competency-based curriculum; P1–P6, S1–S3 (O-Level), S4–S6 (A-Level combinations, TVET and TTC streams). Three terms (school year aligned to Sep–Jul since 2022/23 — verify per year). RWF (0 decimals). National exam grading and aggregates per NESA — encode with vectors.

## Appendix G — Nigeria (`ng-ube`)

| Item | Specification |
| --- | --- |
| Structure | Pre-primary/Nursery; Primary 1–6; JSS 1–3 (BECE); SSS 1–3 (WASSCE/NECO) with Science/Arts/Commercial/Technical departments as pathways. |
| Calendar | "Session" Sep–Jul; First, Second, Third term. Currency NGN. |
| Scheme | CA + Exam (commonly CA 40: two tests + assignment; Exam 60) — school-configurable slots (§4). |
| Scales | WAEC-style: A1 75–100, B2 70–74, B3 65–69, C4 60–64, C5 55–59, C6 50–54, D7 45–49, E8 40–44, F9 0–39 (also used internally); primary often A–F with descriptors. |
| Terminal report | Subject: CA1, CA2, Exam, Total, Grade, Position in subject, Class average, Highest, Lowest, Remark; overall total, average, position in class N/M; affective domain (punctuality, neatness, politeness, honesty, attentiveness, leadership…) and psychomotor (handwriting, games, crafts, drawing…) rated 1–5; class teacher & principal comments; next term begins; fees. Third-term report shows cumulative (average of 3 terms) and promotion decision. |
| Identifiers | `ng.nin`, state/LGA. |

## Appendix H — Ghana (`gh-sbc`)

KG1–KG2, Basic 1–6 (Primary), JHS 1–3 (Basic 7–9, BECE), SHS 1–3 (WASSCE). Standards-based curriculum with School-Based Assessment (SBA) + end-of-term exam weighting (configurable). BECE grades 1–9 with aggregate of 6 (4 cores + best 2 others); WASSCE A1–F9. Currency GHS.

## Appendix I — South Africa (`za-caps`)

Grade R–12; phases Foundation (R–3), Intermediate (4–6), Senior (7–9), FET (10–12). Four
terms (Jan–Dec). Achievement levels 7 (80–100 Outstanding), 6 (70–79 Meritorious), 5
(60–69 Substantial), 4 (50–59 Adequate), 3 (40–49 Moderate), 2 (30–39 Elementary), 1 (0–29
Not achieved). SBA/exam ratios vary by phase and subject (e.g. FET commonly 25:75; PAT
components) — encode per level. Promotion requirements per phase (home language, other
language, mathematics thresholds) as threshold rules. NSC pass categories as an
aggregation. Identifiers `za.id_number`, `za.lurits`. Currency ZAR.

## Appendix J — Francophone systems (`fr-africa-*`: Senegal, Côte d'Ivoire, Cameroon-FR, Benin, Togo, Burkina Faso, Mali, Niger, Guinea, DRC variants)

Primary CI–CM2 (CEPE/CFEE); collège 6e–3e (BFEM/BEPC); lycée 2nde–Terminale (Baccalauréat
séries A/C/D…). School year Oct–Jul in three **trimestres**. Marks /20; subject
**coefficients**; `moyenne` per trimestre and annual; **conseil de classe** decides
passage/redoublement/exclusion with distinctions (tableau d'honneur, encouragements,
félicitations) and sanctions (avertissement, blâme); mentions (Passable ≥10, Assez bien
≥12, Bien ≥14, Très bien ≥16). Currency XOF/XAF (0 decimals). Cameroon runs an Anglophone
GCE subsystem alongside — two programmes in one country/school.

## Appendix K — Other packs wanted (community)

Zambia (2023 curriculum framework), Malawi (PSLCE/MSCE), Zimbabwe (ZIMSEC), Botswana
(BGCSE), Namibia (NSSCO/NSSCAS), Ethiopia (6-2-4 structure; **Ethiopian calendar**),
Egypt and Morocco (Arabic, RTL; /20 in Morocco), Mozambique and Angola (Portuguese, 0–20,
trimestres), Sudan/South Sudan, Somalia, IB (PYP/MYP/DP) as an international pack.
