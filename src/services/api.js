// src/services/api.js - Enhanced with comprehensive booking functionality
import axios from 'axios';

// Default API configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Error handling helper
const getErrorMessage = (error) => {
  if (error.response && error.response.data) {
    return error.response.data.message || error.response.data.error || 'An error occurred';
  }
  return error.message || 'An error occurred';
};

// API Service object
const apiService = {
  // Auth endpoints
  auth: {
    login: async (credentials) => {
      try {
        const response = await apiClient.post('/auth/login', credentials);
        const { token, user } = response.data;
        // Store token
        localStorage.setItem('authToken', token);
        return { success: true, user };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },

    logout: () => {
      localStorage.removeItem('authToken');
      return { success: true };
    },

    getProfile: async () => {
      try {
        const response = await apiClient.get('/auth/me');
        return { success: true, user: response.data.data };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    }
  },

  // Booking endpoints
  bookings: {
    checkAvailability: async (date, time, partySize) => {
      try {
        const response = await apiClient.post('/bookings/check-availability', {
          date,
          time,
          partySize
        });
        return { success: true, data: response.data };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },

    createBooking: async (bookingData) => {
      try {
        const response = await apiClient.post('/bookings', bookingData);
        return { success: true, booking: response.data.data };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },

    getBookings: async (date, status = '', page = 1, limit = 10) => {
      try {
        let query = `?page=${page}&limit=${limit}`;
        if (date) query += `&date=${date}`;
        if (status) query += `&status=${status}`;

        const response = await apiClient.get(`/bookings${query}`);
        return { success: true, ...response.data };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },

    getBooking: async (id) => {
      try {
        const response = await apiClient.get(`/bookings/${id}`);
        return { success: true, booking: response.data.data };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },

    // Public lookup for customers (no auth required)
    lookupBooking: async (reference, email) => {
      try {
        const response = await apiClient.post('/bookings/lookup', { reference, email });
        return { success: true, booking: response.data.data };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },

    updateBookingStatus: async (id, status) => {
      try {
        const response = await apiClient.put(`/bookings/${id}/status`, { status });
        return { success: true, booking: response.data.data };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },

    updateBooking: async (id, bookingData) => {
      try {
        const response = await apiClient.put(`/bookings/${id}`, bookingData);
        return { success: true, booking: response.data.data };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },

    deleteBooking: async (id) => {
      try {
        await apiClient.delete(`/bookings/${id}`);
        return { success: true };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    }
  },

  // Table endpoints
  tables: {
    getTables: async () => {
      try {
        const response = await apiClient.get('/tables');
        return { success: true, tables: response.data.data };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },

    getTableAvailability: async (date) => {
      try {
        const response = await apiClient.get(`/tables/availability/${date}`);
        return { success: true, availability: response.data.data };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },

    createTable: async (tableData) => {
      try {
        const response = await apiClient.post('/tables', tableData);
        return { success: true, table: response.data.data };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },

    updateTable: async (id, tableData) => {
      try {
        const response = await apiClient.put(`/tables/${id}`, tableData);
        return { success: true, table: response.data.data };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },

    deleteTable: async (id) => {
      try {
        const response = await apiClient.delete(`/tables/${id}`);
        return { success: true };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    }
  },

  // Restaurant settings endpoints
  restaurant: {
    getSettings: async () => {
      try {
        const response = await apiClient.get('/restaurant');
        return { success: true, settings: response.data.data };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },

    updateSettings: async (settingsData) => {
      try {
        const response = await apiClient.put('/restaurant', settingsData);
        return { success: true, settings: response.data.data };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },

    updateBookingRules: async (rulesData) => {
      try {
        const response = await apiClient.put('/restaurant/booking-rules', rulesData);
        return { success: true, rules: response.data.data };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },

    updateOpeningHours: async (hoursData) => {
      try {
        const response = await apiClient.put('/restaurant/opening-hours', {
          openingHours: hoursData
        });
        return { success: true, hours: response.data.data };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },

    addClosedDate: async (date, reason) => {
      try {
        const response = await apiClient.post('/restaurant/closed-dates', {
          date,
          reason
        });
        return { success: true, closedDates: response.data.data };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },

    addSpecialEvent: async (eventData) => {
      try {
        const response = await apiClient.post('/restaurant/special-events', eventData);
        return { success: true, specialEvents: response.data.data };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    }
  },

  // User management for admin
  users: {
    getUsers: async (search = '', role = '', page = 1, limit = 10) => {
      try {
        let query = `?page=${page}&limit=${limit}`;
        if (search) query += `&search=${search}`;
        if (role) query += `&role=${role}`;

        const response = await apiClient.get(`/users${query}`);
        return { success: true, ...response.data };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },

    getUser: async (id) => {
      try {
        const response = await apiClient.get(`/users/${id}`);
        return { success: true, user: response.data.data };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },

    createUser: async (userData) => {
      try {
        const response = await apiClient.post('/users', userData);
        return { success: true, user: response.data.data };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },

    updateUser: async (id, userData) => {
      try {
        const response = await apiClient.put(`/users/${id}`, userData);
        return { success: true, user: response.data.data };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },

    deleteUser: async (id) => {
      try {
        await apiClient.delete(`/users/${id}`);
        return { success: true };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },

    getUserBookings: async (id) => {
      try {
        const response = await apiClient.get(`/users/${id}/bookings`);
        return { success: true, bookings: response.data.data };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    }
  }
};

export default apiService;
