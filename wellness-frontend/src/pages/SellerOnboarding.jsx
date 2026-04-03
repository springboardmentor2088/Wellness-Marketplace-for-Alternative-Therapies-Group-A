import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

export default function SellerOnboarding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState("idle"); // 'idle', 'submitting', 'success'
  
  const [formData, setFormData] = useState({
    organizationName: "",
    drugLicenseNumber: "",
    pharmacistName: "",
    pharmacistRegNum: "",
    gstTaxId: "",
    iecCode: ""
  });

  const [files, setFiles] = useState({
    gmp: null,
    copp: null,
    smf: null
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Check if user is already a seller or has a pending application
    const checkStatus = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          navigate("/login");
          return;
        }
        // Simplified for now, just show the form
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    };
    checkStatus();
  }, [navigate]);

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setFiles({ ...files, [field]: file });
      if (errors[field]) setErrors({ ...errors, [field]: null });
    } else {
      toast.error("Please upload a valid PDF document.");
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.organizationName) newErrors.organizationName = "Required";
    if (!formData.drugLicenseNumber) newErrors.drugLicenseNumber = "Required";
    if (!files.gmp) newErrors.gmp = "GMP Certification is mandatory";
    if (!files.smf) newErrors.smf = "Site Master File is mandatory";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fill all required fields and upload mandatory documents.");
      return;
    }

    setIsSubmitting(true);
    const data = new FormData();
    data.append("data", new Blob([JSON.stringify(formData)], { type: "application/json" }));
    if (files.gmp) data.append("gmp", files.gmp);
    if (files.copp) data.append("copp", files.copp);
    if (files.smf) data.append("smf", files.smf);

    try {
      await axios.post("/api/sellers/onboarding", data, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`
        }
      });
      setStatus("success");
      toast.success("Application submitted successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Received!</h2>
          <p className="text-slate-600 mb-8">
            Your pharmaceutical organization profile has been sent to our compliance team for verification. 
            We will review your Drug License and GMP certifications.
          </p>
          <button 
            onClick={() => navigate("/user/dashboard")}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Seller Organization Onboarding
          </h1>
          <p className="text-lg text-slate-600">
            Provide your pharmaceutical certifications to list products on the Wellness Marketplace.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 bg-white shadow-2xl rounded-3xl p-8 md:p-12 border border-slate-200">
          
          {/* Section 1: Identity */}
          <section>
            <h3 className="text-xl font-bold text-indigo-900 mb-6 flex items-center gap-2">
              <span className="p-2 bg-indigo-100 rounded-lg text-indigo-600 text-sm">01</span>
              Legal Identity & Licensing
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Organization Name *</label>
                <input 
                  type="text"
                  placeholder="e.g. Wellness Pharma Pvt Ltd"
                  className={`w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition ${errors.organizationName ? 'border-red-500' : ''}`}
                  value={formData.organizationName}
                  onChange={e => setFormData({...formData, organizationName: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Drug License Number (Primary Key) *</label>
                <input 
                  type="text"
                  placeholder="e.g. DL No. 25-123456"
                  className={`w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition ${errors.drugLicenseNumber ? 'border-red-500' : ''}`}
                  value={formData.drugLicenseNumber}
                  onChange={e => setFormData({...formData, drugLicenseNumber: e.target.value})}
                />
              </div>
            </div>
          </section>

          {/* Section 2: Quality Certifications */}
          <section>
            <h3 className="text-xl font-bold text-indigo-900 mb-6 flex items-center gap-2">
              <span className="p-2 bg-indigo-100 rounded-lg text-indigo-600 text-sm">02</span>
              Quality Compliance Documents (PDF)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase">GMP/WHO-GMP Certification *</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    onChange={e => handleFileChange(e, "gmp")}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                  />
                  <div className={`p-4 border-2 border-dashed rounded-xl text-center transition ${files.gmp ? 'border-green-400 bg-green-50' : 'border-slate-300 bg-slate-50 group-hover:border-indigo-400'}`}>
                    <span className="text-2xl mb-1 block">📄</span>
                    <p className="text-xs font-medium text-slate-600 truncate">
                      {files.gmp ? files.gmp.name : "Upload GMP"}
                    </p>
                  </div>
                </div>
                {errors.gmp && <p className="text-red-500 text-[10px] uppercase font-bold">{errors.gmp}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase">COPP (Export License)</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    onChange={e => handleFileChange(e, "copp")}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                  />
                  <div className={`p-4 border-2 border-dashed rounded-xl text-center transition ${files.copp ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 bg-slate-50 group-hover:border-indigo-400'}`}>
                    <span className="text-2xl mb-1 block">📜</span>
                    <p className="text-xs font-medium text-slate-600 truncate">
                      {files.copp ? files.copp.name : "Upload COPP"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase">Site Master File (SMF) *</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    onChange={e => handleFileChange(e, "smf")}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                  />
                  <div className={`p-4 border-2 border-dashed rounded-xl text-center transition ${files.smf ? 'border-green-400 bg-green-50' : 'border-slate-300 bg-slate-50 group-hover:border-indigo-400'}`}>
                    <span className="text-2xl mb-1 block">🏗️</span>
                    <p className="text-xs font-medium text-slate-600 truncate">
                      {files.smf ? files.smf.name : "Upload SMF"}
                    </p>
                  </div>
                </div>
                {errors.smf && <p className="text-red-500 text-[10px] uppercase font-bold">{errors.smf}</p>}
              </div>
            </div>
          </section>

          {/* Section 3: Technical Staff */}
          <section>
            <h3 className="text-xl font-bold text-indigo-900 mb-6 flex items-center gap-2">
              <span className="p-2 bg-indigo-100 rounded-lg text-indigo-600 text-sm">03</span>
              Expert Oversight & Tax
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Pharmacist Name</label>
                <input 
                  type="text"
                  placeholder="Senior Pharmacist Name"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.pharmacistName}
                  onChange={e => setFormData({...formData, pharmacistName: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Pharmacist Registration #</label>
                <input 
                  type="text"
                  placeholder="Registration Number"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.pharmacistRegNum}
                  onChange={e => setFormData({...formData, pharmacistRegNum: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">GST/Tax ID</label>
                <input 
                  type="text"
                  placeholder="GSTIN"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.gstTaxId}
                  onChange={e => setFormData({...formData, gstTaxId: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">IEC Code (Import/Export)</label>
                <input 
                  type="text"
                  placeholder="Importer Exporter Code"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.iecCode}
                  onChange={e => setFormData({...formData, iecCode: e.target.value})}
                />
              </div>
            </div>
          </section>

          <div className="pt-8">
            <button 
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-indigo-700 hover:shadow-indigo-200 transition transform active:scale-[0.98] ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? "Submitting Application..." : "Apply as Product Seller"}
            </button>
            <p className="text-center text-xs text-slate-400 mt-4">
              By clicking apply, you authorize Wellness platform to verify your pharmaceutical credentials with national regulators.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
