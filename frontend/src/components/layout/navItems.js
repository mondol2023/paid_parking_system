import { CarFront, CreditCard, LayoutDashboard, MapPin, Ticket } from 'lucide-react';

/**
 * One nav definition drives the side rail and the mobile tab bar, so the two
 * can never drift apart.
 */
export const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/lots', label: 'Find parking', short: 'Park', icon: MapPin },
  { to: '/vehicles', label: 'Vehicles', icon: CarFront },
  { to: '/bookings', label: 'Bookings', icon: Ticket },
  { to: '/payments', label: 'Payments', short: 'Pay', icon: CreditCard },
];
