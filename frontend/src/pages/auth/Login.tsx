import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AuthCard,
  authButtonClass,
  authLinkClass,
  fieldClass,
  fieldErrorClass,
  labelClass,
  serverErrorClass,
} from "./AuthCard";
import { loginSchema, type LoginInput } from "../../lib/schemas";
import { apiClient, ApiError } from "../../lib/apiClient";
import { useAuthStore, type AuthUser } from "../../stores/auth";
import { safeNext } from "../../app/guards";
import { ROLE_HOME } from "../../lib/constants";

interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
}

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);
    try {
      const res = await apiClient.post<LoginResponse>("/auth/login", data);
      useAuthStore.getState().login(res.accessToken, res.refreshToken ?? "", res.user);
      const next = new URLSearchParams(location.search).get("next");
      navigate(next ? safeNext(next) : ROLE_HOME[res.user.role], { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(
          err.status === 401
            ? "Incorrect email or password. Please try again."
            : err.status === 403
              ? err.message || "Your account isn't active yet. Please check back later."
              : err.status === 0
                ? "Couldn't reach the server. Please check your connection and try again."
                : err.message,
        );
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle={
        <>
          New to ApnaDairy?{" "}
          <Link to="/register" className={authLinkClass}>
            Create an account
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
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-semibold text-ink">
              Password
            </label>
            <Link to="/forgot-password" className={`text-xs ${authLinkClass}`}>
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            {...register("password")}
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className={fieldClass}
          />
          {errors.password && (
            <p role="alert" className={fieldErrorClass}>
              {errors.password.message}
            </p>
          )}
        </div>
        <button type="submit" disabled={isSubmitting} className={authButtonClass}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-center text-xs text-muted">
          Admins sign in here too — with an account provisioned by the ApnaDairy team.
        </p>
      </form>
    </AuthCard>
  );
}
