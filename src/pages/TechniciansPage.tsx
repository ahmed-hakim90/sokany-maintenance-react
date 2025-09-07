import React from 'react';
import TechnicianManagement from '../components/TechnicianManagement';

const TechniciansPage: React.FC = () => {
  return (
    <div className="page technicians-page">
      <h2>Technicians</h2>
      <TechnicianManagement />
    </div>
  );
};

export default TechniciansPage;
