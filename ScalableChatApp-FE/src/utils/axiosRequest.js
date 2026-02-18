import axios from 'axios'
import { getAccessToken, updateAccessToken, clearStoredUser } from './auth'

const USER_SERVICE_URL = import.meta.env.VITE_USER_SERVICE_URL || 'http://localhost:4002'
const CHAT_SERVICE_URL = import.meta.env.VITE_CHAT_SERVICE_URL || 'http://localhost:4001'
const MESSAGE_SERVICE_URL = import.meta.env.VITE_MESSAGE_SERVICE_URL || 'http://localhost:4003'

export const axiosRequest=axios.create({
       baseURL:'http://localhost:',
})

export const userAxios = axios.create({
       baseURL: USER_SERVICE_URL,
       withCredentials: true,
})

export const chatAxios = axios.create({
       baseURL: CHAT_SERVICE_URL,
       withCredentials: true,
})

export const messageAxios = axios.create({
       baseURL: MESSAGE_SERVICE_URL,
       withCredentials: true,
})

// Token refresh state
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Token refresh function
const refreshAccessToken = async () => {
    try {
        const response = await axios.post(`${USER_SERVICE_URL}/user/refresh-token`, {}, {
            withCredentials: true
        });
        return response.data.accessToken;
    } catch (error) {
        // Refresh failed, redirect to login
        clearStoredUser();
        window.location.href = '/';
        throw error;
    }
};

// Add request interceptor to include access token
const addTokenInterceptor = (axiosInstance) => {
    axiosInstance.interceptors.request.use(
        (config) => {
            const token = getAccessToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    // Add response interceptor to handle token refresh
    axiosInstance.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error.config;
            
            if (error.response?.status === 401 && !originalRequest._retry) {
                if (isRefreshing) {
                    // If already refreshing, queue this request
                    return new Promise((resolve, reject) => {
                        failedQueue.push({ resolve, reject });
                    }).then(token => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return axiosInstance(originalRequest);
                    }).catch(err => {
                        return Promise.reject(err);
                    });
                }

                originalRequest._retry = true;
                isRefreshing = true;
                
                try {
                    const newAccessToken = await refreshAccessToken();
                    updateAccessToken(newAccessToken);
                    processQueue(null, newAccessToken);
                    
                    // Retry original request with new token
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    return axiosInstance(originalRequest);
                } catch (refreshError) {
                    processQueue(refreshError, null);
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
            }
            
            return Promise.reject(error);
        }
    );
};

// Apply interceptors to all axios instances
addTokenInterceptor(userAxios);
addTokenInterceptor(chatAxios);
addTokenInterceptor(messageAxios);


// https://chatgpt.com/c/69612bd0-afe0-8324-8012-652b473a84b8
