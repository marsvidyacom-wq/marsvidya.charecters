import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MarsVidya — Learn for the Future",
    template: "%s | MarsVidya",
  },
  description: "Talk with inspiring characters. Explore, learn, and grow through voice conversations.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
