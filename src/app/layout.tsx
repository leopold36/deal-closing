import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/lib/user-context";
import { NavBar } from "@/components/nav-bar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Deal Closing",
  description: "Deal closing approval workflow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased text-[13px]`}>
        <UserProvider>
          <div className="min-h-screen flex flex-col">
            <NavBar />
            <main className="flex-1 bg-background">{children}</main>
          </div>
        </UserProvider>
      </body>
    </html>
  );
}
