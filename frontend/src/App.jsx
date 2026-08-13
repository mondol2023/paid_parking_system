import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { AppShell } from '@/components/layout/AppShell';
import { Page } from '@/components/layout/AnimatedRoutes';
import { ProtectedRoute, PublicOnlyRoute } from '@/components/common/ProtectedRoute';

import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import Lots from '@/pages/Lots';
import Vehicles from '@/pages/Vehicles';
import Bookings from '@/pages/Bookings';
import Payments from '@/pages/Payments';
import Profile from '@/pages/Profile';
import NotFound from '@/pages/NotFound';

/** Signed-in pages all share the shell; only the inner content transitions. */
function Private({ children }) {
  return (
    <ProtectedRoute>
      <AppShell>
        <Page>{children}</Page>
      </AppShell>
    </ProtectedRoute>
  );
}

function Public({ children }) {
  return (
    <PublicOnlyRoute>
      <Page>{children}</Page>
    </PublicOnlyRoute>
  );
}

export default function App() {
  const location = useLocation();

  return (
    // mode="wait" lets the outgoing page finish before the next one rises in.
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<Public><Login /></Public>} />
        <Route path="/register" element={<Public><Register /></Public>} />

        <Route path="/" element={<Private><Dashboard /></Private>} />
        <Route path="/lots" element={<Private><Lots /></Private>} />
        <Route path="/vehicles" element={<Private><Vehicles /></Private>} />
        <Route path="/bookings" element={<Private><Bookings /></Private>} />
        <Route path="/payments" element={<Private><Payments /></Private>} />
        <Route path="/profile" element={<Private><Profile /></Private>} />

        {/* The old app aliased /dashboard as the home route. */}
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Page><NotFound /></Page>} />
      </Routes>
    </AnimatePresence>
  );
}
