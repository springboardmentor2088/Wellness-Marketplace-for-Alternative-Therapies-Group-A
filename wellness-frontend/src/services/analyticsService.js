import axios from "axios";

const API = "/api/admin/analytics";

export const getAnalyticsDashboard = async () => {
    const token = localStorage.getItem("accessToken");
    const res = await axios.get(API, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
};
