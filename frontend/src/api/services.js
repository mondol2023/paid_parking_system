import api, { tokens } from './axios';

/**
 * One service object per resource (ISP): a screen depends only on the endpoints
 * it uses. Every method resolves to the response *body*, not the axios envelope,
 * so no component ever writes `.data.data`.
 */

const body = (promise) => promise.then((res) => res.data);
/** List endpoints all answer {count, results}; hooks want the array. */
const list = (promise) => body(promise).then((data) => data.results ?? []);

export const authService = {
  login: (credentials) => body(api.post('/auth/login/', credentials)),
  register: (payload) => body(api.post('/auth/register/', payload)),
  profile: () => body(api.get('/auth/profile/')),
  updateProfile: (payload) => body(api.put('/auth/profile/', payload)),
  tokens,
};

export const vehicleService = {
  list: (type) => list(api.get('/vehicles/', { params: type ? { type } : undefined })),
  search: (license, config) => list(api.get('/vehicles/search/', { params: { license }, ...config })),
  create: (formData) => body(api.post('/vehicles/', formData)),
  update: (id, data) => body(api.put(`/vehicles/${id}/`, data)),
  remove: (id) => body(api.delete(`/vehicles/${id}/`)),
};

export const lotService = {
  list: () => list(api.get('/parking-lots/')),
  nearest: (lat, lng, { radius = 10, limit = 12 } = {}) =>
    list(api.get('/parking-lots/nearest/', { params: { lat, lng, radius, limit } })),
  /** Answers {lot, slots} — the one list endpoint that is not {count, results}. */
  slots: (id, availableOnly = false) =>
    body(api.get(`/parking-lots/${id}/slots/`, { params: availableOnly ? { available: 'true' } : undefined })),
};

export const bookingService = {
  list: () => list(api.get('/bookings/')),
  create: (data) => body(api.post('/bookings/create/', data)),
  checkout: (id) => body(api.post(`/bookings/${id}/checkout/`)),
};

export const paymentService = {
  history: () => list(api.get('/payments/history/')),
  pay: (bookingId, data) => body(api.post(`/payments/${bookingId}/pay/`, data)),
};
