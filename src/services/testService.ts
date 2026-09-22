import axios from 'axios';
import { getApiBaseUrl } from '../config/env';

const API_BASE_URL = getApiBaseUrl();

// Create an axios instance for tests
const testApi = axios.create({
  baseURL: `${API_BASE_URL}/tests`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const testService = {
  /**
   * Fetch all tests from the backend
   */
  getAllTests: async () => {
    try {
      const response = await testApi.get('/');
      return response.data;
    } catch (error) {
      console.error('Error fetching tests:', error);
      throw error;
    }
  },

  /**
   * Fetch a single test by ID
   */
  getTestById: async (id: string) => {
    try {
      const response = await testApi.get(`/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching test ${id}:`, error);
      throw error;
    }
  },

  /**
   * Fetch tests by category ID
   */
  getTestsByCategory: async (categoryId: string) => {
    try {
      const response = await testApi.get(`/category/${categoryId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching tests for category ${categoryId}:`, error);
      throw error;
    }
  }
};
