import type { PickupLocation } from '../types';

/** Mock pickup / return hubs, grouped by city. Replace with `GET /bike-locations` when the backend ships. */
export const MOCK_LOCATIONS: PickupLocation[] = [
  { id: 'pune-station', city: 'Pune', name: 'Pune Railway Station Hub', area: 'Pune Station', address: 'Bay 3, Parking Level 1, Pune Railway Station, Agarkar Nagar, Pune 411001', landmark: 'Next to the Platform 1 main entrance', opensAt: '06:00', closesAt: '22:00', contact: '+91 20 4000 1001' },
  { id: 'pune-airport', city: 'Pune', name: 'Pune Airport Hub', area: 'Lohegaon', address: 'Ground floor, Multi-level Car Park, Pune International Airport, Lohegaon 411032', landmark: 'Opposite the arrivals gate', opensAt: '06:00', closesAt: '22:00', contact: '+91 20 4000 1002' },
  { id: 'shivajinagar', city: 'Pune', name: 'Shivajinagar Hub', area: 'Shivajinagar', address: 'Shop 4, Ground Floor, FC Road Corner, Shivajinagar, Pune 411005', landmark: 'Near Shivajinagar bus stand', opensAt: '07:00', closesAt: '21:00', contact: '+91 20 4000 1003' },
  { id: 'koregaon-park', city: 'Pune', name: 'Koregaon Park Hub', area: 'Koregaon Park', address: 'Lane 5, North Main Road, Koregaon Park, Pune 411001', landmark: 'Behind the German Bakery', opensAt: '07:00', closesAt: '21:00', contact: '+91 20 4000 1004' },
  { id: 'hinjewadi', city: 'Pune', name: 'Hinjewadi Phase 1 Hub', area: 'Hinjewadi', address: 'Ground Floor, Rajiv Gandhi Infotech Park, Phase 1, Hinjewadi, Pune 411057', landmark: 'Opposite the Infosys gate', opensAt: '07:00', closesAt: '21:00', contact: '+91 20 4000 1005' },
  { id: 'kothrud', city: 'Pune', name: 'Kothrud Hub', area: 'Kothrud', address: 'Karve Road, near Kothrud Depot, Kothrud, Pune 411038', landmark: 'Beside the Karve Road flyover', opensAt: '07:00', closesAt: '21:00', contact: '+91 20 4000 1006' },
  { id: 'viman-nagar', city: 'Pune', name: 'Viman Nagar Hub', area: 'Viman Nagar', address: 'Shop 12, Phoenix Marketcity Road, Viman Nagar, Pune 411014', landmark: 'Near Symbiosis College', opensAt: '07:00', closesAt: '21:00', contact: '+91 20 4000 1007' },

  // Mumbai
  { id: 'mumbai-andheri', city: 'Mumbai', name: 'Andheri West Hub', area: 'Andheri West', address: 'Shop 7, Link Road, Andheri West, Mumbai 400053', landmark: 'Near Infinity Mall', opensAt: '07:00', closesAt: '22:00', contact: '+91 22 4000 2001' },
  { id: 'mumbai-bandra', city: 'Mumbai', name: 'Bandra Hub', area: 'Bandra West', address: 'Ground Floor, Hill Road, Bandra West, Mumbai 400050', landmark: 'Opposite Bandra Station (West)', opensAt: '07:00', closesAt: '22:00', contact: '+91 22 4000 2002' },
  { id: 'mumbai-powai', city: 'Mumbai', name: 'Powai Hub', area: 'Powai', address: 'Hiranandani Gardens, Main Street, Powai, Mumbai 400076', landmark: 'Near Powai Lake', opensAt: '07:00', closesAt: '21:00', contact: '+91 22 4000 2003' },
  { id: 'mumbai-airport', city: 'Mumbai', name: 'Mumbai Airport Hub', area: 'Chhatrapati Shivaji Airport', address: 'Parking Level P1, Terminal 2, Sahar, Mumbai 400099', landmark: 'Next to the T2 arrivals exit', opensAt: '06:00', closesAt: '23:00', contact: '+91 22 4000 2004' },

  // Bengaluru
  { id: 'blr-indiranagar', city: 'Bengaluru', name: 'Indiranagar Hub', area: 'Indiranagar', address: '100 Feet Road, Indiranagar, Bengaluru 560038', landmark: 'Near Indiranagar Metro Station', opensAt: '07:00', closesAt: '21:00', contact: '+91 80 4000 3001' },
  { id: 'blr-koramangala', city: 'Bengaluru', name: 'Koramangala Hub', area: 'Koramangala', address: '5th Block, Koramangala, Bengaluru 560095', landmark: 'Opposite Forum Mall', opensAt: '07:00', closesAt: '21:00', contact: '+91 80 4000 3002' },
  { id: 'blr-whitefield', city: 'Bengaluru', name: 'Whitefield Hub', area: 'Whitefield', address: 'ITPL Main Road, Whitefield, Bengaluru 560066', landmark: 'Near Phoenix Marketcity', opensAt: '07:00', closesAt: '21:00', contact: '+91 80 4000 3003' },
  { id: 'blr-airport', city: 'Bengaluru', name: 'Bengaluru Airport Hub', area: 'Kempegowda Airport', address: 'Multi-level Car Park, Kempegowda International Airport, Devanahalli 560300', landmark: 'Opposite Terminal 1 arrivals', opensAt: '06:00', closesAt: '23:00', contact: '+91 80 4000 3004' },

  // Delhi
  { id: 'del-cp', city: 'Delhi', name: 'Connaught Place Hub', area: 'Connaught Place', address: 'Block F, Connaught Place, New Delhi 110001', landmark: 'Near Rajiv Chowk Metro', opensAt: '07:00', closesAt: '21:00', contact: '+91 11 4000 4001' },
  { id: 'del-saket', city: 'Delhi', name: 'Saket Hub', area: 'Saket', address: 'Press Enclave Road, Saket, New Delhi 110017', landmark: 'Next to Select Citywalk', opensAt: '07:00', closesAt: '21:00', contact: '+91 11 4000 4002' },
  { id: 'del-airport', city: 'Delhi', name: 'Delhi Airport Hub', area: 'IGI Airport', address: 'Multi-level Car Park, Terminal 3, IGI Airport, New Delhi 110037', landmark: 'Opposite the T3 arrivals gate', opensAt: '06:00', closesAt: '23:00', contact: '+91 11 4000 4003' },

  // Hyderabad
  { id: 'hyd-hitec', city: 'Hyderabad', name: 'HITEC City Hub', area: 'HITEC City', address: 'Madhapur Main Road, HITEC City, Hyderabad 500081', landmark: 'Near Inorbit Mall', opensAt: '07:00', closesAt: '21:00', contact: '+91 40 4000 5001' },
  { id: 'hyd-banjara', city: 'Hyderabad', name: 'Banjara Hills Hub', area: 'Banjara Hills', address: 'Road No. 12, Banjara Hills, Hyderabad 500034', landmark: 'Beside City Centre Mall', opensAt: '07:00', closesAt: '21:00', contact: '+91 40 4000 5002' },
  { id: 'hyd-secunderabad', city: 'Hyderabad', name: 'Secunderabad Hub', area: 'Secunderabad Station', address: 'Station Road, Secunderabad, Hyderabad 500003', landmark: 'Opposite the railway station main gate', opensAt: '06:00', closesAt: '22:00', contact: '+91 40 4000 5003' },
];

/** Cities that have at least one hub, in display order (Pune first). */
export const MOCK_CITIES: string[] = [...new Set(MOCK_LOCATIONS.map((l) => l.city))];
