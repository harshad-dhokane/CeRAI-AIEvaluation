import React,{useState} from 'react';
import './NewTestRunPage.css';

// Import only the Bootstrap CSS for the select components

import CustomSelect from './CustomSelect/CustomSelect';
import Loop from './Loop/Loop';

interface RunFormData {
  target: string;
  testPlanId: number | null;
  testCaseId: number | null;
  metricId: number | null;
  metric: string;
  maxTestCases: string;
  domain: string;
  language: string;
}

const NewTestRunPage: React.FC = () => {
  // Sample data for dropdowns
  const targets = ['Vaidya AI', 'Target 2', 'Target 3'];
  const testPlans = ['Plan 1', 'Plan 2', 'Plan 3'];
  const metrics = ['Accuracy', 'Precision', 'Recall', 'F1 Score'];
  const maxTestCases = ['10', '20', '30', '50', '100'];
  const domains = ['E-commerce', 'Healthcare', 'Finance', 'Education'];
  const languages = ['English', 'Spanish', 'French', 'German', 'Chinese'];
  const [isRunning, setIsRunning] = useState(false);
  const [totalTestCases, setTotalTestCases] = useState(0);
  const [formData, setFormData] = useState<RunFormData>({
    target: "",
    testPlanId: null,
    testCaseId:null,
    metricId: null,
    metric: "",
    maxTestCases: "",
    domain: "",
    language: "",
  });

  const handleChange = <K extends keyof RunFormData>(
    key: K,
    value: RunFormData[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunning(true); 
    const res = await fetch("http://localhost:7000/start-run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const runData = await res.json(); // <-- this should now include runName, runId, testPlanId, metricId
    console.log("POST /start-run response:", runData);
    setTotalTestCases(runData.totalTestCases);
    setIsRunning(true); // now we can start the Loop component

    // 2️⃣ Open WebSocket to get live updates
    const ws = new WebSocket("ws://localhost:7000/ws/test-run");

    ws.onopen = () => {
      console.log("WebSocket connected, sending run info");
      ws.send(JSON.stringify(runData)); // send metric_id, runId, etc.
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data); // backend sends JSON updates
      console.log("Update from backend:", data);

      // Example: if backend sends total_test_cases
      // setTotalTestCases(data.total);
      // setCurrentTestCase(data.current);
  };

  ws.onclose = () => {
    console.log("WebSocket closed");
  };
  };

  return (
    <div className="new-test-run-container">
      <h1>Create New Test Run</h1>
      <p className="subtitle">Configure and start AI evaluation run</p>
      
      <div className="form-group">
        <label>Test Run Name</label>
        <input 
          type="text" 
          className="form-input" 
          defaultValue="Regression test" 
        />
      </div>

      <form className="filters-container" onSubmit={handleSubmit}>
        <div className="filters-row">
          <div className="filter-item">
            <label>Target</label>
            <CustomSelect
              options={targets}
              defaultText="Select Target"
              onChange={(val) => handleChange("target", val)}
            />
          </div>

          <div className="filter-item">
            <label>Test Plan</label>
            <input
              type="number"
              placeholder="Enter Test Plan ID"
              value={formData.testPlanId ?? ""}
              onChange={(e) =>
                handleChange("testPlanId", Number(e.target.value))
              }
            />
          </div>
          <div className="filter-item">
            <label>Test Case ID</label>
            <input
              type="number"
              placeholder="Enter Test Plan ID"
              value={formData.testCaseId?? ""}
              onChange={(e) =>
                handleChange("testCaseId", Number(e.target.value))
              }
            />
          </div>

          <div className="filter-item">
            <label>Metric ID</label>
            <input
              type="number"
              placeholder="Enter Test Plan ID"
              value={formData.metricId?? ""}
              onChange={(e) =>
                handleChange("metricId", Number(e.target.value))
              }
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
              options={domains}
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

        <button type="submit" className="start-button">
          Start Run
        </button>
      </form>
      {isRunning && <Loop isRunning={isRunning} totalTestCases={totalTestCases} stepsPerTestCase={4}/>}       
      
    </div>
  );
};

export default NewTestRunPage;