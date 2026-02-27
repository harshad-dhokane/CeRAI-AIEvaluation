import React from "react";
import "./Header.css";
import AppButton from "../common/Button/AppButton";
import { useNavigate } from "react-router-dom";
import testRun from "../../../src/assets/logo/Test-run.png"

const Header: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="header-container">
      {/* <div className="header-logo">
        <div className="logo-icon">C</div>
        <span className="logo-text">CeRAI</span>
      </div> */}
      
      <div className="header-content">
        <img src={testRun} alt="" />
        <h1 className="page-title">Test Runs</h1>
        
        {/* <div className="header-actions">
          <AppButton
            label="Continue"
            variant="outline-secondary"
            icon="bi-play-fill"
            size="md"
            className="continue-btn"
          />
          <AppButton
            label="New Test Run"
            variant="primary"
            icon="bi-plus-lg"
            size="md"
            className="new-test-run-btn"
          />
        </div> */}
      </div>
    </div>
  );
};

export default Header;
