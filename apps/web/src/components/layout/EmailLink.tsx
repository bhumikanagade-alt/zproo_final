import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';

/**
 * Email link that always leads somewhere. It opens the visitor's default email app; because
 * some devices have none configured, the address is also copied and a contact-form fallback
 * is offered right below the link.
 */
export function EmailLink({
  email,
  subject,
  className,
  children,
}: {
  email: string;
  subject?: string;
  className?: string;
  children?: ReactNode;
}) {
  const [hint, setHint] = useState(false);
  const href = `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <a
        href={href}
        className={className}
        onClick={() => {
          void navigator.clipboard?.writeText(email).catch(() => undefined);
          setHint(true);
        }}
      >
        {children ?? email}
      </a>
      {hint && (
        <span role="status" className="text-xs font-medium text-gray-500">
          Opening your email app… if nothing opens, we copied {email}. You can also{' '}
          <Link to="/contact" className="font-bold text-[#d91e2a] underline">
            use the contact form
          </Link>
          .
        </span>
      )}
    </span>
  );
}
