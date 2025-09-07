import React from 'react';
import MaintenanceManagement from '../components/MaintenanceManagement';

const MaintenanceRequestsPage: React.FC = () => {
  return (
    <div className="page maintenance-page">
      <h2>Maintenance Requests</h2>
      <MaintenanceManagement />
    </div>
  );
};

export default MaintenanceRequestsPage;
