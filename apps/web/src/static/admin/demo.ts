import { MOCK_AIRLINES, MOCK_BUS_OPERATORS } from '@zproo/catalog';
import type {
  AdminCollections,
  AdminCollectionName,
  BookingStatus,
  PaymentStatus,
  RefundStatus,
  RoleName,
  ServiceType,
  UserStatus,
} from '@zproo/types';

/**
 * Deterministic sample data for the admin panel in demo mode: ~120 customers and roughly six
 * months of bookings, payments and refunds across every service. Generated from a fixed seed so
 * references stay stable between visits (admin changes are stored against them), with dates
 * relative to today so dashboards always look current.
 */

export function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Krishna', 'Ishaan', 'Rohan', 'Ananya', 'Diya', 'Aadhya', 'Saanvi', 'Pari', 'Anika', 'Navya', 'Myra', 'Kiara', 'Riya', 'Kabir', 'Dhruv', 'Meera', 'Nisha', 'Pooja', 'Rahul', 'Sneha', 'Tanvi', 'Varun', 'Zoya', 'Omkar', 'Prachi', 'Siddharth', 'Gauri', 'Yash'];
const LAST = ['Sharma', 'Verma', 'Patel', 'Iyer', 'Reddy', 'Nair', 'Kulkarni', 'Deshmukh', 'Joshi', 'Menon', 'Gupta', 'Singh', 'Chopra', 'Rao', 'Pillai', 'Banerjee', 'Das', 'Khan', 'Mehta', 'Shah', 'Patil', 'Jadhav'];
const CITIES = ['Pune', 'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Goa', 'Kochi', 'Jaipur', 'Chennai', 'Ahmedabad', 'Nagpur', 'Nashik'];

const FLIGHT_ROUTES: [string, string, number][] = [
  ['PNQ', 'DEL', 4200], ['BOM', 'GOI', 2400], ['BLR', 'DEL', 4800], ['PNQ', 'BLR', 3100], ['BOM', 'DEL', 4100],
  ['HYD', 'BOM', 3000], ['MAA', 'DEL', 5200], ['BOM', 'DXB', 14500], ['DEL', 'SIN', 19800], ['PNQ', 'HYD', 2900],
  ['CCU', 'BLR', 5600], ['JAI', 'BOM', 3600],
];
const BUS_ROUTES: [string, string, number][] = [
  ['Pune', 'Mumbai', 550], ['Pune', 'Goa', 1250], ['Mumbai', 'Nagpur', 1650], ['Pune', 'Nashik', 600], ['Mumbai', 'Kolhapur', 900],
  ['Pune', 'Hyderabad', 1400], ['Bengaluru', 'Goa', 1300], ['Pune', 'Nagpur', 1500], ['Mumbai', 'Goa', 1350], ['Pune', 'Shirdi', 650],
];
const TRAINS: [string, string, string, string, number][] = [
  ['12123', 'Deccan Queen', 'Pune Jn', 'Mumbai CSMT', 420], ['12149', 'Pune–Danapur SF Exp', 'Pune Jn', 'Danapur', 1650],
  ['22105', 'Indrayani Express', 'Mumbai CSMT', 'Pune Jn', 390], ['12629', 'Karnataka SF Exp', 'Pune Jn', 'New Delhi', 1980],
  ['12025', 'Shatabdi Express', 'Pune Jn', 'Secunderabad', 1450], ['11077', 'Jhelum Express', 'Pune Jn', 'Jammu Tawi', 2350],
  ['12779', 'Goa Express', 'Vasco da Gama', 'Hazrat Nizamuddin', 2150], ['17317', 'Hubballi Express', 'Pune Jn', 'Hubballi', 780],
];
const TRAIN_CLASSES = ['SL', '3A', '2A', 'CC', '3E', '1A'];
const HOTELS: [string, string, number][] = [
  ['Seaside Palms Resort', 'Goa', 6800], ['The Deccan Grand', 'Pune', 4800], ['Marine Bay Suites', 'Mumbai', 8900],
  ['Lake Palace Retreat', 'Udaipur', 11200], ['Backwater Bliss', 'Kochi', 5600], ['Himalayan Pines Lodge', 'Manali', 4200],
  ['Capital Business Hotel', 'Delhi', 5900], ['Garden City Inn', 'Bengaluru', 3900], ['Pink City Haveli', 'Jaipur', 4600],
];
const CAB_VEHICLES: [string, number][] = [['Bike Taxi', 140], ['Auto', 220], ['Mini', 380], ['Sedan', 620], ['SUV', 980], ['Premium', 1400]];
const CAB_AREAS = ['Hinjewadi', 'Kothrud', 'Baner', 'Viman Nagar', 'Pune Airport', 'Shivajinagar', 'Hadapsar', 'Wakad', 'Koregaon Park'];
const BIKES: [string, number][] = [['Honda Activa 6G', 450], ['TVS Jupiter 125', 480], ['Royal Enfield Classic 350', 1400], ['Bajaj Pulsar NS200', 950], ['Ather 450X', 800], ['KTM Duke 390', 1800]];
const PARCEL_ROUTES: [string, string, number][] = [['Pune', 'Mumbai', 180], ['Pune', 'Nashik', 160], ['Mumbai', 'Nagpur', 320], ['Pune', 'Kolhapur', 210], ['Mumbai', 'Pune', 180]];
const HOLIDAYS: [string, string, number][] = [
  ['Goa Beach Bliss', 'Goa', 14999], ['Kashmir Paradise Escape', 'Kashmir', 28499], ['Kerala Backwater Retreat', 'Kerala', 22999],
  ['Royal Rajasthan Heritage', 'Rajasthan', 31999], ['Manali Snow Adventure', 'Manali', 17499], ['Dubai Dazzle Getaway', 'Dubai', 54999],
];
const METHODS: [string, number][] = [['UPI', 0.55], ['Card', 0.25], ['Net banking', 0.1], ['Wallet', 0.1]];
const SERVICE_WEIGHTS: [ServiceType, number][] = [
  ['FLIGHT', 0.24], ['BUS', 0.22], ['TRAIN', 0.17], ['HOTEL', 0.15], ['CAB', 0.11], ['BIKE', 0.04], ['PARCEL', 0.05], ['HOLIDAY', 0.02],
];

export interface DemoUser {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  status: UserStatus;
  roles: RoleName[];
  createdAt: string;
  lastLoginAt: string | null;
}

export interface DemoPayment {
  id: string;
  amountPaise: number;
  status: PaymentStatus;
  method: string;
  provider: string;
  createdAt: string;
}

export interface DemoRefund {
  id: string;
  amountPaise: number;
  status: RefundStatus;
  reason: string;
  createdAt: string;
  completedAt: string | null;
}

export interface DemoBooking {
  reference: string;
  serviceType: ServiceType;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  title: string;
  subtitle: string;
  routeLabel: string;
  userId: string;
  customerName: string;
  customerContact: string;
  travelDate: string;
  totalPaise: number;
  createdAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  passengers: { name: string; detail: string }[];
  priceLines: { label: string; paise: number }[];
  payments: DemoPayment[];
  refund: DemoRefund | null;
  couponCode: string | null;
}

export interface DemoData {
  users: DemoUser[];
  bookings: DemoBooking[];
}

const DAY = 86_400_000;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

let cache: { key: string; data: DemoData } | null = null;

/** Sample data for `seed`, dated relative to today. Cached per seed and day. */
export function demoData(seed: number): DemoData {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const key = `${seed}:${today.toISOString()}`;
  if (cache?.key === key) return cache.data;
  const data = generate(seed, today.getTime());
  cache = { key, data };
  return data;
}

function generate(seed: number, todayMs: number): DemoData {
  const r = mulberry32(seed);
  const int = (min: number, max: number) => min + Math.floor(r() * (max - min + 1));
  const pick = <T>(list: readonly T[]): T => list[Math.floor(r() * list.length)] as T;
  const weighted = <T>(list: readonly (readonly [T, number])[]): T => {
    let x = r();
    for (const [value, weight] of list) {
      if ((x -= weight) <= 0) return value;
    }
    return (list[list.length - 1] as readonly [T, number])[0];
  };
  const code = (n: number) => Array.from({ length: n }, () => ALPHABET[Math.floor(r() * ALPHABET.length)]).join('');
  const now = Date.now();

  // ── Customers ──
  const users: DemoUser[] = Array.from({ length: 120 }, (_, i) => {
    const first = pick(FIRST);
    const last = pick(LAST);
    const createdAt = todayMs - int(0, 365) * DAY + int(8, 22) * 3_600_000;
    const roll = r();
    return {
      id: `demo-user-${String(i + 1).padStart(3, '0')}`,
      fullName: `${first} ${last}`,
      phone: `+91${pick(['98', '97', '99', '88', '70', '81'])}${String(int(10_000_000, 99_999_999))}`,
      email: `${first}.${last}${i + 1}@example.com`.toLowerCase(),
      status: roll < 0.04 ? 'SUSPENDED' : roll < 0.07 ? 'INACTIVE' : 'ACTIVE',
      roles: ['USER'],
      createdAt: new Date(Math.min(createdAt, now)).toISOString(),
      lastLoginAt: r() < 0.9 ? new Date(Math.min(todayMs - int(0, 45) * DAY + int(7, 23) * 3_600_000, now)).toISOString() : null,
    };
  });

  // ── Bookings: ~180 days, gently growing, busier at weekends ──
  const bookings: DemoBooking[] = [];
  const usedRefs = new Set<string>();
  for (let daysAgo = 179; daysAgo >= 0; daysAgo -= 1) {
    const dayStart = todayMs - daysAgo * DAY;
    const weekday = new Date(dayStart).getDay();
    const growth = (180 - daysAgo) / 60;
    const count = Math.max(1, Math.round(3 + growth + (weekday === 5 || weekday === 6 ? 2 : 0) + (r() * 4 - 1.5)));
    for (let n = 0; n < count; n += 1) {
      const createdMs = Math.min(dayStart + int(6, 23) * 3_600_000 + int(0, 59) * 60_000, now - int(1, 30) * 60_000);
      const user = pick(users);
      const service = weighted(SERVICE_WEIGHTS);
      const pax = service === 'CAB' || service === 'PARCEL' || service === 'BIKE' ? 1 : weighted([[1, 0.5], [2, 0.3], [3, 0.12], [4, 0.08]] as const);
      const lead = service === 'CAB' ? int(0, 2) : service === 'PARCEL' ? int(0, 1) : int(1, 40);
      const travelMs = createdMs + lead * DAY;
      const travelDate = new Date(travelMs).toISOString().slice(0, 10);
      let title = '';
      let subtitle = '';
      let routeLabel = '';
      let base = 0;
      switch (service) {
        case 'FLIGHT': {
          const [from, to, fare] = pick(FLIGHT_ROUTES);
          const airline = pick(MOCK_AIRLINES);
          title = `${from} → ${to}`;
          subtitle = `${airline.name} ${airline.code}${int(100, 999)} · ${pax} traveller${pax > 1 ? 's' : ''}`;
          routeLabel = `${from} → ${to}`;
          base = Math.round(fare * (0.8 + r() * 0.9)) * pax;
          break;
        }
        case 'BUS': {
          const [from, to, fare] = pick(BUS_ROUTES);
          const op = pick(MOCK_BUS_OPERATORS);
          title = `${from} → ${to}`;
          subtitle = `${op.name} · Seat${pax > 1 ? 's' : ''} ${Array.from({ length: pax }, () => `${pick(['L', 'U', 'S'])}${int(1, 36)}`).join(', ')}`;
          routeLabel = `${from} → ${to}`;
          base = Math.round(fare * (0.85 + r() * 0.6)) * pax;
          break;
        }
        case 'TRAIN': {
          const [num, name, from, to, fare] = pick(TRAINS);
          const cls = pick(TRAIN_CLASSES);
          const mult = { SL: 1, '3E': 2.2, '3A': 2.6, CC: 1.9, '2A': 3.7, '1A': 6.2 }[cls] ?? 1;
          title = `${from} → ${to}`;
          subtitle = `${num} ${name} · ${cls} · ${pax} passenger${pax > 1 ? 's' : ''}`;
          routeLabel = `${from} → ${to}`;
          base = Math.round((fare * mult) / 2.4) * pax;
          break;
        }
        case 'HOTEL': {
          const [name, city, rate] = pick(HOTELS);
          const nights = int(1, 4);
          const rooms = pax > 2 ? 2 : 1;
          title = name;
          subtitle = `${city} · ${nights} night${nights > 1 ? 's' : ''} · ${rooms} room${rooms > 1 ? 's' : ''}`;
          routeLabel = city;
          base = Math.round(rate * (0.8 + r() * 0.5)) * nights * rooms;
          break;
        }
        case 'CAB': {
          const [vehicle, fare] = pick(CAB_VEHICLES);
          const from = pick(CAB_AREAS);
          let to = pick(CAB_AREAS);
          if (to === from) to = 'Pune Railway Station';
          title = `${from} → ${to}`;
          subtitle = `${vehicle} · ${int(4, 38)} km`;
          routeLabel = `Pune cabs (${vehicle})`;
          base = Math.round(fare * (0.7 + r() * 0.9));
          break;
        }
        case 'BIKE': {
          const [bike, daily] = pick(BIKES);
          const days = int(1, 4);
          title = bike;
          subtitle = `${pick(['Pune', 'Goa', 'Mumbai'])} · ${days} day${days > 1 ? 's' : ''}`;
          routeLabel = bike;
          base = daily * days;
          break;
        }
        case 'PARCEL': {
          const [from, to, fare] = pick(PARCEL_ROUTES);
          const kg = int(1, 12);
          title = `${from} → ${to}`;
          subtitle = `${pick(['Standard', 'Express', 'Same-day'])} · ${kg} kg`;
          routeLabel = `${from} → ${to}`;
          base = fare + kg * 22;
          break;
        }
        case 'HOLIDAY': {
          const [name, dest, price] = pick(HOLIDAYS);
          title = name;
          subtitle = `${dest} · ${pax} traveller${pax > 1 ? 's' : ''}`;
          routeLabel = dest;
          base = price * pax;
          break;
        }
        default:
          break;
      }
      const basePaise = base * 100;
      const taxPaise = Math.round(basePaise * (service === 'HOTEL' ? 0.12 : service === 'PARCEL' ? 0.18 : 0.05));
      const feePaise = service === 'FLIGHT' || service === 'HOTEL' ? 19_900 : service === 'BUS' || service === 'TRAIN' ? 2_900 * pax : 0;
      const couponCode = r() < 0.18 ? pick(['ZPFLY', 'BUS150', 'TRAIN50', 'STAY20', 'FIRSTRIDE', 'PARCEL10']) : null;
      const discountPaise = couponCode ? Math.min(Math.round(basePaise * 0.1), 50_000) : 0;
      const totalPaise = basePaise + taxPaise + feePaise - discountPaise;

      let reference = '';
      do reference = `ZP-${new Date(createdMs).getFullYear()}-${code(6)}`;
      while (usedRefs.has(reference));
      usedRefs.add(reference);

      // ── Status ──
      const ageDays = (now - createdMs) / DAY;
      const roll = r();
      let status: BookingStatus;
      if (ageDays < 0.03 && roll < 0.35) status = 'PENDING_PAYMENT';
      else if (roll < 0.06) status = 'CANCELLED'; // unpaid hold that expired
      else if (roll < 0.17) status = 'REFUNDED';
      else if (service === 'TRAIN' && ageDays < 1 && roll < 0.25) status = 'PROCESSING';
      else status = travelMs < now ? 'COMPLETED' : 'CONFIRMED';
      const unpaid = status === 'PENDING_PAYMENT' || (status === 'CANCELLED' && roll < 0.06);
      const method = weighted(METHODS);
      const payments: DemoPayment[] = [];
      if (r() < 0.08) {
        payments.push({
          id: `pay_${reference.slice(-6).toLowerCase()}_f`,
          amountPaise: totalPaise,
          status: 'FAILED',
          method: weighted(METHODS),
          provider: 'razorpay',
          createdAt: new Date(createdMs + 60_000).toISOString(),
        });
      }
      const paidAt = createdMs + int(2, 9) * 60_000;
      let refund: DemoRefund | null = null;
      let cancelledAt: string | null = null;
      let cancellationReason: string | null = null;
      let paymentStatus: PaymentStatus = unpaid ? (status === 'CANCELLED' ? 'CANCELLED' : 'CREATED') : 'SUCCESS';
      if (status === 'REFUNDED') {
        const cancelMs = Math.min(paidAt + int(1, Math.max(1, Math.floor(ageDays))) * DAY * 0.6, now - 3_600_000);
        cancelledAt = new Date(cancelMs).toISOString();
        cancellationReason = pick(['Change of plans', 'Booked by mistake', 'Found a better option', 'Medical emergency', 'Trip postponed']);
        const fee = Math.round(totalPaise * pick([0, 0.1, 0.15, 0.25]));
        const refundAge = (now - cancelMs) / DAY;
        const refundStatus: RefundStatus = refundAge > 5 ? 'COMPLETED' : refundAge > 1.5 ? 'PROCESSING' : 'REQUESTED';
        refund = {
          id: `rfd_${reference.slice(-6).toLowerCase()}`,
          amountPaise: totalPaise - fee,
          status: refundStatus,
          reason: cancellationReason,
          createdAt: cancelledAt,
          completedAt: refundStatus === 'COMPLETED' ? new Date(cancelMs + int(2, 5) * DAY).toISOString() : null,
        };
        if (refundStatus !== 'COMPLETED') status = 'REFUND_PENDING';
        paymentStatus = refundStatus === 'COMPLETED' ? (fee > 0 ? 'PARTIALLY_REFUNDED' : 'REFUNDED') : 'SUCCESS';
      } else if (status === 'CANCELLED') {
        cancelledAt = new Date(createdMs + 15 * 60_000).toISOString();
        cancellationReason = 'Payment not completed in time';
      }
      payments.push({
        id: `pay_${reference.slice(-6).toLowerCase()}`,
        amountPaise: totalPaise,
        status: unpaid ? (status === 'CANCELLED' ? 'CANCELLED' : 'CREATED') : refund?.status === 'COMPLETED' ? paymentStatus : 'SUCCESS',
        method,
        provider: 'razorpay',
        createdAt: new Date(unpaid ? createdMs : paidAt).toISOString(),
      });

      const passengers = Array.from({ length: Math.max(1, service === 'HOTEL' ? Math.min(pax, 2) : pax) }, (_, i) => ({
        name: i === 0 ? user.fullName : `${pick(FIRST)} ${user.fullName.split(' ')[1] ?? pick(LAST)}`,
        detail: service === 'PARCEL' ? 'Sender' : service === 'CAB' || service === 'BIKE' ? 'Rider' : `${pick(['Adult', 'Adult', 'Adult', 'Child'])} · ${pick(['M', 'F'])} · ${int(8, 64)} yrs`,
      }));
      const priceLines = [
        { label: 'Base fare', paise: basePaise },
        { label: 'Taxes', paise: taxPaise },
        ...(feePaise ? [{ label: 'Convenience fee', paise: feePaise }] : []),
        ...(discountPaise ? [{ label: `Coupon ${couponCode}`, paise: -discountPaise }] : []),
      ];

      bookings.push({
        reference,
        serviceType: service,
        status,
        paymentStatus,
        title,
        subtitle,
        routeLabel,
        userId: user.id,
        customerName: user.fullName,
        customerContact: user.phone,
        travelDate,
        totalPaise,
        createdAt: new Date(createdMs).toISOString(),
        confirmedAt: unpaid ? null : new Date(paidAt + 30_000).toISOString(),
        cancelledAt,
        cancellationReason,
        passengers,
        priceLines,
        payments,
        refund,
        couponCode,
      });
    }
  }
  bookings.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { users, bookings };
}

// ───────── Starter documents for editable collections ─────────

const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();

type Starter = { [K in AdminCollectionName]: () => AdminCollections[K][] };

export const STARTERS: Starter = {
  coupons: () => {
    const base = { usedCount: 0, perUserLimit: 1, createdAt: iso(-60), updatedAt: iso(-60), maxDiscountPaise: null as number | null, usageLimit: null as number | null };
    return [
      { ...base, id: 'cpn_zpfly', code: 'ZPFLY', description: '10% off domestic flights, up to ₹1,000', discountType: 'PERCENT', value: 10, maxDiscountPaise: 100_000, minOrderPaise: 300_000, services: ['FLIGHT'], validFrom: iso(-60), validTo: iso(60), usageLimit: 5000, usedCount: 1840, active: true },
      { ...base, id: 'cpn_bus150', code: 'BUS150', description: '₹150 off bus tickets above ₹999', discountType: 'FLAT', value: 15_000, minOrderPaise: 99_900, services: ['BUS'], validFrom: iso(-45), validTo: iso(45), usedCount: 932, active: true },
      { ...base, id: 'cpn_train50', code: 'TRAIN50', description: '₹50 off the convenience fee on trains', discountType: 'FLAT', value: 5_000, minOrderPaise: 0, services: ['TRAIN'], validFrom: iso(-30), validTo: iso(30), usedCount: 611, active: true },
      { ...base, id: 'cpn_stay20', code: 'STAY20', description: '20% off hotel stays of 2+ nights, up to ₹2,500', discountType: 'PERCENT', value: 20, maxDiscountPaise: 250_000, minOrderPaise: 400_000, services: ['HOTEL'], validFrom: iso(-20), validTo: iso(40), usedCount: 418, active: true },
      { ...base, id: 'cpn_firstride', code: 'FIRSTRIDE', description: '50% off your first cab ride, up to ₹100', discountType: 'PERCENT', value: 50, maxDiscountPaise: 10_000, minOrderPaise: 0, services: ['CAB'], validFrom: iso(-90), validTo: iso(90), perUserLimit: 1, usedCount: 2210, active: true },
      { ...base, id: 'cpn_bike10', code: 'BIKE10', description: '10% off bike rentals, up to ₹300', discountType: 'PERCENT', value: 10, maxDiscountPaise: 30_000, minOrderPaise: 50_000, services: ['BIKE'], validFrom: iso(-30), validTo: iso(60), usedCount: 84, active: true },
      { ...base, id: 'cpn_holiday10', code: 'HOLIDAY10', description: '10% off holiday packages, up to ₹3,000', discountType: 'PERCENT', value: 10, maxDiscountPaise: 300_000, minOrderPaise: 1_000_000, services: ['HOLIDAY'], validFrom: iso(-30), validTo: iso(60), usedCount: 37, active: true },
      { ...base, id: 'cpn_parcel10', code: 'PARCEL10', description: '10% off parcel deliveries', discountType: 'PERCENT', value: 10, minOrderPaise: 0, services: ['PARCEL'], validFrom: iso(-15), validTo: iso(75), usedCount: 157, active: true },
      { ...base, id: 'cpn_ship20', code: 'SHIP20', description: '20% off your first parcel, up to ₹150', discountType: 'PERCENT', value: 20, maxDiscountPaise: 15_000, minOrderPaise: 20_000, services: ['PARCEL'], validFrom: iso(-15), validTo: iso(75), usedCount: 42, active: true },
      { ...base, id: 'cpn_monsoon', code: 'MONSOON25', description: 'Monsoon sale: 25% off holidays (ended)', discountType: 'PERCENT', value: 25, maxDiscountPaise: 500_000, minOrderPaise: 1_000_000, services: ['HOLIDAY'], validFrom: iso(-120), validTo: iso(-20), usedCount: 96, active: false },
    ];
  },
  offers: () => {
    const base = { createdAt: iso(-30), updatedAt: iso(-30) };
    return [
      { ...base, id: 'ofr_flights', title: 'Up to 10% off domestic flights', subtitle: 'Use ZPFLY on fares above ₹3,000', service: 'FLIGHT', couponCode: 'ZPFLY', ctaLabel: 'Search flights', ctaPath: '/flights', validTo: iso(60), featured: true, active: true, sortOrder: 1 },
      { ...base, id: 'ofr_bus', title: 'Flat ₹150 off bus tickets', subtitle: 'Overnight sleepers across Maharashtra', service: 'BUS', couponCode: 'BUS150', ctaLabel: 'Book a bus', ctaPath: '/buses', validTo: iso(45), featured: true, active: true, sortOrder: 2 },
      { ...base, id: 'ofr_hotels', title: '20% off weekend stays', subtitle: 'Stay 2 nights or more with STAY20', service: 'HOTEL', couponCode: 'STAY20', ctaLabel: 'Find hotels', ctaPath: '/hotels', validTo: iso(40), featured: false, active: true, sortOrder: 3 },
      { ...base, id: 'ofr_cabs', title: 'Half price on your first ride', subtitle: 'New riders only, up to ₹100', service: 'CAB', couponCode: 'FIRSTRIDE', ctaLabel: 'Book a cab', ctaPath: '/cabs', validTo: iso(90), featured: false, active: true, sortOrder: 4 },
    ];
  },
  tickets: () => {
    const t = (
      n: number,
      subject: string,
      category: AdminCollections['tickets']['category'],
      priority: AdminCollections['tickets']['priority'],
      status: AdminCollections['tickets']['status'],
      name: string,
      ageDays: number,
      message: string,
      reply?: string,
    ): AdminCollections['tickets'] => ({
      id: `tkt_${n}`,
      number: `ZT-${String(1040 + n)}`,
      subject,
      category,
      priority,
      status,
      customerName: name,
      customerEmail: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      customerPhone: `+9198${String(20_000_000 + n * 7919).slice(0, 8)}`,
      bookingReference: category === 'BOOKING' || category === 'REFUND' || category === 'PAYMENT' ? `ZP-2026-${['K3QX9A', 'M7PT2C', 'B9RD4E', 'H2WN8F', 'Q5ZL3G'][n % 5]}` : null,
      assignee: status === 'OPEN' ? null : 'Support Agent',
      messages: [
        { id: `msg_${n}_1`, author: 'CUSTOMER', name, body: message, internal: false, at: iso(-ageDays) },
        ...(reply ? [{ id: `msg_${n}_2`, author: 'AGENT' as const, name: 'Support Agent', body: reply, internal: false, at: iso(-ageDays + 0.2) }] : []),
      ],
      createdAt: iso(-ageDays),
      updatedAt: iso(-ageDays + (reply ? 0.2 : 0)),
    });
    return [
      t(1, 'Refund not received after cancellation', 'REFUND', 'HIGH', 'OPEN', 'Ananya Iyer', 0.3, 'I cancelled my Pune → Goa bus 4 days ago and the refund still shows as processing. Can you check?'),
      t(2, 'Charged twice for a flight booking', 'PAYMENT', 'URGENT', 'IN_PROGRESS', 'Rohan Kulkarni', 0.8, 'My card was debited twice for the same booking. Please refund the duplicate charge.', 'Sorry about this, Rohan. One of the two charges was a failed attempt that the bank will reverse within 5–7 working days. We have raised it with the gateway.'),
      t(3, 'Need to change the name on my train ticket', 'BOOKING', 'MEDIUM', 'WAITING_ON_CUSTOMER', 'Meera Nair', 2, 'I misspelt my mother’s name. Can I change it?', 'Railway rules do not allow name changes, but we can help you cancel and rebook. Would you like us to do that?'),
      t(4, 'Hotel asked for extra payment at check-in', 'BOOKING', 'HIGH', 'OPEN', 'Kabir Shah', 0.1, 'The hotel in Goa wants ₹1,200 more than the amount on my voucher.'),
      t(5, 'Cannot log in with OTP', 'ACCOUNT', 'MEDIUM', 'RESOLVED', 'Diya Patel', 6, 'The OTP never arrives on my phone.', 'We found your number was on DND for transactional SMS. It works now — please try again.'),
      t(6, 'Loved the bike rental experience', 'FEEDBACK', 'LOW', 'CLOSED', 'Arjun Reddy', 12, 'Smooth pickup and a well-maintained bike. Thanks!', 'Thank you, Arjun — we have shared this with the Pune hub team.'),
      t(7, 'Parcel shows delivered but not received', 'BOOKING', 'HIGH', 'IN_PROGRESS', 'Pooja Deshmukh', 1.5, 'Tracking says delivered yesterday but the receiver has nothing.', 'We are checking the delivery photo and GPS with the courier partner.'),
      t(8, 'Wallet cashback missing', 'PAYMENT', 'LOW', 'OPEN', 'Varun Menon', 3, 'I was promised ₹100 cashback on my first booking but the wallet shows ₹0.'),
    ];
  },
  notifications: () => {
    const base = { createdAt: iso(-10), updatedAt: iso(-10), linkPath: null as string | null, scheduledFor: null as string | null };
    return [
      { ...base, id: 'ntf_1', title: 'Diwali sale is live', body: 'Up to 25% off flights, buses and hotels. Ends Sunday.', audience: 'ALL_USERS', channels: ['IN_APP', 'PUSH', 'EMAIL'], linkPath: '/offers', status: 'SENT', sentAt: iso(-10), recipients: 12480 },
      { ...base, id: 'ntf_2', title: 'Monsoon travel advisory', body: 'Some Konkan routes may run late. Check your trip status before leaving.', audience: 'RECENT_CUSTOMERS', channels: ['SMS', 'IN_APP'], status: 'SENT', sentAt: iso(-25), recipients: 3120 },
      { ...base, id: 'ntf_3', title: 'We miss you!', body: 'Here is ₹100 off your next ride with code COMEBACK.', audience: 'INACTIVE_USERS', channels: ['EMAIL'], status: 'SCHEDULED', scheduledFor: iso(3), sentAt: null, recipients: 0 },
    ];
  },
  partners: () => {
    const base = { createdAt: iso(-200), updatedAt: iso(-30), gstin: null as string | null };
    return [
      ...MOCK_AIRLINES.slice(0, 4).map((a, i) => ({ ...base, id: `ptn_air_${a.code}`, name: a.name, type: 'AIRLINE' as const, contactName: 'Partner desk', email: `partners@${a.name.toLowerCase().replace(/\s+/g, '')}.example`, phone: `+91 22 6000 10${i}0`, city: 'Mumbai', commissionPct: 3, status: 'ACTIVE' as const, listings: 40 + i * 12 })),
      ...MOCK_BUS_OPERATORS.slice(0, 5).map((o, i) => ({ ...base, id: `ptn_bus_${o.code}`, name: o.name, type: 'BUS_OPERATOR' as const, contactName: 'Operations', email: `ops@${o.code.toLowerCase()}.example`, phone: `+91 20 2600 20${i}0`, city: 'Pune', gstin: `27ABCDE${1230 + i}F1Z${i}`, commissionPct: 8, status: (i === 4 ? 'PENDING' : 'ACTIVE') as 'PENDING' | 'ACTIVE', listings: 12 + i * 3 })),
      { ...base, id: 'ptn_htl_seaside', name: 'Seaside Palms Resort', type: 'HOTEL', contactName: 'Revenue manager', email: 'revenue@seasidepalms.example', phone: '+91 832 240 1000', city: 'Goa', commissionPct: 15, status: 'ACTIVE', listings: 6 },
      { ...base, id: 'ptn_fleet_city', name: 'CityRide Fleet Pvt Ltd', type: 'CAB_FLEET', contactName: 'Fleet owner', email: 'fleet@cityride.example', phone: '+91 20 4100 2200', city: 'Pune', commissionPct: 20, status: 'ACTIVE', listings: 84 },
      { ...base, id: 'ptn_bike_ride', name: 'RideOn Rentals', type: 'BIKE_RENTAL', contactName: 'Hub manager', email: 'hello@rideon.example', phone: '+91 20 4100 3300', city: 'Pune', commissionPct: 18, status: 'SUSPENDED', listings: 22 },
    ];
  },
  drivers: () => {
    const r = mulberry32(77);
    const types: AdminCollections['drivers']['vehicleType'][] = ['BIKE', 'AUTO', 'MINI', 'SEDAN', 'SUV'];
    return Array.from({ length: 18 }, (_, i) => {
      const status: AdminCollections['drivers']['status'] = i % 9 === 4 ? 'PENDING_KYC' : i % 11 === 7 ? 'SUSPENDED' : 'ACTIVE';
      return {
        id: `drv_${i + 1}`,
        name: `${FIRST[(i * 7) % FIRST.length]} ${LAST[(i * 5) % LAST.length]}`,
        phone: `+91 9${String(800_000_000 + i * 104_729).slice(0, 9)}`,
        city: CITIES[i % 4] as string,
        vehicleType: types[i % types.length] as AdminCollections['drivers']['vehicleType'],
        vehicleNumber: `MH 12 ${['AB', 'CD', 'EF', 'GH'][i % 4]} ${String(1000 + Math.floor(r() * 8999))}`,
        licenceNumber: `MH12${2015 + (i % 9)}000${String(1000 + i * 37)}`,
        status,
        online: status === 'ACTIVE' && r() < 0.55,
        rating: Math.round((4 + r() * 0.95) * 10) / 10,
        trips: Math.floor(r() * 2400),
        createdAt: iso(-Math.floor(r() * 400) - 10),
        updatedAt: iso(-Math.floor(r() * 10)),
      };
    });
  },
};
