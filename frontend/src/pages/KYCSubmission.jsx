import React, { useState, useEffect } from 'react';
import { FiUpload, FiCheckCircle, FiXCircle, FiClock, FiFileText, FiUser, FiBriefcase, FiCreditCard } from 'react-icons/fi';
import { vendorKYCAPI } from '../services/api';

const KYCSubmissionForm = ({ vendor, onKYCSuccess }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    nationality: '',
    national_id_number: '',
    business_registration_number: '',
    tax_id_number: '',
    business_address: '',
    business_phone: '',
    bank_name: '',
    bank_account_number: '',
    bank_routing_number: '',
    national_id_document: null,
    business_registration_document: null,
    tax_document: null,
    bank_statement: null,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: files[0]
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields validation
    const requiredFields = [
      'full_name', 'date_of_birth', 'nationality', 'national_id_number',
      'business_registration_number', 'business_address', 'business_phone',
      'bank_name', 'bank_account_number'
    ];

    requiredFields.forEach(field => {
      if (!formData[field]) {
        newErrors[field] = `${field.replace('_', ' ').toUpperCase()} is required`;
      }
    });

    // Date validation
    if (formData.date_of_birth) {
      const birthDate = new Date(formData.date_of_birth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 18) {
        newErrors.date_of_birth = 'Must be at least 18 years old';
      }
    }

    // File validation
    const requiredFiles = ['national_id_document', 'business_registration_document', 'bank_statement'];
    requiredFiles.forEach(file => {
      if (!formData[file]) {
        newErrors[file] = `${file.replace('_', ' ').toUpperCase()} is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const formDataToSend = new FormData();

      // Add all text fields
      Object.keys(formData).forEach(key => {
        if (key !== 'national_id_document' && key !== 'business_registration_document' &&
            key !== 'tax_document' && key !== 'bank_statement' && formData[key]) {
          formDataToSend.append(key, formData[key]);
        }
      });

      // Add files
      if (formData.national_id_document) {
        formDataToSend.append('national_id_document', formData.national_id_document);
      }
      if (formData.business_registration_document) {
        formDataToSend.append('business_registration_document', formData.business_registration_document);
      }
      if (formData.tax_document) {
        formDataToSend.append('tax_document', formData.tax_document);
      }
      if (formData.bank_statement) {
        formDataToSend.append('bank_statement', formData.bank_statement);
      }

      await vendorKYCAPI.submitKYC(formDataToSend);
      setSuccess(true);

      if (onKYCSuccess) {
        onKYCSuccess();
      }
    } catch (error) {
      console.error('Error submitting KYC:', error);
      if (error.response?.data) {
        setErrors(error.response.data);
      } else {
        setErrors({ general: 'Failed to submit KYC. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <FiCheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <h2 className="mt-4 text-2xl font-bold text-gray-900">KYC Submitted Successfully!</h2>
          <p className="mt-2 text-gray-600">
            Your KYC documents have been submitted for review. You will receive a notification once the review is complete.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Review typically takes 24-48 hours.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Vendor KYC Verification</h2>
        <p className="mt-2 text-gray-600">
          Please provide the required information and documents for identity verification.
        </p>
      </div>

      {errors.general && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{errors.general}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Personal Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiUser className="mr-2" />
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.full_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your full legal name"
              />
              {errors.full_name && <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth *
              </label>
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.date_of_birth ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.date_of_birth && <p className="mt-1 text-sm text-red-600">{errors.date_of_birth}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nationality *
              </label>
              <input
                type="text"
                name="nationality"
                value={formData.nationality}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.nationality ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Somali"
              />
              {errors.nationality && <p className="mt-1 text-sm text-red-600">{errors.nationality}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                National ID Number *
              </label>
              <input
                type="text"
                name="national_id_number"
                value={formData.national_id_number}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.national_id_number ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your national ID number"
              />
              {errors.national_id_number && <p className="mt-1 text-sm text-red-600">{errors.national_id_number}</p>}
            </div>
          </div>
        </div>

        {/* Business Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiBriefcase className="mr-2" />
            Business Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Registration Number *
              </label>
              <input
                type="text"
                name="business_registration_number"
                value={formData.business_registration_number}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.business_registration_number ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter business registration number"
              />
              {errors.business_registration_number && <p className="mt-1 text-sm text-red-600">{errors.business_registration_number}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax ID Number
              </label>
              <input
                type="text"
                name="tax_id_number"
                value={formData.tax_id_number}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter tax ID number (optional)"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Address *
              </label>
              <textarea
                name="business_address"
                value={formData.business_address}
                onChange={handleInputChange}
                rows={3}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.business_address ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter complete business address"
              />
              {errors.business_address && <p className="mt-1 text-sm text-red-600">{errors.business_address}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Phone *
              </label>
              <input
                type="tel"
                name="business_phone"
                value={formData.business_phone}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.business_phone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter business phone number"
              />
              {errors.business_phone && <p className="mt-1 text-sm text-red-600">{errors.business_phone}</p>}
            </div>
          </div>
        </div>

        {/* Bank Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiCreditCard className="mr-2" />
            Bank Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Name *
              </label>
              <input
                type="text"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.bank_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter bank name"
              />
              {errors.bank_name && <p className="mt-1 text-sm text-red-600">{errors.bank_name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Account Number *
              </label>
              <input
                type="text"
                name="bank_account_number"
                value={formData.bank_account_number}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.bank_account_number ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter bank account number"
              />
              {errors.bank_account_number && <p className="mt-1 text-sm text-red-600">{errors.bank_account_number}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Routing Number
              </label>
              <input
                type="text"
                name="bank_routing_number"
                value={formData.bank_routing_number}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter bank routing number (optional)"
              />
            </div>
          </div>
        </div>

        {/* Document Uploads */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiFileText className="mr-2" />
            Required Documents
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                National ID Document *
              </label>
              <div className={`border-2 border-dashed rounded-lg p-4 text-center ${
                errors.national_id_document ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
              }`}>
                <FiUpload className="mx-auto h-8 w-8 text-gray-400" />
                <div className="mt-2">
                  <label className="cursor-pointer">
                    <span className="text-sm text-blue-600 hover:text-blue-500">Upload file</span>
                    <input
                      type="file"
                      name="national_id_document"
                      onChange={handleFileChange}
                      accept="image/*,.pdf"
                      className="sr-only"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, PDF up to 10MB</p>
                </div>
                {formData.national_id_document && (
                  <p className="text-sm text-green-600 mt-2">{formData.national_id_document.name}</p>
                )}
              </div>
              {errors.national_id_document && <p className="mt-1 text-sm text-red-600">{errors.national_id_document}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Registration Document *
              </label>
              <div className={`border-2 border-dashed rounded-lg p-4 text-center ${
                errors.business_registration_document ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
              }`}>
                <FiUpload className="mx-auto h-8 w-8 text-gray-400" />
                <div className="mt-2">
                  <label className="cursor-pointer">
                    <span className="text-sm text-blue-600 hover:text-blue-500">Upload file</span>
                    <input
                      type="file"
                      name="business_registration_document"
                      onChange={handleFileChange}
                      accept="image/*,.pdf"
                      className="sr-only"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, PDF up to 10MB</p>
                </div>
                {formData.business_registration_document && (
                  <p className="text-sm text-green-600 mt-2">{formData.business_registration_document.name}</p>
                )}
              </div>
              {errors.business_registration_document && <p className="mt-1 text-sm text-red-600">{errors.business_registration_document}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax Document (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400">
                <FiUpload className="mx-auto h-8 w-8 text-gray-400" />
                <div className="mt-2">
                  <label className="cursor-pointer">
                    <span className="text-sm text-blue-600 hover:text-blue-500">Upload file</span>
                    <input
                      type="file"
                      name="tax_document"
                      onChange={handleFileChange}
                      accept="image/*,.pdf"
                      className="sr-only"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, PDF up to 10MB</p>
                </div>
                {formData.tax_document && (
                  <p className="text-sm text-green-600 mt-2">{formData.tax_document.name}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank Statement *
              </label>
              <div className={`border-2 border-dashed rounded-lg p-4 text-center ${
                errors.bank_statement ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
              }`}>
                <FiUpload className="mx-auto h-8 w-8 text-gray-400" />
                <div className="mt-2">
                  <label className="cursor-pointer">
                    <span className="text-sm text-blue-600 hover:text-blue-500">Upload file</span>
                    <input
                      type="file"
                      name="bank_statement"
                      onChange={handleFileChange}
                      accept="image/*,.pdf"
                      className="sr-only"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, PDF up to 10MB</p>
                </div>
                {formData.bank_statement && (
                  <p className="text-sm text-green-600 mt-2">{formData.bank_statement.name}</p>
                )}
              </div>
              {errors.bank_statement && <p className="mt-1 text-sm text-red-600">{errors.bank_statement}</p>}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit KYC'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default KYCSubmissionForm;
