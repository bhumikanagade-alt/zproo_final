import { useMatches } from 'react-router';
import type { PlannedRoute } from './routeMap';

/** Reads the `handle` of the deepest matched route (set from the route map). */
export function useRouteMeta(): PlannedRoute | undefined {
  const matches = useMatches();
  return matches.at(-1)?.handle as PlannedRoute | undefined;
}
