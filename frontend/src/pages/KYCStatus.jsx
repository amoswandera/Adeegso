import React, { useState, useEffect } from 'react';
import { FiCheckCircle, FiXCircle, FiClock, FiAlertCircle, FiFileText, FiUser, FiBriefcase, FiCreditCard } from 'react-icons/fi';
import { vendorKYCAPI } from '../services/api';

const KYCStatus = ({ vendor }) => {
  const [kycData, setKycData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadKYCStatus();
  }, []);

  const loadKYCStatus = async () => {
    try {
      setLoading(true);
      const response = await vendorKYCAPI.getKYCStatus();
      setKycData(response.data);
    } catch (error) {
      console.error('Error loading KYC status:', error);
      setError('Failed to load KYC status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <FiCheckCircle className="h-6 w-6 text-green-500" />;
      case 'rejected':
        return <FiXCircle className="h-6 w-6 text-red-500" />;
      case 'requires_changes':
        return <FiAlertCircle className="h-6 w-6 text-yellow-500" />;
      default:
        return <FiClock className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'rejected':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'requires_changes':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!kycData || !kycData.kyc) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <FiFileText className="mx-auto h-16 w-16 text-gray-400" />
          <h2 className="mt-4 text-2xl font-bold text-gray-900">KYC Not Submitted</h2>
          <p className="mt-2 text-gray-600">
            You haven't submitted your KYC documents yet. KYC verification is required to start accepting orders.
          </p>
          <button
            onClick={() => window.location.href = '/vendor/kyc/submit'}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Submit KYC Documents
          </button>
        </div>
      </div>
    );
  }

  const kyc = kycData.kyc;
  const isApproved = kycData.vendor_approved;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">KYC Verification Status</h2>
        <p className="mt-2 text-gray-600">
          Review your KYC verification status and documents.
        </p>
      </div>

      {/* Status Overview */}
      <div className={`p-6 rounded-lg border-2 mb-6 ${getStatusColor(kyc.status)}`}>
        <div className="flex items-center">
          {getStatusIcon(kyc.status)}
          <div className="ml-3">
            <h3 className="text-lg font-semibold">
              {kyc.status === 'approved' ? 'Approved' :
               kyc.status === 'rejected' ? 'Rejected' :
               kyc.status === 'requires_changes' ? 'Requires Changes' : 'Pending Review'}
            </h3>
            <p className="text-sm mt-1">
              {kyc.status === 'approved' ? 'Your KYC has been approved and you can start accepting orders.' :
               kyc.status === 'rejected' ? `Your KYC was rejected. ${kyc.rejection_reason || 'Please contact support for more information.'}` :
               kyc.status === 'requires_changes' ? `Changes requested: ${kyc.admin_notes || 'Please review and resubmit.'}` :
               'Your KYC documents are under review. This typically takes 24-48 hours.'}
            </p>
            {kyc.reviewed_at && (
              <p className="text-xs mt-2">
                {kyc.status === 'approved' ? 'Approved' : 'Reviewed'} on {formatDate(kyc.reviewed_at)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Vendor Status */}
      <div className="mb-6">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          <FiCheckCircle className="mr-1 h-4 w-4" />
          {isApproved ? 'Vendor Approved' : 'Vendor Not Approved'}
        </div>
      </div>

      {/* KYC Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Personal Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiUser className="mr-2" />
            Personal Information
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <p className="text-sm text-gray-900">{kyc.full_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
              <p className="text-sm text-gray-900">{formatDate(kyc.date_of_birth)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nationality</label>
              <p className="text-sm text-gray-900">{kyc.nationality}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">National ID Number</label>
              <p className="text-sm text-gray-900">{kyc.national_id_number}</p>
            </div>
          </div>
        </div>

        {/* Business Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiBriefcase className="mr-2" />
            Business Information
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Business Registration Number</label>
              <p className="text-sm text-gray-900">{kyc.business_registration_number}</p>
            </div>
            {kyc.tax_id_number && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Tax ID Number</label>
                <p className="text-sm text-gray-900">{kyc.tax_id_number}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Business Address</label>
              <p className="text-sm text-gray-900">{kyc.business_address}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Business Phone</label>
              <p className="text-sm text-gray-900">{kyc.business_phone}</p>
            </div>
          </div>
        </div>

        {/* Bank Information */}
        <div className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiCreditCard className="mr-2" />
            Bank Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Bank Name</label>
              <p className="text-sm text-gray-900">{kyc.bank_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Account Number</label>
              <p className="text-sm text-gray-900">{kyc.bank_account_number}</p>
            </div>
            {kyc.bank_routing_number && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Routing Number</label>
                <p className="text-sm text-gray-900">{kyc.bank_routing_number}</p>
              </div>
            )}
          </div>
        </div>

        {/* Documents */}
        <div className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiFileText className="mr-2" />
            Submitted Documents
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">National ID Document</h4>
              {kyc.national_id_document ? (
                <div className="flex items-center text-green-600">
                  <FiCheckCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">Uploaded</span>
                </div>
              ) : (
                <div className="flex items-center text-gray-500">
                  <FiXCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">Not uploaded</span>
                </div>
              )}
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Business Registration</h4>
              {kyc.business_registration_document ? (
                <div className="flex items-center text-green-600">
                  <FiCheckCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">Uploaded</span>
                </div>
              ) : (
                <div className="flex items-center text-gray-500">
                  <FiXCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">Not uploaded</span>
                </div>
              )}
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Tax Document</h4>
              {kyc.tax_document ? (
                <div className="flex items-center text-green-600">
                  <FiCheckCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">Uploaded</span>
                </div>
              ) : (
                <div className="flex items-center text-gray-500">
                  <FiXCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">Not uploaded</span>
                </div>
              )}
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Bank Statement</h4>
              {kyc.bank_statement ? (
                <div className="flex items-center text-green-600">
                  <FiCheckCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">Uploaded</span>
                </div>
              ) : (
                <div className="flex items-center text-gray-500">
                  <FiXCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">Not uploaded</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={loadKYCStatus}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Refresh Status
        </button>

        {kyc.status !== 'approved' && (
          <button
            onClick={() => window.location.href = '/vendor/kyc/submit'}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {kyc.status === 'rejected' || kyc.status === 'requires_changes' ? 'Resubmit KYC' : 'Update KYC'}
          </button>
        )}
      </div>
    </div>
  );
};

export default KYCStatus;
