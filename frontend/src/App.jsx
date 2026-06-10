import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Vehicles from './pages/Vehicles';
import ParkingLots from './pages/ParkingLots';
import Bookings from './pages/Bookings';

// Simple Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

// Basic Layout
const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-800 text-white p-4 flex justify-between">
        <h1 className="text-xl font-bold">Parking System</h1>
        <div className="space-x-4">
          <a href="/dashboard" className="hover:underline">Lots</a>
          <a href="/vehicles" className="hover:underline">Vehicles</a>
          <a href="/bookings" className="hover:underline">Bookings</a>
          <button onClick={logout} className="bg-red-500 px-3 py-1 rounded">Logout ({user?.username})</button>
        </div>
      </nav>
      <main className="p-4">{children}</main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Login />} /> {/* Reuse login style or create separate Register component */}
          
          <Route path="/dashboard" element={<ProtectedRoute><Layout><ParkingLots /></Layout></ProtectedRoute>} />
          <Route path="/vehicles" element={<ProtectedRoute><Layout><Vehicles /></Layout></ProtectedRoute>} />
          <Route path="/bookings" element={<ProtectedRoute><Layout><Bookings /></Layout></ProtectedRoute>} />
          
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}