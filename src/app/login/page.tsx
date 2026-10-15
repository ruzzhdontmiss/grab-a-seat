import { Suspense } from "react";
import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="py-6">
      <Suspense fallback={null}>
        <AuthForm mode="sign-in" />
      </Suspense>
    </div>
  );
}
