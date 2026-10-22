import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { loginPath } from '@/features/auth/redirect';
import { useAuthStore } from '@/features/auth/store';
import { answerHolidayCouponRequest, parseHolidayCouponRequest } from '@/features/holidays/couponBridge';

/**
 * The Holiday Explorer is kept as a self-contained page so its complete interaction
 * flow and styling do not affect the existing bus, flight, hotel, or shared UI code.
 * Replace the mock-data layer in public/holiday-explorer.html with API calls when ready.
 *
 * Coupons are the one real connection: the explorer asks this page (postMessage) for the coupons made in
 * Admin → Marketing → Coupons that are valid on Holidays, and to check / use them. See features/holidays/couponBridge.ts.
 */
export default function HolidayExplorerPage() {
  const frame = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const here = location.pathname + location.search;
  const hereRef = useRef(here);
  hereRef.current = here;

  useEffect(() => {
    async function onMessage(event: MessageEvent) {
      const target = frame.current?.contentWindow;
      if (!target || event.source !== target || event.origin !== window.location.origin) return;
      const req = parseHolidayCouponRequest(event.data);
      if (!req) return;
      const signedIn = useAuthStore.getState().user !== null;
      const reply = await answerHolidayCouponRequest(req, signedIn);
      target.postMessage(reply, window.location.origin);
      if (req.action === 'signin') void navigate(loginPath(hereRef.current));
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [navigate]);

  return (
    <>
      <Seo
        title="ZPROO Holidays Explorer"
        description="Explore holiday packages, compare itineraries, and complete a demo booking."
      />
      {/* The site layout already provides <main>; one per page. */}
      <div className="w-full overflow-hidden bg-white pb-12 sm:pb-16">
        <h1 className="sr-only">Holiday packages</h1>
        <iframe
          ref={frame}
          title="ZPROO Holidays Explorer"
          src="/holiday-explorer.html"
          className="block w-full border-0"
          style={{ height: 'calc(100vh - 64px)', minHeight: '760px' }}
          loading="eager"
          allow="payment; clipboard-write; web-share"
        />
      </div>
    </>
  );
}
