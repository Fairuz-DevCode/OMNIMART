import axios, { InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const API = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

let memoryAccessToken: string | null = null;
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const setAccessToken = (token: string | null) => {
  memoryAccessToken = token;
};

export const getAccessToken = () => memoryAccessToken;

API.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (memoryAccessToken && config.headers) {
      config.headers.Authorization = `Bearer ${memoryAccessToken}`;
    }

    // Otomatis sertakan token CSRF jika ada di cookie
    if (typeof document !== "undefined" && config.headers) {
      const csrfCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("_csrf_token="));
      if (csrfCookie) {
        config.headers["x-csrf-token"] = decodeURIComponent(csrfCookie.split("=")[1]);
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      originalRequest?.url?.includes("auth/refresh") ||
      originalRequest?.url?.includes("auth/login") ||
      originalRequest?.url?.includes("auth/register")
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return API(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = response.data?.payload?.accessToken;
        setAccessToken(newAccessToken);
        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return API(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export { API as api };
export default API;
