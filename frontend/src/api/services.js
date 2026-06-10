import api from './axios';

export const vehicleService = {
  getAll: (type) => api.get(`/vehicles/${type ? `?type=${type}` : ''}`),
  search: (license) => api.get(`/vehicles/search/?license=${license}`),
  create: (formData) => api.post('/vehicles/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/vehicles/${id}/`, data),
  delete: (id) => api.delete(`/vehicles/${id}/`),
};

export const lotService = {
  getAll: () => api.get('/parking-lots/'),
  getNearest: (lat, lng, radius = 10, limit = 10) => 
    api.get(`/parking-lots/nearest/?lat=${lat}&lng=${lng}&radius=${radius}&limit=${limit}`),
  getSlots: (id, availableOnly = false) => 
    api.get(`/parking-lots/${id}/slots/${availableOnly ? '?available=true' : ''}`),
};

export const bookingService = {
  getAll: () => api.get('/bookings/'),
  create: (data) => api.post('/bookings/create/', data),
  checkout: (id) => api.post(`/bookings/${id}/checkout/`),
};

export const paymentService = {
  getHistory: () => api.get('/payments/history/'),
  confirm: (bookingId, data) => api.post(`/payments/${bookingId}/pay/`, data),
};