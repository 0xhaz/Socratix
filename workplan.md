# Socrates Demo Workplan

Status: planning draft  
Date: July 20, 2026  
Source of truth: `AGENTS.md` and `architecture.md`

## Demo Goal

Build the smallest credible Socrates tutoring layer on top of the existing LMS:

- Student answers a free-text statistics question inside an enrolled lesson.
- App stores the attempt and calls GPT-5.6 through the Responses API with forced Zod structured output.
- App code branches on the diagnosis, not an autonomous agent.
- Tutor responds Socratically without giving away answers.
- Guardrails visibly fire for answer-extraction and out-of-syllabus or wrong-method prompts.
- A follow-up next item records unaided correctness.
- Instructor control is visible through approval metadata and generated-practice review state.

The three-minute demo should stay student-POV. The existing LMS is context, not the story.

## Non-Negotiables

- Do not rebuild LMS features: course management, lessons, enrollment, auth, payments, analytics.
- Free-text answers only. No multiple choice or question-bank system.
- Use Prisma for DB access and reconcile schema fields against the real `schema.prisma`.
- Use Zod-derived TypeScript types for every AI structured output.
- Keep the tutor loop controlled in application code.
- Do not weaken the Socratic guardrail. Answer-extraction must force `SOCRATIC_QUESTION`.
- Do not weaken the scope guardrail. The tutor must refuse out-of-syllabus requests and respect taught method.
- Seeded, hand-verified statistics content comes before generated practice.
- Use `pnpm` only.

## Current Repo Observations

- Existing student lesson route: `src/app/dashboard/enrolled-courses/[slug]/[lessonId]/page.tsx`.
- Existing lesson UI surface: `src/app/dashboard/_components/courseContent.tsx`.
- Existing server-side lesson/enrollment check: `src/app/dashboard/actions/get-lesson-content.ts`.
- Existing course sidebar query: `src/app/dashboard/actions/get-course-sidebar-data.ts`.
- Existing auth user model is `User`, with roles `USER`, `CREATOR`, `ADMIN`.
- Existing course model has `authorId` and `author`, but not `approvedBy` / `approvedAt`.
- `architecture.md` says Next.js 15, while `package.json` currently uses `next@16.1.6`; use the installed repo version unless a compatibility issue appears.
- The worktree already has unrelated modified files. Keep Socrates changes scoped and do not revert existing edits.

## Build Sequence

### 1. Data Model and Migration

Goal: create the minimum persistent layer needed for diagnosis.

Tasks:

- Add `Concept`, `Question`, and `Attempt` models to `prisma/schema.prisma`.
- Add course approval fields reconciled to existing `User`:
  - `approvedById String?`
  - `approvedBy User?`
  - `approvedAt DateTime?`
- Preserve required fields:
  - `Attempt.diagnosis Json?`
  - `Attempt.isNextItem Boolean @default(false)`
  - `Question.reviewState`
  - `Concept.prerequisiteId String?` as a single optional parent.
- Add relations from `Lesson` to questions and from `User` to attempts.
- Run Prisma migration and generation.

Acceptance:

- Migration applies cleanly.
- Prisma client generates.
- Existing course, chapter, lesson, enrollment relations still typecheck.

### 2. Seeded Statistics Demo Data

Goal: remove content uncertainty before adding AI.

Seed exactly three concepts:

1. Sampling distributions
2. Standard error
3. P-value interpretation

Tasks:

- Map each concept to an existing lesson in one demo course.
- Add approved seeded questions with hand-verified reference answers.
- Seed a prerequisite chain: sampling distributions -> standard error -> p-value interpretation.
- Seed method-fidelity notes, especially p-value interpretation over critical-value framing for the demo.
- Ensure the demo course has real approval metadata tied to a BetterAuth creator/admin user.

Acceptance:

- Student can load a seeded lesson and the app can find its approved question.
- Demo course visibly has approval metadata available to render.

### 3. Free-Text Question and Attempt Surface

Goal: create the student action that powers the tutoring loop.

Tasks:

- Extend lesson data fetching to include the active approved question.
- Add a compact question component below lesson content:
  - stem
  - textarea
  - submit button
  - tutor response area
- Add a server action or route handler following existing repo patterns.
- On submit, create an `Attempt` with `responseText`, `questionId`, `studentId`, and `isNextItem`.

Acceptance:

- A student can submit a free-text answer from the lesson page.
- The attempt is stored in the database.
- No extra navigation, review screens, progress bars, or item-type abstractions are introduced.

### 4. Structured Diagnosis Orchestrator

Goal: make the core agentic behavior real and inspectable.

Tasks:

- Add an AI module for `classify_attempt`.
- Define a Zod schema for:
  - `type: CORRECT | SLIP | CONCEPTUAL | PREREQUISITE_GAP`
  - `misconception: string | null`
  - `prerequisite_missing: string | null`
  - `confidence: number`
  - `student_facing_move: SOCRATIC_QUESTION | POINT_AT_SLIP | GENERATE_PRACTICE | ADVANCE`
- Call OpenAI Responses API with model `gpt-5.6-terra`, reasoning medium, and forced structured output.
- Store the structured result in `Attempt.diagnosis`.
- Branch in application code on `diagnosis.type`.

Acceptance:

- The p-value misconception is classified as `CONCEPTUAL`.
- A prerequisite-chain failure can classify as `PREREQUISITE_GAP`.
- App code, not model prose, controls the branch.

### 5. Socratic Response and Generated Practice

Goal: make both demo walkthroughs visible.

Tasks:

- Generate or derive a student-facing tutor response for each branch:
  - `CORRECT`: advance to unaided next item.
  - `SLIP`: point at the slip without reteaching the full solution.
  - `CONCEPTUAL`: ask a Socratic question about the misconception.
  - `PREREQUISITE_GAP`: back up to prerequisite and generate targeted practice.
- Add `generate_practice` only for `CONCEPTUAL` / `PREREQUISITE_GAP`.
- Store generated practice as `Question.isGenerated = true` with `reviewState = PENDING_INSTRUCTOR_REVIEW`.
- Render the review flag visibly in the student UI.

Acceptance:

- Walkthrough A demonstrates p-value misconception diagnosis and Socratic recovery.
- Walkthrough B demonstrates prerequisite gap, generated practice, and review flag.

### 6. Guardrails

Goal: protect the demo from the two known failure modes.

Tasks:

- Add a separate cheap answer-extraction check before final tutor output.
- If the check fires, force `student_facing_move = SOCRATIC_QUESTION`.
- Add syllabus-scope and method-fidelity checks using seeded course/concept metadata.
- Make out-of-scope refusal visible and concise, citing instructor syllabus boundaries.
- Make wrong-method redirection visible when the student uses a method not taught in the seeded course.

Acceptance:

- "Just tell me the answer" never produces the answer.
- An out-of-syllabus question such as ANOVA is refused.
- A wrong-method prompt redirects to the taught method.

### 7. Memory and Next-Item Correctness

Goal: support the headline metric without building a full learning analytics system.

Tasks:

- Add minimal memory persistence per student/concept.
- After an assisted turn, present an unaided next item.
- Store the next item attempt with `isNextItem = true` and `isCorrect`.
- Update memory directly in DB when the outcome is known.

Acceptance:

- Demo can show whether the student solved the next item unaided.
- Attempt data is sufficient to calculate next-item correctness by concept.

### 8. Polish and Demo Recording

Goal: stabilize the path that will be recorded.

Tasks:

- Tighten desktop layout of the lesson and tutor surface.
- Add loading and error states for AI calls.
- Prepare two scripted student responses:
  - p-value as probability null is true
  - hypothesis-test failure caused by prerequisite gap
- Prepare one guardrail prompt:
  - answer extraction or out-of-syllabus ANOVA
- Run build and browser verification.
- Record the 3-minute flow.

Acceptance:

- `pnpm build` passes.
- Prisma migration applies cleanly.
- Student demo path works end to end in browser.
- No visible regressions in existing course/enrollment flow.

## Conditional Stretch

Build the misconception panel only if phases 1-8 are solid.

Scope:

- Add a small panel to the existing admin analytics/dashboard surface.
- Aggregate `Attempt.diagnosis` by misconception and prerequisite gap.
- Show next-item correctness by concept.

Cut immediately if it threatens the student demo path.

## Explicit Cut List

Do not build before submission unless specifically requested:

- Instructor authoring UI
- Syllabus upload UI
- YouTube ingestion
- Question banks
- Multiple item types
- Randomization
- Grading-rule editor
- Question navigation
- In-lesson progress bars
- Review screens
- Voice tutoring
- Multilingual support
- Spaced repetition
- Difficulty curves
- Multi-subject support

## Demo Script Outline

1. 20 seconds: Open approved statistics course lesson. Show approval badge.
2. 60 seconds: Walkthrough A. Student gives p-value misconception, tutor diagnoses and asks a Socratic question.
3. 60 seconds: Walkthrough B. Student reveals prerequisite gap, tutor generates prerequisite practice with review flag.
4. 20 seconds: Guardrail prompt. Tutor refuses out-of-syllabus or refuses to give the answer.
5. 20 seconds: Point to Codex-built migration/UI/orchestrator and GPT-5.6 structured diagnosis/generation.

## Verification Checklist

- `pnpm prisma migrate dev`
- `pnpm build`
- Browser check: enrolled student can open lesson.
- Browser check: question submission stores an attempt.
- Browser check: diagnosis renders a tutor response.
- Browser check: generated item shows pending instructor review.
- Browser check: answer-extraction guardrail holds.
- Browser check: out-of-scope/method-fidelity guardrail holds.
- Browser check: next-item attempt stores `isNextItem` and `isCorrect`.

