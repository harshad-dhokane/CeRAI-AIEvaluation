// import { useState, useEffect } from 'react';
// import { ArrowRightLeft, Target, Inbox, Database } from 'lucide-react';

// const steps = [
//   { id: 1, label: 'Interface', icon: ArrowRightLeft },
//   { id: 2, label: 'Target', icon: Target },
//   { id: 3, label: 'Response', icon: Inbox },
//   { id: 4, label: 'Storage', icon: Database },
// ];

// type StepStatus = 'pending' | 'running' | 'done';

// interface LoopProps {
//   isRunning: boolean;
//   totalTestCases: number;
// }

// const Loop: React.FC<LoopProps> = ({ isRunning, totalTestCases }) => {
//   const [currentTestCase, setCurrentTestCase] = useState(1);
//   const [currentStep, setCurrentStep] = useState<number | null>(null);

//   const progressPercent = Math.round(
//     ((currentTestCase - 1) / totalTestCases) * 100
//   );

//   useEffect(() => {
//     if (!isRunning) return;
//     if (currentTestCase >= totalTestCases) return;

//     let cancelled = false;

//     const runSteps = async () => {
//       for (let stepIndex = 1; stepIndex <= steps.length; stepIndex++) {
//         if (cancelled) return;
//         setCurrentStep(stepIndex);
//         await delay(800);
//       }

//       setCurrentStep(steps.length + 1);
//       await delay(300);

//       setCurrentStep(null);
//       await delay(400);

//       setCurrentTestCase((tc) => tc + 1);
//     };

//     runSteps();

//     return () => {
//       cancelled = true;
//     };
//   }, [isRunning, currentTestCase, totalTestCases]);

//   // ✅ WebSocket inside the component
//   useEffect(() => {
//     if (!isRunning) return;

//     const ws = new WebSocket('ws://localhost:7000/ws/test-run');

//     ws.onopen = () => {
//       console.log('WebSocket connected');
//     };

//     ws.onmessage = (event) => {
//       const data = JSON.parse(event.data);

//       if (data.type === 'RUN_STARTED') {
//         setCurrentTestCase(0);
//         setCurrentStep(1);
//       } else if (data.type === 'TESTCASE_FINISHED') {
//         setCurrentTestCase(data.current);
//         setCurrentStep(steps.length);
//         setTimeout(() => setCurrentStep(null), 300);
//       } else if (data.type === 'RUN_FINISHED') {
//         setCurrentStep(null);
//       }
//     };

//     ws.onclose = () => console.log('WebSocket closed');

//     return () => ws.close();
//   }, [isRunning]);

//   const getStepStatus = (stepId: number): StepStatus => {
//     if (currentStep === null) return 'pending';
//     if (stepId < currentStep) return 'done';
//     if (stepId === currentStep) return 'running';
//     return 'pending';
//   };

//   return (
//     <div style={{ padding: 24, maxWidth: 900, background: '#F8FAFC' }}>
//       <h2 style={{ marginBottom: 16 }}>Test Case Execution</h2>
//       <div
//         style={{
//           padding: 24,
//           borderRadius: 16,
//           background: '#FFFFFF',
//           boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
//         }}
//       >
//         <div style={{ marginBottom: 12, color: '#555' }}>
//           TC-{String(currentTestCase).padStart(2, '0')} / {totalTestCases}
//         </div>

//         <div style={{ marginBottom: 24 }}>
//           <div style={{ height: 8, background: '#E5E7EB', borderRadius: 4 }}>
//             <div
//               style={{
//                 width: `${progressPercent}%`,
//                 height: '100%',
//                 background: '#22C55E',
//                 borderRadius: 4,
//                 transition: 'width 0.4s ease',
//               }}
//             />
//           </div>
//           <div style={{ fontSize: 12, marginTop: 4 }}>{progressPercent}%</div>
//         </div>

//         <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
//           {steps.map((step, index) => {
//             const status = getStepStatus(step.id);
//             const Icon = step.icon;
//             const colors = { pending: '#D1D5DB', running: '#FB923C', done: '#22C55E' };

//             return (
//               <>
//                 <div
//                   style={{
//                     flex: 1,
//                     padding: 16,
//                     borderRadius: 12,
//                     background: colors[status],
//                     color: '#111',
//                     textAlign: 'center',
//                     transition: 'background 0.3s ease',
//                   }}
//                 >
//                   <Icon size={28} />
//                   <div style={{ fontWeight: 600, marginTop: 8 }}>
//                     {step.id}. {step.label}
//                   </div>
//                 </div>

//                 {index !== steps.length - 1 && (
//                   <div
//                     style={{
//                       width: 40,
//                       height: 2,
//                       borderBottom: '2px dashed #9CA3AF',
//                       margin: '0 8px',
//                       flexShrink: 0,
//                     }}
//                   />
//                 )}
//               </>
//             );
//           })}
//         </div>
//       </div>
//     </div>
//   );
// };

// const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// export default Loop;

import { useEffect, useState } from "react";

interface LoopProps {
  isRunning: boolean;
  totalTestCases: number;
  stepsPerTestCase: number; // 👈 how many steps each TC has
}

type StepStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED";

const Loop: React.FC<LoopProps> = ({
  isRunning,
  totalTestCases,
  stepsPerTestCase,
}) => {
  const [currentTestCase, setCurrentTestCase] = useState(0);
  // Track status for each step individually
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>(
    Array(stepsPerTestCase).fill("PENDING")
  );

  const progressPercent =
    totalTestCases === 0
      ? 0
      : Math.round((currentTestCase / totalTestCases) * 100);

  useEffect(() => {
    if (!isRunning) return;

    const ws = new WebSocket("ws://localhost:7000/ws/test-run");

    ws.onopen = () => {
      console.log("✅ WebSocket connected");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("📩 WS EVENT:", data);

      switch (data.type) {
        case "RUN_STARTED":
          setCurrentTestCase(0);
          setStepStatuses(Array(stepsPerTestCase).fill("PENDING"));
          break;

        case "STEP_UPDATE":
          setCurrentTestCase(data.testcaseIndex);
          setStepStatuses((prev) => {
            const next = [...prev];
            next[data.step - 1] = data.status;
            return next;
          });
          break;

        case "TESTCASE_FINISHED":
          setStepStatuses(Array(stepsPerTestCase).fill("PENDING"));
          setCurrentTestCase(data.current + 1);
          break;
        case "RUN_FINISHED":
          console.log("🏁 Run completed");
          ws.close();
          break;
      }
    };

    ws.onclose = () => console.log("❌ WebSocket closed");

    return () => ws.close();
  }, [isRunning, stepsPerTestCase]);

  /* ---------- UI HELPERS ---------- */

  const getStepColor = (stepIndex: number) => {
    const status = stepStatuses[stepIndex]; // stepIndex is 0-based here
    
    switch (status) {
      case "DONE":
        return "#22C55E"; // green
      case "RUNNING":
        return "#F59E0B"; // orange
      case "FAILED":
        return "#EF4444"; // red
      default:
        return "#E5E7EB"; // gray (pending)
    }
  };

  /* ---------- RENDER ---------- */

  return (
    <div style={{ padding: 24, maxWidth: 600 }}>
      <h2>Test Case Execution</h2>

      <div style={{ marginBottom: 8 }}>
        TC-{String(currentTestCase).padStart(2, "0")} / {totalTestCases}
      </div>

      <div style={{ height: 8, background: "#E5E7EB", borderRadius: 4 }}>
        <div
          style={{
            width: `${progressPercent}%`,
            height: "100%",
            background: "#22C55E",
            borderRadius: 4,
            transition: "width 0.3s ease",
          }}
        />
      </div>

      <div style={{ fontSize: 12, marginTop: 4 }}>{progressPercent}%</div>

      <div style={{ marginTop: 24 }}>
        <h4>Steps</h4>

        <div style={{ display: "flex", gap: 8 }}>
          {Array.from({ length: stepsPerTestCase }).map((_, idx) => (
            <div
              key={idx}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: getStepColor(idx),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                color: "#111827",
                fontWeight: 500,
                transition: "background 0.3s ease",
              }}
            >
              {idx + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Loop;


