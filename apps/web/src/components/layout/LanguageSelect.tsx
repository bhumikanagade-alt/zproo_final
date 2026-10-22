import { Languages } from 'lucide-react';
import { usePreferences } from '@/store/preferences';
export function LanguageSelect({ className = '' }: { className?: string }) {
  const language = usePreferences((s) => s.language);
  const setLanguage = usePreferences((s) => s.setLanguage);
  return <label className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-sm font-semibold ${className}`}><Languages className="size-4 text-primary" aria-hidden /><select aria-label="Language" value={language} onChange={(e) => setLanguage(e.target.value)} className="h-9 bg-transparent text-sm outline-none"><option value="en-IN">English</option><option value="mr-IN">मराठी</option><option value="hi-IN">हिन्दी</option></select></label>;
}
