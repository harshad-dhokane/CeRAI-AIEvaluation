import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { API_ENDPOINTS } from "../../config/api";
import styles from "./Analysis.module.css";

interface RunSummary {
  run_name: string;
  status: string;
  start_ts: string;
  end_ts: string | null;
}

interface RunDetail {
  detail_id: number;
  testcase_name: string;
  metric_name: string;
  status: string;
  score?: number | null;
}

interface TestRunResponse {
  summary: RunSummary;
  details: RunDetail[];
}

interface AnalyseResponse {
  status: string;
  analysis_start_ts?: string;
  analysis_end_ts?: string;
  analysis_duration_seconds?: number;
}

const formatDuration = (start: string, end: string | null): string => {
  if (!start || !end) return "-";
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return "-";

  const totalSeconds = Math.floor((endMs - startMs) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const Analysis: React.FC = () => {
  const { runName } = useParams<{ runName: string }>();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [details, setDetails] = useState<RunDetail[]>([]);
  const [analysisStartTs, setAnalysisStartTs] = useState<string | null>(null);
  const [analysisEndTs, setAnalysisEndTs] = useState<string | null>(null);

  useEffect(() => {
    if (!runName) {
      setError("Run name is missing in the URL.");
      setLoading(false);
      return;
    }

    const fetchAnalysis = async () => {
      setLoading(true);
      setError(null);
      try {
        const analyseRes = await fetch(API_ENDPOINTS.ANALYSE_RUN(runName));
        if (!analyseRes.ok) {
          const analyseBody = await analyseRes.json().catch(() => null);
          throw new Error(analyseBody?.detail || `Analysis failed (${analyseRes.status})`);
        }
        const analyseData: AnalyseResponse = await analyseRes.json().catch(() => ({ status: "success" }));
        setAnalysisStartTs(analyseData.analysis_start_ts ?? null);
        setAnalysisEndTs(analyseData.analysis_end_ts ?? null);

        const detailsRes = await fetch(API_ENDPOINTS.GET_TEST_RUN_DETAILS(runName, ""));
        if (!detailsRes.ok) {
          const detailsBody = await detailsRes.json().catch(() => null);
          throw new Error(detailsBody?.detail || `Failed to load run details (${detailsRes.status})`);
        }

        const data: TestRunResponse = await detailsRes.json();
        setSummary(data.summary);
        setDetails(data.details || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong while analysing this run.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [runName]);

  const stats = useMemo(() => {
    const scoredItems = details.filter((d) => typeof d.score === "number") as Array<RunDetail & { score: number }>;
    const totalScore = scoredItems.reduce((sum, d) => sum + d.score, 0);
    const overallScore = scoredItems.length > 0 ? totalScore / scoredItems.length : null;
    const completed = details.filter((d) => d.status === "COMPLETED").length;

    return {
      totalCases: details.length,
      scoredCases: scoredItems.length,
      completedCases: completed,
      overallScore,
    };
  }, [details]);

  if (loading) return <div className={styles.state}>Running analysis for this run...</div>;
  if (error) return <div className={`${styles.state} ${styles.error}`}>{error}</div>;
  if (!summary) return <div className={styles.state}>No analysis data found.</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2>Run Analysis</h2>
        
      </div>

      <section className={styles.cardGrid}>
        <div className={styles.card}>
          <span className={styles.label}>Run Name</span>
          <span className={styles.value}>{summary.run_name}</span>
        </div>
        
        <div className={styles.card}>
          <span className={styles.label}>Duration</span>
          <span className={styles.value}>
            {formatDuration(analysisStartTs || "", analysisEndTs)}
          </span>
        </div>
        <div className={styles.card}>
          <span className={styles.label}>Overall Score</span>
          <span className={styles.value}>
            {stats.overallScore !== null ? stats.overallScore.toFixed(2) : "-"}
          </span>
        </div>
        <div className={styles.card}>
          <span className={styles.label}>Completed / Total</span>
          <span className={styles.value}>{stats.completedCases} / {stats.totalCases}</span>
        </div>
      </section>

      <section className={styles.tableWrap}>
        <h3>Scores by Test Case</h3>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Test Case</th>
                <th>Metric</th>
                <th>Status</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {details.length === 0 ? (
                <tr>
                  <td colSpan={4} className={styles.empty}>No analysed test case records found.</td>
                </tr>
              ) : (
                details.map((item) => (
                  <tr key={item.detail_id}>
                    <td>{item.testcase_name}</td>
                    <td>{item.metric_name}</td>
                    <td>{item.status}</td>
                    <td>{typeof item.score === "number" ? item.score.toFixed(2) : "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Analysis;
