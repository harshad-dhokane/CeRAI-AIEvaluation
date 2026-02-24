import React from "react";
import "./Header.css";
import { Play, Plus } from "lucide-react";
import AppButton from "../common/Button/AppButton";
import { useNavigate } from "react-router-dom";

const Header: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="header">
      <h1>Test Runs</h1>
      
      <div className="header-buttons">
        <AppButton
          label="Continue"
          variant="warning"
          icon="bi-play-fill"
          size="md"
        />

        <AppButton
          label="New Test Run"
          variant="primary"
          icon="bi-plus-lg"
          size="md"
          onClick={() => navigate("/create-test-run")}
        />
      </div>
    </div>
  );
};

export default Header;
