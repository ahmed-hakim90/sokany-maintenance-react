import React from 'react';
import CustomerManagement from '../components/CustomerManagement';

const UsersPage: React.FC = () => {
  // Reuse CustomerManagement as a placeholder for the Admin Users area until full refactor
  return (
    <div className="page users-page">
      <h2>Users Management</h2>
      <CustomerManagement />
    </div>
  );
};

export default UsersPage;
