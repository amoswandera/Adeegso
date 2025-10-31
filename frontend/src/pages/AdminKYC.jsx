import React, { useState, useEffect } from 'react';
import { FiCheckCircle, FiXCircle, FiClock, FiAlertCircle, FiEye, FiUser, FiBriefcase } from 'react-icons/fi';
import { vendorKYCAPI } from '../services/api';

const KYCManagement = () => {
  const [pendingKYC, setPendingKYC] = useState([]);
  const [selectedKYC, setSelectedKYC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    loadPendingKYC();
  }, []);

  const loadPendingKYC = async () => {
    try {
      setLoading(true);
      const response = await vendorKYCAPI.getPendingKYC();
      setPendingKYC(response.data.pending_kyc || []);
    } catch (error) {
      console.error('Error loading pending KYC:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadKYCDetail = async (kycId) => {
    try {
      setDetailLoading(true);
      const response = await vendorKYCAPI.getKYCDetail(kycId);
      setSelectedKYC(response.data);
    } catch (error) {
      console.error('Error loading KYC detail:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async (kycId) => {
    try {
      setActionLoading(kycId);
      await vendorKYCAPI.approveKYC(kycId);
      await loadPendingKYC(); // Refresh list
      if (selectedKYC && selectedKYC.id === kycId) {
        await loadKYCDetail(kycId); // Refresh detail
      }
      alert('KYC approved successfully!');
    } catch (error) {
      console.error('Error approving KYC:', error);
      alert('Failed to approve KYC. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (kycId, reason) => {
    if (!reason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }

    try {
      setActionLoading(kycId);
      await vendorKYCAPI.rejectKYC(kycId, reason);
      await loadPendingKYC(); // Refresh list
      if (selectedKYC && selectedKYC.id === kycId) {
        await loadKYCDetail(kycId); // Refresh detail
      }
      alert('KYC rejected successfully!');
    } catch (error) {
      console.error('Error rejecting KYC:', error);
      alert('Failed to reject KYC. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestChanges = async (kycId, notes) => {
    if (!notes.trim()) {
      alert('Please provide notes for the requested changes.');
      return;
    }

    try {
      setActionLoading(kycId);
      await vendorKYCAPI.requestKYCChanges(kycId, notes);
      await loadPendingKYC(); // Refresh list
      if (selectedKYC && selectedKYC.id === kycId) {
        await loadKYCDetail(kycId); // Refresh detail
      }
      alert('Changes requested successfully!');
    } catch (error) {
      console.error('Error requesting changes:', error);
      alert('Failed to request changes. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <FiCheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <FiXCircle className="h-5 w-5 text-red-500" />;
      case 'requires_changes':
        return <FiAlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <FiClock className="h-5 w-5 text-gray-500" />;
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
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">KYC Management</h1>
        <p className="mt-2 text-gray-600">
          Review and manage vendor KYC submissions
        </p>
      </div>

      {/* Pending KYC List */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Pending KYC ({pendingKYC.length})
          </h2>
        </div>

        {pendingKYC.length === 0 ? (
          <div className="p-6 text-center">
            <FiCheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No pending KYC</h3>
            <p className="mt-1 text-sm text-gray-500">All KYC submissions have been reviewed.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {pendingKYC.map((kyc) => (
              <div key={kyc.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <FiUser className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {kyc.full_name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {kyc.vendor?.name || 'Unknown Vendor'}
                      </p>
                      <p className="text-xs text-gray-400">
                        Submitted {formatDate(kyc.submitted_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => loadKYCDetail(kyc.id)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <FiEye className="mr-1 h-4 w-4" />
                      Review
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KYC Detail Modal */}
      {selectedKYC && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  KYC Review - {selectedKYC.full_name}
                </h3>
                <button
                  onClick={() => setSelectedKYC(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {detailLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-32 bg-gray-200 rounded"></div>
                  <div className="h-24 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Personal Information */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                      <FiUser className="mr-2" />
                      Personal Information
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <p className="text-sm text-gray-900">{selectedKYC.full_name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                        <p className="text-sm text-gray-900">{formatDate(selectedKYC.date_of_birth)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Nationality</label>
                        <p className="text-sm text-gray-900">{selectedKYC.nationality}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">National ID</label>
                        <p className="text-sm text-gray-900">{selectedKYC.national_id_number}</p>
                      </div>
                    </div>
                  </div>

                  {/* Business Information */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                      <FiBriefcase className="mr-2" />
                      Business Information
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Business Registration</label>
                        <p className="text-sm text-gray-900">{selectedKYC.business_registration_number}</p>
                      </div>
                      {selectedKYC.tax_id_number && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Tax ID</label>
                          <p className="text-sm text-gray-900">{selectedKYC.tax_id_number}</p>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Business Address</label>
                        <p className="text-sm text-gray-900">{selectedKYC.business_address}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Business Phone</label>
                        <p className="text-sm text-gray-900">{selectedKYC.business_phone}</p>
                      </div>
                    </div>
                  </div>

                  {/* Documents */}
                  <div className="lg:col-span-2">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Submitted Documents</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { key: 'national_id_document', label: 'National ID' },
                        { key: 'business_registration_document', label: 'Business Registration' },
                        { key: 'tax_document', label: 'Tax Document' },
                        { key: 'bank_statement', label: 'Bank Statement' }
                      ].map(({ key, label }) => (
                        <div key={key} className="border rounded-lg p-4">
                          <h5 className="font-medium text-gray-900 mb-2">{label}</h5>
                          {selectedKYC[key] ? (
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
                      ))}
                    </div>
                  </div>

                  {/* Admin Notes */}
                  {selectedKYC.admin_notes && (
                    <div className="lg:col-span-2">
                      <h4 className="text-md font-semibold text-gray-900 mb-3">Admin Notes</h4>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800">{selectedKYC.admin_notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Rejection Reason */}
                  {selectedKYC.rejection_reason && (
                    <div className="lg:col-span-2">
                      <h4 className="text-md font-semibold text-gray-900 mb-3">Rejection Reason</h4>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800">{selectedKYC.rejection_reason}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setSelectedKYC(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Close
                </button>

                {selectedKYC && selectedKYC.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        const notes = prompt('Enter notes for requested changes:');
                        if (notes) handleRequestChanges(selectedKYC.id, notes);
                      }}
                      className="px-4 py-2 border border-yellow-500 text-yellow-700 rounded-md hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      Request Changes
                    </button>

                    <button
                      onClick={() => {
                        const reason = prompt('Enter reason for rejection:');
                        if (reason) handleReject(selectedKYC.id, reason);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                      disabled={actionLoading === selectedKYC.id}
                    >
                      {actionLoading === selectedKYC.id ? 'Processing...' : 'Reject'}
                    </button>

                    <button
                      onClick={() => handleApprove(selectedKYC.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                      disabled={actionLoading === selectedKYC.id}
                    >
                      {actionLoading === selectedKYC.id ? 'Processing...' : 'Approve'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KYCManagement;
