import { CorrelationCard } from "@/components/CorrelationCard";
import { FlawsAnalytics } from "@/components/FlawsAnalytics";
import { PerformanceCard } from "@/components/PerformanceCard";
import styles from "@/components/insights.module.css";
import { parseCorrelationParams, parsePerf } from "@/lib/insights/params";
import { withParams } from "@/lib/insights/present";
import { getInsightData } from "@/lib/insights/queries";

export const dynamic = "force-dynamic";

type Params = {
  perf?: string | string[];
  cx?: string | string[];
  cy?: string | string[];
  lag?: string | string[];
};

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const perf = parsePerf(params.perf, "month");
  const data = await getInsightData({ perf, correlation: parseCorrelationParams(params), greeting: "Status report" });

  return (
    <div className={styles.stack}>
      <h1 className={styles.pageTitle}>Analytics</h1>
      <PerformanceCard metrics={data.performance} period={perf} hrefFor={(p) => withParams("/analytics", params, { perf: p })} />
      <CorrelationCard data={data.correlation} />
      <FlawsAnalytics items={data.flaws} />
    </div>
  );
}
