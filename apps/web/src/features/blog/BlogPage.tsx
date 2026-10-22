import { useMemo, useState } from "react";
import { EmailLink } from "@/components/layout/EmailLink";
import { Link } from "react-router";
import { Seo } from "@/components/seo/Seo";
import Reveal from "@/features/info/components/Reveal";
import { BlogImage } from "./BlogImage";
import { CATEGORIES, POSTS, type Post } from "./posts";

const EMAIL = "support@zproo.com";

const Meta = ({ post }: { post: Post }) => (
  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
    <span>{post.date}</span>
    <span className="h-1 w-1 rounded-full bg-[#d91e2a]" />
    <span>{post.mins} min read</span>
  </p>
);

const Card = ({ post }: { post: Post }) => (
  <Link
    to={`/blog/${post.slug}`}
    className="group flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-red-100 bg-white shadow-[0_8px_28px_rgba(217,30,42,0.055)] transition-all duration-300 hover:-translate-y-1.5 hover:border-red-200 hover:shadow-[0_20px_42px_rgba(217,30,42,0.12)]"
  >
    <div className="relative aspect-[16/10] overflow-hidden bg-red-50">
      <BlogImage post={post} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
      <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#d91e2a] shadow">{post.category}</span>
    </div>
    <div className="flex flex-1 flex-col p-6">
      <Meta post={post} />
      <h3 className="mt-3 text-lg font-extrabold leading-snug text-[#171717]">{post.title}</h3>
      <p className="mt-2 flex-1 text-[15px] leading-7 text-gray-600">{post.excerpt}</p>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#d91e2a]">
        Read article <span className="transition-transform group-hover:translate-x-1">→</span>
      </span>
      <div className="mt-4 h-1 w-8 rounded-full bg-[#d91e2a] transition-all duration-300 group-hover:w-14" />
    </div>
  </Link>
);

export default function BlogPage() {
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(9);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return POSTS.filter((p) => (cat === "All" || p.category === cat) && (!q || `${p.title} ${p.excerpt}`.toLowerCase().includes(q)));
  }, [cat, query]);

  const featured = POSTS[0];
  const showFeatured = !!featured && cat === "All" && !query.trim();
  const rest = showFeatured && featured ? list.filter((p) => p.slug !== featured.slug) : list;

  return (
    <main className="bg-white text-[#171717]">
      <Seo title="Blog" description="Travel guides, bus and rail tips, stay checklists and money-saving ideas from ZPROO GO." />

      <section className="relative isolate overflow-hidden border-b border-red-100 bg-white px-[7.8%] pb-12 pt-8 md:pb-16 md:pt-10">
        <div className="absolute -right-28 -top-28 -z-10 h-80 w-80 rounded-full bg-red-100/70 blur-3xl" />
        <div className="absolute -bottom-36 left-[18%] -z-10 h-72 w-72 rounded-full bg-red-50 blur-3xl" />
        <div className="absolute right-[38%] top-28 -z-10 h-20 w-20 rounded-full border-[14px] border-red-50" />
        <div className="mx-auto max-w-[1160px]">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="group inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-[#d91e2a]">
              <span className="transition-transform group-hover:-translate-x-1">←</span> Back home
            </Link>
            <span className="hidden rounded-full border border-red-100 bg-red-50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#d91e2a] sm:block">ZPROO GO · Blog</span>
          </div>
          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_310px] lg:items-center">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#d91e2a]">
                <span className="h-2 w-2 rounded-full bg-[#d91e2a]" /> Stories &amp; guides
              </span>
              <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">Travel ideas worth the journey</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">Destination plans, bus and rail know-how, stay checklists and simple ways to save. Written to help you travel smarter and go further.</p>
              <div className="mt-7 flex max-w-md items-center gap-2 rounded-full border border-red-200 bg-white px-5 py-3 shadow-sm focus-within:ring-2 focus-within:ring-red-100">
                <span aria-hidden>🔍</span>
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setShown(9); }}
                  placeholder="Search articles"
                  aria-label="Search articles"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-[280px] lg:mx-0 lg:ml-auto">
              <div className="absolute inset-5 rounded-[2rem] bg-red-100 blur-2xl" />
              <div className="relative aspect-square overflow-hidden rounded-[2rem] border border-red-100 bg-white p-5 shadow-[0_25px_55px_rgba(217,30,42,0.12)]">
                <div className="flex h-full flex-col items-center justify-center rounded-[1.5rem] border border-red-100 bg-gradient-to-br from-red-50 via-white to-white">
                  <span className="text-7xl">✍️</span>
                  <span className="mt-5 text-xs font-black uppercase tracking-[0.3em] text-[#d91e2a]">ZPROO GO</span>
                  <span className="mt-3 h-1 w-12 rounded-full bg-[#d91e2a]" />
                  <span className="mt-4 rounded-full bg-white px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 shadow-sm">{POSTS.length} articles</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1160px] px-[7.8%] py-14 md:py-16">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Categories">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={cat === c}
              onClick={() => { setCat(c); setShown(9); }}
              className={`rounded-full border px-5 py-2 text-sm font-bold transition ${cat === c ? "border-[#d91e2a] bg-[#d91e2a] text-white shadow-[0_8px_20px_rgba(217,30,42,0.2)]" : "border-red-100 bg-white text-gray-600 hover:border-red-200 hover:bg-red-50"}`}
            >
              {c}
            </button>
          ))}
        </div>

        {showFeatured && featured && (
          <Reveal>
            <Link
              to={`/blog/${featured.slug}`}
              className="group mt-8 grid overflow-hidden rounded-[2rem] border border-red-100 bg-white shadow-[0_15px_45px_rgba(217,30,42,0.07)] transition hover:border-red-200 hover:shadow-[0_22px_55px_rgba(217,30,42,0.13)] lg:grid-cols-2"
            >
              <div className="relative min-h-[240px] overflow-hidden bg-red-50">
                <BlogImage post={featured} className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <span className="absolute left-5 top-5 rounded-full bg-[#d91e2a] px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white shadow">Featured</span>
              </div>
              <div className="flex flex-col justify-center p-7 sm:p-10">
                <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#d91e2a]">{featured.category}</span>
                <h2 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">{featured.title}</h2>
                <p className="mt-3 leading-7 text-gray-600">{featured.excerpt}</p>
                <div className="mt-4"><Meta post={featured} /></div>
                <span className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-[#d91e2a] px-6 py-3 text-sm font-extrabold text-white shadow-[0_10px_28px_rgba(217,30,42,0.22)] transition group-hover:bg-red-600">Read article →</span>
              </div>
            </Link>
          </Reveal>
        )}

        {rest.length === 0 && !showFeatured && (
          <p className="mt-8 rounded-2xl bg-red-50 p-6 text-gray-600">No articles match your search.</p>
        )}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rest.slice(0, shown).map((p, i) => (
            <Reveal key={p.slug} delay={(i % 3) * 60}><Card post={p} /></Reveal>
          ))}
        </div>
      </div>

      {/* Load more */}
      {rest.length > shown && (
        <div className="-mt-6 mb-14 text-center">
          <button onClick={() => setShown((n) => n + 6)} className="rounded-full border border-red-200 bg-white px-8 py-3 text-sm font-extrabold text-[#d91e2a] transition hover:-translate-y-0.5 hover:bg-red-50">
            Load more articles ({rest.length - shown} left)
          </button>
        </div>
      )}

      {/* Trending */}
      <section className="border-y border-red-100 bg-red-50/30 px-[7.8%] py-14">
        <div className="mx-auto grid max-w-[1160px] gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <span className="inline-flex rounded-full bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-[#d91e2a] shadow-sm">Trending now</span>
            <h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">What travellers are reading this week</h2>
            <p className="mt-4 leading-7 text-gray-600">Quick reads that help you plan the next trip, from where to go to how to get there comfortably.</p>
            <div className="mt-7 h-1 w-16 rounded-full bg-[#d91e2a]" />
          </div>
          <ol className="grid gap-3">
            {POSTS.slice(1, 6).map((p, i) => (
              <li key={p.slug}>
                <Link to={`/blog/${p.slug}`} className="group flex items-center gap-4 rounded-2xl border border-red-100 bg-white p-3 pr-5 transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-[0_12px_28px_rgba(217,30,42,0.08)]">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#d91e2a] text-sm font-black text-white">{i + 1}</span>
                  <BlogImage post={p} className="h-14 w-20 shrink-0 rounded-xl object-cover" />
                  <span className="min-w-0">
                    <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[#d91e2a]">{p.category}</span>
                    <span className="block truncate font-bold sm:whitespace-normal">{p.title}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Plan by season */}
      <section className="px-[7.8%] py-14 md:py-16">
        <div className="mx-auto max-w-[1160px]">
          <h2 className="text-3xl font-black tracking-tight">Plan by season</h2>
          <div className="mt-2 h-1 w-14 rounded-full bg-[#d91e2a]" />
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["❄️", "Winter", "Nov – Feb", "Rajasthan, Kerala, Goa and snow in Manali or Kashmir."],
              ["☀️", "Summer", "Mar – Jun", "Hill stations like Manali, Mahabaleshwar and Kashmir."],
              ["🌧️", "Monsoon", "Jul – Sep", "Waterfalls near Pune, Kerala backwaters and green hills."],
              ["🍂", "Autumn", "Oct", "Clear skies for Kashmir, Ladakh and festival-season city breaks."],
            ].map(([icon, name, months, text]) => (
              <article key={name} className="group relative overflow-hidden rounded-[1.35rem] border border-red-100 bg-white p-6 shadow-[0_8px_28px_rgba(217,30,42,0.055)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_42px_rgba(217,30,42,0.12)]">
                <span className="absolute -right-7 -top-7 h-24 w-24 rounded-full bg-red-50 transition-transform duration-500 group-hover:scale-150" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-2xl">{icon}</div>
                <h3 className="relative mt-4 text-lg font-extrabold">{name}</h3>
                <p className="relative text-xs font-black uppercase tracking-widest text-[#d91e2a]">{months}</p>
                <p className="relative mt-2 text-[15px] leading-7 text-gray-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-[7.8%] pb-16">
        <div className="relative mx-auto max-w-[1160px] overflow-hidden rounded-[2rem] border border-red-100 bg-gradient-to-br from-red-50 via-white to-white p-8 text-center shadow-[0_20px_55px_rgba(217,30,42,0.08)] sm:p-12">
          <div className="absolute -right-20 -top-24 h-60 w-60 rounded-full bg-red-100/70 blur-3xl" />
          <div className="relative">
            <span className="inline-flex rounded-full bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-[#d91e2a] shadow-sm">Got a story?</span>
            <h2 className="mt-5 text-3xl font-black sm:text-4xl">Suggest a topic</h2>
            <p className="mx-auto mt-3 max-w-xl leading-7 text-gray-600">Tell us a route, city or travel question you would like us to cover next.</p>
            <div className="mt-7"><EmailLink email={EMAIL} subject="Blog topic suggestion" className="inline-flex items-center gap-2 rounded-full bg-[#d91e2a] px-7 py-3.5 font-extrabold text-white shadow-[0_10px_30px_rgba(217,30,42,0.22)] transition hover:-translate-y-0.5 hover:bg-red-600">✉ {EMAIL}</EmailLink></div>
          </div>
        </div>
      </section>
    </main>
  );
}
