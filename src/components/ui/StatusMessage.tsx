import type { ReactNode } from "react";

export interface StatusMessageProps {
  children: ReactNode;
  tone?: "neutral" | "active" | "error";
}

export function StatusMessage({ children, tone = "neutral" }: StatusMessageProps) {
  return (
    <p aria-live="polite" className={`status-message status-message--${tone}`} role="status">
      {children}
    </p>
  );
}
