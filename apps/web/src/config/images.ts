import type { Scene } from '@/components/media/SceneArt';

/**
 * Every photo slot on the site. Drop a photo named after its ID into
 * `apps/web/assets-src/images/<id>.jpg` (with a credit) and run `npm run images`;
 * until then the slot shows its illustrated `scene`.
 */
export const IMAGE_SLOTS = {
  'hero/home': { alt: 'Aeroplane over a coastline at sunset', scene: 'hero' },

  'services/flights': { alt: 'Aeroplane taking off', scene: 'flight' },
  'services/buses': { alt: 'Intercity coach on a highway', scene: 'bus' },
  'services/trains': { alt: 'Train passing through green countryside', scene: 'train' },
  'services/hotels': { alt: 'Hotel room with a view', scene: 'hotel' },
  'services/cabs': { alt: 'City cab at night', scene: 'cab' },
  'services/bikes': { alt: 'Rental bikes on a city street', scene: 'bike' },
  'services/holidays': { alt: 'Palm trees on a tropical beach', scene: 'holiday' },
  'services/parcel': { alt: 'Parcel ready for delivery', scene: 'parcel' },

  'destinations/goa': { alt: 'Beach in Goa with palm trees', scene: 'beach' },
  'destinations/mumbai': { alt: 'Mumbai skyline along Marine Drive', scene: 'city-sea' },
  'destinations/delhi': { alt: 'India Gate in New Delhi', scene: 'monument' },
  'destinations/pune': { alt: 'Pune city with the Sahyadri hills', scene: 'city-hills' },
  'destinations/manali': { alt: 'Snow-capped mountains around Manali', scene: 'mountain' },
  'destinations/kashmir': { alt: 'Lake and mountains in Kashmir', scene: 'lake' },
  'destinations/kerala': { alt: 'Houseboat on the Kerala backwaters', scene: 'backwater' },
  'destinations/rajasthan': { alt: 'Desert fort in Rajasthan', scene: 'desert' },
  'destinations/bangalore': { alt: 'Bengaluru city skyline', scene: 'city' },
  'destinations/hyderabad': { alt: 'Charminar in Hyderabad', scene: 'monument-dome' },
  'destinations/dubai': { alt: 'Dubai skyline in the desert', scene: 'skyline-desert' },

  'hotels/goa': { alt: 'Beach resort pool in Goa', scene: 'resort' },
  'hotels/udaipur': { alt: 'Lake palace hotel in Udaipur', scene: 'palace' },
  'hotels/manali': { alt: 'Mountain lodge in Manali', scene: 'lodge' },
  'hotels/mumbai': { alt: 'City hotel in Mumbai', scene: 'city-sea' },
  'hotels/kerala': { alt: 'Backwater resort in Kerala', scene: 'backwater' },
  'hotels/dubai': { alt: 'Luxury hotel in Dubai', scene: 'skyline-desert' },
} satisfies Record<string, { alt: string; scene: Scene }>;

export type ImageId = keyof typeof IMAGE_SLOTS;
