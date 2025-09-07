import React from 'react';
import CenterSessionManagement from '../components/CenterSessionManagement';

const WarehouseTransfersPage: React.FC = () => {
  return (
    <div className="page warehouse-page">
      <h2>Warehouse & Transfers</h2>
      {/* Reuse CenterSessionManagement as a temporary listing UI; replace with proper transfers UI later */}
      <CenterSessionManagement />
    </div>
  );
};

export default WarehouseTransfersPage;
