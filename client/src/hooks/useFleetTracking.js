import { useEffect, useState, useCallback } from 'react';
import api from '../services/api.js';
import { getSocket } from '../services/socket.js';

/** Loads vehicles + in-transit shipments and keeps vehicle positions live via Socket.IO. */
export function useFleetTracking() {
  const [vehicles, setVehicles] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  const load = useCallback(async () => {
    const [v, s] = await Promise.all([api.get('/vehicles?limit=200'), api.get('/shipments?status=In%20Transit&limit=100')]);
    setVehicles(v.data.data);
    setShipments(s.data.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load().catch(() => setLoading(false));
    const socket = getSocket();
    setConnected(socket.connected);

    const onLocation = (p) =>
      setVehicles((list) =>
        list.map((v) =>
          v._id === p.vehicleId
            ? { ...v, location: { lat: p.lat, lng: p.lng }, speed: p.speed, heading: p.heading, status: p.status, lastUpdated: p.timestamp }
            : v
        )
      );
    const onVehicleStatus = (p) => setVehicles((list) => list.map((v) => (v._id === p.vehicleId ? { ...v, status: p.status } : v)));
    const onShipment = () => load().catch(() => {});

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('vehicle:location', onLocation);
    socket.on('vehicle:status', onVehicleStatus);
    socket.on('shipment:update', onShipment);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('vehicle:location', onLocation);
      socket.off('vehicle:status', onVehicleStatus);
      socket.off('shipment:update', onShipment);
    };
  }, [load]);

  return { vehicles, shipments, loading, connected, reload: load };
}
