import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import { getAllRequests } from "../services/requestService";
import { getDocumentsForPractitioner } from "../services/documentService";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [practitioners, setPractitioners] = useState([]);
  const [selectedPractitioner, setSelectedPractitioner] = useState(null);
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  useEffect(() => {
    // Fetch practitioners from backend API
    const fetchPractitioners = async () => {
      try {
        setLoading(true);
        console.log("Fetching practitioners from /api/practitioners");
        const response = await axios.get("/api/practitioners", {
          headers: {
            "Content-Type": "application/json",
          },
        });
        console.log("Success! Response data:", response.data);
        // Map backend data to frontend format
        const mappedPractitioners = response.data.map((practitioner) => ({
          id: practitioner.id,
          fullName: practitioner.userName,
          email: practitioner.email,
          specialization: practitioner.specialization,
          qualifications: practitioner.qualifications || "Not provided",
          experience: practitioner.experience || "Not provided",
          status: practitioner.verified ? "approved" : "pending",
          submittedDate: practitioner.createdAt
            ? new Date(practitioner.createdAt).toLocaleDateString()
            : new Date().toLocaleDateString(),
          createdAt: practitioner.createdAt,
        }));
        setPractitioners(mappedPractitioners);
        setError(null);
      } catch (err) {
        console.error("Error fetching practitioners:", err);
        console.error("Error details:", {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data,
        });
        setError("Failed to load practitioners. Please try again.");
        setPractitioners([]);
      } finally {
        setLoading(false);
      }
    };

    // Fetch all requests for admin (latest first)
    const fetchRequests = async () => {
      try {
        setRequestsLoading(true);
        console.log("Fetching all requests from backend");
        const requestsData = await getAllRequests();
        console.log("Requests fetched:", requestsData);
        setRequests(requestsData || []);
      } catch (err) {
        console.error("Error fetching requests:", err);
        setRequests([]);
      } finally {
        setRequestsLoading(false);
      }
    };

    fetchPractitioners();
    fetchRequests();
  }, []);

  // Fetch documents when a practitioner is selected
  useEffect(() => {
    if (selectedPractitioner) {
      const fetchDocuments = async () => {
        try {
          setDocumentsLoading(true);
          const docs = await getDocumentsForPractitioner(selectedPractitioner.id);
          setDocuments(docs || []);
        } catch (err) {
          console.error("Error fetching documents:", err);
          setDocuments([]);
        } finally {
          setDocumentsLoading(false);
        }
      };

      fetchDocuments();
    } else {
      setDocuments([]);
    }
  }, [selectedPractitioner]);

  const filteredPractitioners = practitioners.filter(
    (p) =>
      p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleApprove = async (id) => {
    try {
      const token = localStorage.getItem("accessToken");
      await axios.put(
        `/api/practitioners/${id}/verify`,
        {},
        { 
          params: { verified: true },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      // Update local state
      setPractitioners((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "approved" } : p))
      );
      setSelectedPractitioner(null);
    } catch (err) {
      console.error("Error approving practitioner:", err);
      alert("Failed to approve practitioner");
    }
  };

  const handleReject = async (id) => {
    try {
      const token = localStorage.getItem("accessToken");
      await axios.put(
        `/api/practitioners/${id}/verify`,
        {},
        { 
          params: { verified: false },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      // Update local state
      setPractitioners((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "pending" } : p))
      );
      setSelectedPractitioner(null);
    } catch (err) {
      console.error("Error rejecting practitioner:", err);
      alert("Failed to reject practitioner");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminLoggedIn");
    navigate("/login");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "approved":
        return "✅";
      case "rejected":
        return "❌";
      default:
        return "⏳";
    }
  };

  const getRequestStatusColor = (status) => {
    switch (status) {
      case "ACCEPTED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      case "COMPLETED":
        return "bg-blue-100 text-blue-800";
      case "CANCELLED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getRequestStatusIcon = (status) => {
    switch (status) {
      case "ACCEPTED":
        return "✅";
      case "REJECTED":
        return "❌";
      case "COMPLETED":
        return "🎉";
      case "CANCELLED":
        return "❌";
      default:
        return "⏳";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-100 text-red-800";
      case "URGENT":
        return "bg-red-200 text-red-900 font-bold";
      case "NORMAL":
        return "bg-blue-100 text-blue-800";
      case "LOW":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#1f6f66]">Admin Dashboard</h1>
            <p className="text-gray-600 text-sm mt-1">Review & Manage Practitioner Profiles</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-semibold">Total Practitioners</p>
            <p className="text-3xl font-bold text-[#1f6f66] mt-2">{practitioners.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-semibold">Pending Review</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">
              {practitioners.filter((p) => p.status === "pending").length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-semibold">Approved</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {practitioners.filter((p) => p.status === "approved").length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-semibold">Total Requests</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">{requests.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-semibold">Pending Requests</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">
              {requests.filter((r) => r.status === "PENDING").length}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Practitioners List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Practitioners</h2>
                <input
                  type="text"
                  placeholder="Search by name, email, or specialty..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1f6f66] focus:outline-none"
                />
              </div>

              <div className="max-h-screen overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center text-gray-500">
                    <p>Loading practitioners...</p>
                  </div>
                ) : error ? (
                  <div className="p-6 text-center text-red-500">
                    <p>{error}</p>
                  </div>
                ) : filteredPractitioners.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No practitioners found
                  </div>
                ) : (
                  filteredPractitioners.map((practitioner) => (
                    <div
                      key={practitioner.id}
                      onClick={() => setSelectedPractitioner(practitioner)}
                      className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition ${
                        selectedPractitioner?.id === practitioner.id
                          ? "bg-blue-50 border-l-4 border-l-[#1f6f66]"
                          : ""
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {practitioner.fullName}
                          </p>
                          <p className="text-sm text-gray-600">{practitioner.email}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {practitioner.specialization}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                            practitioner.status
                          )}`}
                        >
                          {getStatusIcon(practitioner.status)} {practitioner.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Practitioner Details */}
          <div className="lg:col-span-2">
            {selectedPractitioner ? (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-gradient-to-r from-[#1f6f66] to-[#155e57] px-6 py-6 text-white">
                  <h2 className="text-2xl font-bold">{selectedPractitioner.fullName}</h2>
                  <p className="text-teal-100 mt-1">{selectedPractitioner.specialization}</p>
                </div>

                <div className="p-6 space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Personal Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 tracking-wide">EMAIL</p>
                        <p className="text-gray-900 font-medium">{selectedPractitioner.email}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 tracking-wide">
                          SUBMITTED DATE
                        </p>
                        <p className="text-gray-900 font-medium">
                          {selectedPractitioner.submittedDate}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Professional Details */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Professional Details</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 tracking-wide">
                          SPECIALIZATION
                        </p>
                        <p className="text-gray-900 font-medium">
                          {selectedPractitioner.specialization}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 tracking-wide">
                          EXPERIENCE
                        </p>
                        <p className="text-gray-900 font-medium">
                          {selectedPractitioner.experience}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 tracking-wide">
                          QUALIFICATIONS
                        </p>
                        <p className="text-gray-900">{selectedPractitioner.qualifications}</p>
                      </div>
                    </div>
                  </div>

                  {/* Uploaded Documents */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">📄 Uploaded Documents</h3>
                    {documentsLoading ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">Loading documents...</p>
                      </div>
                    ) : documents.length === 0 ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">No documents uploaded yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 bg-red-100 rounded flex items-center justify-center flex-shrink-0">
                                <span className="text-red-600 text-xs font-bold">PDF</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {doc.fileName}
                                </p>
                                <div className="flex gap-4 text-xs text-gray-500 mt-1">
                                  <span>{(doc.fileSize / 1024).toFixed(2)} KB</span>
                                  <span>
                                    {new Date(doc.uploadedAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button
                              className="ml-4 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition"
                              onClick={async () => {
                                try {
                                  const token = localStorage.getItem("accessToken");
                                  if (!token) {
                                    alert("You must be logged in to view documents.");
                                    return;
                                  }

                                  const response = await axios.get(
                                    `/api/practitioners/documents/${doc.id}/download`,
                                    {
                                      headers: {
                                        Authorization: `Bearer ${token}`,
                                      },
                                      responseType: "blob",
                                    }
                                  );

                                  const contentType =
                                    response.headers["content-type"] || "application/pdf";

                                  const blob = new Blob([response.data], { type: contentType });
                                  const fileURL = window.URL.createObjectURL(blob);

                                  const link = document.createElement("a");
                                  link.href = fileURL;
                                  link.download = doc.fileName;
                                  link.target = "_blank";
                                  document.body.appendChild(link);
                                  link.click();
                                  link.remove();

                                  window.URL.revokeObjectURL(fileURL);
                                } catch (err) {
                                  console.error("Error downloading document:", err);
                                  alert("Failed to open document. Please try again.");
                                }
                              }}
                            >
                              View
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {selectedPractitioner.status === "pending" && (
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleApprove(selectedPractitioner.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition"
                      >
                        ✅ Approve Practitioner
                      </button>
                      <button
                        onClick={() => handleReject(selectedPractitioner.id)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition"
                      >
                        ❌ Reject Application
                      </button>
                    </div>
                  )}

                  {selectedPractitioner.status === "approved" && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                      <span className="text-2xl">✅</span>
                      <div>
                        <p className="text-sm font-semibold text-green-900">Approved</p>
                        <p className="text-xs text-green-800 mt-1">
                          This practitioner has been approved and can accept patients.
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedPractitioner.status === "rejected" && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                      <span className="text-2xl">❌</span>
                      <div>
                        <p className="text-sm font-semibold text-red-900">Rejected</p>
                        <p className="text-xs text-red-800 mt-1">
                          This application has been rejected.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 flex items-center justify-center h-96">
                <div className="text-center">
                  <p className="text-gray-500 text-lg">Select a practitioner to review</p>
                  <p className="text-gray-400 text-sm mt-2">Click on any practitioner from the list to view their details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Requests Section */}
      <div className="max-w-7xl mx-auto px-6 py-8 border-t border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Patient Requests to Practitioners</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Requests List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-800">All Requests</h3>
                <p className="text-sm text-gray-600 mt-1">Latest requests appear first</p>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {requestsLoading ? (
                  <div className="p-6 text-center text-gray-500">
                    <p>Loading requests...</p>
                  </div>
                ) : requests.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <p>No requests found</p>
                  </div>
                ) : (
                  requests.map((request) => (
                    <div
                      key={request.id}
                      onClick={() => setSelectedRequest(request)}
                      className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition ${
                        selectedRequest?.id === request.id
                          ? "bg-blue-50 border-l-4 border-l-[#1f6f66]"
                          : ""
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {request.userName}
                          </p>
                          <p className="text-xs text-gray-600 truncate">
                            To: {request.practitionerName}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1 text-right">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${getRequestStatusColor(
                              request.status
                            )}`}
                          >
                            {getRequestStatusIcon(request.status)} {request.status}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${getPriorityColor(
                              request.priority
                            )}`}
                          >
                            {request.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Request Details */}
          <div className="lg:col-span-2">
            {selectedRequest ? (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-6 text-white">
                  <h3 className="text-2xl font-bold">Request Details</h3>
                  <p className="text-purple-100 mt-1">ID: #{selectedRequest.id}</p>
                </div>

                <div className="p-6 space-y-6">
                  {/* Patient Information */}
                  <div>
                    <h4 className="text-lg font-bold text-gray-800 mb-4">Patient Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 tracking-wide">NAME</p>
                        <p className="text-gray-900 font-medium">{selectedRequest.userName}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 tracking-wide">EMAIL</p>
                        <p className="text-gray-900 font-medium">{selectedRequest.userEmail}</p>
                      </div>
                    </div>
                  </div>

                  {/* Practitioner Information */}
                  <div>
                    <h4 className="text-lg font-bold text-gray-800 mb-4">Practitioner Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 tracking-wide">NAME</p>
                        <p className="text-gray-900 font-medium">{selectedRequest.practitionerName}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 tracking-wide">EMAIL</p>
                        <p className="text-gray-900 font-medium">{selectedRequest.practitionerEmail}</p>
                      </div>
                    </div>
                  </div>

                  {/* Request Details */}
                  <div>
                    <h4 className="text-lg font-bold text-gray-800 mb-4">Request Details</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 tracking-wide">STATUS</p>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mt-1 ${getRequestStatusColor(
                            selectedRequest.status
                          )}`}
                        >
                          {getRequestStatusIcon(selectedRequest.status)} {selectedRequest.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 tracking-wide">PRIORITY</p>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mt-1 ${getPriorityColor(
                            selectedRequest.priority
                          )}`}
                        >
                          {selectedRequest.priority}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 tracking-wide">REQUESTED DATE</p>
                        <p className="text-gray-900 font-medium">
                          {new Date(selectedRequest.requestedDate).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 tracking-wide">CREATED DATE</p>
                        <p className="text-gray-900 font-medium">
                          {new Date(selectedRequest.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedRequest.description && (
                    <div>
                      <h4 className="text-lg font-bold text-gray-800 mb-4">Description</h4>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <p className="text-gray-700">{selectedRequest.description}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 flex items-center justify-center h-96">
                <div className="text-center">
                  <p className="text-gray-500 text-lg">Select a request to view details</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Click on any request from the list to view complete information
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
