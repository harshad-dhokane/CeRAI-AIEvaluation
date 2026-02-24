import React, { useEffect, useState } from "react";
import "./TestRunsTable.css";
import { useNavigate } from "react-router-dom";
import AppButton from "../common/Button/AppButton";
import { Pagination } from "react-bootstrap";
import { API_BASE_URL, API_ENDPOINTS } from "../../config/api";

// Define the structure of a test run (for future use)
interface TestRun {
  run_id: number;
  run_name: string;
  target: string;
  status: string;
  start_ts: string;
  end_ts: string | null;
  domain: string;
  
}

interface Props {
  filters: Record<string, string>; // e.g. { domain: "qaoncloud.com", target: "api" }
}

const TestRunsTable: React.FC<Props> = ({filters}) => {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [filteredRuns, setFilteredRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Table headers
  const headers = [
    "Run Id", "Run Name", "Target", "Started At","Ended At", 
    "Duration", "Status", "Domain",  "Report"
  ];

  // Get Data from backend
  useEffect(() => {
    setLoading(true);
    
    const params = new URLSearchParams(filters).toString();
    const url = `${API_BASE_URL}${API_ENDPOINTS.GET_ALL_TEST_RUNS}?${params}`;
    
    fetch(url)
      .then(res => res.json())
      .then((data: TestRun[]) => {
        setRuns(data);
        setFilteredRuns(data);
        setCurrentPage(1); // Reset to first page when filters change
      })
      .catch(err => console.error("Error fetching test runs:", err))
      .finally(() => setLoading(false));
  }, [filters]);

  // Get current runs
  const indexOfLastRun = currentPage * itemsPerPage;
  const indexOfFirstRun = indexOfLastRun - itemsPerPage;
  const currentRuns = filteredRuns.slice(indexOfFirstRun, indexOfLastRun);
  const totalPages = Math.ceil(filteredRuns.length / itemsPerPage);

  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Generate page numbers for pagination
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }
  
  return (
    <div className="test-runs-table-wrapper">
      <div className="table-card">
        <div className="table-responsive">
          <table className="test-runs-table">
            <thead>
              <tr>
                {headers.map(header => (
                  <th key={header} scope="col">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={headers.length} className="table-loading">
                  <div className="loading-spinner"></div>
                  <span>Loading test runs...</span>
                </td>
              </tr>
            ) : !Array.isArray(currentRuns) || currentRuns.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="table-empty">
                  No test runs match the selected filters
                </td>
              </tr>
            ) : (
              currentRuns.map(run => (
                <tr
                  key={run.run_id}
                  role="button"
                  className="table-row"
                  onClick={() => navigate(`/test-runs/${run.run_name}`)}
                >
                  <td className="id">{run.run_id}</td>
                  <td>{run.run_name}</td>
                  <td>{run.target}</td>
                  <td>{new Date(run.start_ts).toLocaleString()}</td>
                  <td>{run.end_ts ? new Date(run.end_ts).toLocaleString() : "-"}</td>
                  <td>
                    {run.end_ts
                      ? `${Math.round(
                          (new Date(run.end_ts).getTime() -
                            new Date(run.start_ts).getTime()) / 1000
                        )}s`
                      : "-"}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        run.status === "COMPLETED" || run.status === "PASSED"
                          ? "status-completed"
                          : run.status === "RUNNING" || run.status === "IN_PROGRESS"
                          ? "status-running"
                          : run.status === "FAILED"
                          ? "status-failed"
                          : "status-default"
                      }`}
                    >
                      {run.status}
                    </span>
                  </td>
                  <td>{run.domain}</td>
                  <td className="report-cell" onClick={e => e.stopPropagation()}>
                    <button
                      className="report-button"
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = API_ENDPOINTS.DOWNLOAD_REPORT(run.run_name);;
                        link.setAttribute(
                          "download",
                          `${run.run_name}-evaluation.xlsx`
                        );
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                    >
                      <i className="bi bi-file-earmark-text"></i>
                      <span>Report</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      <div className="sticky">
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination-wrapper">
          <div className="pagination-container">
            <button
              className="pagination-button"
              onClick={() => paginate(1)}
              disabled={currentPage === 1}
              aria-label="First page"
            >
              <i className="bi bi-chevron-double-left"></i>
            </button>
            <button
              className="pagination-button"
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <i className="bi bi-chevron-left"></i>
            </button>
            
            {pageNumbers.map(number => (
              <button
                key={number}
                className={`pagination-number ${number === currentPage ? 'active' : ''}`}
                onClick={() => paginate(number)}
                aria-label={`Page ${number}`}
              >
                {number}
              </button>
            ))}
            
            <button
              className="pagination-button"
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              <i className="bi bi-chevron-right"></i>
            </button>
            <button
              className="pagination-button"
              onClick={() => paginate(totalPages)}
              disabled={currentPage === totalPages}
              aria-label="Last page"
            >
              <i className="bi bi-chevron-double-right"></i>
            </button>
          </div>
        </div>
      )}
      
      <div className="table-footer">
        Showing {currentRuns.length} of {filteredRuns.length} test runs
      </div>
      </div>
    </div>

  );
};

export default TestRunsTable;
