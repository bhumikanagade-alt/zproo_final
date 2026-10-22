/**
 * Demo users for development: one account per staff role plus customers (100 users in total).
 * No passwords are stored — sign in with mobile OTP (in development the code is shown on screen).
 * Skipped when NODE_ENV=production.
 */
import type { PrismaClient, RoleName } from '@prisma/client';

const FIRST = [
  'Aarav',
  'Vivaan',
  'Aditya',
  'Vihaan',
  'Arjun',
  'Sai',
  'Reyansh',
  'Krishna',
  'Ishaan',
  'Rohan',
  'Ananya',
  'Diya',
  'Aadhya',
  'Saanvi',
  'Pari',
  'Anika',
  'Navya',
  'Myra',
  'Kiara',
  'Riya',
  'Kabir',
  'Dhruv',
  'Meera',
  'Nisha',
  'Pooja',
  'Rahul',
  'Sneha',
  'Tanvi',
  'Varun',
  'Zoya',
];
const LAST = [
  'Sharma',
  'Verma',
  'Patel',
  'Iyer',
  'Reddy',
  'Nair',
  'Kulkarni',
  'Deshmukh',
  'Joshi',
  'Menon',
  'Gupta',
  'Singh',
  'Chopra',
  'Rao',
  'Pillai',
  'Banerjee',
  'Das',
  'Khan',
  'Mehta',
  'Shah',
];
const CITIES = [
  'Pune',
  'Mumbai',
  'Delhi',
  'Bangalore',
  'Hyderabad',
  'Goa',
  'Kochi',
  'Jaipur',
  'Chennai',
  'Ahmedabad',
];

const STAFF: { role: RoleName; name: string }[] = [
  { role: 'SUPER_ADMIN', name: 'Super Admin' },
  { role: 'ADMIN', name: 'Platform Admin' },
  { role: 'SUPPORT', name: 'Support Agent' },
  { role: 'OPERATOR', name: 'Operations Manager' },
  { role: 'DRIVER', name: 'Rohit Kumar' },
  { role: 'DRIVER', name: 'Sunil Yadav' },
  { role: 'HOTEL_PARTNER', name: 'Goa Beach Resort' },
  { role: 'TRAVEL_PARTNER', name: 'Konkan Travels' },
  { role: 'CORPORATE_ADMIN', name: 'Acme Travel Desk' },
];

const TOTAL_USERS = 100;

/** Deterministic PRNG so every developer gets the same demo data. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const phoneFor = (n: number) => `+9190000${String(n).padStart(5, '0')}`;

export async function seedDemoUsers(prisma: PrismaClient): Promise<{ printed?: string }> {
  if (process.env.NODE_ENV === 'production') return {};
  const random = mulberry32(2026);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)] as T;
  const roles = new Map((await prisma.role.findMany()).map((r) => [r.name, r.id]));
  const roleId = (name: RoleName) => {
    const id = roles.get(name);
    if (!id) throw new Error(`Role ${name} missing — reference data must be seeded first`);
    return id;
  };

  const people = [
    ...STAFF.map((s, i) => ({
      n: i + 1,
      fullName: s.name,
      role: s.role,
      email: `${s.role.toLowerCase().replace(/_/g, '.')}${i + 1}@example.com`,
    })),
    ...Array.from({ length: TOTAL_USERS - STAFF.length }, (_, i) => {
      const first = pick(FIRST);
      const last = pick(LAST);
      const n = STAFF.length + i + 1;
      return {
        n,
        fullName: `${first} ${last}`,
        role: 'USER' as RoleName,
        email: `${first}.${last}${n}@example.com`.toLowerCase(),
      };
    }),
  ];

  for (const person of people) {
    const createdAt = new Date(Date.UTC(2026, 0, 1) + Math.floor(random() * 260) * 86_400_000);
    const phone = phoneFor(person.n);
    // Keyed on phone; staff always get their role, customers keep whatever they have.
    await prisma.user.upsert({
      where: { phone },
      update: {},
      create: {
        phone,
        email: person.email,
        fullName: person.fullName,
        phoneVerifiedAt: createdAt,
        createdAt,
        roles: { create: { roleId: roleId(person.role) } },
        ...(person.role === 'USER' &&
          random() < 0.6 && {
            addresses: {
              create: {
                label: 'Home',
                line1: `${Math.floor(random() * 300) + 1}, MG Road`,
                city: pick(CITIES),
                state: 'Maharashtra',
                postalCode: '411001',
              },
            },
          }),
      },
    });
  }

  const lines = STAFF.map(
    (s, i) => `  ${s.role.padEnd(16)} ${phoneFor(i + 1).slice(3)}  (${s.name})`,
  );
  return {
    printed: `Demo sign-in (development): log in with mobile OTP using these numbers:\n${lines.join('\n')}\n  Customers: ${phoneFor(STAFF.length + 1).slice(3)} … ${phoneFor(TOTAL_USERS).slice(3)}`,
  };
}
