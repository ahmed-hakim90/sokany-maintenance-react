import React from 'react';
import SalesManagement from '../components/SalesManagement';

const SalesOrdersPage: React.FC = () => {
  return (
    <div className="page sales-page">
      <h2>Sales Orders</h2>
      <SalesManagement />
    </div>
  );
};

export default SalesOrdersPage;
