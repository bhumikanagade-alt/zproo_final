import type { CabLocation, Coupon, PickupPoint, Vehicle } from './types';

/** Simulated catalogue. Replace with a real cab-inventory service later; the UI only reads these shapes. */
export const LOCATIONS: readonly CabLocation[] = [
  { id: 'phoenix', name: 'Phoenix Mall, Viman Nagar', area: 'Pune, Maharashtra 411014', lat: 18.5619, lng: 73.9167 },
  { id: 'shivajinagar', name: 'Shivajinagar Railway Station', area: 'Pune, Maharashtra 411005', lat: 18.5308, lng: 73.8475 },
  { id: 'pune-airport', name: 'Pune Airport', area: 'Lohegaon, Pune 411032', lat: 18.5793, lng: 73.9089 },
  { id: 'hinjewadi', name: 'Hinjewadi Phase 1', area: 'Pune, Maharashtra 411057', lat: 18.5912, lng: 73.7389 },
  { id: 'koregaon', name: 'Koregaon Park', area: 'Pune, Maharashtra 411001', lat: 18.5362, lng: 73.8938 },
  { id: 'pune-station', name: 'Pune Junction', area: 'Pune, Maharashtra 411001', lat: 18.5286, lng: 73.8743 },
  { id: 'mumbai-cst', name: 'Mumbai CSMT', area: 'Mumbai, Maharashtra 400001', lat: 18.9398, lng: 72.8355 },
  { id: 'mumbai-airport', name: 'Mumbai Airport T2', area: 'Andheri East, Mumbai 400099', lat: 19.0896, lng: 72.8656 },
  { id: 'bengaluru', name: 'Bengaluru MG Road', area: 'Bengaluru, Karnataka 560001', lat: 12.9756, lng: 77.6068 },
  { id: 'hyderabad', name: 'Hyderabad HITEC City', area: 'Hyderabad, Telangana 500081', lat: 17.4435, lng: 78.3772 },
  { id: 'delhi', name: 'New Delhi Connaught Place', area: 'New Delhi 110001', lat: 28.6315, lng: 77.2167 },
  { id: 'goa', name: 'Panaji, Goa', area: 'Goa 403001', lat: 15.4909, lng: 73.8278 },
];

export const POPULAR_CITIES = ['Pune', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Delhi', 'Goa'] as const;

export const VEHICLES: readonly Vehicle[] = [
  { id: 'bike', label: 'Bike Taxi', seats: 1, bags: 0, luggageLabel: 'No luggage', ac: false, pickupMin: 2, baseFare: 20, perKm: 4.5, perMin: 0.5, speedKmh: 28 },
  { id: 'auto', label: 'Auto', seats: 3, bags: 1, luggageLabel: 'Small luggage', ac: false, pickupMin: 4, baseFare: 30, perKm: 8, perMin: 1, speedKmh: 25, tag: 'Best value' },
  { id: 'mini', label: 'Mini', seats: 4, bags: 2, luggageLabel: '2 bags', ac: true, pickupMin: 6, baseFare: 60, perKm: 10, perMin: 1, speedKmh: 27 },
  { id: 'sedan', label: 'Sedan', seats: 4, bags: 2, luggageLabel: '2 bags', ac: true, pickupMin: 5, baseFare: 80, perKm: 12, perMin: 1.2, speedKmh: 27, tag: 'Most popular' },
  { id: 'suv', label: 'SUV', seats: 6, bags: 3, luggageLabel: '3 bags', ac: true, pickupMin: 10, baseFare: 110, perKm: 16, perMin: 1.5, speedKmh: 27 },
  { id: 'premium', label: 'Premium', seats: 4, bags: 3, luggageLabel: '3 bags', ac: true, pickupMin: 8, baseFare: 140, perKm: 20, perMin: 2, speedKmh: 27 },
];

/** Outstation trips are intercity: bike taxis and autos are not offered. */
export const vehiclesForMode = (mode?: import('./types').RideMode): readonly Vehicle[] =>
  mode === 'outstation' ? VEHICLES.filter((v) => v.id !== 'bike' && v.id !== 'auto') : VEHICLES;

export const COUPONS: readonly Coupon[] = [
  { code: 'ZPROO10', kind: 'flat', value: 10, label: '₹10 off your ride' },
  { code: 'CAB50', kind: 'flat', value: 50, minSubtotal: 150, label: '₹50 off rides above ₹150' },
  { code: 'FIRST20', kind: 'percent', value: 20, maxDiscount: 60, label: '20% off, up to ₹60' },
  { code: 'CAB150', kind: 'flat', value: 150, minSubtotal: 1500, label: '₹150 off rides above ₹1,500' },
  { code: 'RIDE15', kind: 'percent', value: 15, maxDiscount: 200, label: '15% off, up to ₹200' },
];

export const PICKUP_POINTS: readonly PickupPoint[] = [
  { id: 'main', name: 'Main entrance', address: 'At your pickup location' },
  { id: 'bus-stop', name: 'Nearest bus stop', address: 'Within 200 m of pickup' },
  { id: 'square', name: 'Main square / junction', address: 'Within 300 m of pickup' },
  { id: 'hotel', name: 'Nearby hotel lobby', address: 'Within 350 m of pickup' },
];

export const LANDMARKS = ['Mall', 'Hotel', 'Bus Stop', 'Metro Station'] as const;

export const CANCEL_REASONS = [
  'Change of plans',
  'Booked by mistake',
  'Found another ride',
  'Driver is taking too long',
  'Other',
] as const;

export const RIDE_MODES: readonly { id: import('./types').RideMode; label: string }[] = [
  { id: 'one-way', label: 'One way' },
  { id: 'round-trip', label: 'Round trip' },
  { id: 'outstation', label: 'Outstation' },
  { id: 'airport', label: 'Airport transfer' },
  { id: 'rental', label: 'Hourly rental' },
];

export const MOCK_DRIVER = {
  name: 'Rohit Sharma',
  rating: 4.8,
  trips: 124,
  vehicle: 'White Sedan',
  plate: 'MH 12 AB 1234',
} as const;
