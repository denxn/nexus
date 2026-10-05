"use client";

import Link from "next/link";
import { StatusPage, statusStyles } from "@/components/StatusPage";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <StatusPage
      title="Something went wrong"
      message="That did not work. Try again, or log in again if your session may have expired."
    >
      <button type="button" className={statusStyles.primary} onClick={() => retry()}>
        Try again
      </button>
      <Link href="/login" className={statusStyles.secondary}>
        Log in again
      </Link>
    </StatusPage>
  );
}
