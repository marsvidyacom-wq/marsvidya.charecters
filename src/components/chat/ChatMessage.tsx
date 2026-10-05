import type { ChatMessageView } from "@/types/chat";

export interface ChatMessageProps {
  message: ChatMessageView;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isTeacher = message.role === "assistant";

  return (
    <article
      aria-label={`${isTeacher ? "AI English Teacher" : "You"} message`}
      className={`chat-message chat-message--${message.role}`}
    >
      <span aria-hidden="true" className="chat-message__avatar">
        {isTeacher ? "M" : "You"}
      </span>
      <div className="chat-message__body">
        <span className="chat-message__author">{isTeacher ? "AI English Teacher" : "You"}</span>
        <p>{message.content}</p>
      </div>
    </article>
  );
}
