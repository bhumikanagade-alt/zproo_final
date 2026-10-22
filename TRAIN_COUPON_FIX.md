# Train coupon fix

Fixed the Vite parse error in `apps/web/src/static/trains.ts` by replacing the dynamic `await import()` inside the synchronous `trainRoutes()` function with a static import of the existing public coupon module. Train booking now calls `quoteCoupon()` and `redeemCoupon()` synchronously, preserving the existing coupon validation, discount, and redemption flow.

Validation note: dependency installation did not finish in this environment, so a full project build/test could not be run here. Please run `npm install` and `npm run build` locally to verify against your environment.
