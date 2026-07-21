"use client"

import { Button } from "@/components/ui/button";
import { tryCatch } from "@/hooks/try-catch";
import { Loader2 } from "lucide-react";
import { useTransition } from "react"
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { enrollInCourse } from "../actions/enrollInCourse";

export function EnrollmentButton({ courseId, entryHref }: { courseId: string; entryHref: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(): void {
    startTransition(async () => {
      const { data: result, error } = await tryCatch(enrollInCourse(courseId));

      if (error) {
        toast.error("An unexpected error occurred. Please try again.");
        return;
      }

      if (result.status === "error") {
        toast.error(result.message);
        return;
      }

      if (result.status === "success") {
        // Free-course enrollment resolves here (paid courses redirect to Stripe
        // inside the action). Send the student straight into the first lesson.
        toast.success(result.message);
        router.push(entryHref);
        return;
      }
    })
  }

  return <Button
    disabled={pending}
    onClick={onSubmit}
    className="w-full"
  >
    {pending ? (<>
      <Loader2 className="mr-2 size-4 animate-spin" />Enrolling...</>) : (
      <>Enroll Now!</>
    )}
  </Button>
}