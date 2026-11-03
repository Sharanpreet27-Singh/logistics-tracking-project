export const CITIES = [
  { name: 'Panipat', lat: 29.3909, lng: 76.9635 },
  { name: 'Delhi', lat: 28.6139, lng: 77.209 },
  { name: 'Gurugram', lat: 28.4595, lng: 77.0266 },
  { name: 'Karnal', lat: 29.6857, lng: 76.9905 },
  { name: 'Chandigarh', lat: 30.7333, lng: 76.7794 },
  { name: 'Ludhiana', lat: 30.901, lng: 75.8573 },
  { name: 'Amritsar', lat: 31.634, lng: 74.8723 },
  { name: 'Meerut', lat: 28.9845, lng: 77.7064 },
  { name: 'Agra', lat: 27.1767, lng: 78.0081 },
  { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
];
export const city = (name) => {
  const c = CITIES.find((x) => x.name === name);
  return { address: c.name, lat: c.lat, lng: c.lng };
};
