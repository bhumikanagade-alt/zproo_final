import type { ApiFailure, ApiSuccess, ServiceType } from '@zproo/types';
import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { authRoutes } from './auth';
import { bookingRoutes } from './bookings';
import { busRoutes } from './buses';
import { StaticError, type StaticRequest, type StaticResult } from './core';
import { flightRoutes } from './flights';
import { trainRoutes } from './trains';

const ROUTERS = [authRoutes, flightRoutes, busRoutes, trainRoutes, bookingRoutes];

async function route(req: StaticRequest): Promise<StaticResult> {
  if (req.method === 'GET' && req.path.startsWith('/health')) {
    return {
      data: {
        status: 'ok',
        version: 'static',
        uptimeSeconds: 0,
        timestamp: new Date().toISOString(),
        checks: {},
      },
    };
  }
  if (req.method === 'POST' && req.path === '/booking-abandonment') {
    return { status: 202, data: { captured: true, provider: 'static', developmentOnly: true }, message: 'Abandoned booking captured locally; email delivery needs the server email provider.' };
  }
  if (req.method === 'GET' && req.path === '/offers/public') {
    return { data: (await import('./admin/publicOffers')).publicOffers() };
  }
  if (req.method === 'GET' && req.path === '/coupons/public') {
    const { publicCoupons } = await import('./admin/publicCoupons');
    return { data: publicCoupons(req.params.service ? (req.params.service.toUpperCase() as ServiceType) : undefined) };
  }
  if (req.method === 'POST' && req.path === '/coupons/validate') {
    const { checkCoupon } = await import('./admin/publicCoupons');
    const { couponCheckSchema } = await import('@zproo/validation');
    const { currentUser, parse } = await import('./core');
    const body = parse(couponCheckSchema, req.body, 'body');
    return { data: checkCoupon({ ...body, userId: currentUser().id }) };
  }
  if (req.method === 'POST' && req.path === '/coupons/redeem') {
    const { redeemCouponForReference } = await import('./admin/publicCoupons');
    const { couponRedeemSchema } = await import('@zproo/validation');
    const { currentUser, parse } = await import('./core');
    const body = parse(couponRedeemSchema, req.body, 'body');
    return { data: redeemCouponForReference({ ...body, userId: currentUser().id }) };
  }
  if (req.method === 'POST' && req.path === '/coupons/release') {
    const { releaseCouponForReference } = await import('./admin/publicCoupons');
    const { couponReleaseSchema } = await import('@zproo/validation');
    const { currentUser, parse } = await import('./core');
    const body = parse(couponReleaseSchema, req.body, 'body');
    return { data: releaseCouponForReference({ ...body, userId: currentUser().id }) };
  }
  if (req.method === 'GET' && req.path === '/notifications') {
    return { data: (await import('./admin/publicNotifications')).myNotifications() };
  }
  if (req.method === 'GET' && req.path === '/settings/public') {
    return { data: (await import('./admin/public')).publicSettings() };
  }
  if (req.path.startsWith('/admin')) {
    // The admin engine (sample data, catalogue) is its own chunk: customers never download it.
    const { adminRoutes } = await import('./admin/routes');
    const result = adminRoutes(req);
    if (result) return result;
  }
  await enforceSettings(req);
  for (const router of ROUTERS) {
    const result = await router(req);
    if (result) return hideUnlisted(req, result);
  }
  throw new StaticError(404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`);
}

function toRequest(config: InternalAxiosRequestConfig): StaticRequest {
  const url = new URL(config.url ?? '/', 'http://static.local');
  const params: Record<string, string> = Object.fromEntries(url.searchParams);
  for (const [key, value] of Object.entries((config.params ?? {}) as Record<string, unknown>)) {
    if (value !== undefined && value !== null) params[key] = String(value);
  }
  let body: unknown = config.data;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      /* not JSON: leave as is */
    }
  }
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(AxiosHeaders.from(config.headers).toJSON())) {
    if (typeof value === 'string') headers[key.toLowerCase()] = value;
  }
  return {
    method: (config.method ?? 'get').toUpperCase(),
    path: url.pathname,
    params,
    body,
    headers,
  };
}

/** A short, realistic network delay (none in tests). */
const pause = () =>
  import.meta.env.MODE === 'test'
    ? Promise.resolve()
    : new Promise((resolve) => setTimeout(resolve, 120 + Math.random() * 180));

/**
 * Axios adapter for static mode: answers every API call in the browser with the same envelopes,
 * status codes and error codes as the real API, so the website works unchanged.
 */
export async function staticAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  await pause();
  const respond = (status: number, data: ApiSuccess<unknown> | ApiFailure): AxiosResponse => ({
    data,
    status,
    statusText: String(status),
    headers: new AxiosHeaders({ 'content-type': 'application/json' }),
    config,
    request: null,
  });
  try {
    const result = await route(toRequest(config));
    return respond(result.status ?? 200, {
      success: true,
      message: result.message ?? 'Success',
      // A copy, like JSON over the network: callers must never hold references into the demo DB.
      data: result.data === undefined ? result.data : structuredClone(result.data),
    });
  } catch (err) {
    const e =
      err instanceof StaticError
        ? err
        : new StaticError(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
    if (!(err instanceof StaticError)) console.error(err);
    const response = respond(e.status, {
      success: false,
      message: e.message,
      errorCode: e.errorCode,
      data: null,
      ...(e.details && { details: e.details }),
    });
    throw new AxiosError(e.message, undefined, config, null, response);
  }
}

const BOOK_PATHS: Record<string, ServiceType> = {
  '/flights/book': 'FLIGHT',
  '/buses/book': 'BUS',
  '/trains/book': 'TRAIN',
};

/** Maintenance mode and paused services (set in the admin panel) stop new bookings. */
async function enforceSettings(req: StaticRequest): Promise<void> {
  const service = req.method === 'POST' ? BOOK_PATHS[req.path] : undefined;
  if (!service) return;
  const { publicSettings } = await import('./admin/public');
  const s = publicSettings();
  if (s.maintenanceMode) {
    throw new StaticError(503, 'SERVICE_UNAVAILABLE', 'ZPROO GO is down for maintenance. Please try again shortly.');
  }
  if (s.disabledServices.includes(service)) {
    throw new StaticError(503, 'SERVICE_UNAVAILABLE', 'Bookings for this service are paused right now. Please try again later.');
  }
}

/** Search results without the catalogue items an admin has hidden. */
async function hideUnlisted(req: StaticRequest, result: StaticResult): Promise<StaticResult> {
  if (req.method !== 'GET') return result;
  const service = ({ '/flights/search': 'FLIGHT', '/buses/search': 'BUS', '/trains/search': 'TRAIN' } as const)[req.path as '/flights/search'];
  if (!service) return result;
  const { unlistedIds } = await import('./admin/public');
  const hidden = unlistedIds(service);
  if (!hidden.size) return result;
  const data = result.data as Record<string, unknown>;
  if (service === 'FLIGHT') {
    const legs = (data.legs as { offers: { flightNumber: string; segments?: { flightNumber: string }[] }[] }[]).map((leg) => ({
      ...leg,
      offers: leg.offers.filter((o) => !hidden.has(o.flightNumber.replace(/\s+/g, ''))),
    }));
    return { ...result, data: { ...data, legs } };
  }
  if (service === 'BUS') {
    return { ...result, data: { ...data, trips: (data.trips as { serviceNumber: string }[]).filter((t) => !hidden.has(t.serviceNumber)) } };
  }
  return { ...result, data: { ...data, trains: (data.trains as { trainNumber: string }[]).filter((t) => !hidden.has(t.trainNumber)) } };
}
