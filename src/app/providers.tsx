"use client";

import dynamic from "next/dynamic";
import { Toaster } from "sonner";

const AuthProvider = dynamic(
  () => import("@/contexts/auth-context").then((m) => m.AuthProvider),
  { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}
