import { z } from "zod";

/** Shared zod form schemas. Feature agents extend these per domain. */

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().min(2, "Enter your full name"),
    email: z.string().email("Enter a valid email address"),
    phone: z.string().min(7, "Enter a valid phone number"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    role: z.enum(["customer", "farmer", "business", "rider"] as const, {
      errorMap: () => ({ message: "Choose an account type" }),
    }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** All public roles (admin registration is never public). */
export const publicRoleSchema = z.enum(["customer", "farmer", "business", "rider"]);

export const batchCodeSchema = z.object({
  batchCode: z
    .string()
    .trim()
    .min(4, "Enter the batch code from your product label")
    .max(32, "Batch code is too long")
    .regex(/^[A-Za-z0-9-]+$/, "Batch codes only use letters, numbers and dashes"),
});
export type BatchCodeInput = z.infer<typeof batchCodeSchema>;

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  subject: z.string().trim().min(4, "Enter a subject"),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters)"),
});
export type ContactInput = z.infer<typeof contactSchema>;
