export const PRODUCTION_API_URL = 'https://medsseva-backend-cnud.onrender.com/api';

export const getApiBaseUrl = (): string =>
  process.env.EXPO_PUBLIC_API_URL || PRODUCTION_API_URL;

export const getSocketBaseUrl = (): string =>
  getApiBaseUrl().replace(/\/api\/?$/, '');
