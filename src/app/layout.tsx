import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import "antd/dist/reset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Legal Diary",
  description: "Legal Diary Application for Advocates",
  icons: {
    icon: "/images/LEGAL DIARY LOGO.PNG",
    shortcut: "/images/LEGAL DIARY LOGO.PNG",
    apple: "/images/LEGAL DIARY LOGO.PNG",
  },
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
