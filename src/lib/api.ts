import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
});

const clearExpiredSession = () => {
  localStorage.removeItem('vpp_token');
  localStorage.removeItem('vpp_user');
  window.dispatchEvent(new Event('vpp:unauthorized'));

  const publicPaths = ['/', '/guest-request'];
  const isPublicPath = publicPaths.includes(window.location.pathname)
    || window.location.pathname.includes('/print');

  if (!isPublicPath) {
    window.location.replace('/');
  }
};

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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearExpiredSession();
    }
    return Promise.reject(error);
  }
);

export default api;
