import React from 'react';
import { useOutletContext } from 'react-router-dom';
import Orders from './vendor/VendorOrders';

export default function VendorOrders() {
  const { vendorData, loading } = useOutletContext();
  
  return (
    <div className="p-6">
      <Orders />
    </div>
  );
}
