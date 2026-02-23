import React, { useEffect, useState } from "react";
import "./Filters.css";
import { AllFilters } from "../../types/Filters";
import { useNavigate } from "react-router-dom";
import FilterSelect from "../common/Filters/Filters"
import AppButton from "../common/Button/AppButton";
import { API_BASE_URL, API_ENDPOINTS } from "../../config/api";
interface FiltersProps {
  onFilterChange?: (filterType: string, value: string) => void;
}

const Filters: React.FC<FiltersProps> = ({ onFilterChange }) => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<AllFilters>({
    domains: [],
    languages: [],
    targets: [],
    plans: [],
    metrics: [],
    statuses: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`${API_BASE_URL}${API_ENDPOINTS.GET_ALL_FILTERS}`)
      .then((res) => res.json())
      .then((data: AllFilters) => {
        setFilters(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching filters:", err);
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="header">
      <div className="filters">
        <FilterSelect
          filterType="domain"
          placeholder="Domain"
          options={filters.domains}
          isLoading={isLoading}
          onChange={onFilterChange}
        />
        

        {/* <FilterSelect
          placeholder="Language"
          filterType="language"
          options={filters.languages}
          isLoading={isLoading}
          onChange={onFilterChange}
        /> */}

        <FilterSelect
          placeholder="Target"
          filterType="target"
          options={filters.targets}
          isLoading={isLoading}
          onChange={onFilterChange}
        />
        <FilterSelect
          placeholder="Status"
          filterType="status"
          options={filters.statuses}
          isLoading={isLoading}
          onChange={onFilterChange}
        />
        
      </div>  
       <div className="header-buttons">
        <AppButton
          label="New Test Run"
          variant="primary"
          icon="bi-plus-lg" // using bootstrap icon class if needed
          size="md"
          onClick={() => navigate("/create-test-run")}
        />
        <AppButton
          label="Continue"
          variant="warning"
          icon="bi-play-fill" // using bootstrap icon class if needed
          size="md"
          
        />

        {/* New Test Run Button */}
        
      </div>
    </div>
    
    
  );
};

export default Filters;
