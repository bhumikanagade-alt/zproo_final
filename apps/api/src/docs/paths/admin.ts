import {
  adminAuditQuerySchema,
  adminBookingListQuerySchema,
  adminCancelBookingSchema,
  adminCollectionSchemas,
  adminPaymentListQuerySchema,
  adminRefundListQuerySchema,
  adminRefundUpdateSchema,
  adminUserRolesSchema,
  adminUserStatusSchema,
  adminWalletAdjustSchema,
  dashboardQuerySchema,
  inventoryQuerySchema,
  inventoryToggleSchema,
  reportQuerySchema,
  settingsUpdateSchema,
  ticketReplySchema,
  ticketUpdateSchema,
} from '@zproo/validation';
import { z } from 'zod';
import { ErrorResponse, registry, successEnvelope } from '../openapi';

/**
 * Admin panel endpoints. All require a bearer token with `admin:access` plus the permission
 * named in each description. Response shapes are the `Admin*` types in @zproo/types.
 */

const json = (schema: z.ZodType) => ({ 'application/json': { schema } });
const ok = (description: string) => ({ description, content: json(successEnvelope(z.any())) });
const errors = {
  400: { description: 'Validation failed', content: json(ErrorResponse) },
  401: { description: 'Not signed in', content: json(ErrorResponse) },
  403: { description: 'Missing permission', content: json(ErrorResponse) },
};
const security = [{ bearerAuth: [] }];

type Method = 'get' | 'post' | 'patch' | 'put' | 'delete';
function path(method: Method, p: string, summary: string, permission: string, request: Record<string, unknown> = {}) {
  registry.registerPath({
    method,
    path: `/admin${p}`,
    tags: ['Admin'],
    summary,
    description: `Requires \`${permission}\`.`,
    security,
    request: request as never,
    responses: { 200: ok(summary), ...errors },
  });
}
const body = (schema: z.ZodType) => ({ body: { content: json(schema) } });
const ref = z.object({ reference: z.string() });
const id = z.object({ id: z.string() });

path('get', '/dashboard', 'KPIs, daily series and breakdowns', 'booking:read:any', { query: dashboardQuerySchema });
path('get', '/reports', 'Tabular report (CSV-ready)', 'report:read', { query: reportQuerySchema });
path('get', '/bookings', 'List bookings', 'booking:read:any', { query: adminBookingListQuerySchema });
path('get', '/bookings/{reference}', 'Booking details', 'booking:read:any', { params: ref });
path('post', '/bookings/{reference}/cancel', 'Cancel a booking (optionally refunding it)', 'booking:manage', { params: ref, ...body(adminCancelBookingSchema) });
path('get', '/payments', 'List payments', 'payment:read:any', { query: adminPaymentListQuerySchema });
path('get', '/refunds', 'List refunds', 'payment:read:any', { query: adminRefundListQuerySchema });
path('patch', '/refunds/{id}', 'Process, complete or fail a refund', 'refund:approve', { params: id, ...body(adminRefundUpdateSchema) });
path('get', '/users/{id}', 'User details with booking stats', 'user:read:any', { params: id });
path('patch', '/users/{id}/status', 'Activate, deactivate or suspend a user', 'user:manage', { params: id, ...body(adminUserStatusSchema) });
path('put', '/users/{id}/roles', "Replace a user's roles", 'role:manage', { params: id, ...body(adminUserRolesSchema) });
path('get', '/inventory/{service}', 'Catalogue of a service with visibility', 'inventory:manage', { params: z.object({ service: z.string() }), query: inventoryQuerySchema });
path('patch', '/inventory/{service}/{id}', 'Show or hide a catalogue item on the website', 'inventory:manage', { params: z.object({ service: z.string(), id: z.string() }), ...body(inventoryToggleSchema) });
path('get', '/wallet', 'Wallet adjustment ledger', 'wallet:manage');
path('post', '/wallet/adjust', 'Credit or debit a wallet', 'wallet:manage', body(adminWalletAdjustSchema));
for (const [name, schema] of Object.entries(adminCollectionSchemas)) {
  const permission = name === 'tickets' ? 'support:ticket:manage' : name === 'partners' ? 'partner:manage' : name === 'drivers' ? 'driver:manage' : 'offer:manage';
  path('get', `/${name}`, `List ${name}`, permission);
  path('post', `/${name}`, `Create in ${name}`, permission, body(schema));
  path('patch', `/${name}/{id}`, `Update in ${name} (fields are merged)`, permission, { params: id, ...body(z.record(z.string(), z.unknown())) });
  path('delete', `/${name}/{id}`, `Delete from ${name}`, permission, { params: id });
}
path('post', '/tickets/{id}/messages', 'Reply to a ticket or add an internal note', 'support:ticket:manage', { params: id, ...body(ticketReplySchema) });
path('patch', '/tickets/{id}/update', 'Change ticket status, priority or assignee', 'support:ticket:manage', { params: id, ...body(ticketUpdateSchema) });
path('get', '/audit', 'Audit log', 'audit:read', { query: adminAuditQuerySchema });
path('get', '/settings', 'Platform settings', 'admin:access');
path('patch', '/settings', 'Update platform settings', 'settings:manage', body(settingsUpdateSchema));

registry.registerPath({ method: 'get', path: '/settings/public', tags: ['Admin'], summary: 'Public site settings (no sign-in)', responses: { 200: ok('Announcement, maintenance mode, paused services') } });
registry.registerPath({ method: 'get', path: '/offers/public', tags: ['Admin'], summary: 'Live offers (no sign-in)', responses: { 200: ok('Active offers, sorted') } });
