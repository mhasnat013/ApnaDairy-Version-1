import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  AuthCard,
  authButtonClass,
  authLinkClass,
  fieldClass,
  fieldErrorClass,
  labelClass,
  serverErrorClass,
} from "./AuthCard";
import { resetPasswordSchema, type ResetPasswordInput } from "../../lib/schemas";
import { apiClient, ApiError } from "../../lib/apiClient";

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = async (data: ResetPasswordInput) => {
    setServerError(null);
    try {
      await apiClient.post("/auth/reset-password", { token, password: data.password });
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(
          err.status === 0
            ? "Couldn't reach the server. Please check your connection and try again."
            : "This reset link is invalid or has expired. Please request a new one.",
        );
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    }
  };

  if (!token) {
    return (
      <AuthCard title="Invalid reset link">
        <p className="text-sm text-muted">
          This link is missing its reset token.{" "}
          <Link to="/forgot-password" className={authLinkClass}>
            Request a new one
          </Link>
          .
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password" subtitle="Pick something strong — at least 8 characters.">
      {done ? (
        <div className="text-center">
          <p role="status" className="rounded-xl bg-brand/10 px-4 py-3 text-sm text-brand-pine ring-1 ring-brand/25">
            Password updated. You can sign in with your new password now.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="btn-lift mt-5 h-11 rounded-full bg-brand px-8 text-sm font-semibold text-white transition-colors hover:bg-brand-pine"
          >
            Go to sign in
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {serverError && (
            <p role="alert" className={serverErrorClass}>
              {serverError}
            </p>
          )}
          <div>
            <label htmlFor="password" className={labelClass}>
              New password
            </label>
            <input
              id="password"
              {...register("password")}
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className={fieldClass}
            />
            {errors.password && (
              <p role="alert" className={fieldErrorClass}>
                {errors.password.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="confirmPassword" className={labelClass}>
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              {...register("confirmPassword")}
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your password"
              className={fieldClass}
            />
            {errors.confirmPassword && (
              <p role="alert" className={fieldErrorClass}>
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
          <button type="submit" disabled={isSubmitting} className={authButtonClass}>
            {isSubmitting ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
