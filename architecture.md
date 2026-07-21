# Socrates — Architecture (Working Draft)

**Status:** WORKING DRAFT — not finalized
**Target:** OpenAI Build Week, Education track
**Deadline:** Tuesday, July 21, 2026, 5:00 PM PT
**Author:** Haz
**Version:** v0.3.0
**Last updated:** July 19, 2026

Tagging convention: **[DECIDED]** — locked, build against it. **[OPEN]** — needs a call before build. **[DEFERRED]** — explicitly out of scope for the POC, revisit post-hackathon.

---

## 1. Product Summary

Socrates is a memory-enabled, agentic Socratic study companion that unifies two flows normally kept separate: AI-assisted course scaffolding (instructor side) and Socratic tutoring (student side). The instructor owns the curriculum; the AI generates scaffolding around it and tutors students without giving away answers. The system optimizes for and reports **next-item correctness** — whether a student can solve the next problem unaided.

**[DECIDED]** Single-subject scope for the POC. Subject: **introductory inferential statistics**, scoped to three concepts — sampling distributions → standard error → p-value interpretation. Rationale in §11.

**[DECIDED]** The differentiators, in priority order:
1. Instructor owns the syllabus and concept graph; AI generates scaffolding, not curriculum
2. Agentic diagnosis loop (not a flat "never give the answer" prompt)
3. Per-student memory persisting across sessions
4. Next-item-correctness as the headline metric
5. Misconception telemetry surfaced back to the instructor

**[DEFERRED]** Voice tutoring (Realtime API). Stretch goal only — see §10.

---

## 2. Hackathon Constraints (Hard Requirements)

**[DECIDED]** These are non-negotiable submission requirements:
- Must meaningfully use **both** Codex and GPT-5.6
- Working project, Education track
- Public YouTube demo video, **≤3 minutes, with voiceover**, covering: what was built, how Codex was used, how GPT-5.6 was used
- Public/shared code repo with README
- A `/feedback` Codex Session ID

**[OPEN]** Free Codex credits ($100) had a request deadline of July 17, 2026, 12:00 PM PT — this has passed. Confirm whether credits were claimed; if not, budget for direct API spend.

**Caveat:** Several rules details could not be confirmed from a Build-Week-specific rules document (team size cap, IP/ownership clause, whether judging criteria are equally weighted). Verify on the official rules page before submitting.

---

## 3. System Overview

Three surfaces, one shared data model.

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  INSTRUCTOR     │     │   SHARED DATA    │     │    STUDENT      │
│                 │     │                  │     │                 │
│ syllabus upload │────▶│ concept_graph    │◀────│ tutoring loop   │
│ review/approve  │     │ lessons          │     │ attempts        │
│ guardrail config│     │ questions        │     │ memory profile  │
│ insights view   │◀────│ attempts         │     │ next-item check │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

**[DECIDED]** The instructor surface is **not built as an interactive UI for the POC**. Instructor control is proven through visible state inside the student experience (§4.5). The authoring flow and insights view are documented only. See §4.5 for the rationale and what this costs.

---

## 4. Instructor Control Layer

This is the credibility layer. An education judge will check whether the teacher is a participant or a spectator.

### 4.1 Syllabus ingestion
**[DECIDED]** Instructor provides their own syllabus / learning objectives / chapter sequence. GPT-5.6 generates *scaffolding around it* — practice problems, worked examples, misconception lists — not the curriculum itself.

**[OPEN]** Input format. Options: (a) paste text, (b) upload PDF, (c) structured form. PDF upload is the better demo but adds parsing surface. Leaning (a) + (b), with (a) as the demo path.

**[OPEN]** Instructor-attached video source. Instructor may attach a YouTube video as an additional source when building a course — same ingestion path as the syllabus, content still flows through the §4.3 approval queue, concept graph unaffected. Cheap if text ingestion already exists (~1hr). Buys a "we handle video" line in the demo without introducing a second product thesis.

Risk: YouTube transcript retrieval is fiddly (no official captions API, rate limits, videos lacking transcripts). Do not start this until the student loop is demo-ready — it is a nice-to-have, not load-bearing. Distinct from the student-generated variant in §10, which is deferred for thesis reasons, not just time.

### 4.2 Concept graph ownership
**[DECIDED]** The instructor owns the concept graph — which concepts depend on which. This is the control surface that drives the tutor's `PREREQUISITE_GAP` branch. If the instructor declares concept B requires concept A, the tutor respects it.

**[OPEN]** How is the graph created? AI-proposes-instructor-edits is the likely answer, but the editing UI is nontrivial. Fallback for the POC: AI proposes a linear sequence, instructor can reorder and mark prerequisites in a simple list view. Full graph editing is **[DEFERRED]**.

### 4.3 Approval states
**[DECIDED]** Nothing generated reaches a student unapproved. Every lesson, question, and misconception entry carries a state:

```
DRAFT → (instructor edits) → APPROVED → live to students
                           ↘ REJECTED → archived
```

**[DECIDED]** This approval flow matters more than the insights dashboard if time is tight. It is the load-bearing proof that the teacher is in control.

### 4.4 Guardrail configuration
**[DECIDED]** Instructor sets tutor boundaries:
- **Scope:** may the tutor go beyond the syllabus? (default: no)
- **Method fidelity:** must the tutor use the method taught in class? (default: yes)

**Rationale on method fidelity:** a tutor that solves a quadratic by completing the square when the class was taught the formula is actively unhelpful even though it is correct. This creates real classroom friction and most AI tutors get it wrong. Worth calling out explicitly in the demo.

**[OPEN]** How is "the method taught in class" represented? Simplest version: a free-text field per concept that gets injected into the tutor system prompt. Good enough for POC; brittle at scale.

### 4.5 POC implementation — instructor control as visible state

**[DECIDED]** For the POC, sections 4.1–4.4 are **not built as an interactive instructor UI**. Instructor control is instead proven through state the student sees, inside the student walkthrough.

**Rationale.** The instructor layer is the credibility layer — it is what separates Socrates from a Khanmigo clone. Deferring it entirely to documentation would leave the demo showing an AI-generated course tutored with no teacher in the loop, which invites exactly the "spectator teacher" critique this section exists to pre-empt. But building a second interactive surface is not affordable in the remaining window. Visible state resolves the conflict: it demonstrates teacher governance without an authoring UI.

**What gets built (three things, no instructor UI):**

1. **Approval badge on the course.** Course/lesson header displays `approved by {instructor_name}, {approved_at}`. Requires `approved_by` and `approved_at` fields on the course record. **Backed by real BetterAuth admin identities (§12)** — references an actual user record, not a hardcoded name. Establishes at a glance that a human signed off.

2. **A guardrail that visibly fires during the demo.** The student asks something out of scope (e.g. ANOVA when the syllabus stops at two-sample t-tests) and the tutor declines, citing the instructor's syllabus. Or the method-fidelity variant: student attempts the critical-value approach, tutor redirects to the p-value approach because that is what the class was taught. **The refusal is the proof** — it shows instructor settings actively constraining the AI, which is more convincing than a screenshot of a settings page.

3. **Review flag on generated practice.** On-the-fly generated problems carry a `pending_instructor_review` marker visible to the student. This also resolves open decision #3 (§6.2) in the demo's favour: generated practice is served immediately but visibly routes back to the instructor.

**Implementation cost:** `approved_by` / `approved_at` fields, a syllabus-scope list and per-concept method note injected into the tutor system prompt, and a review flag on generated items. Data-model and prompt work largely required anyway. No second UI surface.

**What this costs.** The authoring experience cannot be demonstrated — syllabus upload, draft review, and the insights view (§9) move to documentation only. This is a real loss, mitigated by the authoring flow being the more conventional part of the product.

**[DECIDED]** Risk to test: this approach works only if the guardrail fires convincingly on camera. A tutor that waffles or half-answers the out-of-scope question makes the whole thing read as a gimmick. Test alongside the §8.1 answer-extraction guardrail — same underlying failure mode (model wants to be helpful).

**[OPEN]** Whether to build the interactive instructor surface if time unexpectedly permits. Default assumption: no. Polish on the student loop is worth more than a second surface.

---

## 5. Agentic Tutoring Loop

### 5.1 Core principle
**[DECIDED]** The loop is controlled in application code, not handed to an autonomous agent. The model is called at specific points; the branching happens in our code. This is more predictable, cheaper, and far easier to demo than a free-running agent.

### 5.2 Turn flow

```
Student submits attempt
        │
        ▼
┌─────────────────────────────────────┐
│ ORCHESTRATOR CALL (gpt-5.6-terra)   │
│ input: attempt + lesson + memory    │
│ reasoning: medium                   │
│ response_format: diagnosis schema   │
└─────────────────────────────────────┘
        │
        ▼
   diagnosis.type?
        │
   ┌────┼─────────────┬──────────────────┐
   ▼    ▼             ▼                  ▼
CORRECT  SLIP      CONCEPTUAL      PREREQUISITE_GAP
   │    │             │                  │
   │    │             │                  ▼
   │    │             │          call generate_practice()
   │    │             │          on the prerequisite
   │    │             ▼                  │
   │    │        Socratic question       │
   │    ▼                                │
   │  point at the slip,                 │
   │  don't re-teach                     │
   ▼                                     │
present unaided NEXT ITEM ◄──────────────┘
   │
   ▼
update_memory() + log next_item_correct
```

**[DECIDED]** Four error types, three tools. This is the ceiling for the POC. Additional misconception categories, difficulty adaptation curves, and spaced repetition are **[DEFERRED]** — a judge cannot see any of it in a 3-minute video.

### 5.3 Where "agentic" earns its keep
**[DECIDED]** Steps that justify the label:
- **Internal diagnosis** (student never sees it)
- **Branching strategy** (different errors get different pedagogical responses)
- **Side-actions** (generating targeted practice, writing memory) rather than only emitting text

If the tutor only replies with a question every turn, it is a prompt, not an agent. A sharp judge will see through the label.

---

## 6. Tool Definitions

### 6.1 `classify_attempt` (structured output, not a function tool)
**[DECIDED]** The orchestrator's forced response schema.

```json
{
  "type": "CORRECT | SLIP | CONCEPTUAL | PREREQUISITE_GAP",
  "misconception": "string — what specifically is wrong, or null",
  "prerequisite_missing": "concept_id or null",
  "confidence": 0.0,
  "student_facing_move": "SOCRATIC_QUESTION | POINT_AT_SLIP | GENERATE_PRACTICE | ADVANCE"
}
```

### 6.2 `generate_practice` (function tool)
**[DECIDED]** Called only on CONCEPTUAL / PREREQUISITE_GAP branches — roughly 1 turn in 4, not every turn.

```json
{
  "name": "generate_practice",
  "parameters": {
    "concept_id": "string",
    "difficulty": "easier | same | harder",
    "avoid_numbers_from": "the problem they just did"
  }
}
```

**[OPEN]** Should generated practice go through instructor approval, or is on-the-fly generation exempt? Tension: §4.3 says nothing unapproved reaches students, but real-time practice generation is the agentic showpiece. Possible resolution: generated practice is served immediately but flagged in the instructor queue for post-hoc review. Needs a decision.

### 6.3 `update_memory` (function tool)
**[DECIDED]** Called at end of turn, never mid-turn.

```json
{
  "name": "update_memory",
  "parameters": {
    "student_id": "string",
    "concept_id": "string",
    "observation": "resolved_misconception | new_misconception | mastery_up",
    "detail": "string"
  }
}
```

**[DECIDED]** If application code already knows the outcome, write directly to the DB — no model call needed.

---

## 7. API Call Mapping

**[DECIDED]** Per-turn call budget:

| Call | When | Model | Notes |
|---|---|---|---|
| Orchestrator | Every turn | `gpt-5.6-terra` | `reasoning: medium`, forced structured output |
| Practice generation | CONCEPTUAL / PREREQ branches only | `gpt-5.6-terra` | Structured Outputs |
| Student-facing message | Every turn | `gpt-5.6-terra` | May fold into call 1 to save latency |
| Memory write | End of turn | — | Direct DB write where possible |

**[DECIDED]** Terra for the orchestrator, not Sol. Diagnosis does not need flagship reasoning; reserve Sol for anything that demonstrably needs it.

**[OPEN]** Whether to fold the student-facing message into the orchestrator call. Saves a round-trip and latency; costs some control over the Socratic phrasing. Needs a latency test to decide.

---

## 8. Hard Problems

### 8.1 Guardrail against caving
**[DECIDED]** This is the failure mode that kills a Socratic demo. When a student types "just tell me the answer," the model wants to help — that is its training. A system-prompt instruction alone will fold under a persistent student.

**[DECIDED]** Pattern: run a cheap separate check on the student's message for answer-extraction attempts. If it fires, force `student_facing_move = SOCRATIC_QUESTION` regardless of what the orchestrator returned. Do not rely on the main prompt to police itself.

**[DECIDED]** Test this explicitly before submission. Have someone actively try to jailbreak the tutor.

### 8.2 Latency
**[DECIDED]** Three sequential model calls per turn feels sluggish in a live tutor.

Mitigations:
- Terra (fast) for the orchestrator
- Fold call 3 into call 1 where possible **[OPEN]** — see §7
- Only pay for call 2 on branches that need it
- Stream the final response so it *feels* fast while reasoning happens

**[OPEN]** No latency budget number set yet. Should establish a target (e.g. first token < 1.5s) and measure against it.

---

## 9. Instructor Insights

**[DECIDED]** Falls out of the architecture nearly free — `classify_attempt` already produces structured diagnosis data on every attempt.

Aggregate across a class to surface:
- Named misconceptions with counts ("17 of 30 students think a p-value is the probability the hypothesis is true")
- Prerequisite bottlenecks (where `PREREQUISITE_GAP` fires most)
- Students stuck who have not asked for help
- Next-item-correctness per concept — did tutoring transfer, or do students only succeed with help?

**[DECIDED]** Lead with misconception telemetry, not time saved on worksheet generation. "AI generates worksheets" is a crowded, unimpressive claim.

**[OPEN]** POC scope. Previously documented-only on the assumption that building a dashboard was unaffordable. The existing platform already has an admin analytics dashboard (§12), so the misconception panel is a **component addition, not a new surface** — materially cheaper than assumed. Build only if the tutoring loop (§14 items 1–7) is solid. See §14 item 8.

---

## 10. Deferred Scope

**[DEFERRED]** Voice tutoring via Realtime API (`gpt-realtime-2.1`). Only add if the text tutor + memory + insights view are demo-ready by Day 4. Tightens the latency budget considerably — diagnosis would need to run in parallel rather than blocking speech.

**[DEFERRED]** Multilingual / code-switching tutoring. Discussed and parked. Direction if revisited: localize the *tutoring dialogue* only, keep course content canonical in English; preserve technical terms in English while explaining reasoning in the target language (mirrors how bilingual instructors actually code-switch). Pick one non-English language (Malay) and make it excellent rather than demoing five shallowly.

**[DEFERRED]** Student-generated study companions from YouTube videos. Student pastes a video URL and gets a tutor built from it, with no instructor involved.

Deferred for **thesis conflict, not just time**. The differentiator established in §4 is instructor control — teacher owns the syllabus, owns the concept graph, approves all content, sets method fidelity. A student-generated tutor over an arbitrary video is the inverse: no instructor, no approved content, no concept graph, no method fidelity. Demoing both in three minutes presents two products with contradictory theses, and the Education track judge is well positioned to notice that one undermines the other.

Secondary architectural problem: both `PREREQUISITE_GAP` branching (§5.2) and misconception telemetry (§9) depend on the concept graph. Without it, the agentic loop degrades to Socratic chat over a transcript — a materially weaker claim, and much closer to what already exists in the market.

Genuine merit worth preserving for post-hackathon: it solves the cold-start problem. The current design requires an instructor to arrive with a syllabus before anything happens. "Paste a URL, get a tutor" is self-serve, needs zero setup, and matches how students actually study. Revisit as either a separate product or a consumer on-ramp into the instructor product — that question needs time the hackathon window does not allow.

Near-term substitute: the instructor-attached video source in §4.1, which captures the video capability without the thesis conflict.

**[DEFERRED]** Full concept-graph editing UI.
**[DEFERRED]** Spaced repetition, difficulty adaptation curves, additional misconception categories.
**[DEFERRED]** Multi-subject support.

---

## 11. Subject Decision and Open Items

### 11.1 Subject rationale — introductory inferential statistics

**[DECIDED]** Subject: introductory inferential statistics. Three concepts only: sampling distributions → standard error → p-value interpretation.

**Selection criterion.** The subject was chosen for whether it produces a *visible, nameable misconception within ninety seconds*, not for breadth or familiarity. The demo succeeds only if a judge watches a student get something wrong for an interesting reason and sees the tutor name the reasoning error correctly.

This ruled out algebra: most algebra errors are slips (dropped sign, arithmetic) that land in the `SLIP` branch and are pedagogically uninteresting to watch.

**Why stats fits the architecture:**

- **Canonical documented misconceptions.** "A p-value is the probability the null hypothesis is true" is the definitive intro-stats error — wrong, extremely common, and immediately legible. When the tutor responds that the student is treating the p-value as a probability about the hypothesis rather than about the data, a judge can verify both that the diagnosis is correct and that a generic chatbot would not have produced it.
- **Genuine prerequisite chain.** Sampling distributions → standard error → hypothesis testing is a real dependency. A student fumbling hypothesis testing frequently has a broken model of sampling distributions underneath. This gives `PREREQUISITE_GAP` (§5.2) an honest trigger — backing up a level is genuinely the right pedagogical move, not a contrived feature demo.
- **Method fidelity is real.** Stats courses differ on critical-value vs p-value approach, hypothesis notation, z vs t conventions. The §4.4 instructor guardrail therefore has a defensible concrete use.
- **Judge legibility.** Intro statistics is among the most-taken online courses in existence and the Education track judge's background is Coursera. The content will be recognised instantly and evaluated on pedagogical soundness — the scrutiny this design is built to withstand.

**Runner-up considered:** intro programming (loops and scope). Strong equivalent misconception, real prerequisite chain, programmatically verifiable correctness. Rejected as a crowded space for AI demos — "AI helps with code" is a less differentiated claim than "AI catches a statistical reasoning error."

**Ruled out:** humanities-flavoured subjects (essay feedback, history). No crisp correct/incorrect signal, which makes next-item-correctness meaningless — and that metric is central to the pitch.

**[DECIDED]** Content must be hand-verified. Statistics produces plausible-sounding wrong explanations easily, and there is no time to check a large generated course. Three concepts checked carefully beats twelve generated and trusted. A judge who spots an incorrect statistics explanation will discount everything else in the demo.

### 11.2 Open decisions requiring a call

| # | Decision | Blocking? |
|---|---|---|
| 1 | ~~Subject choice~~ — CLOSED, see §11.1 | — |
| 2 | Syllabus input format (paste / PDF / form) | Reduced — §4.5 removes the authoring UI; seeded data may suffice |
| 3 | ~~Does generated practice bypass approval?~~ — resolved in §4.5: served immediately, visibly flagged for review | — |
| 4 | Fold student-facing message into orchestrator call? (§7) | No — optimize later |
| 5 | ~~Concept graph creation UX~~ (§4.2) | Reduced — seeded for POC, no editing UI |
| 6 | Method-fidelity representation (§4.4) | No — free-text is adequate for POC |
| 7 | Latency target number (§8.2) | No — but set before polish phase |
| 8 | Were the $100 Codex credits claimed before the July 17 deadline? | Yes — budget impact |

---

## 12. Tech Stack — Existing Platform

**[DECIDED]** Socrates is built as a layer on an **existing, working LMS**, not greenfield. Confirmed stack:

| Layer | Technology |
|---|---|
| Framework | Next.js 15 |
| Language | TypeScript |
| ORM | Prisma |
| Database | PostgreSQL (Neon) |
| Styling | Tailwind CSS + shadcn/ui |
| Auth | BetterAuth (social logins, admin/student roles) |
| Payments | Stripe (checkout, subscriptions, webhooks) |
| Security | Arcjet (bot detection, rate limiting) |
| Package manager | pnpm |

**Already built (no work required):**
- Course → chapter → lesson structure with drag-and-drop ordering
- Course management (create/edit/delete), publishing, catalog
- Student enrollment and progress tracking
- Admin analytics dashboard
- Role-based access (admin/student)

**Implications for this architecture:**

- **§12's greenfield stack assumption is superseded.** The speculated stack matched almost exactly; no migration needed.
- **§4.5 `approved_by` is real.** BetterAuth provides genuine instructor identities and admin roles — the approval badge references an actual user record, not a hardcoded string.
- **§9 insights is no longer documented-only.** An admin analytics dashboard already exists, so the misconception panel is a component addition rather than a new surface. **[OPEN]** — whether to build it depends on time remaining after the tutoring loop is solid.
- **Concept graph has structure to attach to.** Concepts map onto existing lessons rather than needing a parallel hierarchy.

**[DECIDED]** Prisma is an accelerant worth noting in the README: all Socrates schema additions are migrations against an existing model, and Codex handles Prisma schema work well. This is concrete, demonstrable Codex usage per submission requirements.

### 12.1 Hackathon eligibility — pre-existing project

**[DECIDED]** Build Week permits pre-existing projects only if *meaningfully extended using Codex and/or GPT-5.6 after the Submission Period start date* (July 13, 2026), with timestamped evidence.

The LMS predates the window; the Socrates layer does not. This is the intended shape of the exception — but it requires:
- Commits for the Socrates layer visibly dated within the window
- Codex session history preserved (also needed for the `/feedback` Session ID)
- **Do not squash or rewrite history** in a way that obscures when the AI layer was added
- README should state plainly which parts predate the hackathon and which were built during it

**[DECIDED]** Demo scope discipline. The platform is complete — Stripe, catalog, revenue tracking, enrollment. **None of it belongs in the three minutes.** Judges are scoring the tutoring layer built with GPT-5.6 and Codex; the existing platform is setting, not story.

---

## 12A. Question and Attempt Layer

**[DECIDED]** This is the one genuinely missing piece. The existing platform tracks lesson *completion* but has no surface where a student submits an answer. The tutoring loop requires an attempt to diagnose, so this is build item #1.

### 12A.1 Scope discipline

**[DECIDED]** Build the minimum that makes diagnosis visible. Not required: question banks, multiple item types, randomization, grading rules, question navigation, in-lesson progress bars, review screens.

Required: a question attached to a lesson, a free-text student response, a stored attempt.

### 12A.2 Free-text only — no multiple choice

**[DECIDED]** Questions accept free-text responses. MCQ is explicitly rejected.

**Rationale.** MCQ reveals *that* a student was wrong, not *why* — and "why" is the entire differentiator. A student selecting option C yields nothing for `classify_attempt`. A student writing "the p-value is 0.03 so there's a 3% chance the null is true" hands the orchestrator a named, diagnosable misconception directly. Free-text is also less implementation work.

### 12A.3 Prisma schema additions

**[OPEN]** Sketch, not final — field names and relations to be reconciled against the existing schema.

```prisma
model Question {
  id              String  @id @default(cuid())
  lessonId        String
  conceptId       String
  stem            String
  referenceAnswer String
  isGenerated     Boolean @default(false)   // on-the-fly practice (§6.2)
  reviewState     String  @default("APPROVED") // §4.5 review flag
}

model Attempt {
  id           String   @id @default(cuid())
  studentId    String
  questionId   String
  responseText String
  diagnosis    Json?    // classify_attempt output (§6.1)
  isNextItem   Boolean  @default(false)
  isCorrect    Boolean?
  createdAt    DateTime @default(now())
}

model Concept {
  id           String  @id
  name         String
  prerequisite String? // §4.2 — single parent sufficient for 3 concepts
}
```

**Design notes:**

- **`diagnosis Json`** deliberately avoids committing to a column shape before the schema stabilises. It is where `classify_attempt` output lands, and what §9's misconception panel aggregates over.
- **`isNextItem`** is what makes next-item-correctness measurable — same student, same concept, no tutor assistance, immediately following an assisted problem.
- **`Concept.prerequisite` as a single parent is deliberately crude.** With three concepts in a chain (§11.1), a graph is overkill. Needs replacing for multi-subject; that is **[DEFERRED]**.

### 12A.4 UI surface

**[DECIDED]** Question stem, textarea, submit button, tutor response rendering beneath. That is the entire surface for the demo.

### 12A.5 Build ordering within this layer

**[DECIDED]** Seeded questions first → orchestrator diagnosing against them → only then wire `generate_practice` to create new ones. Building generation first means debugging two unfinished systems simultaneously.

---

## 13. Demo Narrative

**[DECIDED]** Two walkthroughs, **both from the student POV**, on the same subject (§11.1). They cover different branches so the demo proves the branching is real rather than one scripted path.

### Walkthrough A — `CONCEPTUAL` branch
Student misinterprets a p-value as the probability the null hypothesis is true. Tutor diagnoses the specific misconception (not just "incorrect"), responds Socratically without supplying the answer, and the student arrives at the correct interpretation. Closes with an unaided next item.

**Demonstrates:** internal diagnosis, Socratic guardrail holding, next-item-correctness.

### Walkthrough B — `PREREQUISITE_GAP` branch
Student fumbles hypothesis testing. Tutor diagnoses the root cause as a broken model of sampling distributions, backs up a level, and generates targeted practice on the prerequisite on the fly. Generated item visibly carries the `pending_instructor_review` flag (§4.5).

**Demonstrates:** the agentic showpiece — branching, prerequisite reasoning, on-the-fly generation, and the instructor review loop closing.

### Instructor control
**[DECIDED]** Shown as visible state within both walkthroughs per §4.5 — approval badge, and a guardrail visibly firing on an out-of-scope or wrong-method question. No separate instructor segment.

### Three-minute structure
1. **~20s** — Context and the approval badge. Establishes teacher governance immediately.
2. **~60s** — Walkthrough A.
3. **~60s** — Walkthrough B, including the guardrail firing.
4. **~30s** — Codex + GPT-5.6 usage, explicit, per submission requirements.

**[DECIDED]** Both walkthroughs are student-POV, which removes the earlier risk of the video splitting between two audiences. The instructor thesis now rides along inside the student narrative rather than competing with it.

**[OPEN]** Which walkthrough leads. A is simpler and establishes the Socratic behaviour; B is more impressive. Current lean: A first as setup, B as payoff.

---

## 14. Build Sequence

**[DECIDED]** Revised against the July 21 deadline, the §4.5 scope cut, and the existing platform (§12).

Auth, course structure, enrollment, progress tracking, and the admin dashboard already exist. Remaining work is the Socrates layer only.

Load-bearing, in order:

1. **Question + attempt layer (§12A)** — Prisma migrations, seeded questions, free-text submit surface. Build item #1: nothing downstream works without an attempt to diagnose.
2. **Seeded course data** — three stats concepts (§11.1), hand-verified, with prerequisite links, mapped onto existing lessons. Instructor metadata (`approved_by` via BetterAuth, syllabus scope, method note).
3. **Orchestrator + diagnosis** — `classify_attempt` structured output and the four-way branch (§5.2, §6.1), diagnosing against seeded questions.
4. **Socratic response + `generate_practice`** — enough for both walkthroughs (§13).
5. **Guardrails** — answer-extraction (§8.1) and out-of-scope/method-fidelity (§4.5). Both must fire reliably on camera.
6. **Memory + next-item logging** — the metric that carries the pitch.
7. **Polish + record.**

**[OPEN]** 8. **Misconception panel** on the existing admin dashboard (§9). Newly viable given the dashboard already exists — a component, not a surface. Build only if 1–7 are solid.

**[DECIDED]** Cut candidates, in order of first-to-go: instructor-attached video source (§4.1), misconception panel (item 8), memory persistence across sessions (demoable within a single session).

**[DECIDED]** The two guardrails are not cut candidates. A Socratic tutor that folds under pressure invalidates the entire premise.
