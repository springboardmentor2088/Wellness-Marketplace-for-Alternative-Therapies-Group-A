const API_BASE = "/api";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
});

export const analyzeMedicalInput = async (text, file = null) => {
  try {
    let base64Image = null;
    let mimeType = null;

    if (file) {
      mimeType = file.type;
      base64Image = await convertToBase64(file);
      // Remove the data:image/xxx;base64, prefix for the backend
      base64Image = base64Image.split(',')[1];
    }

    const res = await fetch(`${API_BASE}/medical-intelligence/analyze`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        text,
        image: base64Image,
        mimeType
      }),
    });

    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
  } catch (error) {
    console.error("Medical analysis failed:", error);
    throw error;
  }
};

const convertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

export const analyzeForTriage = async (symptomsText) => {
  try {
    const query = encodeURIComponent(symptomsText);
    const res = await fetch(`${API_BASE}/medical-intelligence/triage?symptoms=${query}`, {
      method: "GET",
      headers: authHeaders(),
    });

    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
  } catch (error) {
    console.error("Medical triage failed:", error);
    throw error;
  }
};
