import axios from 'axios';
import { getApiBaseUrl } from '../config/env';

const API_BASE_URL = getApiBaseUrl();

// Create an axios instance for packages
const packageApi = axios.create({
  baseURL: `${API_BASE_URL}/packages`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const packageService = {
  /**
   * Fetch all packages from the backend
   */
  getAllPackages: async () => {
    try {
      const response = await packageApi.get('/');
      return response.data;
    } catch (error) {
      console.error('Error fetching packages:', error);
      throw error;
    }
  },

  /**
   * Fetch a single package by ID
   */
  getPackageById: async (id: string) => {
    try {
      const response = await packageApi.get(`/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching package ${id}:`, error);
      throw error;
    }
  },

  /**
   * Fetch packages by category ID
   */
  getPackagesByCategory: async (categoryId: string) => {
    try {
      if (categoryId === 'all') {
        const response = await packageApi.get('/');
        return response.data;
      }
      const response = await packageApi.get(`/category/${categoryId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching packages for category ${categoryId}:`, error);
      throw error;
    }
  }
};
