import React, { useEffect, useState, useMemo, useRef } from "react";
import "./TestRunsTable.css";
import { useNavigate } from "react-router-dom";
import AppButton from "../common/Button/AppButton";
import { Pagination } from "react-bootstrap";
import { API_BASE_URL, API_ENDPOINTS } from "../../config/api";
import { AllFilters, FilterOption } from "../../types/Filters";

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

interface HeaderConfig {
  key: string;
  label: string;
  filterable: boolean;
  filterType?: 'target' | 'status' | 'domain';
}

interface Props {
  filters: Record<string, string>; // e.g. { domain: "qaoncloud.com", target: "api" }
  onFilterChange?: (filterType: string, value: string) => void;
}

const TestRunsTable: React.FC<Props> = ({filters, onFilterChange}) => {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [filteredRuns, setFilteredRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [availableFilters, setAvailableFilters] = useState<AllFilters>({
    domains: [],
    languages: [],
    targets: [],
    plans: [],
    metrics: [],
    statuses: [],
  });
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null);
  const filterRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const FILTER_KEY_MAP: Record<string, keyof AllFilters> = {
    domain: "domains",
    target: "targets",
    status: "statuses",
  };
  // Table headers with filter configuration
  const headers: HeaderConfig[] = [
    { key: "run_id", label: "Run Id", filterable: false },
    { key: "run_name", label: "Run Name", filterable: false },
    { key: "target", label: "Target", filterable: true, filterType: "target" },
    { key: "start_ts", label: "Started At", filterable: false },
    { key: "end_ts", label: "Ended At", filterable: false },
    { key: "duration", label: "Duration", filterable: false },
    { key: "status", label: "Status", filterable: true, filterType: "status" },
    { key: "domain", label: "Domain", filterable: true, filterType: "domain" },
    { key: "report", label: "Report", filterable: false },
  ];

  // Fetch available filters
  useEffect(() => {
    setFiltersLoading(true);
    fetch(`${API_BASE_URL}${API_ENDPOINTS.GET_ALL_FILTERS}`)
      .then((res) => res.json())
      .then((data: AllFilters) => {
        setAvailableFilters(data);
        setFiltersLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching filters:", err);
        setFiltersLoading(false);
      });
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openFilterColumn && filterRefs.current[openFilterColumn]) {
        const filterElement = filterRefs.current[openFilterColumn];
        if (filterElement && !filterElement.contains(event.target as Node)) {
          setOpenFilterColumn(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openFilterColumn]);

  // Handle filter change
  const handleFilterChange = (filterType: string, value: string) => {
    onFilterChange?.(filterType, value);
    setOpenFilterColumn(null); // Close dropdown after selection
  };

  // Handle filter clear
  const handleFilterClear = (filterType: string) => {
    onFilterChange?.(filterType, "");
    setOpenFilterColumn(null);
  };

  // Toggle filter dropdown
  const toggleFilterDropdown = (columnKey: string) => {
    setOpenFilterColumn(openFilterColumn === columnKey ? null : columnKey);
  };

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
    <div>
      <div className="table-responsive table-container mb-3">
        <table className="table table-hover table-bordered align-middle mb-0">
          <thead className="table-light">
            <tr>
              {headers.map(header => (
                <th 
                  key={header.key} 
                  scope="col"
                  className={header.filterable ? "filterable-header" : ""}
                >
                  <div className="header-content">
                    <span>{header.label}</span>
                    {header.filterable && header.filterType && (
                      <div className="filter-wrapper" ref={(el) => {
                        filterRefs.current[header.key] = el;
                      }}>
                        <button
                          className="filter-trigger"
                          onClick={() => toggleFilterDropdown(header.key)}
                          title={`Filter by ${header.label}`}
                        >
                          <i className={`bi bi-funnel${filters[header.filterType] ? '-fill' : ''}`}></i>
                        </button>
                        
                        {openFilterColumn === header.key && (
                          <div className="filter-dropdown">
                            <div className="filter-options">
                              <select
                                className="form-select form-select-sm"
                                value={filters[header.filterType] || ""}
                                onChange={(e) => handleFilterChange(header.filterType!, e.target.value)}
                                disabled={filtersLoading}
                              >
                                <option value="">All {header.label}</option>
                                {availableFilters[FILTER_KEY_MAP[header.filterType!]]?.map(
                                  (opt: FilterOption) => (
                                    <option key={opt.filter_name} value={opt.filter_name}>
                                      {opt.filter_name}
                                    </option>
                                  )
                                )}
                              </select>
                              
                              {filters[header.filterType] && (
                                <button
                                  className="btn btn-sm btn-outline-secondary mt-2 w-100"
                                  onClick={() => handleFilterClear(header.filterType!)}
                                >
                                  Clear Filter
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={headers.length} className="text-center py-4">
                  <div className="spinner-border spinner-border-sm me-2" role="status" />
                  Loading test runs...
                </td>
              </tr>
            ) : !Array.isArray(currentRuns) || currentRuns.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="text-center py-4 text-muted">
                  No test runs match the selected filters
                </td>
              </tr>
            ) : (
              currentRuns.map(run => (
      <tr
        key={run.run_id}
        role="button"
        className="cursor-pointer"
        onClick={() => navigate(`/test-runs/${run.run_name}`)}
      >
        <td>{run.run_id}</td>
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
            className={`badge ${
              run.status === "PASSED"
                ? "bg-success"
                : run.status === "FAILED"
                ? "bg-danger"
                : "bg-secondary"
            }`}
          >
            {run.status}
          </span>
        </td>
        <td>{run.domain}</td>
        <td onClick={e => e.stopPropagation()}>
          <AppButton
            label="Report"
            variant="outline-primary"
            size="sm"
            icon="bi-file-earmark-text"
            onClick={() => {
              const link = document.createElement("a");
              link.href = API_ENDPOINTS.DOWNLOAD_REPORT(run.run_name);
              link.setAttribute(
                "download",
                `${run.run_name}-evaluation.xlsx`
              );
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          /> 
        </td>
      </tr>
    ))
  )}
</tbody>
  </table>
  
</div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center">
          <Pagination className="mb-0">
            <Pagination.First 
              onClick={() => paginate(1)} 
              disabled={currentPage === 1} 
            />
            <Pagination.Prev 
              onClick={() => paginate(currentPage - 1)} 
              disabled={currentPage === 1} 
            />
            
            {pageNumbers.map(number => (
              <Pagination.Item 
                key={number} 
                active={number === currentPage}
                onClick={() => paginate(number)}
              >
                {number}
              </Pagination.Item>
            ))}
            
            <Pagination.Next 
              onClick={() => paginate(currentPage + 1)} 
              disabled={currentPage === totalPages} 
            />
            <Pagination.Last 
              onClick={() => paginate(totalPages)} 
              disabled={currentPage === totalPages} 
            />
          </Pagination>
        </div>
      )}
      
      <div className="text-muted text-center mt-2">
        Showing {currentRuns.length} of {filteredRuns.length} test runs
      </div>
    </div>

  );
};

export default TestRunsTable;
