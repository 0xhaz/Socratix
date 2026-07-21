"use server";

import { QuestionReviewState } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require_user";

type DiagnosisType = "CORRECT" | "SLIP" | "CONCEPTUAL" | "PREREQUISITE_GAP";

type Counter = {
  label: string;
  count: number;
};

type ConceptSummary = {
  conceptName: string;
  attempts: number;
  correct: number;
  conceptual: number;
  prerequisiteGaps: number;
  nextItems: number;
  nextItemsCorrect: number;
};

type RecentAttempt = {
  id: string;
  studentName: string;
  conceptName: string;
  lessonTitle: string;
  responseText: string;
  diagnosisType: DiagnosisType | "UNKNOWN";
  isCorrect: boolean | null;
  isNextItem: boolean;
  createdAt: Date;
};

type PendingReviewQuestion = {
  id: string;
  stem: string;
  conceptName: string;
  lessonTitle: string;
  createdAt: Date;
};

export type TutorDashboardData = {
  totalAttempts: number;
  totalStudents: number;
  nextItemAttempts: number;
  nextItemCorrect: number;
  nextItemCorrectRate: number | null;
  diagnosisCounts: Counter[];
  misconceptionCounts: Counter[];
  prerequisiteGapCounts: Counter[];
  conceptSummaries: ConceptSummary[];
  recentAttempts: RecentAttempt[];
  pendingReviewQuestions: PendingReviewQuestion[];
};

export async function getTutorDashboard(): Promise<TutorDashboardData> {
  const session = await requireUser();
  const courses = await prisma.course.findMany({
    where: {
      authorId: session.user.id,
    },
    select: {
      id: true,
    },
  });
  const courseIds = courses.map((course) => course.id);

  if (courseIds.length === 0) {
    return emptyDashboard();
  }

  const attempts = await prisma.attempt.findMany({
    where: {
      question: {
        lesson: {
          chapter: {
            courseId: {
              in: courseIds,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      responseText: true,
      diagnosis: true,
      isCorrect: true,
      isNextItem: true,
      createdAt: true,
      student: {
        select: {
          id: true,
          name: true,
        },
      },
      question: {
        select: {
          concept: {
            select: {
              name: true,
            },
          },
          lesson: {
            select: {
              title: true,
            },
          },
        },
      },
    },
  });

  const pendingReviewQuestions = await prisma.question.findMany({
    where: {
      isGenerated: true,
      reviewState: QuestionReviewState.PENDING_INSTRUCTOR_REVIEW,
      lesson: {
        chapter: {
          courseId: {
            in: courseIds,
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 8,
    select: {
      id: true,
      stem: true,
      createdAt: true,
      concept: {
        select: {
          name: true,
        },
      },
      lesson: {
        select: {
          title: true,
        },
      },
    },
  });

  const diagnosisCounts = new Map<string, number>();
  const misconceptionCounts = new Map<string, number>();
  const prerequisiteGapCounts = new Map<string, number>();
  const conceptSummaries = new Map<string, ConceptSummary>();
  const studentIds = new Set<string>();
  let nextItemAttempts = 0;
  let nextItemCorrect = 0;

  for (const attempt of attempts) {
    const diagnosisType = getDiagnosisType(attempt.diagnosis);
    const misconception = getDiagnosisString(attempt.diagnosis, "misconception");
    const prerequisiteMissing = getDiagnosisString(attempt.diagnosis, "prerequisite_missing");
    const conceptName = attempt.question.concept.name;

    studentIds.add(attempt.student.id);
    increment(diagnosisCounts, diagnosisType);

    if (misconception) {
      increment(misconceptionCounts, misconception);
    }

    if (diagnosisType === "PREREQUISITE_GAP" && prerequisiteMissing) {
      increment(prerequisiteGapCounts, prerequisiteMissing);
    }

    const summary = conceptSummaries.get(conceptName) ?? {
      conceptName,
      attempts: 0,
      correct: 0,
      conceptual: 0,
      prerequisiteGaps: 0,
      nextItems: 0,
      nextItemsCorrect: 0,
    };

    summary.attempts += 1;

    if (attempt.isCorrect) {
      summary.correct += 1;
    }

    if (diagnosisType === "CONCEPTUAL") {
      summary.conceptual += 1;
    }

    if (diagnosisType === "PREREQUISITE_GAP") {
      summary.prerequisiteGaps += 1;
    }

    if (attempt.isNextItem) {
      nextItemAttempts += 1;
      summary.nextItems += 1;

      if (attempt.isCorrect) {
        nextItemCorrect += 1;
        summary.nextItemsCorrect += 1;
      }
    }

    conceptSummaries.set(conceptName, summary);
  }

  return {
    totalAttempts: attempts.length,
    totalStudents: studentIds.size,
    nextItemAttempts,
    nextItemCorrect,
    nextItemCorrectRate: nextItemAttempts > 0 ? nextItemCorrect / nextItemAttempts : null,
    diagnosisCounts: toSortedCounters(diagnosisCounts),
    misconceptionCounts: toSortedCounters(misconceptionCounts),
    prerequisiteGapCounts: toSortedCounters(prerequisiteGapCounts),
    conceptSummaries: Array.from(conceptSummaries.values()).sort((a, b) => b.attempts - a.attempts),
    recentAttempts: attempts.slice(0, 10).map((attempt) => ({
      id: attempt.id,
      studentName: attempt.student.name,
      conceptName: attempt.question.concept.name,
      lessonTitle: attempt.question.lesson.title.trim(),
      responseText: attempt.responseText,
      diagnosisType: getDiagnosisType(attempt.diagnosis),
      isCorrect: attempt.isCorrect,
      isNextItem: attempt.isNextItem,
      createdAt: attempt.createdAt,
    })),
    pendingReviewQuestions: pendingReviewQuestions.map((question) => ({
      id: question.id,
      stem: question.stem,
      conceptName: question.concept.name,
      lessonTitle: question.lesson.title.trim(),
      createdAt: question.createdAt,
    })),
  };
}

function emptyDashboard(): TutorDashboardData {
  return {
    totalAttempts: 0,
    totalStudents: 0,
    nextItemAttempts: 0,
    nextItemCorrect: 0,
    nextItemCorrectRate: null,
    diagnosisCounts: [],
    misconceptionCounts: [],
    prerequisiteGapCounts: [],
    conceptSummaries: [],
    recentAttempts: [],
    pendingReviewQuestions: [],
  };
}

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function toSortedCounters(map: Map<string, number>): Counter[] {
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function getDiagnosisType(value: unknown): DiagnosisType | "UNKNOWN" {
  if (!isRecord(value) || typeof value.type !== "string") {
    return "UNKNOWN";
  }

  if (
    value.type === "CORRECT" ||
    value.type === "SLIP" ||
    value.type === "CONCEPTUAL" ||
    value.type === "PREREQUISITE_GAP"
  ) {
    return value.type;
  }

  return "UNKNOWN";
}

function getDiagnosisString(value: unknown, key: "misconception" | "prerequisite_missing"): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const diagnosisValue = value[key];
  return typeof diagnosisValue === "string" && diagnosisValue.trim() ? diagnosisValue : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
