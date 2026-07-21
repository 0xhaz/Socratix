"use server";

import { QuestionReviewState } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require_user";
import { classifyAttemptWithAi, generatePracticeWithAi, type Diagnosis } from "@/lib/socrates-ai";
import { z } from "zod";

const SubmitAttemptSchema = z.object({
  questionId: z.string().min(1, "Question is required"),
  responseText: z.string().trim().min(3, "Write a little more before submitting").max(2000, "Answer is too long"),
  isNextItem: z.boolean().optional(),
});

type SubmitAttemptSuccess = {
  status: "success";
  message: string;
  attemptId: string;
  tutorResponse: string;
  isCorrect: boolean | null;
  nextQuestion: NextQuestion | null;
};

type SubmitAttemptError = {
  status: "error";
  message: string;
};

export type SubmitAttemptResult = SubmitAttemptSuccess | SubmitAttemptError;

type NextQuestion = {
  id: string;
  stem: string;
  reviewState: QuestionReviewState;
  concept: {
    name: string;
  };
};

export async function submitAttempt(input: z.input<typeof SubmitAttemptSchema>): Promise<SubmitAttemptResult> {
  const session = await requireUser();
  const parsed = SubmitAttemptSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.errors[0]?.message ?? "Invalid answer",
    };
  }

  const question = await prisma.question.findFirst({
    where: {
      id: parsed.data.questionId,
      reviewState: {
        in: [QuestionReviewState.APPROVED, QuestionReviewState.PENDING_INSTRUCTOR_REVIEW],
      },
    },
    select: {
      id: true,
      lessonId: true,
      conceptId: true,
      stem: true,
      referenceAnswer: true,
      concept: {
        select: {
          name: true,
          slug: true,
          description: true,
          methodNote: true,
          prerequisite: {
            select: {
              name: true,
            },
          },
        },
      },
      lesson: {
        select: {
          title: true,
          chapter: {
            select: {
              courseId: true,
            },
          },
        },
      },
    },
  });

  if (!question?.lesson.chapter.courseId) {
    return {
      status: "error",
      message: "Question is not available",
    };
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: session.user.id,
        courseId: question.lesson.chapter.courseId,
      },
    },
    select: {
      status: true,
    },
  });

  if (!enrollment || enrollment.status !== "ACTIVE") {
    return {
      status: "error",
      message: "You are not enrolled in this course",
    };
  }

  const memory = await prisma.studentConceptMemory.findUnique({
    where: {
      studentId_conceptId: {
        studentId: session.user.id,
        conceptId: question.conceptId,
      },
    },
    select: {
      masteryScore: true,
      misconception: true,
      observations: true,
    },
  });

  const guardrailResponse = applyGuardrails(parsed.data.responseText, question.concept.slug);
  const fallbackDiagnosis = classifySeededAttempt(parsed.data.responseText, question.concept.slug);
  const aiDiagnosis = guardrailResponse
    ? null
    : await classifyAttemptWithAi({
      lessonTitle: question.lesson.title,
      conceptName: question.concept.name,
      conceptSlug: question.concept.slug,
      conceptDescription: question.concept.description,
      methodNote: question.concept.methodNote,
      prerequisiteName: question.concept.prerequisite?.name ?? null,
      questionStem: question.stem,
      referenceAnswer: question.referenceAnswer,
      responseText: parsed.data.responseText,
      studentMemory: memory ? JSON.stringify(memory) : null,
    });
  const diagnosis = forceSocraticIfNeeded(guardrailResponse?.diagnosis ?? aiDiagnosis ?? fallbackDiagnosis, parsed.data.responseText);
  const tutorResponse = guardrailResponse?.response ?? diagnosis.student_facing_response ?? buildTutorResponse(diagnosis.type, question.concept);
  const isCorrect = diagnosis.type === "CORRECT";
  const isNextItem = parsed.data.isNextItem ?? false;

  const attempt = await prisma.attempt.create({
    data: {
      studentId: session.user.id,
      questionId: question.id,
      responseText: parsed.data.responseText,
      diagnosis,
      studentFacingResponse: tutorResponse,
      isNextItem,
      isCorrect,
    },
    select: {
      id: true,
    },
  });
  await updateStudentMemory({
    studentId: session.user.id,
    conceptId: question.conceptId,
    diagnosis,
    isCorrect,
  });
  const nextQuestion = isCorrect && !isNextItem
    ? await upsertNextQuestion({
      lessonId: question.lessonId,
      conceptId: question.conceptId,
      conceptName: question.concept.name,
      conceptSlug: question.concept.slug,
      methodNote: question.concept.methodNote,
      avoidStem: question.stem,
      avoidResponse: parsed.data.responseText,
    })
    : null;

  return {
    status: "success",
    message: "Attempt submitted",
    attemptId: attempt.id,
    tutorResponse,
    isCorrect,
    nextQuestion,
  };
}

type SeededDiagnosis = {
  type: "CORRECT" | "SLIP" | "CONCEPTUAL" | "PREREQUISITE_GAP";
  misconception: string | null;
  prerequisite_missing: string | null;
  confidence: number;
  student_facing_move: "SOCRATIC_QUESTION" | "POINT_AT_SLIP" | "GENERATE_PRACTICE" | "ADVANCE";
  student_facing_response?: string;
};

function classifySeededAttempt(responseText: string, conceptSlug: string): SeededDiagnosis {
  const normalized = responseText.toLowerCase();

  if (conceptSlug === "sampling-distribution") {
    const mentionsDistribution = normalized.includes("distribution");
    const mentionsStatistic = normalized.includes("statistic") || normalized.includes("sample mean") || normalized.includes("proportion");
    const mentionsRepeatedSamples = normalized.includes("repeated") || normalized.includes("many samples") || normalized.includes("sample to sample");

    if (mentionsDistribution && mentionsStatistic && mentionsRepeatedSamples) {
      return {
        type: "CORRECT",
        misconception: null,
        prerequisite_missing: null,
        confidence: 0.78,
        student_facing_move: "ADVANCE",
      };
    }

    return {
      type: "CONCEPTUAL",
      misconception: "Does not yet distinguish a sampling distribution from a distribution of individual observations.",
      prerequisite_missing: null,
      confidence: 0.62,
      student_facing_move: "SOCRATIC_QUESTION",
    };
  }

  if (conceptSlug === "standard-error") {
    const mentionsVariability = normalized.includes("variability") || normalized.includes("variation") || normalized.includes("varies");
    const mentionsStatistic = normalized.includes("sample mean") || normalized.includes("statistic") || normalized.includes("estimate");
    const mentionsSamples = normalized.includes("sample") || normalized.includes("sampling");

    if (mentionsVariability && mentionsStatistic && mentionsSamples) {
      return {
        type: "CORRECT",
        misconception: null,
        prerequisite_missing: null,
        confidence: 0.74,
        student_facing_move: "ADVANCE",
      };
    }

    return {
      type: "CONCEPTUAL",
      misconception: "May be treating standard error as spread among individual data values rather than sampling variability of a statistic.",
      prerequisite_missing: "sampling-distribution",
      confidence: 0.64,
      student_facing_move: "SOCRATIC_QUESTION",
    };
  }

  const mentionsNullTruth = normalized.includes("null") && normalized.includes("true");
  const treatsHypothesisAsProbability = normalized.includes("chance") || normalized.includes("probability") || normalized.includes("%");
  const mentionsExtremeResults = normalized.includes("extreme") || normalized.includes("as extreme");
  const conditionsOnNull = normalized.includes("if the null") || normalized.includes("assuming the null") || normalized.includes("null hypothesis were true");

  if (mentionsNullTruth && treatsHypothesisAsProbability && !mentionsExtremeResults) {
    return {
      type: "CONCEPTUAL",
      misconception: "Treats the p-value as the probability that the null hypothesis is true.",
      prerequisite_missing: null,
      confidence: 0.85,
      student_facing_move: "SOCRATIC_QUESTION",
    };
  }

  if (conditionsOnNull && mentionsExtremeResults) {
    return {
      type: "CORRECT",
      misconception: null,
      prerequisite_missing: null,
      confidence: 0.72,
      student_facing_move: "ADVANCE",
    };
  }

  return {
    type: "CONCEPTUAL",
    misconception: "Needs to connect the p-value to results under the assumption that the null hypothesis is true.",
    prerequisite_missing: null,
    confidence: 0.58,
    student_facing_move: "SOCRATIC_QUESTION",
  };
}

function buildTutorResponse(type: SeededDiagnosis["type"], concept: { name: string; slug: string }): string {
  if (type === "CORRECT") {
    return buildCorrectResponse(concept);
  }

  if (concept.slug === "sampling-distribution") {
    return "Good start. Now tighten one distinction: is a sampling distribution about the values of individual people or measurements, or about the values of a statistic across repeated samples?";
  }

  if (concept.slug === "standard-error") {
    return "Pause on what is varying. Does standard error describe the spread of individual observations, or the sample-to-sample variation of a statistic like the sample mean?";
  }

  return "Pause on what the p-value is conditioned on. If we assume the null hypothesis were true, what is the probability describing: the hypothesis itself, or data at least as extreme as the result we observed?";
}

function buildCorrectResponse(concept: { name: string; slug: string }): string {
  if (concept.slug === "sampling-distribution") {
    return "Good. You identified the key idea: a sampling distribution is about how a statistic varies across repeated samples, not the distribution of individual observations.";
  }

  if (concept.slug === "standard-error") {
    return "Good. Standard error is about sample-to-sample variability in a statistic, such as the sample mean.";
  }

  return `Good. For ${concept.name}, the key move is conditioning on the null hypothesis and talking about results at least this extreme.`;
}

async function upsertNextQuestion(input: {
  lessonId: string;
  conceptId: string;
  conceptName: string;
  conceptSlug: string;
  methodNote: string | null;
  avoidStem: string;
  avoidResponse: string;
}): Promise<NextQuestion> {
  const nextItem = await generatePracticeWithAi({
    lessonTitle: input.conceptName,
    conceptName: input.conceptName,
    conceptSlug: input.conceptSlug,
    methodNote: input.methodNote,
    avoidStem: input.avoidStem,
    avoidResponse: input.avoidResponse,
  }) ?? buildNextItem(input.conceptSlug);
  const existingQuestion = await prisma.question.findFirst({
    where: {
      lessonId: input.lessonId,
      conceptId: input.conceptId,
      stem: nextItem.stem,
      isGenerated: true,
    },
    select: {
      id: true,
      stem: true,
      reviewState: true,
      concept: {
        select: {
          name: true,
        },
      },
    },
  });

  if (existingQuestion) {
    return existingQuestion;
  }

  return prisma.question.create({
    data: {
      lessonId: input.lessonId,
      conceptId: input.conceptId,
      stem: nextItem.stem,
      referenceAnswer: nextItem.referenceAnswer,
      isGenerated: true,
      reviewState: QuestionReviewState.PENDING_INSTRUCTOR_REVIEW,
    },
    select: {
      id: true,
      stem: true,
      reviewState: true,
      concept: {
        select: {
          name: true,
        },
      },
    },
  });
}

function buildNextItem(conceptSlug: string): { stem: string; referenceAnswer: string } {
  if (conceptSlug === "sampling-distribution") {
    return {
      stem: "A class takes many random samples of 40 students and records the sample mean study time for each sample. What would the sampling distribution describe?",
      referenceAnswer:
        "It would describe the distribution of the sample mean study time across many repeated samples of 40 students.",
    };
  }

  if (conceptSlug === "standard-error") {
    return {
      stem: "Two studies estimate the same population mean, but one has a smaller standard error. What does the smaller standard error tell you?",
      referenceAnswer:
        "It means that study's estimate would vary less from sample to sample, so the statistic is more precise.",
    };
  }

  return {
    stem: "A different study reports p = 0.01. Explain what this means without saying it is the probability that the null hypothesis is true.",
    referenceAnswer:
      "If the null hypothesis were true, there would be a 1% probability of observing results at least as extreme as the study's result.",
  };
}

function applyGuardrails(responseText: string, conceptSlug: string): { diagnosis: Diagnosis; response: string } | null {
  const normalized = responseText.toLowerCase();

  if (isAnswerExtractionAttempt(normalized)) {
    const response = "I cannot give away the answer, but I can help you reason it out. What part of the prompt tells you what quantity the probability or distribution is describing?";
    return {
      diagnosis: {
        type: "CONCEPTUAL",
        misconception: "Student attempted to extract the answer instead of explaining reasoning.",
        prerequisite_missing: null,
        confidence: 1,
        student_facing_move: "SOCRATIC_QUESTION",
        student_facing_response: response,
      },
      response,
    };
  }

  if (mentionsOutOfScopeTopic(normalized)) {
    const response = "That is outside this instructor-approved unit. For this course, stay with sampling distributions, standard error, confidence intervals, and p-value interpretation. Which of those ideas do you think this question is testing?";
    return {
      diagnosis: {
        type: "CONCEPTUAL",
        misconception: "Student moved outside the approved syllabus scope.",
        prerequisite_missing: null,
        confidence: 1,
        student_facing_move: "SOCRATIC_QUESTION",
        student_facing_response: response,
      },
      response,
    };
  }

  if (conceptSlug === "p-value-interpretation" && mentionsCriticalValueMethod(normalized)) {
    const response = "This class is using the p-value interpretation method here, not a critical-value shortcut. If we assume the null hypothesis is true, what probability does the p-value describe?";
    return {
      diagnosis: {
        type: "CONCEPTUAL",
        misconception: "Student used a critical-value method when the instructor's method note calls for p-value interpretation.",
        prerequisite_missing: null,
        confidence: 1,
        student_facing_move: "SOCRATIC_QUESTION",
        student_facing_response: response,
      },
      response,
    };
  }

  return null;
}

function forceSocraticIfNeeded<TDiagnosis extends SeededDiagnosis | Diagnosis>(diagnosis: TDiagnosis, responseText: string): TDiagnosis {
  if (!isAnswerExtractionAttempt(responseText.toLowerCase())) {
    return diagnosis;
  }

  return {
    ...diagnosis,
    student_facing_move: "SOCRATIC_QUESTION",
    student_facing_response: "I cannot give away the answer, but I can help you reason it out. What does the question ask you to interpret?",
  };
}

function isAnswerExtractionAttempt(normalized: string): boolean {
  return [
    "just tell me",
    "give me the answer",
    "what is the answer",
    "tell me the answer",
    "solve it for me",
    "i don't care",
  ].some((phrase) => normalized.includes(phrase));
}

function mentionsOutOfScopeTopic(normalized: string): boolean {
  return ["anova", "regression", "chi-square", "bayesian", "machine learning", "neural network"].some((topic) => normalized.includes(topic));
}

function mentionsCriticalValueMethod(normalized: string): boolean {
  return normalized.includes("critical value") || normalized.includes("rejection region") || normalized.includes("z critical") || normalized.includes("t critical");
}

async function updateStudentMemory(input: {
  studentId: string;
  conceptId: string;
  diagnosis: SeededDiagnosis | Diagnosis;
  isCorrect: boolean;
}): Promise<void> {
  const masteryDelta = input.isCorrect ? 1 : -1;
  const observation = {
    at: new Date().toISOString(),
    type: input.diagnosis.type,
    misconception: input.diagnosis.misconception,
  };

  await prisma.studentConceptMemory.upsert({
    where: {
      studentId_conceptId: {
        studentId: input.studentId,
        conceptId: input.conceptId,
      },
    },
    update: {
      masteryScore: {
        increment: masteryDelta,
      },
      misconception: input.isCorrect ? null : input.diagnosis.misconception,
      observations: observation,
      lastAttemptAt: new Date(),
    },
    create: {
      studentId: input.studentId,
      conceptId: input.conceptId,
      masteryScore: input.isCorrect ? 1 : 0,
      misconception: input.isCorrect ? null : input.diagnosis.misconception,
      observations: observation,
      lastAttemptAt: new Date(),
    },
  });
}
