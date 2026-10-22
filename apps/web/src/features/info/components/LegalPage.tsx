import React, { useEffect, useMemo, useState } from "react";
import { EmailLink } from "@/components/layout/EmailLink";
import { Link } from "react-router";
import { Seo } from "@/components/seo/Seo";
import Reveal from "./Reveal";
import { TERMS, PRIVACY, NOTICE, EFFECTIVE } from "../data/legal";

type Tab = "terms" | "privacy";

const EMAIL = "career@zproo.com";

const ICONS: Record<Tab, string[]> = {
  terms: ["📜", "🪪", "🔑", "🚗", "📅", "💳", "↩️", "🤝", "🚫", "🔗", "©️", "💬", "📶", "⚠️", "⚖️", "🛡️", "⏸️", "🔒", "🔄", "🏛️", "✉️"],
  privacy: ["🔎", "🧾", "✍️", "⚙️", "📍", "🎯", "📣", "🍪", "🤲", "🏢", "🛡️", "🗄️", "🙋", "🧒", "🌍", "🔗", "🔄", "✉️"],
};

const HIGHLIGHTS: Record<Tab, { icon: string; title: string; text: string }[]> = {
  terms: [
    { icon: "📝", title: "Accurate details", text: "Give correct information and keep your login safe." },
    { icon: "✅", title: "Confirmed bookings", text: "A booking is final only once confirmation is shown." },
    { icon: "↩️", title: "Refund rules", text: "Cancellations and refunds follow the terms shown at booking." },
    { icon: "⚖️", title: "Fair use", text: "Use the platform lawfully. No misuse, fraud or scraping." },
  ],
  privacy: [
    { icon: "🔐", title: "Reasonable security", text: "Technical and organisational measures protect your data." },
    { icon: "📍", title: "Your location", text: "Location is used only when you allow it on your device." },
    { icon: "🙋", title: "Your rights", text: "Ask to access, correct, update or delete your information." },
    { icon: "✉️", title: "Contact us", text: `Privacy questions? Write to ${EMAIL}.` },
  ],
};

const readSecs = (t: string) => Math.max(5, Math.round(t.split(/\s+/).length / 3.3));

const LegalPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>("terms");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<number[]>([1]);
  const [active, setActive] = useState<number>(1);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const all = tab === "terms" ? TERMS : PRIVACY;
  const list = useMemo(() => {
    const t = query.trim().toLowerCase();
    return t ? all.filter((s) => `${s.title} ${s.body}`.toLowerCase().includes(t)) : all;
  }, [all, query]);

  // Scroll-spy for the side navigation
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number(e.target.getAttribute("data-n")));
        });
      },
      { rootMargin: "-15% 0px -75% 0px" }
    );
    list.forEach((s) => {
      const el = document.getElementById(`${tab}-${s.n}`);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [list, tab]);

  const switchTab = (next: Tab) => {
    setTab(next);
    setQuery("");
    setOpen([1]);
    setActive(1);
  };

  const toggle = (n: number) => setOpen((o) => (o.includes(n) ? o.filter((x) => x !== n) : [...o, n]));
  const allOpen = open.length >= all.length;

  const jump = (n: number) => {
    if (!open.includes(n)) setOpen((o) => [...o, n]);
    document.getElementById(`${tab}-${n}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <main className="bg-white text-[#111]">
      <Seo title="Terms & Privacy" description="Terms & Conditions and Privacy Policy for ZPROO GO." />
      <div
        className="fixed left-0 top-0 z-50 h-1.5 bg-gradient-to-r from-[#ff4b55] to-[#b3141f] transition-[width] duration-150"
        style={{ width: `${progress}%` }}
      />

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#a80f1a] via-[#d91e2a] to-[#ff4b55] px-[7.8%] pb-28 pt-10 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(#fff 1.2px, transparent 1.2px)", backgroundSize: "26px 26px" }}
        />
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 animate-float rounded-full bg-white/10" />
        <div className="pointer-events-none absolute bottom-16 left-[38%] h-24 w-24 animate-float rounded-full bg-white/10" style={{ animationDelay: "2s" }} />
        <div className="pointer-events-none absolute -left-10 top-1/2 h-40 w-40 animate-float rounded-full border-[14px] border-white/10" style={{ animationDelay: "4s" }} />

        <div className="relative mx-auto max-w-[1100px]">
          <Link to="/" className="text-sm font-medium text-white/80 transition hover:text-white">← Back home</Link>

          <div className="animate-fade-up mt-8 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-white" /> Legal
              </span>
              <h1 className="mt-5 text-5xl font-extrabold leading-[1.05] md:text-6xl">
                Terms <span className="text-red-100">&amp;</span> Privacy
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-red-50">
                Clear rules for using ZPROO EV, and clear promises about how we treat your information.
              </p>
            </div>

            <div className="relative flex h-32 w-32 shrink-0 items-center justify-center md:h-40 md:w-40">
              <span className="absolute inset-0 animate-pulse-ring rounded-[2rem] bg-white/40" />
              <span className="relative flex h-full w-full rotate-3 items-center justify-center rounded-[2rem] bg-white text-6xl shadow-2xl md:text-7xl">🛡️</span>
            </div>
          </div>

          <div className="animate-fade-up mt-8 flex flex-wrap gap-3" style={{ animationDelay: "150ms" }}>
            {[
              [`${TERMS.length}`, "Terms sections"],
              [`${PRIVACY.length}`, "Privacy sections"],
              [EFFECTIVE, "Effective date"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-2xl border border-white/25 bg-white/10 px-5 py-3 backdrop-blur">
                <div className="text-xl font-extrabold">{v}</div>
                <div className="text-xs uppercase tracking-wider text-red-100">{l}</div>
              </div>
            ))}
          </div>

          <div className="relative mt-8 flex w-full max-w-md rounded-full border border-white/30 bg-white/15 p-1 backdrop-blur">
            <span
              className="absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-white shadow transition-transform duration-300"
              style={{ transform: tab === "privacy" ? "translateX(100%)" : "translateX(0)" }}
            />
            {(["terms", "privacy"] as Tab[]).map((k) => (
              <button
                key={k}
                onClick={() => switchTab(k)}
                className={`relative z-10 w-1/2 rounded-full py-2.5 text-sm font-bold transition-colors ${tab === k ? "text-[#d91e2a]" : "text-white"}`}
              >
                {k === "terms" ? "Terms & Conditions" : "Privacy Policy"}
              </button>
            ))}
          </div>
        </div>

        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="absolute bottom-0 left-0 h-14 w-full">
          <path d="M0,40 C240,90 480,0 720,30 C960,60 1200,90 1440,30 L1440,80 L0,80 Z" fill="#fff" />
        </svg>
      </section>

      {/* ---------- Highlights ---------- */}
      <section key={`h-${tab}`} className="relative z-10 -mt-12 px-[7.8%]">
        <div className="mx-auto grid max-w-[1100px] gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS[tab].map((h, i) => (
            <div
              key={h.title}
              style={{ animationDelay: `${i * 90}ms` }}
              className="group animate-fade-up relative overflow-hidden rounded-2xl border border-red-100 bg-white p-5 shadow-lg transition hover:-translate-y-1.5 hover:shadow-xl"
            >
              <span className="absolute left-0 top-0 h-1 w-0 bg-[#d91e2a] transition-all duration-500 group-hover:w-full" />
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-2xl transition group-hover:rotate-6 group-hover:scale-110">{h.icon}</div>
              <h3 className="mt-3 font-bold">{h.title}</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-gray-600">{h.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Document ---------- */}
      <section className="px-[7.8%] py-14">
        <div className="mx-auto grid max-w-[1100px] gap-10 lg:grid-cols-[270px_1fr]">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="🔍 Search this document"
                className="w-full rounded-full border border-red-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#d91e2a] focus:ring-2 focus:ring-red-100"
              />
              <button
                onClick={() => setOpen(allOpen ? [] : all.map((s) => s.n))}
                className="mt-3 w-full rounded-full bg-[#d91e2a] py-2 text-sm font-semibold text-white transition hover:bg-[#b3141f]"
              >
                {allOpen ? "Collapse all" : "Expand all"}
              </button>
              <nav className="mt-3 hidden max-h-[52vh] space-y-1 overflow-y-auto pr-1 lg:block">
                {list.map((s) => (
                  <button
                    key={s.n}
                    onClick={() => jump(s.n)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                      active === s.n ? "bg-[#d91e2a] font-semibold text-white shadow" : "text-gray-700 hover:bg-white"
                    }`}
                  >
                    <span className="w-5 font-bold">{s.n}</span>
                    <span className="truncate">{s.title}</span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          <div key={tab} className="space-y-4">
            {list.length === 0 && <p className="rounded-xl bg-red-50 p-6 text-gray-600">No sections match your search.</p>}
            {list.map((s, i) => {
              const isOpen = query.trim() !== "" || open.includes(s.n);
              return (
                <Reveal key={s.n}>
                  <article
                    id={`${tab}-${s.n}`}
                    data-n={s.n}
                    className="group relative scroll-mt-6 overflow-hidden rounded-2xl border border-red-100 bg-white shadow-sm transition hover:shadow-lg"
                  >
                    <span
                      className={`absolute left-0 top-0 h-full w-1.5 origin-top bg-[#d91e2a] transition-transform duration-300 ${
                        isOpen ? "scale-y-100" : "scale-y-0 group-hover:scale-y-100"
                      }`}
                    />
                    <button onClick={() => toggle(s.n)} aria-expanded={isOpen} className="flex w-full items-center gap-4 p-5 text-left">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-2xl transition group-hover:rotate-6">
                        {ICONS[tab][s.n - 1] ?? "•"}
                      </span>
                      <span className="flex-1">
                        <span className="block text-xs font-semibold uppercase tracking-wider text-[#d91e2a]">
                          Section {s.n} · {readSecs(s.body)} sec read
                        </span>
                        <span className="block text-lg font-bold">{s.title}</span>
                      </span>
                      <span className={`text-2xl text-[#d91e2a] transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>⌄</span>
                    </button>
                    <div className={`grid transition-[grid-template-rows] duration-300 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                      <div className="overflow-hidden">
                        <p className="px-5 pb-5 leading-relaxed text-gray-600 sm:pl-[84px]" style={{ animationDelay: `${i * 20}ms` }}>
                          {s.body}
                        </p>
                      </div>
                    </div>
                  </article>
                </Reveal>
              );
            })}

            <Reveal>
              <div className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-white p-6">
                <h3 className="flex items-center gap-2 font-bold text-[#d91e2a]">⚠️ Important legal notice</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-700">{NOTICE}</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Contact ---------- */}
      <section className="px-[7.8%] pb-16">
        <div className="relative mx-auto max-w-[1100px] overflow-hidden rounded-3xl bg-gradient-to-br from-[#a80f1a] via-[#d91e2a] to-[#ff4b55] p-8 text-center text-white sm:p-14">
          <div className="pointer-events-none absolute -left-10 -top-10 h-44 w-44 animate-float rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-12 -right-8 h-56 w-56 animate-float rounded-full bg-white/10" style={{ animationDelay: "3s" }} />
          <h2 className="relative text-3xl font-extrabold sm:text-4xl">Questions about these policies?</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-red-50">Reach ZPROO EV Pvt Ltd for questions, complaints or privacy requests.</p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <EmailLink email={EMAIL} className="rounded-full bg-white px-7 py-3 font-bold text-[#d91e2a] transition hover:scale-105">
              ✉ {EMAIL}
            </EmailLink>
            <button onClick={copyEmail} className="rounded-full border border-white/50 px-7 py-3 font-semibold transition hover:bg-white/15">
              {copied ? "Copied ✓" : "Copy email"}
            </button>
          </div>
          <p className="relative mt-6 text-sm text-red-100">© 2026 ZPROO EV Pvt Ltd. All rights reserved.</p>
        </div>
      </section>

      {progress > 8 && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#d91e2a] text-xl font-bold text-white shadow-xl transition hover:-translate-y-1 hover:bg-[#b3141f]"
        >
          ↑
        </button>
      )}
    </main>
  );
};

export default LegalPage;
