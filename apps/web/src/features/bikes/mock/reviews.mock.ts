import type { BikeReview } from '../types';
import { MOCK_BIKES } from './bikes.mock';

/** Mock rider reviews. Replace with `GET /bikes/:id/reviews` when the backend ships. */
type Seed = Omit<BikeReview, 'id' | 'bikeId'>;

const seeds: Record<string, Seed[]> = {
  'honda-activa-6g': [
    { author: 'Neha K.', rating: 5, title: 'Perfect for Pune traffic', body: 'Light, smooth and the under-seat storage fit my helmet and a daypack. Pickup at the station took five minutes.', date: '2026-09-21', tripType: '2-day rental' },
    { author: 'Rahul S.', rating: 4, title: 'Reliable and easy', body: 'Great mileage and no surprises. Wished the pickup queue was shorter on Saturday morning.', date: '2026-09-03', tripType: '1-day rental' },
    { author: 'Aisha M.', rating: 5, title: 'Comfortable for two', body: 'We rode all day around Koregaon Park and Aga Khan Palace without any trouble.', date: '2026-08-17', tripType: 'Weekend rental' },
  ],
  'royal-enfield-classic-350': [
    { author: 'Vikram P.', rating: 5, title: 'Made our Sahyadri trip', body: 'Pulled strongly on the ghats and stayed comfortable for 300 km. The bike was clean and the paperwork was quick.', date: '2026-09-28', tripType: '3-day rental' },
    { author: 'Sneha D.', rating: 5, title: 'The thump is addictive', body: 'Easy to ride for a first-time Enfield rider. Staff explained the gearing patiently.', date: '2026-09-09', tripType: 'Weekend rental' },
    { author: 'Imran Q.', rating: 4, title: 'Heavy but stable', body: 'Great on highways, a bit heavy in tight lanes. Would rent again for a long ride.', date: '2026-08-30', tripType: '2-day rental' },
  ],
  'yamaha-r15-v4': [
    { author: 'Karan T.', rating: 5, title: 'Sharp and fast', body: 'Quickshifter is a joy on the Mumbai–Pune expressway. Good grip and brakes.', date: '2026-09-18', tripType: '1-day rental' },
    { author: 'Pooja L.', rating: 4, title: 'Not for slow commutes', body: 'Riding position is aggressive for city use but brilliant on open roads.', date: '2026-09-02', tripType: 'Weekend rental' },
  ],
  'ola-s1-pro': [
    { author: 'Arjun N.', rating: 4, title: 'Silent and quick', body: 'Range was more than enough for a full day around Hinjewadi. Charging at the hub was free and easy.', date: '2026-09-25', tripType: '1-day rental' },
    { author: 'Meera R.', rating: 4, title: 'Fun to ride', body: 'The touchscreen takes getting used to, but acceleration is great for overtakes in traffic.', date: '2026-09-11', tripType: '2-day rental' },
  ],
  'royal-enfield-himalayan': [
    { author: 'Rohit G.', rating: 5, title: 'Handles bad roads easily', body: 'Long-travel suspension swallowed broken patches near Tamhini. The rack carried our bags without fuss.', date: '2026-09-15', tripType: '4-day rental' },
    { author: 'Tanvi B.', rating: 4, title: 'Tall but confident', body: 'Seat height is on the high side for me, but it feels planted at speed.', date: '2026-08-26', tripType: '3-day rental' },
  ],
};

/** Generic fallback so every bike has at least a couple of reviews in the demo. */
const generic: Seed[] = [
  { author: 'Sanjay V.', rating: 4, title: 'Good bike, smooth rental', body: 'Bike was clean, tank was full and the handover took only a few minutes.', date: '2026-09-12', tripType: '1-day rental' },
  { author: 'Divya A.', rating: 5, title: 'Would rent again', body: 'Everything matched the listing. Helpful staff at the hub and no hidden charges.', date: '2026-08-29', tripType: '2-day rental' },
];


export const MOCK_REVIEWS: BikeReview[] = MOCK_BIKES.flatMap((b) =>
  (seeds[b.id] ?? generic).map((r, i) => ({ ...r, id: `${b.id}-r${i + 1}`, bikeId: b.id })),
);
