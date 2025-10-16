import axios from 'axios';
import { isTokenValid, logout } from "./src/utils/auth";
const token = localStorage.getItem("token");

const axiosInstance = axios.create({
  // baseURL: 'http://localhost:3000/api',
  baseURL: '/api',
  // baseURL: 'https://profitfirst.co.in/api',
  headers: token ? { Authorization: `Bearer ${token}` } : {},
});
 

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    if (!isTokenValid()) {
      logout(); // auto-logout if token expired
      return Promise.reject({ message: "Token expired" });
    }
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default axiosInstance;
