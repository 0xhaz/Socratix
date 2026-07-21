"use client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import React, { useTransition } from "react";
import { Loader } from "lucide-react";
import { useRouter } from "next/navigation";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  // State management
  const [githubPending, startGithubTransition] = useTransition();
  const [emailPending, startEmailTransition] = useTransition();

  const [email, setEmail] = React.useState<string>("");

  const router = useRouter();

  // GitHub login
  async function signInWithGithub() {
    startGithubTransition(async () => {
      await authClient.signIn.social({
        provider: "github",
        callbackURL: "/",
        fetchOptions: {
          onSuccess: async () => {
            // await handleRoleUpdate(selectedRole);
            toast.success("Successfully logged in with GitHub");
          },
          onError: (error) => {
            toast.error(error.error.message);
          },
        },
      });
    });
  }

  // Email login (OTP-based)
  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    startEmailTransition(async () => {
      try {
        // Use emailOTP sign in instead of email/password
        await authClient.emailOtp.sendVerificationOtp({
          email: email,
          type: 'sign-in',
          fetchOptions: {
            onSuccess: async () => {
              toast.success(`Verification code sent to ${email}`);
              router.push(`/verify-email?email=${encodeURIComponent(email)}`);
            },
            onError: (error) => {
              toast.error(error.error.message);
            },
          },
        });
      } catch (error) {
        console.error("Error sending verification code:", error);
        toast.error("An unexpected error occurred");
      }
    });
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>
            Choose your role and login to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={signInWithEmail}>
            <div className="grid gap-6">


              {/* Social Logins */}
              <div className="flex gap-4">
                {/* GitHub login */}
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 justify-center gap-2"
                  onClick={signInWithGithub}
                  disabled={githubPending}
                >
                  {githubPending ? (
                    <>
                      <Loader className="size-4 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className="size-4"
                      >
                        <path
                          d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                          fill="currentColor"
                        />
                      </svg>
                      GitHub
                    </>
                  )}
                </Button>
              </div>

              <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                <span className="bg-card text-muted-foreground relative z-10 px-2">
                  Or continue with email
                </span>
              </div>


              {/* Email OTP Login */}
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={emailPending }
                  onClick={signInWithEmail}
                >
                  {emailPending ? (
                    <>
                      <Loader className="size-4 animate-spin mr-2" />
                      Sending OTP...
                    </>
                  ) : (
                    "Continue with Email"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="text-muted-foreground text-center text-xs text-balance">
        By clicking continue, you agree to our{" "}
        <a
          href="#"
          className="underline underline-offset-4 hover:text-primary"
        >
          Terms of Service
        </a>{" "}
        and{" "}
        <a
          href="#"
          className="underline underline-offset-4 hover:text-primary"
        >
          Privacy Policy
        </a>
        .
      </div>
    </div>
  );
}
