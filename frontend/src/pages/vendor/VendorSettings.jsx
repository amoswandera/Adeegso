import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FiSettings, FiUser, FiBell, FiCreditCard, FiMapPin, FiClock, FiSave, FiUpload } from 'react-icons/fi';
import { vendorAPI } from '../../services/api';

const VendorSettings = () => {
  const { vendorData, loading, refreshVendorData } = useOutletContext();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    profile: {
      name: '',
      email: '',
      phone: '',
      description: '',
      address: '',
      businessHours: {
        monday: { open: '09:00', close: '22:00', closed: false },
        tuesday: { open: '09:00', close: '22:00', closed: false },
        wednesday: { open: '09:00', close: '22:00', closed: false },
        thursday: { open: '09:00', close: '22:00', closed: false },
        friday: { open: '09:00', close: '22:00', closed: false },
        saturday: { open: '10:00', close: '23:00', closed: false },
        sunday: { open: '10:00', close: '22:00', closed: false }
      }
    },
    notifications: {
      orderNotifications: true,
      reviewNotifications: true,
      promotionEmails: false,
      smsUpdates: true
    },
    payment: {
      bankAccount: '',
      routingNumber: '',
      paypalEmail: '',
      autoPayout: true,
      payoutThreshold: 50
    }
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // In a real app, you'd fetch vendor settings from API
        // For now, we'll use mock data with vendor info
        setSettings(prev => ({
          ...prev,
          profile: {
            ...prev.profile,
            name: vendorData?.name || 'My Restaurant',
            email: 'vendor@example.com', // Would come from user account
            phone: '+1 (555) 123-4567',
            description: 'Delicious food delivered fast',
            address: '123 Main St, New York, NY 10001'
          }
        }));
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };

    if (vendorData) {
      fetchSettings();
    }
  }, [vendorData]);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      // Update vendor profile
      const response = await vendorAPI.updateVendorProfile({
        name: settings.profile.name,
        location: settings.profile.address,
        description: settings.profile.description
      });
      // Update local settings with response data
      const updatedData = response.data;
      setSettings(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          name: updatedData.name,
          address: updatedData.location,
          description: updatedData.description
        }
      }));
      // Refresh vendor data in layout
      await refreshVendorData();
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = (field, value) => {
    setSettings(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        [field]: value
      }
    }));
  };

  const updateBusinessHours = (day, field, value) => {
    setSettings(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        businessHours: {
          ...prev.profile.businessHours,
          [day]: {
            ...prev.profile.businessHours[day],
            [field]: value
          }
        }
      }
    }));
  };

  const updateNotification = (field, value) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: value
      }
    }));
  };

  const updatePayment = (field, value) => {
    setSettings(prev => ({
      ...prev,
      payment: {
        ...prev.payment,
        [field]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 bg-gray-200 rounded w-1/3"></div>
        <div className="h-96 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', name: 'Profile', icon: <FiUser className="h-5 w-5" /> },
    { id: 'notifications', name: 'Notifications', icon: <FiBell className="h-5 w-5" /> },
    { id: 'payment', name: 'Payment', icon: <FiCreditCard className="h-5 w-5" /> }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  ${activeTab === tab.id
                    ? 'border-brand-blue text-brand-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center
                `}
              >
                {tab.icon}
                <span className="ml-2">{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                    <input
                      type="text"
                      value={settings.profile.name}
                      onChange={(e) => updateProfile('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={settings.profile.email}
                      onChange={(e) => updateProfile('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={settings.profile.phone}
                      onChange={(e) => updateProfile('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input
                      type="text"
                      value={settings.profile.address}
                      onChange={(e) => updateProfile('address', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={settings.profile.description}
                    onChange={(e) => updateProfile('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                    placeholder="Describe your business..."
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Business Hours</h3>
                <div className="space-y-3">
                  {Object.entries(settings.profile.businessHours).map(([day, hours]) => (
                    <div key={day} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900 w-20 capitalize">
                          {day}
                        </span>
                        <div className="flex items-center space-x-2">
                          <input
                            type="time"
                            value={hours.open}
                            onChange={(e) => updateBusinessHours(day, 'open', e.target.value)}
                            disabled={hours.closed}
                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                          />
                          <span className="text-gray-500">to</span>
                          <input
                            type="time"
                            value={hours.close}
                            onChange={(e) => updateBusinessHours(day, 'close', e.target.value)}
                            disabled={hours.closed}
                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                          />
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={hours.closed}
                              onChange={(e) => updateBusinessHours(day, 'closed', e.target.checked)}
                              className="h-4 w-4 text-brand-blue focus:ring-brand-blue border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">Closed</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Order Notifications</h4>
                    <p className="text-sm text-gray-500">Get notified when new orders are placed</p>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notifications.orderNotifications}
                      onChange={(e) => updateNotification('orderNotifications', e.target.checked)}
                      className="h-4 w-4 text-brand-blue focus:ring-brand-blue border-gray-300 rounded"
                    />
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Review Notifications</h4>
                    <p className="text-sm text-gray-500">Get notified when customers leave reviews</p>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notifications.reviewNotifications}
                      onChange={(e) => updateNotification('reviewNotifications', e.target.checked)}
                      className="h-4 w-4 text-brand-blue focus:ring-brand-blue border-gray-300 rounded"
                    />
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">SMS Updates</h4>
                    <p className="text-sm text-gray-500">Receive important updates via SMS</p>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notifications.smsUpdates}
                      onChange={(e) => updateNotification('smsUpdates', e.target.checked)}
                      className="h-4 w-4 text-brand-blue focus:ring-brand-blue border-gray-300 rounded"
                    />
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Promotional Emails</h4>
                    <p className="text-sm text-gray-500">Receive promotional emails and offers</p>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notifications.promotionEmails}
                      onChange={(e) => updateNotification('promotionEmails', e.target.checked)}
                      className="h-4 w-4 text-brand-blue focus:ring-brand-blue border-gray-300 rounded"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account Number</label>
                  <input
                    type="text"
                    value={settings.payment.bankAccount}
                    onChange={(e) => updatePayment('bankAccount', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                    placeholder="Enter bank account number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Routing Number</label>
                  <input
                    type="text"
                    value={settings.payment.routingNumber}
                    onChange={(e) => updatePayment('routingNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                    placeholder="Enter routing number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PayPal Email</label>
                  <input
                    type="email"
                    value={settings.payment.paypalEmail}
                    onChange={(e) => updatePayment('paypalEmail', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                    placeholder="Enter PayPal email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payout Threshold ($)</label>
                  <input
                    type="number"
                    value={settings.payment.payoutThreshold}
                    onChange={(e) => updatePayment('payoutThreshold', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                    min="10"
                    step="10"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoPayout"
                  checked={settings.payment.autoPayout}
                  onChange={(e) => updatePayment('autoPayout', e.target.checked)}
                  className="h-4 w-4 text-brand-blue focus:ring-brand-blue border-gray-300 rounded"
                />
                <label htmlFor="autoPayout" className="ml-2 block text-sm text-gray-900">
                  Enable automatic payouts when threshold is reached
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-blue hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue disabled:opacity-50"
        >
          <FiSave className="mr-2 h-4 w-4" />
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default VendorSettings;
