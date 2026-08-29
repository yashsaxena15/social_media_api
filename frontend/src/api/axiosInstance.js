import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:8000/api/';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          // Attempt to refresh the token
          const response = await axios.post(`${BASE_URL}token/refresh/`, {
            refresh: refreshToken,
          });

          // Save new tokens
          const newAccessToken = response.data.access;
          localStorage.setItem('access_token', newAccessToken);

          if (response.data.refresh) {
            localStorage.setItem('refresh_token', response.data.refresh);
          }

          // Update header and retry request
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh token is expired or invalid
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login'; // Redirect to login
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token available
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
