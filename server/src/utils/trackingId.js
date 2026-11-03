export async function generateTrackingId(Shipment) {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  for (let i = 0; i < 10; i++) {
    const id = `SHP-${stamp}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    if (!(await Shipment.exists({ trackingId: id }))) return id;
  }
  return `SHP-${stamp}-${Date.now().toString().slice(-6)}`;
}
