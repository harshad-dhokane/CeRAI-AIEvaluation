import React, { useState, useEffect } from 'react';
import './ContinueTestRunPage.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Accordion, Button } from 'react-bootstrap';
import CustomSelect from './CustomSelect/CustomSelect';
import Loop from './Loop/Loop';
import { API_BASE_URL, API_ENDPOINTS, WS_BASE_URL } from "../../config/api";
interface RunFormData {
  runName: string;   // ✅ add this
  target: string;
  testPlan: string; 
  testCaseId: number | null;
  metric: string;     // ✅ name
  maxTestCases: string;
  domain: string;
  language: string;
}

interface FilterItem {
  filter_name: string;
}

interface AllFiltersResponse {
  domains: FilterItem[];
  languages: FilterItem[];
  targets: FilterItem[];
  plans: FilterItem[];
  metrics: FilterItem[];
  statuses: FilterItem[];
}

const ContinueRunPage: React.FC = () => {
  // Sample data for dropdowns
  // const targets = ['Vaidya AI', 'Target 2', 'Target 3'];
  const testPlans = ['Plan 1', 'Plan 2', 'Plan 3'];
  const metrics = ['Accuracy', 'Precision', 'Recall', 'F1 Score'];
  const maxTestCases = ['10', '20', '30', '50', '100'];
  const domains = ['E-commerce', 'Healthcare', 'Finance', 'Education'];
  const languages = ['English', 'Spanish', 'French', 'German', 'Chinese'];
  const [isRunning, setIsRunning] = useState(false);
  const [totalTestCases, setTotalTestCases] = useState(0);
  const [filters, setFilters] = useState<AllFiltersResponse | null>(null);
  const [existingRun, setExistingRun] = useState<any>(null);
  const [groupedDetails, setGroupedDetails] = useState<Record<string, string[]>>({});
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [planMetrics, setPlanMetrics] = useState<string[]>([]);
  
  const [formData, setFormData] = useState<RunFormData>({
    runName:"",   // ✅ initialize this
    target: "",
    testPlan: "",
    testCaseId:null,
    
    metric: "",
    maxTestCases: "10", // 👈 default selected
    domain: "",
    language: "",
  });
  const isStartDisabled = !formData.testPlan || isRunning
  useEffect(() => {
  const fetchFilters = async () => {
    try {
      const res = await fetch("http://localhost:7000/get_all_filters");
      const data: AllFiltersResponse = await res.json();
      setFilters(data);
    } catch (err) {
      console.error("Failed to fetch filters", err);
    }
  };

  fetchFilters();
}, []);
const fetchMetricsByPlan = async (planName: string) => {
  try {
    const res = await fetch(
      `http://localhost:7000/get_metrics_by_plan/${planName}`
    );
    const data = await res.json();
    setPlanMetrics(data.map((m: any) => m.filter_name));
  } catch (err) {
    console.error("Failed to fetch metrics", err);
    setPlanMetrics([]);
  }
};
const handleChange = (key: string, value: any) => {
  setFormData(prev => ({
    ...prev,
    [key]: value,
    ...(key === "testPlan" && { metric: "" })
  }));

  if (key === "testPlan") {
    fetchMetricsByPlan(value); // 🔥 second fetch happens here
  }
};
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!formData.runName) {
    alert("Please enter a run name and fetch it first.");
    return;
  }

  if (!existingRun) {
    alert("Please fetch a valid run before continuing.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/continue-run-with-plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.detail || "Failed to continue run");
      return;
    }

    // ✅ IMPORTANT
    setTotalTestCases(data.totalTestCases);
    setIsRunning(true);

    // 🔥 OPEN WEBSOCKET
    const ws = new WebSocket(`${WS_BASE_URL}/ws/test-run`);

    ws.onopen = () => {
      console.log("WebSocket connected for continue");
      ws.send(JSON.stringify(data));
    };

    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      console.log("Continue update:", update);

      // update progress if needed
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
      setIsRunning(false); // stop loop only when backend finishes
    };

  } catch (err) {
    console.error("Error continuing run:", err);
    setIsRunning(false);
  }
};
const handleFetchRun = async () => {
  try {
    const res = await fetch("http://localhost:7000/continue-run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ run_name: formData.runName }),
    });

    if (!res.ok) {
      alert("Run not found");
      return;
    }

    const data = await res.json();

    setExistingRun(data.run);

    // 🔥 GROUP BY PLAN
    const grouped: Record<string, string[]> = {};

    data.details.forEach((d: any) => {
      if (!grouped[d.plan_name]) {
        grouped[d.plan_name] = [];
      }
      grouped[d.plan_name].push(d.metric_name);
    });

    setGroupedDetails(grouped);

  } catch (err) {
    console.error(err);
  }
};

// const handleSubmit = async (e: React.FormEvent) => {
//   e.preventDefault();  // 🚨 VERY IMPORTANT

//   console.log("Submitting run name:", formData.runName);

//   try {
//     const res = await fetch("http://localhost:7000/continue-run", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         run_name: formData.runName,
//       }),
//     });

//     if (!res.ok) {
//       console.error("Run not found");
//       return;
//     }

//     const data = await res.json();
//     console.log("Continue Run Response:", data);

//   } catch (err) {
//     console.error("Error:", err);
//   }
// };  

  return (
    <div className="new-test-run-container">
      <h1>Continue Test Run</h1>
      <p className="subtitle">Configure and start AI evaluation run</p>
      
      <div className="fetch-run-section">
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder="Enter Run Name"
            value={formData.runName}
            onChange={(e) => handleChange("runName", e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFetchRun()}
          />
          <button 
            className="btn btn-primary" 
            onClick={handleFetchRun}
            disabled={!formData.runName.trim()}
          >
            Fetch Run
          </button>
        </div>
      </div>

      <div className="accordion-container">
        <Accordion defaultActiveKey={null} className="mb-3">
          {existingRun && (
            <Accordion.Item eventKey="0">
              <Accordion.Header>Run Details</Accordion.Header>
              <Accordion.Body>
                <div className="run-details-accordion">
                  <div className="row">
                    <div className="col-md-6">
                      <p><strong>Target:</strong> {existingRun.target || 'N/A'}</p>
                      <p><strong>Status:</strong> 
                        <span className={`badge bg-${existingRun.status === 'completed' ? 'success' : 'warning'}`}>
                          {existingRun.status || 'N/A'}
                        </span>
                      </p>
                    </div>
                    <div className="col-md-6">
                      <p><strong>Start Time:</strong> {existingRun.start_ts || 'N/A'}</p>
                      <p><strong>End Time:</strong> {existingRun.end_ts || 'In Progress'}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h5>Metrics by Plan</h5>
                    {Object.entries(groupedDetails).map(([plan, metrics], index) => (
                      <div key={plan} className="mb-3">
                        <h6>{plan}</h6>
                        <div className="list-group">
                          {metrics.map((metric, idx) => (
                            <div key={idx} className="list-group-item">
                              {metric}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Accordion.Body>
            </Accordion.Item>
          )}

          <Accordion.Item eventKey="1">
            <Accordion.Header 
              className={!existingRun ? 'text-muted' : ''}
              onClick={(e) => !existingRun && e.preventDefault()}
            >
              Configure Test Run {!existingRun && <span className="ms-2">(Fetch a run first)</span>}
            </Accordion.Header>
            <Accordion.Body>
              {existingRun ? (
                <form className="filters-container" onSubmit={handleSubmit}>
                  <div className="filters-row">
                    <div className="filter-item">
                      <label>Target</label>
                      <CustomSelect
                        options={filters?.targets?.map(t => t.filter_name) ?? []}
                        defaultText="Select Target"
                        onChange={(val: string) => handleChange("target", val)}
                      />
                    </div>

                  <div className="filter-item">
                    <label>Test Plan</label>
                    <CustomSelect
                      options={filters?.plans?.map(p => p.filter_name) ?? []}
                      defaultText="Select Test Plan"
                      onChange={(val: string) => handleChange("testPlan", val)}
                    />
                  </div>
          <div className="filter-item">
            <label>Test Case ID</label>
            <input
              type="number"
              placeholder="Enter Test Plan ID"
              value={formData.testCaseId?? ""}
              disabled={!formData.testPlan}
              onChange={(e) =>
                handleChange("testCaseId", Number(e.target.value))
              }
            />
          </div>

          <div className="filter-item">
            <label>Metric </label>
            <CustomSelect
              options={planMetrics}
              defaultText={
                formData.testPlan ? "Select Metric" : "Select Test Plan first"
              }
              
              disabled={!formData.testPlan}
              onChange={(val) => handleChange("metric", val)}
            />
          </div>
        </div>

        <div className="filters-row">
          <div className="filter-item">
            <label>Max test cases</label>
            <CustomSelect
              options={maxTestCases}
              defaultText="Select Max"
              onChange={(val) => handleChange("maxTestCases", val)}
            />
          </div>

          <div className="filter-item">
            <label>Domain</label>
            <CustomSelect
              options={filters?.domains.map(p => p.filter_name) ?? []}
              defaultText="Select Domain"
              onChange={(val) => handleChange("domain", val)}
            />
          </div>

          <div className="filter-item">
            <label>Language</label>
            <CustomSelect
              options={languages}
              defaultText="Select Language"
              onChange={(val) => handleChange("language", val)}
            />
          </div>
        </div>

        <button type="submit" className="start-button" disabled={isStartDisabled}>
          Start Run
        </button>
              
                </form>
              ) : (
                <div className="text-center py-3 text-muted">
                  Please fetch a run first to configure test parameters
                </div>
              )}
        {isRunning && <Loop isRunning={isRunning} totalTestCases={totalTestCases} stepsPerTestCase={4} stepNames={["Prepare", "Finding elements", "Execute", "Store"]}/>}             
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </div>
    </div>
  );
};

export default ContinueRunPage;