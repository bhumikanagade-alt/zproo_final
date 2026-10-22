import React, { useState } from "react";
import { Link } from "react-router";
import { Seo } from "@/components/seo/Seo";
import Reveal from "./Reveal";
import type { PageData, Section } from "../data/pages";

import { EmailLink } from "@/components/layout/EmailLink";
import { CAREER_EMAIL, COMPANY_NAME as COMPANY, SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_HREF } from "@/config/contact";
import { CareerForm } from "@/features/contact/CareerForm";

type ExtraContent = {
  eyebrow: string;
  title: string;
  text: string;
  points: string[];
  cards: { title: string; text: string }[];
};

const EXTRA_CONTENT: Record<string, ExtraContent> = {
  "pnr-status": {
    eyebrow: "Know your status",
    title: "A clearer way to understand your railway booking",
    text: "Your PNR tells an important part of your journey story. Check the latest status, understand the code and plan your next step.",
    points: ["Keep your 10-digit PNR accessible", "Understand CNF, RAC and WL", "Check again as the journey approaches", "Carry matching passenger identification"],
    cards: [
      { title: "Status explained", text: "See what each common railway status means instead of decoding abbreviations yourself." },
      { title: "Plan with updates", text: "A waitlisted or RAC booking can change, so keep checking relevant updates." },
      { title: "Travel ready", text: "Save your PNR and ticket details where you can access them quickly." },
    ],
  },
  "live-train-status": {
    eyebrow: "Stay in the loop",
    title: "Know when your train is getting closer",
    text: "Live running information helps you make practical decisions around station arrival, pickups and onward connections.",
    points: ["Check the train's current progress", "See the next station and estimated timing", "Allow extra time when delays change", "Share useful arrival updates with family"],
    cards: [
      { title: "Plan your pickup", text: "Use the latest estimated arrival information to reduce unnecessary waiting." },
      { title: "Follow the route", text: "See how the train is progressing through its journey and upcoming stops." },
      { title: "Stay flexible", text: "Running times can change, so keep checking as the train approaches your station." },
    ],
  },
  "cancel-booking": {
    eyebrow: "Plans changed?",
    title: "Understand the cancellation journey before you confirm",
    text: "Cancellation rules can vary by operator and ticket. Review the applicable conditions, charges and expected refund before completing the cancellation.",
    points: ["Open the correct booking", "Review the cancellation policy", "Check the refund amount", "Confirm only after reviewing the final details"],
    cards: [
      { title: "Review first", text: "Cancellation windows and charges can differ, so check the policy attached to your booking." },
      { title: "Know the refund", text: "See the applicable refund amount and deductions before confirming cancellation." },
      { title: "Keep proof", text: "Save your cancellation confirmation and booking reference for future follow-up." },
    ],
  },
  "refund-status": {
    eyebrow: "Money back, clearly",
    title: "Follow your refund with less uncertainty",
    text: "Refund timing can depend on the payment method, operator and bank. Keep your booking and transaction details ready while the amount is being processed.",
    points: ["Keep the original booking reference", "Check the refund status after cancellation", "Allow the expected processing period", "Contact support with payment details if it is delayed"],
    cards: [
      { title: "Original payment method", text: "Eligible refunds are generally returned according to the applicable payment and booking process." },
      { title: "Processing time", text: "Banks and payment providers can take different amounts of time to reflect a refund." },
      { title: "Need a follow-up?", text: "Share your booking and transaction references so the team can investigate." },
    ],
  },
  about: {
    eyebrow: "The ZPROO story",
    title: "Technology that keeps travel moving",
    text: "ZPROO GO focuses on making travel information easier to understand and travel actions easier to complete. We build around real traveller needs: clarity, speed and dependable support.",
    points: ["Design around everyday travel problems", "Make important information easy to find", "Keep booking journeys simple", "Improve through feedback and iteration"],
    cards: [
      { title: "Traveller first", text: "Every experience starts with the question: how can this be simpler for the person travelling?" },
      { title: "Clear by design", text: "We aim to make choices, policies and journey information easier to understand." },
      { title: "Always improving", text: "Travel changes constantly, so our experiences are designed to evolve with it." },
    ],
  },
  careers: {
    eyebrow: "Come build with us",
    title: "Bring your ideas to the future of travel",
    text: "We are building experiences that sit at the intersection of technology, movement and everyday human needs. If you enjoy solving real problems, there is room to make an impact.",
    points: ["Own meaningful problems", "Learn through real projects", "Work across product and technology", "Build experiences used by travellers"],
    cards: [
      { title: "Make an impact", text: "Work on products that solve practical problems for people on the move." },
      { title: "Keep learning", text: "Take on new challenges, share ideas and grow with the team." },
      { title: "Build with purpose", text: "Turn thoughtful ideas into useful experiences that can make travel easier." },
    ],
  },
};

const SectionTitle: React.FC<{ title: string; index: number }> = ({ title, index }) => (
  <div className="flex items-start gap-4">
    <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#d91e2a] text-xs font-extrabold text-white shadow-[0_10px_24px_rgba(217,30,42,0.18)]">
      {String(index + 1).padStart(2, "0")}
    </span>
    <div>
      <h2 className="text-2xl font-black tracking-tight text-[#171717] md:text-3xl">{title}</h2>
      <span className="mt-3 block h-1 w-14 rounded-full bg-[#d91e2a]" />
    </div>
  </div>
);

const Faq: React.FC<{ items: { q: string; a: string }[] }> = ({ items }) => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mt-7 space-y-3">
      {items.map((f, i) => {
        const active = open === i;
        return (
          <div
            key={f.q}
            className={`overflow-hidden rounded-2xl border bg-white transition-all duration-300 ${
              active ? "border-[#d91e2a] shadow-[0_14px_35px_rgba(217,30,42,0.10)]" : "border-gray-200 hover:border-red-200 hover:shadow-md"
            }`}
          >
            <button
              onClick={() => setOpen(active ? null : i)}
              aria-expanded={active}
              className="flex w-full items-center justify-between gap-5 px-5 py-5 text-left"
            >
              <span className="flex items-center gap-3 font-bold text-[#171717]">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${active ? "bg-[#d91e2a] text-white" : "bg-red-50 text-[#d91e2a]"}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                {f.q}
              </span>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl transition-transform ${active ? "rotate-180 bg-[#d91e2a] text-white" : "bg-red-50 text-[#d91e2a]"}`}>
                {active ? "−" : "+"}
              </span>
            </button>
            <div className={`grid transition-all duration-300 ${active ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
              <div className="overflow-hidden">
                <p className="whitespace-pre-line border-t border-red-50 px-5 pb-5 pt-4 pl-[68px] leading-7 text-gray-600">{f.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Block: React.FC<{ s: Section }> = ({ s }) => {
  switch (s.t) {
    case "cards":
      return (
        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {s.items.map((c, i) => (
            <article
              key={c.title}
              className="group relative overflow-hidden rounded-[1.35rem] border border-red-100 bg-white p-6 shadow-[0_8px_28px_rgba(217,30,42,0.055)] transition-all duration-300 hover:-translate-y-1.5 hover:border-red-200 hover:shadow-[0_20px_42px_rgba(217,30,42,0.12)]"
            >
              <span className="absolute -right-7 -top-7 h-24 w-24 rounded-full bg-red-50 transition-transform duration-500 group-hover:scale-150" />
              <div className="relative flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl shadow-sm transition-all duration-300 group-hover:bg-[#d91e2a] group-hover:text-white group-hover:rotate-3">
                  {c.icon}
                </div>
                <span className="text-xs font-black tracking-widest text-red-200">0{i + 1}</span>
              </div>
              <h3 className="relative mt-5 text-lg font-extrabold text-[#171717]">{c.title}</h3>
              <p className="relative mt-2 text-[15px] leading-7 text-gray-600">{c.text}</p>
              <div className="relative mt-5 h-1 w-8 rounded-full bg-[#d91e2a] transition-all duration-300 group-hover:w-14" />
            </article>
          ))}
        </div>
      );
    case "steps":
      return (
        <ol className="mt-7 grid gap-4 md:grid-cols-2">
          {s.items.map((st, i) => (
            <li key={st.title} className="group relative rounded-[1.35rem] border border-red-100 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-red-200 hover:shadow-[0_16px_35px_rgba(217,30,42,0.09)]">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#d91e2a] text-sm font-black text-white shadow-[0_8px_18px_rgba(217,30,42,0.22)]">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-extrabold text-[#171717]">{st.title}</h3>
                  <p className="mt-2 leading-7 text-gray-600">{st.text}</p>
                </div>
              </div>
              {i < s.items.length - 1 && <span className="absolute bottom-0 right-6 hidden h-1 w-10 rounded-full bg-red-100 transition-all group-hover:w-16 md:block" />}
            </li>
          ))}
        </ol>
      );
    case "table":
      return (
        <div className="mt-7 overflow-hidden rounded-[1.35rem] border border-red-100 bg-white shadow-[0_8px_28px_rgba(217,30,42,0.055)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[15px]">
              <thead className="bg-red-50 text-[#171717]">
                <tr>
                  {s.head.map((h) => <th key={h} className="border-b border-red-100 px-5 py-4 font-extrabold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {s.rows.map((r, i) => (
                  <tr key={r[0]} className={`border-t border-red-50 transition-colors hover:bg-red-50/60 ${i % 2 ? "bg-white" : "bg-red-50/15"}`}>
                    {r.map((c, j) => (
                      <td key={j} className={`px-5 py-4 ${j === 0 ? "font-extrabold text-[#171717]" : "text-gray-600"}`}>
                        {j === 0 && <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#d91e2a] align-middle" />}
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="h-1 bg-gradient-to-r from-[#d91e2a] via-red-300 to-red-50" />
        </div>
      );
    case "checks":
      return (
        <ul className="mt-7 grid gap-4 sm:grid-cols-2">
          {s.items.map((t, i) => (
            <li key={t} className="group flex items-start gap-4 rounded-[1.2rem] border border-red-100 bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-red-200 hover:shadow-[0_12px_28px_rgba(217,30,42,0.08)]">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 font-black text-[#d91e2a] transition-colors group-hover:bg-[#d91e2a] group-hover:text-white">✓</span>
              <span className="pt-1 leading-6 text-gray-700">{t}</span>
              <span className="ml-auto pt-1 text-xs font-black text-red-200">{String(i + 1).padStart(2, "0")}</span>
            </li>
          ))}
        </ul>
      );
    case "note":
      return (
        <div className="relative mt-7 overflow-hidden rounded-[1.35rem] border border-red-100 bg-gradient-to-br from-red-50 via-white to-white p-6 shadow-[0_10px_30px_rgba(217,30,42,0.06)] sm:p-7">
          <span className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-red-100/70" />
          <div className="relative flex gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#d91e2a] text-xl font-black text-white shadow-lg">i</span>
            <p className="pt-1 leading-7 text-gray-700">{s.text}</p>
          </div>
        </div>
      );
    case "faq":
      return <Faq items={s.items} />;
  }
};

const ExtraSection: React.FC<{ data: ExtraContent }> = ({ data }) => (
  <section className="relative overflow-hidden rounded-[2rem] border border-red-100 bg-white p-7 shadow-[0_15px_45px_rgba(217,30,42,0.07)] sm:p-10">
    <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-red-50" />
    <div className="absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-red-50/70" />
    <div className="relative grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
      <div>
        <span className="inline-flex rounded-full bg-red-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#d91e2a]">{data.eyebrow}</span>
        <h2 className="mt-5 text-3xl font-black leading-tight tracking-tight text-[#171717] md:text-4xl">{data.title}</h2>
        <p className="mt-4 leading-7 text-gray-600">{data.text}</p>
        <div className="mt-7 h-1 w-16 rounded-full bg-[#d91e2a]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {data.points.map((point, i) => (
          <div key={point} className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50/45 p-4 transition hover:bg-red-50">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#d91e2a] text-xs font-black text-white">{i + 1}</span>
            <span className="pt-0.5 text-sm font-semibold leading-6 text-[#444]">{point}</span>
          </div>
        ))}
      </div>
    </div>
    <div className="relative mt-9 grid gap-4 md:grid-cols-3">
      {data.cards.map((card) => (
        <article key={card.title} className="rounded-2xl border border-red-100 bg-white p-5 shadow-[0_7px_22px_rgba(217,30,42,0.045)] transition hover:-translate-y-1 hover:border-red-200 hover:shadow-[0_14px_30px_rgba(217,30,42,0.09)]">
          <span className="mb-4 block h-1 w-9 rounded-full bg-[#d91e2a]" />
          <h3 className="font-extrabold text-[#171717]">{card.title}</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">{card.text}</p>
        </article>
      ))}
    </div>
  </section>
);

const PageLayout: React.FC<{ page: PageData }> = ({ page }) => {
  const extra = EXTRA_CONTENT[page.slug];
  const isFaq = page.slug === "faqs";
  const EMAIL = page.slug === "careers" ? CAREER_EMAIL : SUPPORT_EMAIL;

  return (
    <main key={page.slug} className="bg-white text-[#171717]">
      <Seo title={page.title} description={page.tagline} />
      <section className="relative isolate overflow-hidden border-b border-red-100 bg-white px-[7.8%] pb-12 pt-8 md:pb-16 md:pt-10">
        <div className="absolute -right-28 -top-28 -z-10 h-80 w-80 rounded-full bg-red-100/70 blur-3xl" />
        <div className="absolute -bottom-36 left-[18%] -z-10 h-72 w-72 rounded-full bg-red-50 blur-3xl" />
        <div className="absolute right-[38%] top-28 -z-10 h-20 w-20 rounded-full border-[14px] border-red-50" />

        <div className="mx-auto max-w-[1160px]">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="group inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-[#d91e2a]">
              <span className="transition-transform group-hover:-translate-x-1">←</span> Back home
            </Link>
            <span className="hidden rounded-full border border-red-100 bg-red-50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#d91e2a] sm:block">ZPROO GO · {page.group}</span>
          </div>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_310px] lg:items-center">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#d91e2a]">
                <span className="h-2 w-2 rounded-full bg-[#d91e2a] shadow-[0_0_12px_rgba(217,30,42,0.35)]" /> {page.group}
              </span>
              <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight text-[#171717] sm:text-5xl lg:text-6xl">{page.title}</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">{page.tagline}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/" className="rounded-full bg-[#d91e2a] px-6 py-3 text-sm font-extrabold text-white shadow-[0_10px_28px_rgba(217,30,42,0.22)] transition hover:-translate-y-0.5 hover:bg-red-600">Explore ZPROO</Link>
                <Link to="/contact" className="rounded-full border border-red-200 bg-white px-6 py-3 text-sm font-bold text-[#d91e2a] transition hover:-translate-y-0.5 hover:bg-red-50">Talk to us</Link>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[280px] lg:mx-0 lg:ml-auto">
              <div className="absolute inset-5 rounded-[2rem] bg-red-100 blur-2xl" />
              <div className="relative aspect-square overflow-hidden rounded-[2rem] border border-red-100 bg-white p-5 shadow-[0_25px_55px_rgba(217,30,42,0.12)]">
                <div className="flex h-full flex-col items-center justify-center rounded-[1.5rem] border border-red-100 bg-gradient-to-br from-red-50 via-white to-white">
                  <span className="text-7xl drop-shadow-[0_10px_15px_rgba(217,30,42,0.12)]">{page.icon}</span>
                  <span className="mt-5 text-xs font-black uppercase tracking-[0.3em] text-[#d91e2a]">ZPROO GO</span>
                  <span className="mt-3 h-1 w-12 rounded-full bg-[#d91e2a]" />
                  <span className="mt-4 rounded-full bg-white px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 shadow-sm">Travel made clearer</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {page.stats.map(([v, l], i) => (
              <div key={l} className="group rounded-2xl border border-red-100 bg-white p-4 shadow-[0_8px_24px_rgba(217,30,42,0.045)] transition hover:-translate-y-1 hover:border-red-200 hover:shadow-[0_15px_32px_rgba(217,30,42,0.10)]">
                <div className="flex items-end justify-between gap-2">
                  <div className="text-2xl font-black text-[#171717] sm:text-3xl">{v}</div>
                  <span className="text-[10px] font-black tracking-[0.2em] text-red-200">0{i + 1}</span>
                </div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-500 sm:text-sm">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1160px] space-y-16 px-[7.8%] py-14 md:py-16">
        {extra && !isFaq && <Reveal><ExtraSection data={extra} /></Reveal>}
        {page.sections.map((s, index) => (
          <Reveal key={s.title} delay={index * 40}>
            <section>
              <SectionTitle title={s.title} index={index} />
              <Block s={s} />
            </section>
          </Reveal>
        ))}
      </div>

      {page.slug === "careers" && (
        <section id="apply" className="px-[7.8%] pb-16">
          <div className="mx-auto max-w-[1160px] rounded-[2rem] border border-red-100 bg-white p-6 shadow-[0_20px_55px_rgba(217,30,42,0.08)] sm:p-10">
            <span className="inline-flex rounded-full bg-red-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-[#d91e2a]">Apply now</span>
            <h2 className="mt-4 text-3xl font-black text-[#171717]">Apply to join {COMPANY}</h2>
            <p className="mt-2 mb-6 max-w-2xl leading-7 text-gray-600">Share your details and a link to your resume or portfolio. We read every application.</p>
            <CareerForm />
          </div>
        </section>
      )}

      <section className="px-[7.8%] pb-16">
        <div className="relative mx-auto max-w-[1160px] overflow-hidden rounded-[2rem] border border-red-100 bg-gradient-to-br from-red-50 via-white to-white p-8 text-center shadow-[0_20px_55px_rgba(217,30,42,0.08)] sm:p-12">
          <div className="absolute -right-20 -top-24 h-60 w-60 rounded-full bg-red-100/70 blur-3xl" />
          <div className="absolute -bottom-28 -left-20 h-60 w-60 rounded-full bg-red-50 blur-3xl" />
          <div className="relative">
            <span className="inline-flex rounded-full bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-[#d91e2a] shadow-sm">Need a hand?</span>
            <h2 className="mt-5 text-3xl font-black text-[#171717] sm:text-4xl">Still have a question?</h2>
            <p className="mx-auto mt-3 max-w-xl leading-7 text-gray-600">Write to the {COMPANY} team and we will get back to you.</p>
            <div className="mt-7 flex flex-wrap items-start justify-center gap-3">
              <EmailLink email={EMAIL} className="inline-flex items-center gap-2 rounded-full bg-[#d91e2a] px-7 py-3.5 font-extrabold text-white shadow-[0_10px_30px_rgba(217,30,42,0.22)] transition hover:-translate-y-0.5 hover:bg-red-600">
                ✉ {EMAIL}
              </EmailLink>
              {SUPPORT_PHONE && SUPPORT_PHONE_HREF && page.slug !== "careers" && (
                <a href={SUPPORT_PHONE_HREF} className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-7 py-3.5 font-extrabold text-[#d91e2a] transition hover:-translate-y-0.5 hover:bg-red-50">
                  📞 {SUPPORT_PHONE}
                </a>
              )}
              <Link to="/contact" className="inline-flex items-center rounded-full border border-red-200 bg-white px-7 py-3.5 font-extrabold text-[#d91e2a] transition hover:-translate-y-0.5 hover:bg-red-50">Contact form</Link>
            </div>
            <p className="mt-6 text-xs text-gray-400">© {new Date().getFullYear()} {COMPANY}. All rights reserved.</p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default PageLayout;
