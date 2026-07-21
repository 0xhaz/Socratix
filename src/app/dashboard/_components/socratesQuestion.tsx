"use client";

import { submitAttempt, type SubmitAttemptResult } from "@/app/dashboard/actions/submit-attempt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";

type SocratesQuestionProps = {
  question: {
    id: string;
    stem: string;
    isGenerated: boolean;
    reviewState: string;
    concept: {
      name: string;
    };
  } | null;
};

export function SocratesQuestion({ question }: SocratesQuestionProps) {
  const [responseText, setResponseText] = useState("");
  const [followUpResponseText, setFollowUpResponseText] = useState("");
  const [nextResponseText, setNextResponseText] = useState("");
  const [result, setResult] = useState<SubmitAttemptResult | null>(null);
  const [nextResult, setNextResult] = useState<SubmitAttemptResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [followUpPending, startFollowUpTransition] = useTransition();
  const [nextPending, startNextTransition] = useTransition();

  if (!question) {
    return null;
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!question) {
      return;
    }

    startTransition(async () => {
      const submitResult = await submitAttempt({
        questionId: question.id,
        responseText,
      });

      setResult(submitResult);
      setNextResult(null);
      setFollowUpResponseText("");
      setNextResponseText("");

      if (submitResult.status === "error") {
        toast.error(submitResult.message);
        return;
      }

      toast.success(submitResult.message);
    });
  }

  function onSubmitFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!question) {
      return;
    }

    startFollowUpTransition(async () => {
      const submitResult = await submitAttempt({
        questionId: question.id,
        responseText: followUpResponseText,
      });

      setResult(submitResult);
      setNextResult(null);
      setNextResponseText("");

      if (submitResult.status === "error") {
        toast.error(submitResult.message);
        return;
      }

      toast.success("Follow-up submitted");
    });
  }

  function onSubmitNextItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextQuestion = result?.status === "success" ? result.nextQuestion : null;

    if (!nextQuestion) {
      return;
    }

    startNextTransition(async () => {
      const submitResult = await submitAttempt({
        questionId: nextQuestion.id,
        responseText: nextResponseText,
        isNextItem: true,
      });

      setNextResult(submitResult);

      if (submitResult.status === "error") {
        toast.error(submitResult.message);
        return;
      }

      toast.success("Next item submitted");
    });
  }

  const tutorResponse = result?.status === "success" ? result.tutorResponse : null;
  const nextQuestion = result?.status === "success" ? result.nextQuestion : null;
  const showFollowUpForm = result?.status === "success" && !result.isCorrect && !nextQuestion;
  const nextTutorResponse = nextResult?.status === "success" ? nextResult.tutorResponse : null;

  return (
    <section className="border-t pt-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{question.concept.name}</Badge>
        {question.reviewState === "PENDING_INSTRUCTOR_REVIEW" && (
          <Badge variant="outline">Pending instructor review</Badge>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <p className="text-base font-medium leading-7">{question.stem}</p>
        <Textarea
          value={responseText}
          onChange={(event) => setResponseText(event.target.value)}
          placeholder="Explain your reasoning in your own words."
          className="min-h-28 resize-none"
          disabled={pending}
        />
        <Button type="submit" disabled={pending || responseText.trim().length < 3}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="size-4" />
              Submit answer
            </>
          )}
        </Button>
      </form>

      {tutorResponse && (
        <div className="mt-5 rounded-md border bg-muted/40 p-4">
          <p className="text-sm font-medium">Tutor response</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{tutorResponse}</p>
        </div>
      )}

      {showFollowUpForm && (
        <form onSubmit={onSubmitFollowUp} className="mt-5 space-y-3">
          <p className="text-sm font-medium">Reply to tutor</p>
          <Textarea
            value={followUpResponseText}
            onChange={(event) => setFollowUpResponseText(event.target.value)}
            placeholder="Answer the tutor's question."
            className="min-h-24 resize-none"
            disabled={followUpPending}
          />
          <Button type="submit" disabled={followUpPending || followUpResponseText.trim().length < 3}>
            {followUpPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="size-4" />
                Submit reply
              </>
            )}
          </Button>
        </form>
      )}

      {nextQuestion && (
        <div className="mt-6 border-t pt-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Next item</Badge>
            <Badge variant="outline">{nextQuestion.reviewState === "PENDING_INSTRUCTOR_REVIEW" ? "Pending instructor review" : "Approved"}</Badge>
          </div>

          <form onSubmit={onSubmitNextItem} className="space-y-3">
            <p className="text-base font-medium leading-7">{nextQuestion.stem}</p>
            <Textarea
              value={nextResponseText}
              onChange={(event) => setNextResponseText(event.target.value)}
              placeholder="Answer this one without tutor help."
              className="min-h-28 resize-none"
              disabled={nextPending || nextResult?.status === "success"}
            />
            <Button type="submit" disabled={nextPending || nextResponseText.trim().length < 3 || nextResult?.status === "success"}>
              {nextPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Submit next item
                </>
              )}
            </Button>
          </form>

          {nextTutorResponse && (
            <div className="mt-5 rounded-md border bg-muted/40 p-4">
              <p className="text-sm font-medium">Next-item result</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{nextTutorResponse}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
