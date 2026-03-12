import axios from "axios";
import { getAccessToken } from "./authService";

axios.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export const fetchNotifications = async (page = 0, size = 10) => {
    const response = await axios.get(`/api/notifications?page=${page}&size=${size}`);
    return response.data;
};

export const fetchUnreadCount = async () => {
    const response = await axios.get("/api/notifications/unread-count");
    return response.data.unreadCount;
};

export const markAsRead = async (id) => {
    const response = await axios.put(`/api/notifications/${id}/read`);
    return response.data;
};
