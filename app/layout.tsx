import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediSync — Patient Portal",
  description: "AI-assisted healthcare coordination, with a human always in the loop.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}