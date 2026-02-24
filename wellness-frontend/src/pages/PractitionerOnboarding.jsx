import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import { uploadDocuments } from "../services/documentService";

export default function PractitionerOnboarding() {
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState('pending'); // 'pending' or 'verified'
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    licenseNumber: '',
    specialization: '',
    yearsOfExperience: '',
    bio: '',
    qualifications: '',
    clinicAddress: '',
    consultationFee: ''
  });

  useEffect(() => {
    // Check if practitioner is already verified
    const checkVerificationStatus = async () => {
      try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
          setLoading(false);
          return;
        }

        const response = await fetch(
          '/api/practitioners/me/onboarding-status',
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );

        if (response.ok) {
          const onboardingStatus = await response.json();
          
          // If profile already exists, redirect to dashboard (regardless of verification status)
          if (onboardingStatus.profileExists) {
            navigate('/practitioner/dashboard');
            return;
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error checking verification status:', err);
        setLoading(false);
      }
    };

    checkVerificationStatus();
  }, [navigate]);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    setUploadedFiles(prev => [...prev, ...pdfFiles]);
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleVerify = async () => {
    // Check if all required fields are filled
    const requiredFields = [
      'fullName',
      'email',
      'phone',
      'licenseNumber',
      'specialization',
      'yearsOfExperience',
      'bio',
      'qualifications',
      'clinicAddress',
      'consultationFee'
    ];

    const newErrors = {};

    requiredFields.forEach(field => {
      if (formData[field].toString().trim() === '') {
        newErrors[field] = 'This field is required';
      }
    });

    if (uploadedFiles.length === 0) {
      newErrors.documents = 'Please upload at least one document';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setApiError(null);

    try {
      // Create the practitioner profile on the backend
      const practitionerData = {
        specialization: formData.specialization,
        qualifications: formData.qualifications,
        experience: `${formData.yearsOfExperience} years`,
        bio: formData.bio
      };

      console.log("Submitting practitioner profile:", practitionerData);

      const response = await axios.post(
        "/api/practitioners",
        practitionerData,
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
          }
        }
      );

      console.log("Practitioner profile created successfully:", response.data);
      const practitionerId = response.data.id;

      // Upload documents
      console.log("Uploading documents...");
      try {
        const uploadedDocs = await uploadDocuments(practitionerId, uploadedFiles);
        console.log("Documents uploaded successfully:", uploadedDocs);
      } catch (uploadErr) {
        console.error("Error uploading documents:", uploadErr);
        throw new Error("Practitioner profile created but documents upload failed");
      }

      // Store practitioner details in localStorage (for convenience only)
      localStorage.setItem('practitionerData', JSON.stringify(formData));
      localStorage.setItem('uploadedFilesCount', uploadedFiles.length);
      localStorage.setItem('practitionerId', practitionerId);

      // Show success message that request was sent.
      // Actual verification status will be controlled by admin in the backend.
      setVerificationStatus('verified');
      setErrors({});
    } catch (err) {
      console.error("Error creating practitioner profile:", err);
      const errorMsg = err.response?.data?.message || err.message || "Failed to submit practitioner profile";
      setApiError(errorMsg);
      console.error("Full error details:", {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinueToDashboard = () => {
    navigate("/practitioner/dashboard");
  };

  return (
    <>
      {loading ? (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#f5f3ea] to-[#e7e2d3]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1f6f66] mx-auto mb-4"></div>
            <p className="text-gray-600 font-semibold">Checking your profile...</p>
          </div>
        </div>
      ) : (
        <div className="min-h-screen flex bg-gradient-to-br from-[#f5f3ea] to-[#e7e2d3]">
      
      {/* LEFT SIDE BRAND PANEL */}
      <div className="hidden md:flex w-1/2 bg-[#1f6f66] text-white flex-col justify-center px-16">
        <h1 className="text-4xl font-bold mb-6">
          Practitioner Verification
        </h1>
        <p className="text-lg opacity-90 leading-relaxed mb-8">
          Complete your professional profile to start helping patients on our platform.
        </p>
        
        <div className="space-y-4 text-sm opacity-90">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs">1</span>
            </div>
            <div>
              <p className="font-semibold">Complete Profile</p>
              <p className="text-teal-100 text-xs">Provide your professional credentials</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs">2</span>
            </div>
            <div>
              <p className="font-semibold">Upload Documents</p>
              <p className="text-teal-100 text-xs">Submit your certificates and credentials</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs">3</span>
            </div>
            <div>
              <p className="font-semibold">Get Verified</p>
              <p className="text-teal-100 text-xs">Wait for admin approval</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs">4</span>
            </div>
            <div>
              <p className="font-semibold">Start Accepting Patients</p>
              <p className="text-teal-100 text-xs">Access your dashboard and manage bookings</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE FORM */}
      <div className="flex w-full md:w-1/2 items-center justify-center px-6 py-8">
        <div className="bg-white w-full max-w-2xl p-10 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">

          <h2 className="text-3xl font-bold text-[#1f6f66] text-center mb-2">
            Complete Your Professional Profile
          </h2>
          <p className="text-center text-gray-500 text-sm mb-8">
            Fill in your details to get verified and start practicing
          </p>

          <form className="space-y-5">
            
            {/* Personal Information Section */}
            <div className="bg-gray-50 p-5 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-[#1f6f66]">📋</span>
                Personal Information
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 tracking-wide">
                    FULL NAME *
                  </label>
                  <input
                    type="text"
                    placeholder="Dr. John Smith"
                    value={formData.fullName}
                    onChange={(e) => {
                      setFormData({...formData, fullName: e.target.value});
                      if (errors.fullName) setErrors({...errors, fullName: null});
                    }}
                    className={`w-full mt-2 px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none ${
                      errors.fullName ? 'border-red-500 focus:ring-red-500' : 'focus:ring-[#1f6f66]'
                    }`}
                    required
                  />
                  {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-gray-600 tracking-wide">
                    EMAIL ADDRESS *
                  </label>
                  <input
                    type="email"
                    placeholder="doctor@example.com"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({...formData, email: e.target.value});
                      if (errors.email) setErrors({...errors, email: null});
                    }}
                    className={`w-full mt-2 px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none ${
                      errors.email ? 'border-red-500 focus:ring-red-500' : 'focus:ring-[#1f6f66]'
                    }`}
                    required
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-gray-600 tracking-wide">
                    PHONE NUMBER *
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 234 567 8900"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({...formData, phone: e.target.value});
                      if (errors.phone) setErrors({...errors, phone: null});
                    }}
                    className={`w-full mt-2 px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none ${
                      errors.phone ? 'border-red-500 focus:ring-red-500' : 'focus:ring-[#1f6f66]'
                    }`}
                    required
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-gray-600 tracking-wide">
                    LICENSE NUMBER *
                  </label>
                  <input
                    type="text"
                    placeholder="LIC-123456"
                    value={formData.licenseNumber}
                    onChange={(e) => {
                      setFormData({...formData, licenseNumber: e.target.value});
                      if (errors.licenseNumber) setErrors({...errors, licenseNumber: null});
                    }}
                    className={`w-full mt-2 px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none ${
                      errors.licenseNumber ? 'border-red-500 focus:ring-red-500' : 'focus:ring-[#1f6f66]'
                    }`}
                    required
                  />
                  {errors.licenseNumber && <p className="text-red-500 text-xs mt-1">{errors.licenseNumber}</p>}
                </div>
              </div>
            </div>

            {/* Professional Details Section */}
            <div className="bg-gray-50 p-5 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-[#1f6f66]">💼</span>
                Professional Details
              </h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 tracking-wide">
                    SPECIALIZATION *
                  </label>
                  <select
                    value={formData.specialization}
                    onChange={(e) => {
                      setFormData({...formData, specialization: e.target.value});
                      if (errors.specialization) setErrors({...errors, specialization: null});
                    }}
                    className={`w-full mt-2 px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none ${
                      errors.specialization ? 'border-red-500 focus:ring-red-500' : 'focus:ring-[#1f6f66]'
                    }`}
                    required
                  >
                    <option value="">Select Specialization</option>
                    <option value="Physiotherapy">Physiotherapy</option>
                    <option value="Ayurveda">Ayurveda</option>
                    <option value="Yoga Therapy">Yoga Therapy</option>
                    <option value="Naturopathy">Naturopathy</option>
                    <option value="Clinical Psychology">Clinical Psychology</option>
                    <option value="Nutrition & Dietetics">Nutrition & Dietetics</option>
                    <option value="Acupuncture">Acupuncture</option>
                    <option value="Herbalism">Herbalism</option>
                  </select>
                  {errors.specialization && <p className="text-red-500 text-xs mt-1">{errors.specialization}</p>}
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-gray-600 tracking-wide">
                    YEARS OF EXPERIENCE *
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 5"
                    value={formData.yearsOfExperience}
                    onChange={(e) => {
                      setFormData({...formData, yearsOfExperience: e.target.value});
                      if (errors.yearsOfExperience) setErrors({...errors, yearsOfExperience: null});
                    }}
                    className={`w-full mt-2 px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none ${
                      errors.yearsOfExperience ? 'border-red-500 focus:ring-red-500' : 'focus:ring-[#1f6f66]'
                    }`}
                    required
                  />
                  {errors.yearsOfExperience && <p className="text-red-500 text-xs mt-1">{errors.yearsOfExperience}</p>}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-600 tracking-wide">
                  QUALIFICATIONS & CREDENTIALS *
                </label>
                <textarea
                  placeholder="e.g., MBBS, MD (Physiotherapy), Certified Yoga Instructor"
                  value={formData.qualifications}
                  onChange={(e) => {
                    setFormData({...formData, qualifications: e.target.value});
                    if (errors.qualifications) setErrors({...errors, qualifications: null});
                  }}
                  className={`w-full mt-2 px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none ${
                    errors.qualifications ? 'border-red-500 focus:ring-red-500' : 'focus:ring-[#1f6f66]'
                  }`}
                  rows="2"
                  required
                />
                {errors.qualifications && <p className="text-red-500 text-xs mt-1">{errors.qualifications}</p>}
              </div>
              
              <div>
                <label className="text-xs font-semibold text-gray-600 tracking-wide">
                  PROFESSIONAL BIO *
                </label>
                <textarea
                  placeholder="Write a brief description about yourself, your expertise, and approach to treatment..."
                  value={formData.bio}
                  onChange={(e) => {
                    setFormData({...formData, bio: e.target.value});
                    if (errors.bio) setErrors({...errors, bio: null});
                  }}
                  className={`w-full mt-2 px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none ${
                    errors.bio ? 'border-red-500 focus:ring-red-500' : 'focus:ring-[#1f6f66]'
                  }`}
                  rows="4"
                  required
                />
                {errors.bio && <p className="text-red-500 text-xs mt-1">{errors.bio}</p>}
              </div>
            </div>

            {/* Practice Information Section */}
            <div className="bg-gray-50 p-5 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-[#1f6f66]">🏥</span>
                Practice Information
              </h3>
              
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-600 tracking-wide">
                  CLINIC/PRACTICE ADDRESS *
                </label>
                <textarea
                  placeholder="Enter your clinic address"
                  value={formData.clinicAddress}
                  onChange={(e) => {
                    setFormData({...formData, clinicAddress: e.target.value});
                    if (errors.clinicAddress) setErrors({...errors, clinicAddress: null});
                  }}
                  className={`w-full mt-2 px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none ${
                    errors.clinicAddress ? 'border-red-500 focus:ring-red-500' : 'focus:ring-[#1f6f66]'
                  }`}
                  rows="2"
                  required
                />
                {errors.clinicAddress && <p className="text-red-500 text-xs mt-1">{errors.clinicAddress}</p>}
              </div>
              
              <div>
                <label className="text-xs font-semibold text-gray-600 tracking-wide">
                  CONSULTATION FEE (USD) *
                </label>
                <input
                  type="number"
                  placeholder="e.g., 75"
                  value={formData.consultationFee}
                  onChange={(e) => {
                    setFormData({...formData, consultationFee: e.target.value});
                    if (errors.consultationFee) setErrors({...errors, consultationFee: null});
                  }}
                  className={`w-full mt-2 px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none ${
                    errors.consultationFee ? 'border-red-500 focus:ring-red-500' : 'focus:ring-[#1f6f66]'
                  }`}
                  required
                />
                {errors.consultationFee && <p className="text-red-500 text-xs mt-1">{errors.consultationFee}</p>}
              </div>
            </div>

            {/* Document Upload Section */}
            <div className="bg-gray-50 p-5 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-[#1f6f66]">📄</span>
                Upload Documents
              </h3>
              
              <div>
                <label className="text-xs font-semibold text-gray-600 tracking-wide mb-2 block">
                  CERTIFICATES & CREDENTIALS (PDF only) *
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Upload your MBBS certificate, license, and other professional credentials
                </p>
                
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PDF files only (Multiple files allowed)</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf"
                    multiple
                    onChange={handleFileUpload}
                  />
                </label>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold text-gray-600">Uploaded Files ({uploadedFiles.length})</p>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                            <span className="text-red-600 text-xs font-bold">PDF</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700 text-sm font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {errors.documents && <p className="text-red-500 text-xs mt-2">{errors.documents}</p>}
              </div>
            </div>

            {/* Verification Status */}
            {apiError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white text-xl flex-shrink-0">
                  ❌
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900">Submission Failed</p>
                  <p className="text-xs text-red-800 mt-1">{apiError}</p>
                </div>
              </div>
            )}

            {verificationStatus === 'pending' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white text-xl flex-shrink-0">
                  ⏳
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900">Verification Pending</p>
                  <p className="text-xs text-amber-800 mt-1">
                    Please complete all required fields and upload your documents, then click "Request Sent" to submit for verification.
                  </p>
                </div>
              </div>
            )}

            {verificationStatus === 'verified' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white text-xl flex-shrink-0">
                  ✅
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-900">Request Sent Successfully!</p>
                  <p className="text-xs text-green-800 mt-1">
                    Your verification request has been submitted. Our team will review your credentials and notify you once approved.
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              {verificationStatus === 'pending' ? (
                <button
                  type="button"
                  onClick={handleVerify}
                  className="flex-1 bg-[#1f6f66] text-white py-3 rounded-lg font-semibold hover:bg-[#155e57] transition duration-300 shadow-md"
                >
                  Request Sent
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleContinueToDashboard}
                  className="flex-1 bg-[#1f6f66] text-white py-3 rounded-lg font-semibold hover:bg-[#155e57] transition duration-300 shadow-md"
                >
                  Continue to Dashboard
                </button>
              )}
            </div>

          </form>

        </div>
      </div>
        </div>
      )}
    </>
  );
}