import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type Notice = {
  id: number;
  message: string;
  tone: 'success' | 'error' | 'info';
};

type NotificationsApi = {
  notify: (message: string, tone?: Notice['tone']) => void;
};

const Ctx = createContext<NotificationsApi | null>(null);

let nextId = 1;

export function NotificationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [items, setItems] = useState<Notice[]>([]);

  const api = useMemo(
    () => ({
      notify: (
        message: string,
        tone: Notice['tone'] = 'info',
      ) => {
        const id = nextId++;

        setItems((v) => [
          ...v,
          {
            id,
            message,
            tone,
          },
        ]);

        window.setTimeout(() => {
          setItems((v) =>
            v.filter((n) => n.id !== id),
          );
        }, 4500);
      },
    }),
    [],
  );

  return (
    <Ctx.Provider value={api}>
      {children}

      <div
        className="fixed right-4 top-20 z-[70] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
        aria-live="polite"
      >
        {items.map((n) => (
          <div
            key={n.id}
            className={`rounded-xl border bg-card p-4 text-sm font-semibold shadow-raised ${
              n.tone === 'success'
                ? 'border-success/40'
                : n.tone === 'error'
                  ? 'border-danger/40'
                  : 'border-border'
            }`}
          >
            <span>{n.message}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useNotifications() {
  const value = useContext(Ctx);

  if (!value) {
    throw new Error(
      'useNotifications must be used inside NotificationsProvider',
    );
  }

  return value;
}