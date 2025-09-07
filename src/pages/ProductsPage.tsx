import React from 'react';
import InventoryManagement from '../components/InventoryManagement';

const ProductsPage: React.FC = () => {
  return (
    <div className="page products-page">
      <h2>Products & Categories</h2>
      <InventoryManagement />
    </div>
  );
};

export default ProductsPage;
