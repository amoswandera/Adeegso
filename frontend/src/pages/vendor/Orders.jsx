import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FiPackage, FiCheck, FiClock, FiTruck, FiCheckCircle, FiXCircle, FiSearch, FiPhone, FiMapPin } from 'react-icons/fi';
import { vendorAPI } from '../../services/api';
import { webSocketService } from '../../services/api';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  ready: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800'
};

const OrderCard = ({ order, onStatusUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getNextStatus = (currentStatus) => {
    const statusFlow = ['pending', 'processing', 'ready', 'completed'];
    const currentIndex = statusFlow.indexOf(currentStatus);
    return currentIndex < statusFlow.length - 1 ? statusFlow[currentIndex + 1] : null;
  };

  const nextStatus = getNextStatus(order.status);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center">
              <h3 className="font-medium text-gray-900">Order #{order.id}</h3>
              <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(order.orderTime).toLocaleString()}
            </p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              ${order.total.toFixed(2)}
            </p>
          </div>
          <div className="flex space-x-2">
            {nextStatus && (
              <button
                onClick={() => onStatusUpdate(order.id, nextStatus)}
                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-brand-blue hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue"
              >
                Mark as {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              {isExpanded ? (
                <FiXCircle className="h-5 w-5" />
              ) : (
                <FiCheckCircle className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Customer</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-medium">{order.customer.name}</p>
                  <div className="flex items-center mt-1 text-sm text-gray-600">
                    <FiPhone className="h-4 w-4 mr-1" />
                    <span>{order.customer.phone}</span>
                  </div>
                  <div className="flex items-start mt-1 text-sm text-gray-600">
                    <FiMapPin className="h-4 w-4 mt-0.5 mr-1 flex-shrink-0" />
                    <span>{order.deliveryAddress}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Order Items</h4>
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <div>
                        <span className="font-medium">{item.quantity}x</span> {item.name}
                        {item.notes && (
                          <p className="text-xs text-gray-500 mt-0.5">Note: {item.notes}</p>
                        )}
                      </div>
                      <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 text-right">
                  <p className="text-sm">
                    <span className="text-gray-600">Subtotal:</span>{' '}
                    <span className="font-medium">${order.subtotal.toFixed(2)}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-600">Delivery:</span>{' '}
                    <span className="font-medium">${order.deliveryFee.toFixed(2)}</span>
                  </p>
                  <p className="text-base font-semibold mt-1">
                    <span className="text-gray-700">Total:</span>{' '}
                    <span>${order.total.toFixed(2)}</span>
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Order Status History</h4>
              <div className="space-y-3">
                {[
                  { status: 'pending', time: order.orderTime, label: 'Order Placed' },
                  ...(order.statusHistory || [])
                ].map((history, index) => (
                  <div key={index} className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      {history.status === 'completed' ? (
                        <FiCheck className="h-5 w-5 text-green-500" />
                      ) : history.status === 'cancelled' ? (
                        <FiXCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <FiClock className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {history.label || history.status.charAt(0).toUpperCase() + history.status.slice(1)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(history.time).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Orders = () => {
  const outletContext = useOutletContext();
  const vendorData = outletContext?.vendorData || {
    name: 'Test Restaurant',
    approved: true
  };
  const loading = outletContext?.loading || false;

  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Replace mock data with actual API calls
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);

        // Fetch real orders from API
        const response = await vendorAPI.getOrders();
        setOrders(response.data || []);

      } catch (error) {
        console.error('Error fetching orders:', error);
        // Fallback to empty array
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();

    // Set up WebSocket connection for real-time updates
    webSocketService.connect('vendor');

    // Listen for order status updates
    const unsubscribe = webSocketService.on('onOrderStatusChanged', (orderId, newStatus) => {
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? {
                ...order,
                status: newStatus,
                statusHistory: [
                  ...(order.statusHistory || []),
                  { status: newStatus, time: new Date().toISOString() }
                ]
              }
            : order
        )
      );
    });

    // Cleanup WebSocket connection
    return () => {
      unsubscribe();
      webSocketService.disconnect();
    };
  }, []);

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      // Update order status via API
      await vendorAPI.updateOrderStatus(orderId, newStatus);

      // Update local state
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? {
                ...order,
                status: newStatus,
                statusHistory: [
                  ...(order.statusHistory || []),
                  { status: newStatus, time: new Date().toISOString() }
                ]
              }
            : order
        )
      );

      alert(`Order status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status. Please try again.');
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        order.customer.phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-12 bg-gray-200 rounded w-full"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and track customer orders
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { status: 'pending', label: 'Pending', icon: <FiClock className="h-6 w-6" /> },
          { status: 'processing', label: 'Processing', icon: <FiPackage className="h-6 w-6" /> },
          { status: 'ready', label: 'Ready', icon: <FiCheck className="h-6 w-6" /> },
          { status: 'completed', label: 'Completed', icon: <FiTruck className="h-6 w-6" /> }
        ].map((stat) => (
          <div key={stat.status} className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center">
              <div className={`p-3 rounded-full ${statusColors[stat.status].replace('text-', 'text-opacity-50 bg-').split(' ')[0]} bg-opacity-20`}>
                {stat.icon}
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="text-2xl font-semibold text-gray-900">{statusCounts[stat.status] || 0}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search orders..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
              Status:
            </label>
            <select
              id="status-filter"
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue sm:text-sm rounded-md"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="ready">Ready for Pickup</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
              <FiPackage className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No orders</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'No orders match your search criteria.'
                : 'You have no orders yet. New orders will appear here.'}
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusUpdate={handleStatusUpdate}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Orders;
