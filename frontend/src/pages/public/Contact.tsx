import { Link } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  EditorialHero,
  ColourBlock,
} from "../../components/public/Editorial";
import { Reveal } from "../../components/ui/Reveal";
import { contactSchema, type ContactInput } from "../../lib/schemas";
import { apiClient, ApiError } from "../../lib/apiClient";
import { useAuthStore } from "../../stores/auth";

/**
 * Contact form — sends a real support ticket via POST /complaints when the
 * visitor is logged in. Guests are told honestly to log in first.
 */
export function Contact() {
  const isAuthenticated = useAuthStore((s) => s.token !== null && s.user !== null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({ resolver: zodResolver(contactSchema) });

  const onSubmit = async (data: ContactInput) => {
    setError(null);
    if (!isAuthenticated) {
      setError("Please log in to send us a message — tickets are linked to your account so we can follow up.");
      return;
    }
    try {
      await apiClient.post("/complaints", {
        subject: data.subject,
        description: `From ${data.name} <${data.email}>\n\n${data.message}`,
      });
      setSent(true);
      reset();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? `Couldn't send your message: ${e.message}`
          : "Couldn't send your message. Please try again.",
      );
    }
  };

  const fieldClass =
    "h-12 w-full rounded-xl border border-line bg-white px-4 text-sm text-ink placeholder:text-muted/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25";

  return (
    <div>
      <EditorialHero
        eyebrow="Contact"
        title={"Get in touch"}
        lede="Questions about the network, a partnership, or feedback on the platform — we'd love to hear it."
      />
      <ColourBlock tone="ivory">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="rounded-3xl border border-line bg-white p-6 shadow-card sm:p-10"
              noValidate
            >
              {sent && (
                <p
                  role="status"
                  className="mb-6 flex items-start gap-2.5 rounded-2xl bg-mint px-4 py-3.5 text-sm font-medium text-brand-pine"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  Message sent — we've opened a support ticket and will follow up on your account email.
                </p>
              )}
              {error && (
                <p
                  role="alert"
                  className="mb-6 flex items-start gap-2.5 rounded-2xl bg-red-50 px-4 py-3.5 text-sm font-medium text-danger"
                >
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>
                    {error}{" "}
                    <Link to="/login?next=/contact" className="font-semibold underline">
                      Log in
                    </Link>
                  </span>
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-ink">
                    Name
                  </label>
                  <input id="name" {...register("name")} placeholder="Your name" className={fieldClass} />
                  {errors.name && (
                    <p role="alert" className="mt-1.5 text-xs text-danger">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-ink">
                    Email
                  </label>
                  <input
                    id="email"
                    {...register("email")}
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={fieldClass}
                  />
                  {errors.email && (
                    <p role="alert" className="mt-1.5 text-xs text-danger">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <label htmlFor="subject" className="mb-1.5 block text-sm font-semibold text-ink">
                  Subject
                </label>
                <input id="subject" {...register("subject")} placeholder="What's this about?" className={fieldClass} />
                {errors.subject && (
                  <p role="alert" className="mt-1.5 text-xs text-danger">
                    {errors.subject.message}
                  </p>
                )}
              </div>
              <div className="mt-4">
                <label htmlFor="message" className="mb-1.5 block text-sm font-semibold text-ink">
                  Message
                </label>
                <textarea
                  id="message"
                  {...register("message")}
                  rows={5}
                  placeholder="Tell us what's on your mind…"
                  className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink placeholder:text-muted/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                />
                {errors.message && (
                  <p role="alert" className="mt-1.5 text-xs text-danger">
                    {errors.message.message}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-lift mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-brand px-8 text-sm font-semibold text-white transition-colors hover:bg-brand-pine disabled:opacity-60"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                Send message
              </button>
            </form>
          </Reveal>
          <Reveal className="mt-6 text-center">
            <p className="text-sm text-muted">
              Signed in? Your{" "}
              <Link to="/login" className="font-semibold text-brand hover:underline">
                portal support section
              </Link>{" "}
              keeps your full ticket history.
            </p>
          </Reveal>
        </div>
      </ColourBlock>
    </div>
  );
}
