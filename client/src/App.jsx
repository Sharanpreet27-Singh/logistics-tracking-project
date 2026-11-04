import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import Spinner from './components/Spinner.jsx';

const Login = lazy(() => import('./pages/Login.jsx'));
const TrackShipment = lazy(() => import('./pages/TrackShipment.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const FleetTracking = lazy(() => import('./pages/FleetTracking.jsx'));
const Vehicles = lazy(() => import('./pages/Vehicles.jsx'));
const Drivers = lazy(() => import('./pages/Drivers.jsx'));
const Shipments = lazy(() => import('./pages/Shipments.jsx'));
const RoutesPage = lazy(() => import('./pages/Routes.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Alerts = lazy(() => import('./pages/Alerts.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

export default function App() {
  return (
    <Suspense fallback={<Spinner full />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/track" element={<TrackShipment />} />
        <Route path="/track/:trackingId" element={<TrackShipment />} />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="tracking" element={<FleetTracking />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="drivers" element={<Drivers />} />
          <Route path="shipments" element={<Shipments />} />
          <Route path="routes" element={<RoutesPage />} />
          <Route path="reports" element={<ProtectedRoute roles={['admin', 'manager', 'dispatcher']}><Reports /></ProtectedRoute>} />
          <Route path="alerts" element={<Alerts />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
