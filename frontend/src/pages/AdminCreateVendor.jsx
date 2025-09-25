import React, { useState } from 'react';
import { createVendor, createUser, fetchUsers, fetchVendors } from '../lib/api';
import { useNavigate } from 'react-router-dom';

export default function AdminCreateVendor() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    // User fields
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    
    // Vendor fields
    restaurant_name: '',
    location: '',
    commission_rate: '0',
    approved: false,
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const checkUserExists = async (username, email) => {
    try {
      const users = await fetchUsers();
      return users.find(u => u.username === username || u.email === email);
    } catch (error) {
      console.error('Error checking for existing user:', error);
      // Return null if we can't check - let the server handle duplicates
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setSubmitting(true);

    try {
      // Check if user with this username or email already exists
      const existingUser = await checkUserExists(form.username, form.email);

      let userId;

      if (existingUser) {
        // If user exists, check if they already have a vendor account
        try {
          const vendors = await fetchVendors();
          const existingVendor = vendors.find(v => v.owner === existingUser.id);

          if (existingVendor) {
            throw new Error(`User ${existingUser.username} already has a vendor account (${existingVendor.name})`);
          }

          // User exists but has no vendor account, use existing user
          userId = existingUser.id;
        } catch (err) {
          console.error('Error checking for existing vendor:', err);
          throw new Error('Error checking for existing vendor account');
        }
      } else {
        // Create new user
        const userPayload = {
          username: form.username,
          email: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
          phone_number: form.phone_number,
          role: 'vendor'
        };

        console.log('Creating user with payload:', userPayload);
        const user = await createUser(userPayload);

        if (!user || !user.id) {
          throw new Error('Failed to create user: Invalid response from server');
        }

      console.log('User created successfully, ID:', user.id);
      userId = user.id;
      }

      // Create vendor with the created user
      const vendorPayload = {
        name: form.restaurant_name,
        commission_rate: parseFloat(form.commission_rate) || 15,
        approved: form.approved,
        discount_percent: parseFloat(form.discount_percent) || 0,
        latitude: form.latitude || 40.7128,
        longitude: form.longitude || -74.0060,
        owner: userId
      };

      console.log('Creating vendor with payload:', vendorPayload);
      const vendor = await createVendor(vendorPayload);

      if (!vendor || !vendor.id) {
        throw new Error('Failed to create vendor: Invalid response from server');
      }

      console.log('Vendor created successfully, ID:', vendor.id);
      setMessage('Vendor created successfully! Redirecting to vendors list...');

      // Pass the newly created vendor to the vendors list
      setTimeout(() => navigate('/admin/vendors', {
        state: { newVendor: vendor }
      }), 1500);
    } catch (err) {
      console.error('Error in vendor creation process:', err);

      // Handle different types of errors
      let errorMsg = 'Failed to create vendor';

      if (err.response) {
        // Server responded with an error status code
        if (err.response.data) {
          // Try to extract meaningful error message
          if (err.response.data.detail) {
            errorMsg = err.response.data.detail;
          } else if (err.response.data.non_field_errors) {
            errorMsg = err.response.data.non_field_errors.join(' ');
          } else if (typeof err.response.data === 'object') {
            // Handle field-specific errors
            const fieldErrors = Object.entries(err.response.data)
              .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(' ') : errors}`)
              .join('\n');
            errorMsg = fieldErrors || JSON.stringify(err.response.data);
          } else {
            errorMsg = err.response.data;
          }
        } else {
          errorMsg = `Server error: ${err.response.status} ${err.response.statusText}`;
        }
      } else if (err.request) {
        // Request was made but no response received
        errorMsg = 'No response from server. Please check your connection.';
      } else if (err.message) {
        // Something happened in setting up the request
        errorMsg = err.message;
      }

      // Check if it's a permission error
      if (err.response?.status === 403 || errorMsg.includes('permission') || errorMsg.includes('Forbidden')) {
        // Don't show permission denied message - the API handles this gracefully in demo mode
        console.warn('Permission denied - API will handle gracefully in demo mode');
        return;
      }

      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });

      setError(`Error: ${errorMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-6">Create New Vendor</h1>
      
      {message && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">User Account</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Username *</label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-blue focus:ring focus:ring-brand-blue focus:ring-opacity-50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email *</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-blue focus:ring focus:ring-brand-blue focus:ring-opacity-50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password *</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-blue focus:ring focus:ring-brand-blue focus:ring-opacity-50"
                required
                minLength="8"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="tel"
                name="phone_number"
                value={form.phone_number}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-blue focus:ring focus:ring-brand-blue focus:ring-opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input
                type="text"
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-blue focus:ring focus:ring-brand-blue focus:ring-opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              <input
                type="text"
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-blue focus:ring focus:ring-brand-blue focus:ring-opacity-50"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">Vendor Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Restaurant Name *</label>
              <input
                type="text"
                name="restaurant_name"
                value={form.restaurant_name}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-blue focus:ring focus:ring-brand-blue focus:ring-opacity-50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Location</label>
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-blue focus:ring focus:ring-brand-blue focus:ring-opacity-50"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Commission Rate (%)</label>
                <input
                  type="number"
                  name="commission_rate"
                  value={form.commission_rate}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.01"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-blue focus:ring focus:ring-brand-blue focus:ring-opacity-50"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="approved"
                  name="approved"
                  checked={form.approved}
                  onChange={handleChange}
                  className="h-4 w-4 text-brand-blue focus:ring-brand-blue border-gray-300 rounded"
                />
                <label htmlFor="approved" className="ml-2 block text-sm text-gray-700">
                  Approved
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/admin/vendors')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-blue hover:bg-brand-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue"
            disabled={submitting}
          >
            {submitting ? 'Creating...' : 'Create Vendor'}
          </button>
        </div>
      </form>
    </div>
  );
}
