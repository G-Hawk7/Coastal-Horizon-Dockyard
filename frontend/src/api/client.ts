import axios from 'axios';

// When running on localhost (dev or preview), always target FastAPI on port 8000 directly.
// In production (Vercel), use relative '/api/v1' so vercel.json handles serverless routing.
const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const baseURL = import.meta.env.VITE_API_BASE_URL || (
  isLocal ? 'http://127.0.0.1:8000/api/v1' : '/api/v1'
);

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});