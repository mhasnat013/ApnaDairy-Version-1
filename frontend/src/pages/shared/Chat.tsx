import { useEffect, useRef, useState } from "react";
import { Bot, Send } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Button } from "../../components/ui/Button";
import { LoadingState } from "../../components/ui/States";
import { cn } from "../../lib/cn";
import { useAuthStore } from "../../stores/auth";
import { useChatHistory, useSendChat } from "../../features/portal/apiEngagement";
import { fmtDateTime } from "../../features/portal/components";

/** Role-aware support chat. Session is stable per user so history persists. */
export function ChatPage({ title = "Support chat", description = "Ask about orders, batches, deliveries or your account." }: { title?: string; description?: string }) {
  const user = useAuthStore((s) => s.user);
  const sessionId = user ? `portal-${user.role}-${user.id}` : undefined;
  const { data: history, isLoading } = useChatHistory(sessionId);
  const send = useSendChat();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history?.length, send.isSuccess]);

  const messages = history ?? [];

  const submit = () => {
    const text = draft.trim();
    if (!text || send.isPending) return;
    setDraft("");
    send.mutate({ message: text, sessionId });
  };

  return (
    <div>
      <PageHeader eyebrow="Support" title={title} description={description} />
      <div className="flex max-h-[70vh] min-h-[480px] flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-card">
        <div className="flex items-center gap-3 border-b border-line bg-palegreen/50 px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand text-white">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">ApnaDairy Assistant</p>
            <p className="text-xs text-muted">Rule-based help — a human follows up on anything it can't answer.</p>
          </div>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-6" role="log" aria-label="Chat messages" aria-live="polite">
          {isLoading ? (
            <LoadingState label="Loading conversation…" />
          ) : messages.length === 0 ? (
            <div className="mx-auto max-w-sm rounded-2xl bg-palegreen/60 px-5 py-6 text-center text-sm text-muted">
              No messages yet — say hello and ask about your orders, batches or deliveries.
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender === "user";
              return (
                <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      mine ? "bg-brand text-white" : "bg-palegreen/70 text-ink",
                    )}
                  >
                    <p className="whitespace-pre-wrap">{m.messageText}</p>
                    <p className={cn("mt-1 text-[11px]", mine ? "text-white/70" : "text-muted")}>
                      {fmtDateTime(m.sentAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          {send.isPending && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-palegreen/70 px-4 py-3 text-sm text-muted">Typing…</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        {send.isError && (
          <p role="alert" className="border-t border-line bg-danger/10 px-5 py-2 text-sm font-medium text-danger">
            Couldn't send that message. Please try again.
          </p>
        )}
        <form
          className="flex items-center gap-3 border-t border-line px-4 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label htmlFor="chat-input" className="sr-only">
            Type your message
          </label>
          <input
            id="chat-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type your message…"
            maxLength={4000}
            className="h-11 flex-1 rounded-xl border border-line bg-white px-4 text-sm text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <Button type="submit" loading={send.isPending} aria-label="Send message">
            <Send className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
