import { HistoryPage } from "@/components/history/HistoryPage";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <HistoryPage type="SLEEP" basePath="/sleep" searchParams={await searchParams} />;
}
