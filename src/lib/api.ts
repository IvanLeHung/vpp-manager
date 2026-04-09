import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://vpp-backend-7oh1.onrender.com/api',
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('vpp_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
