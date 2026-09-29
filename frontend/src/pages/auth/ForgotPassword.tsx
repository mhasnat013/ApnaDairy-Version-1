import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import {
  AuthCard,
  authButtonClass,
  authLinkClass,
  fieldClass,
  fieldErrorClass,
  labelClass,
  serverErrorClass,
} from "./AuthCard";
import { z } from "zod";
import { apiClient, ApiError } from "../../lib/apiClient";

const forgotSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
});

type ForgotInput = z.infer<typeof forgotSchema>;

export function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotInput>({ resolver: zodResolver(forgotSchema) });

  const onSubmit = async (data: ForgotInput) => {
    setServerError(null);
    try {
      await apiClient.post("/auth/forgot-password", data);
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        setServerError("Couldn't reach the server. Please check your connection and try again.");
      } else {
        // Avoid account enumeration: treat other errors as sent.
        setSent(true);
      }
    }
  };

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your account email and we'll send you a reset link."
    >
      {sent ? (
        <div className="text-center">
          <p role="status" className="rounded-xl bg-brand/10 px-4 py-3 text-sm text-brand-pine ring-1 ring-brand/25">
            If an account exists for that email, a reset link is on its way.
          </p>
          <Link
            to="/login"
            className={`mt-5 inline-block text-sm ${authLinkClass}`}
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {serverError && (
            <p role="alert" className={serverErrorClass}>
              {serverError}
            </p>
          )}
          <div>
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <input
              id="email"
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={fieldClass}
            />
            {errors.email && (
              <p role="alert" className={fieldErrorClass}>
                {errors.email.message}
              </p>
            )}
          </div>
          <button type="submit" disabled={isSubmitting} className={authButtonClass}>
            {isSubmitting ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
