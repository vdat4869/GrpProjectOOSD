import axios from 'axios';

// Base URL ưu tiên từ biến môi trường Vite, fallback localhost:8000 (gateway)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
	baseURL: API_BASE_URL,
});

// Thêm Authorization header tự động nếu có token
apiClient.interceptors.request.use((config) => {
	const token = localStorage.getItem('accessToken');
	if (token) {
		config.headers = config.headers || {};
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

export default apiClient;
