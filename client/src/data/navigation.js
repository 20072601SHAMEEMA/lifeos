import { LayoutDashboard, Siren, Navigation, Users, IdCard, History, MapPin, User, Settings } from 'lucide-react';

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/emergency', label: 'Emergency', icon: Siren, danger: true },
  { to: '/journey', label: 'Journey', icon: Navigation },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/card', label: 'Emergency Card', icon: IdCard },
  { to: '/history', label: 'Safety History', icon: History },
  { to: '/nearby', label: 'Nearby Services', icon: MapPin },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: Settings },
];
