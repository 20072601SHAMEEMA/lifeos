import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import { GuestRoute, ProtectedRoute } from './components/RouteGuards.jsx';
import { LoadingState } from './components/ui.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';

// Heavier pages (maps, QR) are code-split and loaded on demand.
const Emergency = lazy(() => import('./pages/Emergency.jsx'));
const Contacts = lazy(() => import('./pages/Contacts.jsx'));
const Journey = lazy(() => import('./pages/Journey.jsx'));
const EmergencyCard = lazy(() => import('./pages/EmergencyCard.jsx'));
const History = lazy(() => import('./pages/History.jsx'));
const Nearby = lazy(() => import('./pages/Nearby.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const PublicCard = lazy(() => import('./pages/PublicCard.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

export default function App() {
  return (
    <Suspense fallback={<LoadingState label="Loading…" />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
        <Route path="/e/:shareId" element={<PublicCard />} />

        {/* Full-screen emergency mode lives outside the sidebar layout */}
        <Route path="/emergency" element={<ProtectedRoute><Emergency /></ProtectedRoute>} />

        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/journey" element={<Journey />} />
          <Route path="/card" element={<EmergencyCard />} />
          <Route path="/history" element={<History />} />
          <Route path="/nearby" element={<Nearby />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
