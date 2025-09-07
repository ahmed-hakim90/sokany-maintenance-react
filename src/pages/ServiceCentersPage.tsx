import React from 'react';
import CenterManagement from '../components/CenterManagement';

const ServiceCentersPage: React.FC = () => {
  return (
    <div className="page centers-page">
      <h2>Service Centers</h2>
      <CenterManagement />
    </div>
  );
};

export default ServiceCentersPage;
