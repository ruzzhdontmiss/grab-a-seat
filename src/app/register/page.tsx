import { Suspense } from "react";
import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <div className="py-6">
      <Suspense fallback={null}>
        <AuthForm mode="sign-up" />
      </Suspense>
    </div>
  );
}
