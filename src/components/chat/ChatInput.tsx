import type { FormEvent, KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";

export interface ChatInputProps {
  value: string;
  isSubmitting: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

function SendIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="m4 4 17 8-17 8 3-8-3-8Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M7 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

export function ChatInput({ value, isSubmitting, onChange, onSubmit }: ChatInputProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <form className="chat-composer" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="chat-message">
        Message your English teacher
      </label>
      <textarea
        autoComplete="off"
        disabled={isSubmitting}
        id="chat-message"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a question or practise a sentence…"
        rows={2}
        value={value}
      />
      <Button aria-label="Send message" disabled={isSubmitting} size="icon" type="submit">
        <SendIcon />
      </Button>
      <p className="chat-composer__hint">Enter to send · Shift + Enter for a new line</p>
    </form>
  );
}
