"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LoginButton from "@/components/auth/login-button";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Graph Review System</h1>
          <p className="mt-2 text-gray-600">
            Submit and manage graph reviews for your team
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {status === "loading" ? (
            <div className="flex justify-center">
              <div className="w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
          ) : status === "authenticated" ? (
            <p className="text-center text-gray-600">Redirecting to dashboard...</p>
          ) : (
            <div className="flex flex-col space-y-4">
              <p className="text-center text-gray-600">
                Please sign in to continue
              </p>
              <div className="flex justify-center">
                <LoginButton />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}