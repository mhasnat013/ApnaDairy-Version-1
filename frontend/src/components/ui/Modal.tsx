import { ReactNode, useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Render as a full-screen sheet on mobile (<640px). */
  sheetOnMobile?: boolean;
  labelledBy?: string;
  /** Night-theme panel (dark forest glass) for public pages. */
  dark?: boolean;
}

/**
 * Accessible dialog primitive (plan §16): focus trap, Escape close,
 * body scroll-lock, focus return, reduced-motion fade-only.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  sheetOnMobile = true,
  labelledBy,
  dark = false,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<Element | null>(null);
  const titleId = labelledBy ?? "modal-title";
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      // Focus trap
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    // Move focus into the dialog on open
    const t = window.setTimeout(() => dialogRef.current?.focus(), 30);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      window.clearTimeout(t);
      document.body.style.overflow = originalOverflow;
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      role="presentation"
    >
      <button
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/50 backdrop-blur-[2px]"
        tabIndex={-1}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col shadow-lift outline-none",
          dark
            ? "border border-white/10 bg-[#173127] text-ivory"
            : "bg-white",
          "animate-[modalIn_180ms_ease-out]",
          sheetOnMobile
            ? "rounded-t-3xl sm:max-w-lg sm:rounded-3xl"
            : "m-4 max-w-lg rounded-3xl",
          reduceMotion && "animate-none",
        )}
      >
        <div
          className={cn(
            "flex items-start justify-between gap-4 px-6 py-5",
            dark ? "border-b border-white/10" : "border-b border-line",
          )}
        >
          <div>
            <h2
              id={titleId}
              className={cn(
                "text-xl",
                dark
                  ? "font-condensed uppercase tracking-wide text-ivory"
                  : "font-display font-semibold text-ink",
              )}
            >
              {title}
            </h2>
            {description && (
              <p className={cn("mt-1 text-sm", dark ? "text-ivory/60" : "text-muted")}>
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className={cn(
              "rounded-full p-2 transition-colors",
              dark ? "text-ivory/60 hover:bg-white/10 hover:text-white" : "text-muted hover:bg-palegreen hover:text-ink",
            )}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
      <style>{`@keyframes modalIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }`}</style>
    </div>,
    document.body,
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

/** Confirmation dialog for destructive/important actions. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} sheetOnMobile={false}>
      <p className="text-sm leading-relaxed text-muted">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="h-10 rounded-xl border border-line px-5 text-sm font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={cn(
            "h-10 rounded-xl px-5 text-sm font-semibold text-white transition-colors",
            danger ? "bg-danger hover:brightness-110" : "bg-brand hover:bg-brand-pine",
          )}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
