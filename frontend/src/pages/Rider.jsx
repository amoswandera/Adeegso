import React, { useState, useEffect } from 'react';
import { FiPackage, FiMapPin, FiClock, FiCheckCircle, FiXCircle, FiTruck, FiDollarSign, FiMap, FiWifi, FiWifiOff, FiUser } from 'react-icons/fi';
import { riderDeliveryAPI } from '../services/api';

const RiderDashboard = () => {
  const [availableDeliveries, setAvailableDeliveries] = useState([]);
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    const loadRiderData = async () => {
      setLoading(true);
      setError('');

      try {
        const availableResponse = await riderDeliveryAPI.getAvailableDeliveries();
        setAvailableDeliveries(availableResponse.data || []);

        const myDeliveriesResponse = await riderDeliveryAPI.getMyDeliveries();
        setMyDeliveries(myDeliveriesResponse.data || []);

        const completedDeliveries = myDeliveriesResponse.data?.filter(d => d.status === 'delivered') || [];
        const totalEarnings = completedDeliveries.reduce((sum, delivery) => {
          return sum + (delivery.total_amount * 0.15);
        }, 0);
        setWalletBalance(totalEarnings);
      } catch (error) {
        console.error('Error loading rider data:', error);
        setError('Failed to load rider data. Please try again.');

        setAvailableDeliveries([
          {
            id: 1,
            customer: 'John Doe',
            vendor: 'Pizza Palace',
            address: '123 Main St, Downtown',
            items: ['2x Margherita Pizza', '1x Garlic Bread'],
            total: 45.50,
            distance: '2.3 km',
            estimatedTime: '25 min'
          },
          {
            id: 2,
            customer: 'Jane Smith',
            vendor: 'Burger Joint',
            address: '456 Oak Ave, Midtown',
            items: ['1x Cheeseburger', '1x Fries', '1x Coke'],
            total: 28.75,
            distance: '1.8 km',
            estimatedTime: '20 min'
          }
        ]);

        setMyDeliveries([
          {
            id: 3,
            customer: 'Mike Johnson',
            vendor: 'Sushi Express',
            address: '789 Pine Rd, Uptown',
            status: 'on_way',
            items: ['1x Salmon Roll', '1x Miso Soup'],
            total: 32.00,
            pickupTime: '14:30'
          }
        ]);

        setWalletBalance(156.75);
      } finally {
        setLoading(false);
      }
    };

    loadRiderData();
  }, []);

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setCurrentLocation(location);
          updateLocationOnServer(location);
        },
        (error) => {
          console.error("Error getting location:", error);
          setError("Failed to get your location. Please enable location services.");
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    } else {
      setError("Geolocation is not supported by this browser.");
    }
  };

  const updateLocationOnServer = async (location) => {
    try {
      await riderDeliveryAPI.updateLocation(location);
      console.log("Location updated on server");
    } catch (error) {
      console.error("Error updating location on server:", error);
    }
  };

  const toggleOnlineStatus = async () => {
    try {
      await riderDeliveryAPI.setOnlineStatus({ is_online: !isOnline });
      setIsOnline(!isOnline);
      setError('');
    } catch (error) {
      console.error("Error updating online status:", error);
      setError("Failed to update online status. Please try again.");
    }
  };

  const handleAcceptDelivery = async (deliveryId) => {
    try {
      await riderDeliveryAPI.acceptDelivery(deliveryId);
      const delivery = availableDeliveries.find(d => d.id === deliveryId);
      if (delivery) {
        setMyDeliveries(prev => [...prev, { ...delivery, status: 'assigned' }]);
        setAvailableDeliveries(prev => prev.filter(d => d.id !== deliveryId));
      }
    } catch (error) {
      console.error('Error accepting delivery:', error);
      setError('Failed to accept delivery. Please try again.');
    }
  };

  const handleUpdateStatus = async (deliveryId, newStatus) => {
    try {
      await riderDeliveryAPI.updateDeliveryStatus(deliveryId, newStatus);
      setMyDeliveries(prev => prev.map(delivery =>
        delivery.id === deliveryId ? { ...delivery, status: newStatus } : delivery
      ));
      if (newStatus === 'delivered') {
        const delivery = myDeliveries.find(d => d.id === deliveryId);
        if (delivery) {
          const earnings = delivery.total * 0.15;
          setWalletBalance(prev => prev + earnings);
        }
      }
      setError('');
    } catch (error) {
      console.error('Error updating delivery status:', error);
      setError('Failed to update delivery status. Please try again.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'assigned':
        return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">Assigned</span>;
      case 'on_way':
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">On Way</span>;
      case 'delivered':
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Delivered</span>;
      default:
        return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">Unknown</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Rider Dashboard</h1>
              <p className="text-gray-600 mt-2">Manage your deliveries and earnings</p>
            </div>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <button
                onClick={toggleOnlineStatus}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isOnline ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
              >
                {isOnline ? <FiWifi className="mr-2" /> : <FiWifiOff className="mr-2" />}
                {isOnline ? 'Online' : 'Offline'}
              </button>
              <button
                onClick={getCurrentLocation}
                className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                <FiMap className="mr-2" />
                Update Location
              </button>
              <button
                onClick={() => setShowProfileModal(true)}
                className="flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
              >
                <FiUser className="mr-2" />
                Profile
              </button>
              {currentLocation && (
                <span className="text-sm text-gray-600">
                  📍 {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                </span>
              )}
            </div>
          </div>
        </div>
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FiPackage className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Available Orders</p>
                <p className="text-2xl font-bold text-gray-900">{availableDeliveries.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <FiTruck className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Deliveries</p>
                <p className="text-2xl font-bold text-gray-900">{myDeliveries.filter(d => d.status === 'on_way').length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <FiCheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed Today</p>
                <p className="text-2xl font-bold text-gray-900">{myDeliveries.filter(d => d.status === 'delivered').length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FiDollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Wallet Balance</p>
                <p className="text-2xl font-bold text-gray-900">${walletBalance.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('available')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'available' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Available Deliveries ({availableDeliveries.length})
              </button>
              <button
                onClick={() => setActiveTab('active')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'active' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Deliveries ({myDeliveries.length})
              </button>
            </nav>
          </div>
          <div className="p-6">
            {activeTab === 'available' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Available Delivery Requests</h3>
                {availableDeliveries.length === 0 ? (
                  <div className="text-center py-12">
                    <FiPackage className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No deliveries available</h3>
                    <p className="mt-1 text-sm text-gray-500">Check back later for new delivery requests.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {availableDeliveries.map((delivery) => (
                      <div key={delivery.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">Order #{delivery.id}</h4>
                            <p className="text-sm text-gray-600">{delivery.customer} • {delivery.vendor}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">${delivery.total}</p>
                            <p className="text-sm text-gray-600">{delivery.distance}</p>
                          </div>
                        </div>
                        <div className="mb-3">
                          <p className="text-sm text-gray-600 mb-1">
                            <FiMapPin className="inline h-4 w-4 mr-1" />
                            {delivery.address}
                          </p>
                          <p className="text-sm text-gray-600">
                            <FiClock className="inline h-4 w-4 mr-1" />
                            Est. {delivery.estimatedTime}
                          </p>
                        </div>
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-700 mb-1">Items:</p>
                          <ul className="text-sm text-gray-600">
                            {delivery.items.map((item, index) => (
                              <li key={index}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleAcceptDelivery(delivery.id)}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            Accept Delivery
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {activeTab === 'active' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">My Active Deliveries</h3>
                {myDeliveries.length === 0 ? (
                  <div className="text-center py-12">
                    <FiTruck className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No active deliveries</h3>
                    <p className="mt-1 text-sm text-gray-500">Accept delivery requests to start earning.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myDeliveries.map((delivery) => (
                      <div key={delivery.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">Order #{delivery.id}</h4>
                            <p className="text-sm text-gray-600">{delivery.customer} • {delivery.vendor}</p>
                            {getStatusBadge(delivery.status)}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">${delivery.total}</p>
                            {delivery.pickupTime && (
                              <p className="text-sm text-gray-600">Pickup: {delivery.pickupTime}</p>
                            )}
                          </div>
                        </div>
                        <div className="mb-3">
                          <p className="text-sm text-gray-600 mb-1">
                            <FiMapPin className="inline h-4 w-4 mr-1" />
                            {delivery.address}
                          </p>
                          <p className="text-sm text-gray-600">
                            <FiClock className="inline h-4 w-4 mr-1" />
                            Est. 25 min
                          </p>
                        </div>
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-700 mb-1">Items:</p>
                          <ul className="text-sm text-gray-600">
                            {delivery.items.map((item, index) => (
                              <li key={index}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex justify-end space-x-2">
                          {delivery.status === 'assigned' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(delivery.id, 'on_way')}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                Start Delivery
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(delivery.id, 'cancelled')}
                                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {delivery.status === 'on_way' && (
                            <button
                              onClick={() => handleUpdateStatus(delivery.id, 'delivered')}
                              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                              Mark as Delivered
                            </button>
                          )}
                          {delivery.status === 'delivered' && (
                            <span className="px-3 py-2 bg-green-100 text-green-800 text-sm font-medium rounded-md">
                              Completed - ${delivery.total * 0.15} earned
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {showProfileModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Rider Profile</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select vehicle type</option>
                    <option value="motorcycle">Motorcycle</option>
                    <option value="car">Car</option>
                    <option value="bicycle">Bicycle</option>
                    <option value="scooter">Scooter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter license plate number"
                  />
                </div>
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">KYC Documents</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-600">Driver's License</label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Vehicle Registration</label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Insurance Document</label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowProfileModal(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Save Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiderDashboard;
