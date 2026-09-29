import { useState } from "react";
import { Bot, MessageCircle, User } from "lucide-react";
import { PageHeader } from "../../../components/ui/Section";
import { Card } from "../../../components/ui/Card";
import { QueryState, fmtDateTime } from "../../../features/portal/components";
import { useChatSessionMessages, useChatSessions } from "../../../features/portal/apiCore";
import { cn } from "../../../lib/cn";

/** Admin-only, read-only oversight of chatbot conversations across the platform. */
export function AdminChatOversight() {
  const sessions = useChatSessions();
  const [selected, setSelected] = useState<string | null>(null);
  const messages = useChatSessionMessages(selected);

  const list = sessions.data ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Chat oversight"
        description="Read-only view of assistant conversations across the platform."
      />
      <QueryState
        isLoading={sessions.isLoading}
        isError={sessions.isError}
        error={sessions.error}
        isEmpty={list.length === 0}
        emptyTitle="No conversations"
        emptyHint="User conversations with the ApnaDairy assistant will appear here."
        emptyIcon={<MessageCircle className="h-7 w-7" aria-hidden="true" />}
        onRetry={() => sessions.refetch()}
      >
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <Card className="max-h-[70vh] overflow-y-auto p-2">
            <ul className="space-y-1" role="listbox" aria-label="Chat sessions">
              {list.map((s) => (
                <li key={s.session_id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected === s.session_id}
                    onClick={() => setSelected(s.session_id)}
                    className={cn(
                      "w-full rounded-xl px-4 py-3 text-left transition-colors",
                      selected === s.session_id ? "bg-mint ring-1 ring-brand/40" : "hover:bg-palegreen/60",
                    )}
                  >
                    <p className="truncate text-sm font-semibold text-ink">
                      {s.user_email ?? `User #${s.user_id ?? "?"}`}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {s.messages} message{s.messages === 1 ? "" : "s"}
                      {s.last_at ? ` · ${fmtDateTime(s.last_at)}` : ""}
                    </p>
                    <p className="truncate font-mono text-[11px] text-muted/70">{s.session_id}</p>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="flex max-h-[70vh] min-h-[480px] flex-col overflow-hidden p-0">
            {selected === null ? (
              <div className="flex flex-1 items-center justify-center p-8 text-center">
                <div>
                  <MessageCircle className="mx-auto h-10 w-10 text-muted" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold text-ink">Select a conversation</p>
                  <p className="mt-1 text-xs text-muted">Choose a session on the left to read the thread.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="border-b border-line bg-palegreen/50 px-5 py-4">
                  <p className="truncate text-sm font-semibold text-ink">{selected}</p>
                  <p className="text-xs text-muted">Read-only — admins cannot reply from here.</p>
                </div>
                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-6" role="log" aria-label="Chat messages">
                  {messages.isLoading ? (
                    <p className="py-8 text-center text-sm text-muted">Loading conversation…</p>
                  ) : messages.isError ? (
                    <div className="py-8 text-center">
                      <p className="text-sm font-semibold text-ink">Couldn't load this conversation.</p>
                      <button
                        type="button"
                        onClick={() => messages.refetch()}
                        className="mt-2 text-sm font-semibold text-brand hover:underline"
                      >
                        Try again
                      </button>
                    </div>
                  ) : (messages.data ?? []).length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted">No messages in this session.</p>
                  ) : (
                    (messages.data ?? []).map((m) => {
                      const mine = m.sender === "user";
                      return (
                        <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                          <div
                            className={cn(
                              "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                              mine ? "bg-brand text-white" : "bg-palegreen/70 text-ink",
                            )}
                          >
                            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-70">
                              {mine ? <User className="h-3 w-3" aria-hidden="true" /> : <Bot className="h-3 w-3" aria-hidden="true" />}
                              {mine ? "User" : "Assistant"}
                            </p>
                            <p className="whitespace-pre-wrap">{m.message_text}</p>
                            {m.sent_at && (
                              <p className={cn("mt-1 text-[11px]", mine ? "text-white/70" : "text-muted")}>
                                {fmtDateTime(m.sent_at)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </Card>
        </div>
      </QueryState>
    </div>
  );
}
