import React, { useState, useEffect } from 'react';
import { FiPackage, FiMapPin, FiClock, FiCheckCircle, FiXCircle, FiTruck, FiDollarSign, FiMap, FiWifi, FiWifiOff, FiUser, FiCreditCard, FiArrowDownCircle } from 'react-icons/fi';
import { riderDeliveryAPI, riderWalletAPI, riderProfileAPI, riderKYCAPI, authAPI } from '../services/api';
import { getAuthTokens } from '../utils/auth';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const RiderDashboard = () => {
  const [availableDeliveries, setAvailableDeliveries] = useState([]);
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [earningsToday, setEarningsToday] = useState(0);
  const [deliveriesToday, setDeliveriesToday] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [profileData, setProfileData] = useState({
    user: {
      first_name: '',
      last_name: '',
      email: '',
      phone_number: ''
    },
    rider: {
      vehicle_type: '',
      license_plate: '',
      verified: false
    }
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [kycFiles, setKycFiles] = useState({
    drivers_license: null,
    vehicle_registration: null,
    insurance_document: null
  });
  const [kycStatus, setKycStatus] = useState(null);
  const [kycLoading, setKycLoading] = useState(false);

  useEffect(() => {
    const loadRiderData = async () => {
      setLoading(true);
      setError('');

      try {
        // Load wallet data first
        const walletBalanceResponse = await riderWalletAPI.getBalance();
        setWalletBalance(walletBalanceResponse.data.balance || 0);

        const walletTransactionsResponse = await riderWalletAPI.getTransactions();
        setWalletTransactions(walletTransactionsResponse.data.transactions || []);

        // Load profile data
        try {
          const profileResponse = await riderProfileAPI.getProfile();
          const data = profileResponse.data;

          // Handle both nested format (user/rider) and flat format
          if (data.user && data.rider) {
            // Already in correct format
            setProfileData(data);
          } else if (data.vehicle_type || data.license_plate) {
            // Backend returned rider data directly, construct nested format
            setProfileData({
              user: {
                first_name: data.user_first_name || data.first_name || '',
                last_name: data.user_last_name || data.last_name || '',
                email: data.user_email || data.email || '',
                phone_number: data.user_phone_number || data.phone_number || ''
              },
              rider: {
                vehicle_type: data.vehicle_type || '',
                license_plate: data.license_plate || '',
                verified: data.verified || false
              }
            });
          } else {
            // Unexpected format, use defaults
            console.warn('Unexpected profile data format:', data);
          }
        } catch (profileError) {
          console.log('Profile not found, using default values');
          // Profile will use default values
        }

        // Load KYC status
        try {
          const kycResponse = await riderKYCAPI.getKYCStatus();
          setKycStatus(kycResponse.data);
        } catch (kycError) {
          console.log('KYC not submitted yet');
          setKycStatus(null);
        }

        // Load delivery data
        const availableResponse = await riderDeliveryAPI.getAvailableDeliveries();
        setAvailableDeliveries(availableResponse.data || []);

        const myDeliveriesResponse = await riderDeliveryAPI.getMyDeliveries();
        setMyDeliveries(myDeliveriesResponse.data || []);

      } catch (error) {
        console.error('Error loading rider data:', error);
        setError('Failed to load rider data. Please try again.');

        // Fallback to mock data if APIs fail
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
        setEarningsToday(45.50);
        setDeliveriesToday(3);
        setAverageRating(4.8);
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
      // Remove from available deliveries and add to my deliveries
      const delivery = availableDeliveries.find(d => d.id === deliveryId);
      if (delivery) {
        setAvailableDeliveries(prev => prev.filter(d => d.id !== deliveryId));
        setMyDeliveries(prev => [...prev, { ...delivery, status: 'assigned' }]);
      }
      setError('');
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

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setError('');

    try {
      // 1. Prepare user and rider data
      const { user, rider } = profileData;
      const userData = {
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone_number: user.phone_number || ''
      };

      const riderData = {
        vehicle_type: rider.vehicle_type || '',
        license_plate: rider.license_plate || ''
      };
      
      console.log('Sending profile update:', { user: userData, rider: riderData });
      
      // 2. Update user and rider data in parallel
      const [userResponse, riderResponse] = await Promise.all([
        authAPI.patch('/auth/me/', userData).catch(error => {
          console.error('Error updating user profile:', error);
          throw new Error('Failed to update user profile. ' + (error.response?.data?.detail || error.message));
        }),
        riderProfileAPI.updateProfile(riderData).catch(error => {
          console.error('Error updating rider profile:', error);
          throw new Error('Failed to update rider profile. ' + (error.response?.data?.detail || error.message));
        })
      ]);

      console.log('Profile update successful:', { userResponse, riderResponse });
      
      // 3. Update local state with the response data
      setProfileData(prev => ({
        ...prev,
        user: {
          ...prev.user,
          ...userResponse.data
        },
        rider: {
          ...prev.rider,
          ...riderResponse.data
        }
      }));

      // 4. Handle KYC submission if there are files
      const hasKycFiles = kycFiles.drivers_license || kycFiles.vehicle_registration || kycFiles.insurance_document;
      
      if (hasKycFiles) {
        await handleKYCSubmission(userData, riderData);
      }
      
      // 5. Close the modal and show success message
      setShowProfileModal(false);
      toast.success('Profile updated successfully', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleWithdrawal = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) < 10 || parseFloat(withdrawAmount) > walletBalance) {
      return;
    }

    setWithdrawLoading(true);
    try {
      await riderWalletAPI.requestWithdrawal(parseFloat(withdrawAmount));
      setWalletBalance(prev => prev - parseFloat(withdrawAmount));
      setWithdrawAmount('');
      setShowWalletModal(false);
      setError('');
      toast.success('Withdrawal request submitted successfully!');
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      const errorMessage = error.response?.data?.message || 'Failed to process withdrawal. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleFileChange = (field) => (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file type and size (max 5MB)
      const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      if (!validTypes.includes(file.type)) {
        toast.error('Invalid file type. Please upload a JPEG, PNG, or PDF file.');
        return;
      }
      
      if (file.size > maxSize) {
        toast.error('File is too large. Maximum size is 5MB.');
        return;
      }
      
      setKycFiles(prev => ({
        ...prev,
        [field]: file
      }));
    }
  };

  const handleSubmitKYC = async () => {
    setKycLoading(true);
    try {
      // Validate required files
      if (!kycFiles.drivers_license || !kycFiles.vehicle_registration || !kycFiles.insurance_document) {
        throw new Error('Please upload all required documents');
      }

      const formData = new FormData();

      // Add basic rider info
      formData.append('rider_id', profileData.rider?.id || 1);
      formData.append('full_name', `${profileData.user?.first_name || ''} ${profileData.user?.last_name || ''}`.trim());
      formData.append('vehicle_type', profileData.rider?.vehicle_type || '');
      formData.append('license_plate', profileData.rider?.license_plate || '');

      // Add current date for dates (since we don't have date inputs in the form)
      const currentDate = new Date().toISOString().split('T')[0];
      formData.append('date_of_birth', currentDate);
      formData.append('license_issue_date', currentDate);
      formData.append('license_expiry_date', new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      // Add file uploads with proper field names
      if (kycFiles.drivers_license) {
        formData.append('drivers_license_document', kycFiles.drivers_license);
      }
      if (kycFiles.vehicle_registration) {
        formData.append('vehicle_registration_document', kycFiles.vehicle_registration);
      }
      if (kycFiles.insurance_document) {
        formData.append('insurance_document', kycFiles.insurance_document);
      }

      // Submit KYC with headers for file upload
      const response = await riderKYCAPI.submitKYC(formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Update KYC status with the response
      setKycStatus({
        ...response.data,
        // Preserve file URLs in the state
        kyc: {
          ...response.data.kyc,
          drivers_license_document: response.data.kyc?.drivers_license_document || kycFiles.drivers_license,
          vehicle_registration_document: response.data.kyc?.vehicle_registration_document || kycFiles.vehicle_registration,
          insurance_document: response.data.kyc?.insurance_document || kycFiles.insurance_document
        }
      });
      
      toast.success('KYC submitted successfully! It is now pending admin approval.');

      // Clear file inputs
      setKycFiles({
        drivers_license: null,
        vehicle_registration: null,
        insurance_document: null
      });

    } catch (error) {
      console.error('Error submitting KYC:', error);
      setError('Failed to submit KYC. Please try again.');
    } finally {
      setKycLoading(false);
    }
  };

  const updateProfileData = (section, field, value) => {
    setProfileData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  // Handle KYC submission
  const handleKYCSubmission = async (userData, riderData) => {
    console.log('Submitting KYC documents...');
    setKycLoading(true);
    
    try {
      const formData = new FormData();
      
      // Add basic rider info
      formData.append('full_name', `${userData.first_name} ${userData.last_name}`.trim());
      formData.append('vehicle_type', riderData.vehicle_type);
      formData.append('license_plate', riderData.license_plate);
      
      // Add current date for dates
      const currentDate = new Date().toISOString().split('T')[0];
      formData.append('date_of_birth', currentDate);
      formData.append('license_issue_date', currentDate);
      formData.append('license_expiry_date', new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      
      // Add file uploads with proper field names
      if (kycFiles.drivers_license) {
        formData.append('drivers_license_document', kycFiles.drivers_license);
      }
      if (kycFiles.vehicle_registration) {
        formData.append('vehicle_registration_document', kycFiles.vehicle_registration);
      }
      if (kycFiles.insurance_document) {
        formData.append('insurance_document', kycFiles.insurance_document);
      }
      
      console.log('Submitting KYC with form data:', {
        full_name: `${userData.first_name} ${userData.last_name}`.trim(),
        vehicle_type: riderData.vehicle_type,
        license_plate: riderData.license_plate,
        has_drivers_license: !!kycFiles.drivers_license,
        has_vehicle_registration: !!kycFiles.vehicle_registration,
        has_insurance_document: !!kycFiles.insurance_document
      });
      
      // Submit KYC using the riderKYCAPI
      const response = await riderKYCAPI.submitKYC(formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('KYC submission response:', response);
      
      // Update KYC status with the response
      setKycStatus({
        ...response.data,
        kyc: {
          ...response.data.kyc,
          drivers_license_document: response.data.kyc?.drivers_license_document || kycFiles.drivers_license,
          vehicle_registration_document: response.data.kyc?.vehicle_registration_document || kycFiles.vehicle_registration,
          insurance_document: response.data.kyc?.insurance_document || kycFiles.insurance_document
        },
        status: 'pending',
        submitted_at: new Date().toISOString()
      });
      
      // Clear file inputs
      setKycFiles({
        drivers_license: null,
        vehicle_registration: null,
        insurance_document: null
      });
      
      // Show success message
      toast.success('KYC submitted successfully! It is now pending admin approval.', {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true
      });
      
      return response;
      
    } catch (error) {
      console.error('Error submitting KYC:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to submit KYC';
      toast.error(`KYC submission failed: ${errorMessage}`, {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true
      });
      throw error;
    } finally {
      setKycLoading(false);
    }
  };

  const handleRejectDelivery = async (deliveryId) => {
    try {
      // For now, just remove from available deliveries
      setAvailableDeliveries(prev => prev.filter(d => d.id !== deliveryId));
      setError('');
    } catch (error) {
      console.error('Error rejecting delivery:', error);
      setError('Failed to reject delivery. Please try again.');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading rider dashboard...</p>
        </div>
      </div>
    );
  }

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
                onClick={() => setShowWalletModal(true)}
                className="flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
              >
                <FiCreditCard className="mr-2" />
                Wallet (${walletBalance.toFixed(2)})
              </button>
              <button
                onClick={() => setShowProfileModal(true)}
                className="flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
              >
                <FiUser className="mr-2" />
                Profile
              </button>
              {kycStatus && (
                <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  kycStatus.kyc?.status === 'approved' ? 'bg-green-100 text-green-800' :
                  kycStatus.kyc?.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  kycStatus.kyc?.status === 'requires_changes' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  KYC: {kycStatus.kyc?.status === 'requires_changes' ? 'Changes Required' :
                        kycStatus.kyc?.status?.charAt(0).toUpperCase() + kycStatus.kyc?.status?.slice(1)}
                </div>
              )}
              {currentLocation && (
                <span className="text-sm text-gray-600">
                  📍 {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions for Mobile */}
          <div className="md:hidden grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={toggleOnlineStatus}
              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-colors ${
                isOnline ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}
            >
              {isOnline ? <FiWifi className="h-8 w-8 mb-2" /> : <FiWifiOff className="h-8 w-8 mb-2" />}
              <span className="text-sm font-medium">{isOnline ? 'Online' : 'Offline'}</span>
            </button>
            <button
              onClick={getCurrentLocation}
              className="flex flex-col items-center justify-center p-4 bg-blue-50 border-2 border-blue-200 text-blue-700 rounded-lg transition-colors"
            >
              <FiMap className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium">Update Location</span>
            </button>
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
                <p className="text-sm font-medium text-gray-600">Today's Earnings</p>
                <p className="text-2xl font-bold text-gray-900">${earningsToday.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <FiCheckCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Deliveries Today</p>
                <p className="text-2xl font-bold text-gray-900">{deliveriesToday}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <FiArrowDownCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Rating</p>
                <p className="text-2xl font-bold text-gray-900">⭐ {averageRating}</p>
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
                            onClick={() => handleRejectDelivery(delivery.id)}
                            className="px-4 py-2 border border-red-300 text-red-700 text-sm font-medium rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            <FiXCircle className="inline h-4 w-4 mr-1" />
                            Reject
                          </button>
                          <button
                            onClick={() => handleAcceptDelivery(delivery.id)}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <FiCheckCircle className="inline h-4 w-4 mr-1" />
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

      {/* Wallet Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FiCreditCard className="mr-2" />
                Rider Wallet
              </h3>

              <div className="mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800">Current Balance</span>
                    <span className="text-2xl font-bold text-green-600">${walletBalance.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Transactions</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {walletTransactions.length === 0 ? (
                      <p className="text-sm text-gray-500">No transactions yet</p>
                    ) : (
                      walletTransactions.slice(0, 5).map((transaction) => {
                        const typeInfo = formatTransactionType(transaction.transaction_type);
                        return (
                          <div key={transaction.id} className={`flex items-center justify-between p-2 rounded ${typeInfo.bgColor}`}>
                            <div>
                              <p className={`text-sm font-medium ${typeInfo.color}`}>
                                {typeInfo.label}
                              </p>
                              <p className="text-xs text-gray-600">{transaction.description}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-medium ${typeInfo.color}`}>
                                {transaction.transaction_type === 'earning' ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(transaction.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Request Withdrawal</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount ($)
                      </label>
                      <input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="Enter amount to withdraw"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        max={walletBalance}
                        step="0.01"
                      />
                    </div>
                    <div className="text-xs text-gray-600">
                      Minimum withdrawal: $10.00 • Processing time: 24-48 hours
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowWalletModal(false);
                    setWithdrawAmount('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Close
                </button>
                <button
                  onClick={handleWithdrawal}
                  disabled={withdrawLoading || !withdrawAmount || parseFloat(withdrawAmount) < 10 || parseFloat(withdrawAmount) > walletBalance}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {withdrawLoading ? 'Processing...' : 'Request Withdrawal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
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
                    value={profileData?.user ? `${profileData.user.first_name || ''} ${profileData.user.last_name || ''}`.trim() : ''}
                    onChange={(e) => {
                      const [firstName, ...lastNameParts] = e.target.value.split(' ');
                      updateProfileData('user', 'first_name', firstName || '');
                      updateProfileData('user', 'last_name', lastNameParts.join(' ') || '');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={profileData?.user?.phone_number || ''}
                    onChange={(e) => updateProfileData('user', 'phone_number', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                  <select
                    value={profileData?.rider?.vehicle_type || ''}
                    onChange={(e) => updateProfileData('rider', 'vehicle_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
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
                    value={profileData?.rider?.license_plate || ''}
                    onChange={(e) => updateProfileData('rider', 'license_plate', e.target.value)}
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
                        onChange={(e) => handleFileChange('drivers_license', e.target.files[0])}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Vehicle Registration</label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange('vehicle_registration', e.target.files[0])}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Insurance Document</label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange('insurance_document', e.target.files[0])}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">KYC Status</h4>
                  {kycStatus ? (
                    <div className={`p-3 rounded-md ${
                      kycStatus.kyc?.status === 'approved' ? 'bg-green-50 border border-green-200' :
                      kycStatus.kyc?.status === 'rejected' ? 'bg-red-50 border border-red-200' :
                      kycStatus.kyc?.status === 'requires_changes' ? 'bg-yellow-50 border border-yellow-200' :
                      'bg-blue-50 border border-blue-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm font-medium ${
                            kycStatus.kyc?.status === 'approved' ? 'text-green-800' :
                            kycStatus.kyc?.status === 'rejected' ? 'text-red-800' :
                            kycStatus.kyc?.status === 'requires_changes' ? 'text-yellow-800' :
                            'text-blue-800'
                          }`}>
                            Status: {kycStatus.kyc?.status === 'requires_changes' ? 'Requires Changes' :
                                     kycStatus.kyc?.status?.charAt(0).toUpperCase() + kycStatus.kyc?.status?.slice(1)}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Submitted: {new Date(kycStatus.kyc?.submitted_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          kycStatus.kyc?.status === 'approved' ? 'bg-green-100 text-green-800' :
                          kycStatus.kyc?.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          kycStatus.kyc?.status === 'requires_changes' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {kycStatus.rider_verified ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                      <p className="text-sm text-gray-600">KYC not submitted yet</p>
                      <button
                        onClick={handleSubmitKYC}
                        disabled={kycLoading}
                        className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {kycLoading ? 'Submitting...' : 'Submit KYC'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowProfileModal(false);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={profileLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {profileLoading ? 'Saving...' : 'Save Profile'}
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
