import React from 'react';
import { useOutletContext } from 'react-router-dom';
import Products from './vendor/VendorProducts';

export default function VendorProducts() {
  const { vendorData, loading } = useOutletContext();
  
  return (
    <div className="p-6">
      <Products />
    </div>
  );
}
