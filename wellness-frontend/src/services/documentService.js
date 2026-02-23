import axios from "axios";

const API_BASE_URL = "/api/practitioners";

export const uploadDocuments = async (practitionerId, files) => {
  const formData = new FormData();
  
  files.forEach((file) => {
    formData.append("files", file);
  });

  try {
    const response = await axios.post(
      `${API_BASE_URL}/${practitionerId}/documents/upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error uploading documents:", error);
    throw error;
  }
};

export const getDocumentsForPractitioner = async (practitionerId) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/${practitionerId}/documents`,
      {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching documents:", error);
    throw error;
  }
};

export const getMyDocuments = async () => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/me/documents`,
      {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching my documents:", error);
    throw error;
  }
};

export const deleteDocument = async (documentId) => {
  try {
    await axios.delete(
      `${API_BASE_URL}/documents/${documentId}`,
      {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
        }
      }
    );
  } catch (error) {
    console.error("Error deleting document:", error);
    throw error;
  }
};
