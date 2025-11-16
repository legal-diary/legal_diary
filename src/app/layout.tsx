import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import "antd/dist/reset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Legal Diary",
  description: "Legal Diary Application for Advocates",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
