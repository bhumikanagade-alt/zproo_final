# Local demo mode (development only)

The website and admin panel can run entirely in your browser with fake data and no server. This is
for trying things out on your own computer. It is **never** used for a live site: production builds
refuse to build unless `VITE_DATA_SOURCE=api`.

## Turn it on

In your local `.env` at the repo root:

```env
VITE_DATA_SOURCE=static
```

Then `npm run dev -w @zproo/web` and open http://localhost:5173. Leave the variable out (or set it to
`api`) to use the real API instead.

## Demo sign-in

- Customers: any valid Indian mobile number; the one-time code is shown on screen.
- Staff: open `/login`, choose **Email**. The password for every demo staff account is `Admin@1234`.

| Email | Role | Sees |
| --- | --- | --- |
| `admin@zproogo.com` | Super admin | Everything, including roles and settings |
| `ops.admin@zproogo.com` | Admin | Everything except role changes and settings |
| `support@zproogo.com` | Support | Dashboard, bookings, payments, refunds (read), users (read), support tickets |
| `operations@zproogo.com` | Operator | Dashboard, bookings (cancel), catalogue, drivers |

Everything you do is stored in this browser only (localStorage). Do not use these accounts or this
password anywhere else.
