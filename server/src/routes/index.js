import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, authorize } from '../middleware/auth.js';
import { crud } from '../controllers/crud.js';
import * as auth from '../controllers/authController.js';
import * as shipments from '../controllers/shipmentController.js';
import { stats } from '../controllers/dashboardController.js';
import * as reports from '../controllers/reportController.js';
import * as routing from '../controllers/routeController.js';
import * as alerts from '../controllers/alertController.js';
import { trackShipment } from '../controllers/trackController.js';
import { Vehicle } from '../models/Vehicle.js';
import { Driver } from '../models/Driver.js';
import { Shipment } from '../models/Shipment.js';
import { vehicleSchema, driverSchema, shipmentCreateSchema } from '../validators/schemas.js';

const router = Router();
// Operations staff (admin, manager, dispatcher) run the fleet: vehicles, drivers, shipments, reports.
// Only admins delete shipments, since that erases delivery history.
const manage = authorize('admin', 'manager', 'dispatcher');
const dispatch = manage;

// ---- Public ----
router.get('/health', (_req, res) => res.json({ success: true, status: 'ok', uptime: process.uptime() }));
// Public tracking: enough for a page that refreshes every 15 s, far too slow for guessing IDs.
const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many tracking requests from this address. Please wait a minute and try again.' },
});
router.get('/track/:trackingId', trackLimiter, trackShipment);

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
router.post('/auth/login', loginLimiter, auth.login);
router.post('/auth/refresh', loginLimiter, auth.refresh);

// ---- Authenticated ----
router.use(authenticate);
router.get('/auth/me', auth.me);
router.post('/auth/logout', auth.logout);

router.get('/dashboard/stats', stats);

const vehicleCrud = crud({
  Model: Vehicle,
  schema: vehicleSchema,
  searchFields: ['registrationNo', 'make', 'model'],
  filters: ['status', 'type'],
  populate: [{ path: 'assignedDriver', select: 'name phone' }],
  afterRemove: (v) => Driver.updateMany({ assignedVehicle: v._id }, { assignedVehicle: null }),
});
router.get('/vehicles', vehicleCrud.list);
router.post('/vehicles', manage, vehicleCrud.create);
router.get('/vehicles/:id', vehicleCrud.get);
router.put('/vehicles/:id', manage, vehicleCrud.update);
router.delete('/vehicles/:id', manage, vehicleCrud.remove);

const driverCrud = crud({
  Model: Driver,
  schema: driverSchema,
  searchFields: ['name', 'phone', 'licenseNo'],
  filters: ['status'],
  populate: [{ path: 'assignedVehicle', select: 'registrationNo' }],
  afterRemove: (d) => Vehicle.updateMany({ assignedDriver: d._id }, { assignedDriver: null }),
});
router.get('/drivers', driverCrud.list);
router.post('/drivers', manage, driverCrud.create);
router.get('/drivers/:id', driverCrud.get);
router.put('/drivers/:id', manage, driverCrud.update);
router.delete('/drivers/:id', manage, driverCrud.remove);

const shipmentCrud = crud({
  Model: Shipment,
  schema: shipmentCreateSchema,
  searchFields: ['trackingId', 'customerName'],
  filters: ['status'],
  populate: [
    { path: 'vehicle', select: 'registrationNo type location' },
    { path: 'driver', select: 'name phone' },
  ],
});
router.get('/shipments', shipmentCrud.list);
router.post('/shipments', dispatch, shipments.createShipment);
router.get('/shipments/:id', shipmentCrud.get);
router.patch('/shipments/:id/assign', dispatch, shipments.assignShipment);
router.patch('/shipments/:id/status', dispatch, shipments.updateShipmentStatus);
router.delete('/shipments/:id', authorize('admin'), shipmentCrud.remove);

router.post('/routes/optimize', dispatch, routing.optimizeRoute);
router.get('/routes/:shipmentId', routing.shipmentRoute);

router.get('/reports/deliveries', manage, reports.deliveryReport);
router.get('/reports/vehicles', manage, reports.vehicleReport);
router.get('/reports/drivers', manage, reports.driverReport);

router.get('/alerts', alerts.listAlerts);
router.patch('/alerts/read-all', alerts.markAllRead);
router.patch('/alerts/:id/read', alerts.markRead);

export default router;
