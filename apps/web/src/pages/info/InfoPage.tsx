import { useParams } from 'react-router';
import LegalPage from '@/features/info/components/LegalPage';
import PageLayout from '@/features/info/components/PageLayout';
import { PAGES } from '@/features/info/data/pages';
import { NotFoundPage } from '@/pages/NotFoundPage';

/** Footer information pages: /info/bus-tickets, /info/faqs, /info/terms-privacy, … */
export default function InfoPage() {
  const { slug } = useParams();
  if (slug === 'terms-privacy') return <LegalPage />;
  const page = PAGES.find((p) => p.slug === slug);
  return page ? <PageLayout page={page} /> : <NotFoundPage />;
}
