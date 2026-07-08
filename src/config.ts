const getApiUrl = (): string => {
  const origin = window.location.origin;
  // If running on Vite's dev server ports, route requests to backend port 5000.
  if (origin.includes(':5173') || origin.includes(':5174')) {
    return 'http://localhost:5000';
  }
  // In production / backend-hosted mode, use the same origin.
  return origin;
};

export const API_BASE_URL = getApiUrl();  