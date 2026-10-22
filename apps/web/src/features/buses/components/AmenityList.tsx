import {
  BatteryCharging,
  Bed,
  Cctv,
  Droplet,
  Lamp,
  MapPin,
  Plug,
  Wifi,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  'Wi-Fi': Wifi,
  'Charging point': Plug,
  Blanket: Bed,
  'Water bottle': Droplet,
  'Reading light': Lamp,
  CCTV: Cctv,
  'Live tracking': MapPin,
};

export function AmenityList({ amenities }: { amenities: string[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Amenities">
      {amenities.map((a) => {
        const Icon = ICONS[a] ?? BatteryCharging;
        return (
          <li key={a} className="inline-flex items-center gap-1.5 text-sm">
            <Icon aria-hidden className="size-4 text-primary" /> {a}
          </li>
        );
      })}
    </ul>
  );
}
