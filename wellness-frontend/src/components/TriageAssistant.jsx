import { useState } from "react";
import { analyzeForTriage } from "../services/medicalIntelligenceService";
import toast from "react-hot-toast";

export default function TriageAssistant({ isOpen, setIsOpen, onSelectPractitioner }) {
  const [loading, setLoading] = useState(false);
  const [symptoms, setSymptoms] = useState("");
  const [result, setResult] = useState(null);

  const handleAnalyze = async () => {
    if (!symptoms.trim()) {
      toast.error("Please provide symptoms to get a recommendation.");
      return;
    }

    try {
      setLoading(true);
      setResult(null);
      const data = await analyzeForTriage(symptoms);
      
      // LOGGING: Final normalized specialty and number of doctors fetched
      console.info("Triage Analysis Result:", {
        specialty: data?.suggestedSpecialty || "General Medicine",
        doctorsCount: data?.recommendedPractitioners?.length || 0,
        source: data?.source || "Unknown"
      });

      setResult(data);
    } catch (error) {
      console.error("Triage Error:", error);
      toast.error("Triage analysis failed. Ensuring healthcare continuity via fallback...");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSymptoms("");
    setResult(null);
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          {/* Modal Container */}
          <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row relative z-[10000] my-auto border border-slate-200">
            
            {/* Left: Input Panel */}
            <div className="md:w-1/2 p-8 border-r border-slate-100 flex flex-col bg-white">
              <div className="flex justify-between items-center mb-8">
                <div className="flex flex-col">
                  <h2 className="text-2xl font-black text-[#1f6f66] italic tracking-tight">Ask Your Friend</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Medicine & Practitioner Recommendations</p>
                </div>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="text-slate-300 hover:text-slate-900 font-light text-4xl leading-none transition-colors"
                >
                  &times;
                </button>
              </div>

              <div className="flex-1 space-y-6">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Ask for medicine or practitioner recommendation</label>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g., 'What medicine is good for abdominal pain?' or 'I need a cardiologist'..."
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-[#1f6f66]/20 focus:border-[#1f6f66] focus:outline-none min-h-[180px] resize-none transition-all placeholder:text-slate-300"
                />
              </div>

              <div className="pt-8 mt-auto">
                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${loading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-[#1f6f66] text-white hover:bg-[#155e57] shadow-[#1f6f66]/20'}`}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <span>Get Recommendation</span>
                  )}
                </button>
                <button 
                  onClick={resetForm}
                  className="w-full mt-6 text-center text-[10px] text-slate-300 hover:text-[#1f6f66] font-black uppercase tracking-[0.2em] transition-colors"
                >
                  Clear Results
                </button>
              </div>
            </div>

            {/* Right: Results Panel */}
            <div className="md:w-1/2 bg-slate-50 p-8 overflow-y-auto max-h-[85vh] md:max-h-none border-t md:border-t-0 md:border-l border-slate-100">
              {!loading && !result && (
                <div className="h-64 md:h-full flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center text-4xl mb-6 border border-slate-100 animate-pulse">🩺</div>
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Medical Routing Offline</h3>
                  <p className="text-[10px] text-slate-300 mt-2 px-8">Input symptoms to initialize the clinical recommendation engine.</p>
                </div>
              )}

              {loading && (
                <div className="h-64 md:h-full flex flex-col items-center justify-center text-center">
                  <div className="relative mb-8">
                    <div className="w-24 h-24 border-[6px] border-slate-100 border-t-[#1f6f66] rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-3xl">🧩</div>
                  </div>
                  <h3 className="text-sm font-black text-[#1f6f66] uppercase tracking-widest mb-1">Clinical Processing</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black opacity-50">Mapping specialties...</p>
                </div>
              )}

              {result && (() => {
                const specialty = result?.suggestedSpecialty || "General Medicine";
                const practitioners = result?.recommendedPractitioners || [];
                const message = result?.message || "AI analysis complete. Connecting to relevant clinical departments.";
                const isEmergency = result?.triageLevel === 'HIGH' || result?.triageLevel === 'EMERGENCY';
                const isRejected = result?.triageLevel === 'REJECTED';

                if (isRejected) {
                  return (
                    <div className="h-64 md:h-full flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-500">
                      <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-4xl mb-6 border-4 border-red-100 shadow-lg shadow-red-100/50">
                        🛑
                      </div>
                      <h3 className="text-xl font-black text-red-600 uppercase tracking-tighter mb-2">Access Denied</h3>
                      <p className="text-sm text-red-900/60 font-medium px-8 leading-relaxed">
                        {result.triage?.advice || message}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    
                    {/* Emergency Advice */}
                    {isEmergency && (
                      <div className="bg-red-600 text-white p-6 rounded-[2rem] shadow-2xl shadow-red-200">
                        <div className="flex items-center gap-4 mb-3">
                          <span className="text-3xl animate-pulse">🚨</span>
                          <h4 className="text-xl font-black italic uppercase tracking-tighter">Emergency Alert</h4>
                        </div>
                        <p className="font-bold text-[10px] opacity-90 leading-relaxed mb-5 uppercase tracking-wide">Critical condition suspected. bypass digital triage and seek immediate care.</p>
                        <button 
                           onClick={() => setIsOpen(false)}
                           className="w-full py-4 bg-white text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-[1.02] transition-transform"
                        >
                          Find Nearest ER
                        </button>
                      </div>
                    )}

                    {/* AI Recommendation Box */}
                    <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm group hover:shadow-xl hover:shadow-slate-100 transition-all">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="bg-[#1f6f66] text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em]">Clinical Routing</span>
                      </div>
                      <p className="text-sm text-slate-800 font-semibold leading-relaxed">
                        "{message}"
                      </p>
                    </div>

                    {/* Pre-Appointment Care / While You Wait */}
                    {(result?.triage?.medicines?.length > 0 || result?.triage?.home_remedies?.length > 0) && (
                      <div className="bg-amber-50/50 border border-amber-100 p-6 rounded-[2rem] shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center gap-3 mb-5">
                          <span className="text-2xl">☕</span>
                          <h4 className="text-sm font-black text-amber-900 uppercase tracking-[0.1em]">While you wait...</h4>
                        </div>
                        
                        <div className="space-y-5">
                          {result?.triage?.medicines?.length > 0 && (
                            <div>
                              <h5 className="text-xs font-black text-amber-800 uppercase tracking-widest mb-3">Safe OTC Relief</h5>
                              <ul className="space-y-4">
                                {result.triage.medicines.map((med, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs">
                                    <span className="mt-0.5 text-amber-500 text-[10px]">💊</span>
                                    <div>
                                      <span className="font-bold text-amber-900 text-sm block leading-tight mb-1">{med.name}</span> 
                                      <span className="text-amber-800 font-medium text-xs leading-relaxed block">{med.usage}</span>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {result?.triage?.home_remedies?.length > 0 && (
                            <div>
                              <h5 className="text-[10px] font-black text-amber-700/60 uppercase tracking-widest mb-3">Home Remedies</h5>
                              <ul className="space-y-2">
                                {result.triage.home_remedies.map((remedy, i) => (
                                  <li key={i} className="text-sm text-amber-900 font-medium flex items-center gap-2">
                                    <span className="w-1 h-1 rounded-full bg-amber-400"></span>
                                    {remedy}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Practitioner List */}
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                        <span className="h-px bg-slate-200 flex-1"></span>
                        Top Specialists
                        <span className="h-px bg-slate-200 flex-1"></span>
                      </h4>
                      
                      <div className="space-y-4">
                        {practitioners.length > 0 ? (
                          practitioners.map((doctor, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between hover:border-[#1f6f66] hover:shadow-lg hover:shadow-slate-100 transition-all cursor-default group">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-2xl group-hover:bg-teal-50 transition-colors">👨‍⚕️</div>
                                <div className="truncate max-w-[120px]">
                                  <h5 className="text-sm font-black text-slate-900 leading-none mb-2 truncate">{doctor.userName}</h5>
                                  <div className="flex items-center gap-2">
                                    <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[8px] font-black uppercase">{doctor.rating} ★</span>
                                    <span className="text-[9px] text-slate-400 font-bold truncate">{doctor.specialization}</span>
                                  </div>
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  setIsOpen(false);
                                  if(onSelectPractitioner) onSelectPractitioner(doctor);
                                }}
                                className="bg-[#1f6f66] text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#1f6f66]/10 hover:bg-[#155e57] transition-all transform active:scale-95"
                              >
                                Book
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-10 px-4 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                              No {specialty} pool available<br/>
                              <span className="text-[10px] opacity-80 mt-2 inline-block">Connecting to General Medicine...</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
