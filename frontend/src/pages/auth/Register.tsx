import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import {
  AuthCard,
  authButtonClass,
  authLinkClass,
  fieldClass,
  fieldErrorClass,
  labelClass,
  serverErrorClass,
} from "./AuthCard";
import { registerSchema, type RegisterInput } from "../../lib/schemas";
import { apiClient, ApiError } from "../../lib/apiClient";
import { useAuthStore, type AuthUser } from "../../stores/auth";
import { ROLE_HOME, type Role } from "../../lib/constants";
import { cn } from "../../lib/cn";

const ROLES: Array<{ value: Role; label: string; hint: string }> = [
  { value: "customer", label: "Customer", hint: "Buy fresh dairy and manage subscriptions" },
  { value: "farmer", label: "Farmer", hint: "Sell milk directly with verified batches" },
  { value: "business", label: "Business", hint: "Procure dairy in bulk from verified farms" },
  { value: "rider", label: "Delivery rider", hint: "Join the delivery fleet (admin approval required)" },
  // NOTE: no "admin" — admin accounts are provisioned internally, never public.
];

export function Register() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null);
    try {
      const res = await apiClient.post<{
        accessToken: string;
        refreshToken?: string;
        user: AuthUser;
      }>("/auth/register", data);
      // Rider accounts need admin approval before they can sign in — don't
      // drop them into a portal that would 403 on every request.
      if (res.user.status === "pending") {
        setPendingApproval(res.user.email);
        return;
      }
      useAuthStore.getState().login(res.accessToken, res.refreshToken ?? "", res.user);
      navigate(ROLE_HOME[res.user.role], { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(
          err.status === 409
            ? "An account with this email already exists. Try signing in instead."
            : err.status === 0
              ? "Couldn't reach the server. Please check your connection and try again."
              : err.message,
        );
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    }
  };

  if (pendingApproval) {
    return (
      <AuthCard
        title="Account created"
        subtitle="Your rider application is with our team."
      >
        <div className="space-y-4 text-center">
          <p role="status" className="rounded-xl bg-mint px-4 py-3 text-sm font-medium text-ink">
            Thanks, {pendingApproval} — your delivery-rider account is <strong>pending admin approval</strong>.
            We&apos;ll review it shortly; you&apos;ll be able to sign in once it&apos;s approved.
          </p>
          <Link to="/login" className={authLinkClass}>
            Back to sign in
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Join ApnaDairy"
      subtitle={
        <>
          Already have an account?{" "}
          <Link to="/login" className={authLinkClass}>
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && (
          <p role="alert" className={serverErrorClass}>
            {serverError}
          </p>
        )}
        <div>
          <label htmlFor="fullName" className={labelClass}>
            Full name
          </label>
          <input
            id="fullName"
            {...register("fullName")}
            autoComplete="name"
            placeholder="Your name"
            className={fieldClass}
          />
          {errors.fullName && (
            <p role="alert" className={fieldErrorClass}>
              {errors.fullName.message}
            </p>
          )}
        </div>
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
        <fieldset>
          <legend className={cn(labelClass, "mb-1.5")}>I&apos;m joining as</legend>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((r) => (
              <label
                key={r.value}
                className="cursor-pointer rounded-xl border border-line p-3 transition-colors has-[:checked]:border-brand has-[:checked]:bg-mint"
              >
                <input
                  {...register("role")}
                  type="radio"
                  value={r.value}
                  className="sr-only"
                />
                <span className="block text-sm font-semibold text-ink">{r.label}</span>
                <span className="mt-0.5 block text-xs text-muted">{r.hint}</span>
              </label>
            ))}
          </div>
          {errors.role && (
            <p role="alert" className={fieldErrorClass}>
              {errors.role.message}
            </p>
          )}
        </fieldset>
        <div>
          <label htmlFor="phone" className={labelClass}>
            Phone
          </label>
          <input
            id="phone"
            {...register("phone")}
            type="tel"
            autoComplete="tel"
            placeholder="03xx xxxxxxx"
            className={fieldClass}
          />
          {errors.phone && (
            <p role="alert" className={fieldErrorClass}>
              {errors.phone.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>
            Password
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
            Confirm password
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
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}
