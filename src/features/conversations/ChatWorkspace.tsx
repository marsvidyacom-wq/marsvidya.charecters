"use client";

import Link from "next/link";
import { useState } from "react";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { MarsVidyaHeader } from "@/components/navigation/MarsVidyaHeader";
import { Card } from "@/components/ui/Card";
import { StatusMessage } from "@/components/ui/StatusMessage";
import type { ChatMessageView, ChatSubmitHandler } from "@/types/chat";

const welcomeMessage: ChatMessageView = {
  id: "welcome",
  role: "assistant",
  content: "Hi! What would you like to practise in English today?",
};

async function developmentSubmit() {
  await Promise.resolve();
}

export interface ChatWorkspaceProps {
  onSubmit?: ChatSubmitHandler;
}

type ChatStatus = { message: string; tone: "neutral" | "active" | "error" };

export function ChatWorkspace({ onSubmit = developmentSubmit }: ChatWorkspaceProps) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessageView[]>([welcomeMessage]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<ChatStatus>({
    message: "Development mode — live AI replies will be connected in the next milestone.",
    tone: "neutral",
  });

  async function submitMessage() {
    const content = draft.trim();

    if (!content) {
      setStatus({ message: "Write a message before sending.", tone: "error" });
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    setStatus({ message: "Sending your message…", tone: "active" });

    try {
      await onSubmit(content);
      setMessages((current) => [
        ...current,
        { id: `user-${current.length}`, role: "user", content },
      ]);
      setDraft("");
      setStatus({
        message: "Message saved in development mode. Live AI replies are coming next.",
        tone: "neutral",
      });
    } catch (error) {
      setStatus({
        message: error instanceof Error ? error.message : "Your message could not be sent. Try again.",
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="chat-shell">
      <MarsVidyaHeader />
      <main className="chat-workspace">
        <div className="chat-workspace__heading">
          <Link className="back-link" href="/">
            <span aria-hidden="true">←</span> Speaking practice
          </Link>
          <span className="eyebrow">Private English practice</span>
          <h2>Chat with your AI English Teacher</h2>
          <p>Write naturally. Your teacher will help you build clear, confident English.</p>
        </div>

        <Card className="chat-panel">
          <div aria-live="polite" aria-relevant="additions" className="chat-thread">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
          </div>
          <StatusMessage tone={status.tone}>{status.message}</StatusMessage>
          <ChatInput
            isSubmitting={isSubmitting}
            onChange={setDraft}
            onSubmit={submitMessage}
            value={draft}
          />
        </Card>
      </main>
    </div>
  );
}
