import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FiUsers, FiSearch, FiPhone, FiMail, FiMapPin, FiShoppingBag } from 'react-icons/fi';
import { vendorAPI } from '../../services/api';

const CustomerCard = ({ customer }) => (
  <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <div className="h-10 w-10 rounded-full bg-brand-blue text-white flex items-center justify-center font-semibold">
          {customer.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="ml-3">
          <h3 className="font-medium text-gray-900">{customer.name || 'Unknown'}</h3>
          <p className="text-sm text-gray-500">{customer.email || 'No email'}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-gray-900">
          {customer.order_count || 0} orders
        </p>
        <p className="text-sm text-gray-500">
          ${customer.total_spent || '0.00'} spent
        </p>
      </div>
    </div>
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="flex items-center text-sm text-gray-600">
        <FiPhone className="h-4 w-4 mr-1" />
        <span>{customer.phone || 'No phone'}</span>
      </div>
      <div className="flex items-center text-sm text-gray-600 mt-1">
        <FiMapPin className="h-4 w-4 mr-1" />
        <span className="truncate">{customer.address || 'No address'}</span>
      </div>
    </div>
  </div>
);

const VendorCustomers = () => {
  const { vendorData, loading } = useOutletContext();
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setIsLoading(true);
        // For now, get customers from orders and aggregate them
        const ordersResponse = await vendorAPI.getOrders();
        const orders = ordersResponse.data || [];

        // Aggregate customer data from orders
        const customerMap = {};
        orders.forEach(order => {
          const customerId = order.customer?.id || 'unknown';
          if (!customerMap[customerId]) {
            customerMap[customerId] = {
              id: customerId,
              name: order.customer?.username || 'Unknown Customer',
              email: order.customer?.email || '',
              phone: order.customer?.phone || '',
              address: order.delivery_address || '',
              order_count: 0,
              total_spent: 0,
              last_order: null
            };
          }

          customerMap[customerId].order_count += 1;
          customerMap[customerId].total_spent += parseFloat(order.total_amount || 0);

          if (!customerMap[customerId].last_order ||
              new Date(order.created_at) > new Date(customerMap[customerId].last_order)) {
            customerMap[customerId].last_order = order.created_at;
          }
        });

        setCustomers(Object.values(customerMap));
      } catch (error) {
        console.error('Error fetching customers:', error);
        // Fallback to mock data
        setCustomers([
          {
            id: 1,
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+1 (555) 123-4567',
            address: '123 Main St, New York, NY',
            order_count: 15,
            total_spent: 245.50,
            last_order: '2024-01-15'
          },
          {
            id: 2,
            name: 'Jane Smith',
            email: 'jane@example.com',
            phone: '+1 (555) 987-6543',
            address: '456 Oak Ave, Brooklyn, NY',
            order_count: 8,
            total_spent: 189.25,
            last_order: '2024-01-12'
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  if (loading || isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your customer relationships and view order history
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search customers..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue sm:text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-50">
              <FiUsers className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Customers</p>
              <p className="text-2xl font-semibold text-gray-900">{customers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-50">
              <FiShoppingBag className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Orders</p>
              <p className="text-2xl font-semibold text-gray-900">
                {customers.reduce((sum, c) => sum + c.order_count, 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-50">
              <FiUsers className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg. Order Value</p>
              <p className="text-2xl font-semibold text-gray-900">
                ${customers.length > 0 ?
                  (customers.reduce((sum, c) => sum + c.total_spent, 0) / customers.reduce((sum, c) => sum + c.order_count, 1)).toFixed(2) :
                  '0.00'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer List */}
      {filteredCustomers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
            <FiUsers className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No customers found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'No customers match your search criteria.' : 'You have no customers yet. New customers will appear here when they place orders.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
        </div>
      )}
    </div>
  );
};

export default VendorCustomers;
