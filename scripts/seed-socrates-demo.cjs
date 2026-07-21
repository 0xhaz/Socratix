const fs = require("fs");
const path = require("path");
const { PrismaClient, QuestionReviewState } = require("../src/generated/prisma");

loadDotEnv();

const prisma = new PrismaClient();

const concepts = [
  {
    slug: "sampling-distribution",
    name: "Sampling distributions",
    lessonTitle: "The Sampling Distribution",
    description: "A sampling distribution describes how a statistic varies across repeated samples.",
    methodNote: "Use repeated-sampling language before moving to inference.",
    prerequisiteSlug: null,
    stem: "In your own words, what is a sampling distribution?",
    referenceAnswer:
      "A sampling distribution is the distribution of a statistic, such as a sample mean, across many repeated samples from the same population.",
  },
  {
    slug: "standard-error",
    name: "Standard error",
    lessonTitle: "Confidence Intervals",
    description: "Standard error describes the typical sample-to-sample variation of a statistic.",
    methodNote: "Connect confidence intervals to standard error as sampling variability, not individual data spread.",
    prerequisiteSlug: "sampling-distribution",
    stem: "A statistician says a sample mean has a standard error of 2. What does that standard error describe?",
    referenceAnswer:
      "The standard error describes the typical variability of the sample mean from sample to sample. It is not the standard deviation of individual observations.",
  },
  {
    slug: "p-value-interpretation",
    name: "P-value interpretation",
    lessonTitle: "Hypothesis Testing",
    description: "A p-value is a probability about data under the assumption that the null hypothesis is true.",
    methodNote: "Use the p-value interpretation taught in class. Do not switch to a critical-value method for the demo.",
    prerequisiteSlug: "standard-error",
    stem: "A study reports p = 0.03 when testing a null hypothesis. Explain what this p-value means in context.",
    referenceAnswer:
      "If the null hypothesis were true, a p-value of 0.03 means there is a 3% probability of observing results at least as extreme as the study's result. It is not the probability that the null hypothesis is true.",
  },
];

async function main() {
  await approveDemoCourses();

  const conceptsBySlug = new Map();

  for (const concept of concepts) {
    const savedConcept = await prisma.concept.upsert({
      where: {
        slug: concept.slug,
      },
      update: {
        name: concept.name,
        description: concept.description,
        methodNote: concept.methodNote,
      },
      create: {
        slug: concept.slug,
        name: concept.name,
        description: concept.description,
        methodNote: concept.methodNote,
      },
    });

    conceptsBySlug.set(concept.slug, savedConcept);
  }

  for (const concept of concepts) {
    if (!concept.prerequisiteSlug) {
      continue;
    }

    const savedConcept = conceptsBySlug.get(concept.slug);
    const prerequisite = conceptsBySlug.get(concept.prerequisiteSlug);

    if (savedConcept && prerequisite) {
      await prisma.concept.update({
        where: {
          id: savedConcept.id,
        },
        data: {
          prerequisiteId: prerequisite.id,
        },
      });
    }
  }

  for (const concept of concepts) {
    const savedConcept = conceptsBySlug.get(concept.slug);
    const lessons = await prisma.lesson.findMany({
      select: {
        id: true,
        title: true,
      },
    });
    const lesson = lessons.find((candidate) => normalizeTitle(candidate.title) === normalizeTitle(concept.lessonTitle));

    if (!savedConcept || !lesson) {
      console.log(`Skipped ${concept.name}: lesson "${concept.lessonTitle}" was not found.`);
      continue;
    }

    const existingQuestion = await prisma.question.findFirst({
      where: {
        lessonId: lesson.id,
        conceptId: savedConcept.id,
        stem: concept.stem,
      },
      select: {
        id: true,
      },
    });

    if (existingQuestion) {
      await prisma.question.update({
        where: {
          id: existingQuestion.id,
        },
        data: {
          referenceAnswer: concept.referenceAnswer,
          isGenerated: false,
          reviewState: QuestionReviewState.APPROVED,
        },
      });

      console.log(`Updated question for ${lesson.title}.`);
      continue;
    }

    await prisma.question.create({
      data: {
        lessonId: lesson.id,
        conceptId: savedConcept.id,
        stem: concept.stem,
        referenceAnswer: concept.referenceAnswer,
        isGenerated: false,
        reviewState: QuestionReviewState.APPROVED,
      },
    });

    console.log(`Created question for ${lesson.title}.`);
  }
}

async function approveDemoCourses() {
  const demoCourses = await prisma.course.findMany({
    where: {
      title: {
        contains: "inferential",
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      authorId: true,
      approvedAt: true,
    },
  });

  for (const course of demoCourses) {
    await prisma.course.update({
      where: {
        id: course.id,
      },
      data: {
        approvedById: course.authorId,
        approvedAt: course.approvedAt ?? new Date(),
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

function loadDotEnv() {
  const envPath = path.join(process.cwd(), ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function normalizeTitle(title) {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}
