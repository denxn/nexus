import Link from "next/link";
import { StatusPage, statusStyles } from "@/components/StatusPage";

export default function NotFound() {
  return (
    <StatusPage title="Page not found" message="There is nothing at this address.">
      <Link href="/" className={statusStyles.primary}>
        Back to the dashboard
      </Link>
    </StatusPage>
  );
}
