import { useState, useRef } from "react";
import { analyzeMedicalInput } from "../services/medicalIntelligenceService";
import toast from "react-hot-toast";

export default function AskYourFriend({ isOpen, setIsOpen }) {
  const [loading, setLoading] = useState(false);
  const [symptoms, setSymptoms] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const compressImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }));
          }, "image/jpeg", 0.7);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        toast.error("Please upload an image for prescription OCR.");
        return;
      }
      
      try {
        setLoading(true);
        const compressed = await compressImage(selectedFile);
        setFile(compressed);
        setPreview(URL.createObjectURL(compressed));
        toast.success("Image optimized for AI clinical logic.");
      } catch (err) {
        toast.error("Failed to process image.");
        setFile(selectedFile); // Fallback to original
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!symptoms.trim() && !file) {
      toast.error("Please provide symptoms or a prescription image.");
      return;
    }

    try {
      setLoading(true);
      setResult(null);
      const data = await analyzeMedicalInput(symptoms, file);
      setResult(data);
    } catch (error) {
      toast.error("Medical analysis failed. Ensure your Gemini API key is configured.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSymptoms("");
    setFile(null);
    setPreview(null);
    setResult(null);
  };

  return (
    <>
      {/* Main Analysis Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row max-h-[90vh] border border-slate-200">
            
            {/* Left: Input Panel */}
            <div className="md:w-[40%] p-8 border-r border-slate-100 flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <div className="flex flex-col">
                  <h2 className="text-2xl font-black text-[#1f6f66] italic tracking-tight">Ask Your Friend</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Medical Logic Engine</p>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-slate-300 hover:text-slate-900 transition-colors font-light text-4xl leading-none">&times;</button>
              </div>

              <div className="space-y-6 flex-1">
                <div className="relative group">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                  />
                  <div 
                    onClick={() => fileInputRef.current.click()}
                    className={`mt-2 border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${preview ? 'border-[#1f6f66] bg-teal-50' : 'border-slate-200 hover:border-[#1f6f66] bg-slate-50/50'}`}
                  >
                    {preview ? (
                      <div className="text-center">
                        <img src={preview} alt="Prescription Preview" className="h-32 w-auto mx-auto rounded-xl shadow-md mb-4 border-2 border-white" />
                        <p className="text-[10px] text-[#1f6f66] font-black uppercase tracking-tighter">OCR Ready</p>
                      </div>
                    ) : (
                      <>
                        <span className="text-5xl mb-4 opacity-80">📄</span>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-center">Upload Prescription Image</p>
                        <p className="text-[10px] text-slate-400 mt-2 text-center opacity-70">JPG, PNG up to 10MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-8 mt-auto">
                <button
                  onClick={handleAnalyze}
                  disabled={loading || !file}
                  className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all ${loading || !file ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-[#1f6f66] text-white hover:bg-[#155e57] hover:shadow-[#1f6f66]/20 active:scale-[0.98]'}`}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Scanning...</span>
                    </>
                  ) : (
                    <span>Scan Prescription</span>
                  )}
                </button>
                <div 
                  onClick={resetForm}
                  className="mt-6 text-center text-[10px] font-black text-slate-300 hover:text-red-400 uppercase tracking-widest cursor-pointer transition-colors"
                >
                  Clear Image
                </div>
              </div>
            </div>

            {/* Right: Results Panel */}
            <div className="md:w-[60%] bg-slate-50 p-8 overflow-y-auto custom-scrollbar">
              {!loading && !result && (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center text-4xl mb-6 border border-slate-100 animate-pulse">📝</div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-2">Awaiting Prescription</h3>
                  <p className="text-xs text-slate-400 leading-relaxed px-6">Upload your doctor's written prescription and we will extract the exact medicines and dosages for you.</p>
                </div>
              )}

              {loading && (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="relative mb-8">
                    <div className="w-24 h-24 border-[6px] border-slate-100 border-t-[#1f6f66] rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-3xl">🧩</div>
                  </div>
                  <h3 className="text-sm font-black text-[#1f6f66] uppercase tracking-widest mb-2">Processing Logic</h3>
                  <p className="text-xs text-slate-400 px-8">Extracting active ingredients and cross-referencing diagnostic data...</p>
                </div>
              )}

              {result && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-4">
                  
                  {/* ERROR STATE */}
                  {result.status === 'ERROR' && (
                    <div className="bg-white border-2 border-red-50 p-8 rounded-3xl text-center shadow-sm">
                      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">⚠️</div>
                      <h4 className="text-lg font-black text-red-900 mb-2">Analysis Failed</h4>
                      <p className="text-xs text-red-600 font-medium mb-6 leading-relaxed">
                        {result.message || "AI analysis service is currently unavailable."}
                      </p>
                      <button 
                        onClick={() => setResult(null)}
                        className="px-8 py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                      >
                        Try Again
                      </button>
                    </div>
                  )}

                  {/* PARTIAL SUCCESS / FALLBACK STATE */}
                  {result.status === 'PARTIAL_SUCCESS' && (
                    <div className="bg-amber-50 border-2 border-amber-100 p-8 rounded-3xl text-center shadow-sm">
                      <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">📡</div>
                      <h4 className="text-lg font-black text-amber-900 mb-2">Analysis Alert</h4>
                      <p className="text-xs text-amber-700 font-medium mb-6 leading-relaxed">
                        {result.message || "We couldn't analyze the prescription due to connectivity issues or safety filters."}
                      </p>
                      <button 
                        onClick={() => setResult(null)}
                        className="px-8 py-3 bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-700 transition-colors shadow-lg shadow-amber-200"
                      >
                        Try Again
                      </button>
                    </div>
                  )}

                  {/* Extracted Medicines Card */}
                  {result.status !== 'ERROR' && result?.analysis?.extracted_medicines && result.analysis.extracted_medicines.length > 0 && (
                    <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-slate-100 group hover:shadow-xl hover:shadow-slate-100 transition-all">
                      <div className="flex items-center gap-2 mb-6">
                        <span className="bg-[#1f6f66] text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em]">Prescription Extraction</span>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {result.analysis.extracted_medicines.map((med, idx) => (
                          <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                            <h3 className="text-xl font-black text-[#1f6f66] mb-1 tracking-tighter uppercase truncate" title={med.name}>{med.name}</h3>
                            <p className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-4 inline-block bg-slate-100 px-2.5 py-1 rounded-md">{med.dose}</p>
                            
                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100/50">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#1f6f66]"></span>
                                Instructions
                              </p>
                              <p className="text-xs text-slate-800 font-semibold leading-relaxed ml-3">{med.instructions}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {result.analysis.advice && (
                        <div className="mt-6 bg-teal-50/50 p-5 rounded-[1.5rem] border border-teal-100/50">
                          <p className="text-[10px] font-black text-teal-800/60 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="text-teal-600">💡</span> Pharmacist Insight
                          </p>
                          <p className="text-xs text-teal-900 font-medium leading-relaxed">{result.analysis.advice}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-[10px] text-amber-700/80 text-center font-black uppercase tracking-[0.2em] bg-amber-50/50 py-5 rounded-2xl border border-amber-100 px-6 leading-loose shadow-sm mt-4">
                    ⚠️ System Advisory: Always follow your doctor's exact instructions and directions.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
