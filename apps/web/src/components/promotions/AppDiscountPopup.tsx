import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@zproo/ui';
import { Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Lives in memory only: it resets on every page load or refresh (so the popup shows again), but
 * survives in-app navigation (so going Home -> Buses -> Home does not reopen it).
 */
let shownThisPageLoad = false;

/** Test helper: pretend the page was just refreshed. */
export function resetAppPopupForTests() {
  shownThisPageLoad = false;
}

/** Test helper: behave as if the popup was already shown on this page load. */
export function skipAppPopupForTests() {
  shownThisPageLoad = true;
}

export function AppDiscountPopup({
  autoOpen = false,
}: {
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Opens once per page load/refresh; later in-app visits to Home don't reopen it.
    if (autoOpen && !shownThisPageLoad) {
      shownThisPageLoad = true;
      setOpen(true);
    }
  }, [autoOpen]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md overflow-hidden p-0">
        {/* RED HEADER */}
        <div className="bg-primary px-6 py-7 text-primary-foreground">
          <div className="flex items-start">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/15">
              <Smartphone aria-hidden />
            </div>
          </div>

          <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em]">
            ZPROO BUS app
          </p>

          <h2 className="mt-1 text-3xl font-extrabold">
            10% OFF
          </h2>

          <p className="mt-2 text-sm text-primary-foreground/85">
            Save more when you book eligible bus trips through the app.
          </p>
        </div>

        {/* CONTENT */}
        <div className="p-6">
          <DialogTitle>
            Save More on App
          </DialogTitle>

          <DialogDescription className="mt-2">
            Use coupon <strong>ZPROO10</strong> on eligible bookings.
            Download the app when it launches.
          </DialogDescription>

          <Button
            className="mt-5 w-full"
            onClick={() => setOpen(false)}
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AppDiscountBanner({
  onOpen,
}: {
  onOpen: () => void;
}) {
  return (
    <Card className="border-primary/20 bg-primary-light p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold">
          <span className="mr-2 rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">
            10% OFF
          </span>
          Save more with the ZPROO BUS app
        </p>

        <Button size="sm" onClick={onOpen}>
          View offer
        </Button>
      </div>
    </Card>
  );
}