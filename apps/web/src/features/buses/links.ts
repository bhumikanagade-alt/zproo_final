export const busTripUrl = (tripId: string) => `/buses/${encodeURIComponent(tripId)}`;
export const busSeatsUrl = (tripId: string) => `/buses/${encodeURIComponent(tripId)}/seats`;
