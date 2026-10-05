export type ChatRole = "assistant" | "user";

export interface ChatMessageView {
  id: string;
  role: ChatRole;
  content: string;
}

export type ChatSubmitHandler = (content: string) => Promise<void>;
