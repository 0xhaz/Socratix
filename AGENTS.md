# AGENTS.md — Socrates

Agentic Socratic study companion built as a layer on an existing LMS.
Full design rationale lives in `architecture.md`. Read it before making structural decisions.

---

## Context

This is an **existing, working LMS**. Course management, chapters, lessons, enrollment, progress tracking, admin analytics, auth, and payments are already built and working. Do not rebuild or refactor them.

The work is a **new tutoring layer** on top: a question/attempt surface, an agentic diagnosis loop, guardrails, and per-student memory.

Deadline is tight. Prefer the smallest change that works over the most general one.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| ORM | Prisma |
| Database | PostgreSQL (Neon) |
| Styling | Tailwind CSS + shadcn/ui |
| Auth | BetterAuth (admin/student roles) |
| Payments | Stripe |
| Security | Arcjet |
| Package manager | **pnpm** (not npm, not yarn) |

AI layer: OpenAI **Responses API**, model `gpt-5.6-terra`, Structured Outputs via Zod schemas.

---

## Conventions

- **pnpm only.** `pnpm add`, `pnpm dev`, `pnpm prisma migrate dev`.
- **TypeScript strict.** No `any`. If a type is genuinely unknown, use `unknown` and narrow.
- **Prisma for all DB access.** No raw SQL unless there's a specific reason, and say why.
- **Zod schemas for all AI structured output.** Define the schema, derive the TS type from it, pass it to the Responses API. Never hand-parse model JSON.
- **shadcn/ui components** before writing custom ones. Match existing component patterns in the repo.
- **Server Actions or Route Handlers** consistent with whatever the existing codebase already does — check first, don't introduce a second pattern.
- Follow the existing file/folder structure. Read neighbouring files before adding new ones.

---

## Schema

New models: `Question`, `Attempt`, `Concept`. Additions to existing models: `approved_by`, `approved_at` on courses.

**Reconcile against the real `schema.prisma` before migrating.** The sketch in `architecture.md` §12A.3 is illustrative — field names, relation names, and the user model reference (`studentId` → BetterAuth user) must match what actually exists.

Key design points that must survive reconciliation:
- `Attempt.diagnosis` is `Json?` — deliberately unstructured, holds `classify_attempt` output
- `Attempt.isNextItem` boolean — this is what makes next-item-correctness measurable
- `Question.reviewState` — supports the instructor review flag on generated practice
- `Concept.prerequisite` is a single optional parent, not a graph. Three concepts don't need a graph.

---

## The tutoring loop

Controlled in **application code**, not by an autonomous agent. Call the model at specific points; branch in our own code.

```
attempt submitted
  → orchestrator call (gpt-5.6-terra, reasoning: medium, forced structured output)
  → read diagnosis.type in OUR code
  → branch: CORRECT | SLIP | CONCEPTUAL | PREREQUISITE_GAP
  → maybe call generate_practice (only on CONCEPTUAL / PREREQUISITE_GAP)
  → student-facing Socratic response
  → present unaided next item, log isCorrect
  → write memory
```

Four error types. Three tools (`classify_attempt` as structured output, `generate_practice`, `update_memory`). Do not add more without being asked.

---

## Non-negotiables

**Do not weaken the Socratic guardrail.** The tutor must not give away answers. When a student pushes ("just tell me"), a separate cheap check must force `student_facing_move = SOCRATIC_QUESTION` regardless of what the orchestrator returned. Do not rely on the system prompt to police itself — models fold under pressure.

**Do not weaken the scope guardrail.** The tutor refuses out-of-syllabus questions and respects the instructor's taught method. These refusals are load-bearing for the demo, not incidental features.

**Free-text answers only.** No multiple choice. MCQ reveals *that* a student is wrong, not *why* — and "why" is the whole product.

**Content correctness matters.** This is introductory inferential statistics (sampling distributions → standard error → p-value interpretation). Plausible-sounding wrong statistics explanations are easy to generate. Flag anything you're unsure about rather than letting it through.

---

## Scope discipline

Build item order (from `architecture.md` §14):

1. Question + attempt layer — nothing works without an attempt to diagnose
2. Seeded course data — 3 stats concepts, hand-verified, mapped to existing lessons
3. Orchestrator + diagnosis against seeded questions
4. Socratic response + `generate_practice`
5. Guardrails (both)
6. Memory + next-item logging
7. Polish
8. *(conditional)* Misconception panel on the existing admin dashboard

**Seeded questions before generated ones.** Building generation first means debugging two unfinished systems at once.

**Out of scope — do not build unless asked:** question banks, multiple item types, randomization, grading rules, question navigation, in-lesson progress bars, review screens, an instructor authoring UI, voice, multilingual support, YouTube ingestion, spaced repetition, difficulty curves, multi-subject support.

The UI surface for a question is: stem, textarea, submit, tutor response below it. That's all.

---

## Definition of done

A change is done when:
- It builds and typechecks (`pnpm build`)
- Prisma migrations apply cleanly
- The affected flow works end to end in the browser
- No regressions in existing LMS functionality
- Renders correctly on desktop (mobile is nice-to-have, not blocking for the demo)

---

## Notes for this repo

- The LMS predates this work; the tutoring layer does not. **Do not squash or rewrite git history** — commit provenance matters.
- Keep commits scoped and descriptive; they're part of the submission evidence.
- When you're uncertain about a pedagogical or product decision, ask rather than assume. Architecture decisions are documented in `architecture.md` with DECIDED / OPEN / DEFERRED tags — respect them, and flag it if something needs to change.
