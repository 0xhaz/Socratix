import { zodTextFormat } from "openai/helpers/zod";
import OpenAI from "openai";
import { z } from "zod";
import { env } from "@/env";

export const DiagnosisSchema = z.object({
  type: z.enum(["CORRECT", "SLIP", "CONCEPTUAL", "PREREQUISITE_GAP"]),
  misconception: z.string().nullable(),
  prerequisite_missing: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  student_facing_move: z.enum(["SOCRATIC_QUESTION", "POINT_AT_SLIP", "GENERATE_PRACTICE", "ADVANCE"]),
  student_facing_response: z.string().min(1),
});

export type Diagnosis = z.infer<typeof DiagnosisSchema>;

export const PracticeQuestionSchema = z.object({
  stem: z.string().min(1),
  referenceAnswer: z.string().min(1),
});

export type PracticeQuestion = z.infer<typeof PracticeQuestionSchema>;

type ClassifyAttemptInput = {
  lessonTitle: string;
  conceptName: string;
  conceptSlug: string;
  conceptDescription: string | null;
  methodNote: string | null;
  prerequisiteName: string | null;
  questionStem: string;
  referenceAnswer: string;
  responseText: string;
  studentMemory: string | null;
};

type GeneratePracticeInput = {
  lessonTitle: string;
  conceptName: string;
  conceptSlug: string;
  methodNote: string | null;
  avoidStem: string;
  avoidResponse: string;
};

const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
const model = env.OPENAI_MODEL ?? "gpt-5.6-terra";

export async function classifyAttemptWithAi(input: ClassifyAttemptInput): Promise<Diagnosis | null> {
  if (!openai) {
    return null;
  }

  try {
    const response = await openai.responses.parse({
      model,
      reasoning: {
        effort: "medium",
      },
      input: [
        {
          role: "system",
          content: [
            "You are Socratix, a Socratic tutor for introductory inferential statistics.",
            "Classify the student's free-text answer. Do not give away final answers.",
            "Respect the instructor's scope: sampling distributions, standard error, confidence intervals, and p-value interpretation.",
            "Respect the instructor's taught method. If the student uses a different method, redirect Socratically.",
            "Use exactly one of the four diagnosis types.",
            "For student_facing_response, ask one concise Socratic question unless the answer is correct or a minor slip.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
      text: {
        format: zodTextFormat(DiagnosisSchema, "classify_attempt"),
      },
    });

    return firstParsed(response, DiagnosisSchema);
  } catch (error) {
    console.error("AI diagnosis failed:", error);
    return null;
  }
}

export async function generatePracticeWithAi(input: GeneratePracticeInput): Promise<PracticeQuestion | null> {
  if (!openai) {
    return null;
  }

  try {
    const response = await openai.responses.parse({
      model,
      input: [
        {
          role: "system",
          content: [
            "Generate one free-text practice question for introductory inferential statistics.",
            "The question must be answerable without multiple choice.",
            "Use instructor-approved scope only. Do not introduce ANOVA, regression, Bayesian inference, or advanced tests.",
            "Keep the numbers and wording different from the student's previous problem.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
      text: {
        format: zodTextFormat(PracticeQuestionSchema, "generate_practice"),
      },
    });

    return firstParsed(response, PracticeQuestionSchema);
  } catch (error) {
    console.error("AI practice generation failed:", error);
    return null;
  }
}

function firstParsed<TSchema extends z.ZodType>(response: OpenAI.Responses.Response, schema: TSchema): z.infer<TSchema> | null {
  for (const output of response.output) {
    if (output.type !== "message") {
      continue;
    }

    for (const item of output.content) {
      if (item.type === "refusal") {
        return null;
      }

      if ("parsed" in item && item.parsed) {
        return schema.parse(item.parsed);
      }
    }
  }

  return null;
}
