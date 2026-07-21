# Socratix Demo Script

Target length: 3 minutes  
Demo path: student tutoring flow, then tutor dashboard  
Subject: introductory inferential statistics

## Pre-Demo Setup

- Log in as a student enrolled in the Inferential Statistics course.
- Open the course player on **The Sampling Distribution**.
- Make sure the YouTube lesson video is visible.
- Keep the admin/tutor account ready in another tab, or be ready to switch role/session.
- Use a browser zoom level where the video, question, tutor response, and sidebar are readable.

## 0:00-0:20 — Product Context

Screen: student lesson page with video and sidebar.

Voiceover:

> This is Socratix, a Socratic tutoring layer built on top of an existing LMS. The course, lessons, enrollment, and video player already exist. What we added is the tutoring layer underneath each lesson: free-text questions, attempt diagnosis, Socratic follow-up, next-item correctness, and a tutor dashboard.

Click nothing yet. Let the viewer see the course structure and video.

## 0:20-0:55 — Wrong Student Attempt

Screen: **The Sampling Distribution** lesson.

Voiceover:

> The student is not choosing from multiple choice. They have to explain their reasoning in their own words, because the interesting signal is not only whether they are wrong, but why. I’ll start with an intentionally incomplete answer.

In the answer box, type:

```text
Sampling Distribution is the keystone to understanding Confidence Intervals and Hypothesis Testing
```

Click **Submit Answer**.

Expected tutor response:

```text
Good start. Now tighten one distinction: is a sampling distribution about the values of individual people or measurements, or about the values of a statistic across repeated samples?
```

Voiceover:

> The answer is incomplete. Instead of giving away the definition, the tutor asks a targeted question. That is the Socratic behavior: it forces the student to repair the concept.

## 0:55-1:25 — Corrected Follow-Up

Screen: reply-to-tutor box.

In **Reply to tutor**, type:

```text
It is about the values of a statistic, like the sample mean, across many repeated samples from the same population.
```

Click **Submit Reply**.

Expected tutor response:

```text
Good. You identified the key idea: a sampling distribution is about how a statistic varies across repeated samples, not the distribution of individual observations.
```

Expected next item appears:

```text
A class takes many random samples of 40 students and records the sample mean study time for each sample. What would the sampling distribution describe?
```

Voiceover:

> Once the student fixes the reasoning, Socratix does not stop at praise. It immediately gives a next item. This is the metric we care about: can the student solve the next problem unaided?

## 1:25-1:55 — Next-Item Correctness

In **Next item**, type:

```text
It describes the distribution of the sample mean study time across many random samples of 40 students.
```

Click **Submit next item**.

Expected result:

```text
Good. You identified the key idea: a sampling distribution is about how a statistic varies across repeated samples, not the distribution of individual observations.
```

Voiceover:

> This attempt is stored separately as a next item. That lets the instructor measure transfer, not just whether the student followed the tutor while being helped.

## 1:55-2:25 — P-Value Misconception Branch

Screen: click **Hypothesis Testing** in the lesson sidebar.

Voiceover:

> Here is a second wrong answer, this time with a classic statistics misconception. A generic chatbot may explain p-values, but Socratix is looking for the specific reasoning error in the student's free-text answer.

In the answer box, type:

```text
p = 0.03 means there is a 3% chance the null hypothesis is true.
```

Click **Submit Answer**.

Expected tutor response:

```text
Pause on what the p-value is conditioned on. If we assume the null hypothesis were true, what is the probability describing: the hypothesis itself, or data at least as extreme as the result we observed?
```

Voiceover:

> The tutor catches the classic misconception: treating a p-value as the probability that the hypothesis is true. It still does not give the answer away. It asks the student to identify what the probability is actually about.

## 2:25-2:50 — Tutor Dashboard

Screen: switch to creator/admin view. Open **Tutor Dashboard** in the sidebar or go to:

```text
/admin/tutor
```

Voiceover:

> The instructor gets the other side of the loop. Attempts are aggregated by concept, diagnosis type, misconception, and next-item correctness. Generated practice is also marked as pending instructor review, so the teacher stays in control of what the AI produces.

Point to:

- Attempts
- Next-item correctness
- Misconceptions
- Concept performance
- Generated Practice Review
- Recent Attempts

## 2:50-3:00 — Close

Screen: tutor dashboard or split back to student page.

Voiceover:

> Codex was used to add the Prisma models, migrations, student tutoring UI, attempt logging, and instructor dashboard into an existing LMS. GPT-5.6 powers the structured diagnosis and targeted practice generation when the OpenAI API key is configured, with a deterministic fallback so the live demo stays stable. The core product loop is visible end to end: student reasoning in, Socratic tutoring out, next-item correctness and misconception telemetry back to the instructor.

## Backup Lines

Use if the demo runs fast:

> The video is supporting material. The source of truth is instructor-approved lesson context and questions, which is important for classroom trust.

> Multiple choice can show that a student is wrong. Free text shows why they are wrong.

> The instructor dashboard is not just analytics. It closes the loop between student misconceptions and teacher action.

## Do Not Claim

- Do not say the AI watched or understood the YouTube video.
- Do not say GPT-5.6 is live unless `OPENAI_API_KEY` is configured in the demo environment.
- Do not say generated practice is fully instructor-approved. Say it is visibly marked for instructor review.
- Do not spend time on Stripe, course creation, auth, or general LMS features.
