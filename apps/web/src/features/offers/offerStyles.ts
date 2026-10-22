/** Scoped CSS for the colourful, animated offer cards and service filters. */
export const OFFER_CSS = `
@keyframes offerRise { from { opacity:0; transform: translateY(18px) scale(.97);} to { opacity:1; transform:none;} }
@keyframes offerToastIn { 0%{opacity:0;transform:translateX(35px) scale(.95)} 100%{opacity:1;transform:none} }
@keyframes offerFloatA { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(14px,10px) scale(1.15)} }
@keyframes offerFloatB { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-12px,-8px) scale(1.2)} }
@keyframes offerSweep { 0%{transform:translateX(-120%) skewX(-18deg)} 55%,100%{transform:translateX(320%) skewX(-18deg)} }
@keyframes offerHue { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
@keyframes offerWiggle { 0%,100%{transform:rotate(-8deg) scale(1)} 50%{transform:rotate(6deg) scale(1.08)} }
@keyframes offerCarousel { from{transform:translateX(0)} to{transform:translateX(calc(-50% - 10px))} }
@keyframes offerPop { 0%{transform:scale(.9)} 60%{transform:scale(1.06)} 100%{transform:scale(1)} }

.offer-card{
  position:relative; display:flex; flex-direction:column; overflow:hidden; height:100%;
  border-radius:1.1rem; background:#fff; border:1px solid color-mix(in srgb,var(--o-accent) 18%,#e5e7eb);
  box-shadow:0 6px 18px -8px color-mix(in srgb,var(--o-accent) 45%,transparent);
  animation: offerRise .5s cubic-bezier(.22,1,.36,1) both;
  transition: transform .3s ease, box-shadow .3s ease;
}
.offer-card:hover{ transform:translateY(-6px) rotate(-.4deg); box-shadow:0 22px 38px -14px color-mix(in srgb,var(--o-accent) 60%,transparent); }
.offer-card-head{
  position:relative; overflow:hidden; padding:1rem 1.25rem 1.1rem; color:#fff;
  background: var(--o-gradient); background-size:200% 200%; animation: offerHue 8s ease infinite;
}
.offer-card-head::after{
  content:''; position:absolute; top:0; bottom:0; left:0; width:35%;
  background:linear-gradient(100deg,transparent,rgba(255,255,255,.45),transparent);
  animation: offerSweep 4.5s ease-in-out infinite; pointer-events:none;
}
.offer-orb{ position:absolute; border-radius:9999px; background:rgba(255,255,255,.22); filter:blur(2px); }
.offer-orb-a{ width:90px; height:90px; right:-20px; top:-30px; animation: offerFloatA 6s ease-in-out infinite; }
.offer-orb-b{ width:60px; height:60px; left:35%; bottom:-28px; animation: offerFloatB 7s ease-in-out infinite; }
.offer-card-bgicon{ position:absolute; right:.75rem; bottom:.4rem; width:3.6rem; height:3.6rem; opacity:.22; animation: offerWiggle 5s ease-in-out infinite; }
.offer-card-service{
  display:inline-flex; align-items:center; gap:.3rem; border-radius:9999px; padding:.2rem .6rem;
  font-size:.68rem; font-weight:800; letter-spacing:.06em; text-transform:uppercase;
  background:rgba(255,255,255,.22); backdrop-filter:blur(4px);
}
.offer-card-tag{
  border-radius:9999px; padding:.2rem .55rem; font-size:.65rem; font-weight:800; background:#fff;
  color:var(--o-accent); animation: offerPop 2.4s ease-in-out infinite;
}
.offer-card-value{ position:relative; margin-top:.7rem; font-size:1.9rem; line-height:1; font-weight:900; letter-spacing:-.02em; text-shadow:0 2px 10px rgba(0,0,0,.18); }
.offer-tear{ position:relative; display:flex; align-items:center; height:0; }
.offer-notch{ position:absolute; top:-.7rem; width:1.4rem; height:1.4rem; border-radius:9999px; background:var(--background,#f8fafc); border:1px solid color-mix(in srgb,var(--o-accent) 18%,#e5e7eb); }
.offer-notch-l{ left:-.75rem } .offer-notch-r{ right:-.75rem }
.offer-dash{ margin:0 1rem; flex:1; border-top:2px dashed color-mix(in srgb,var(--o-accent) 30%,#e5e7eb); }
.offer-code-btn{
  margin-top:1rem; display:flex; align-items:center; gap:.5rem; width:100%;
  border-radius:.8rem; padding:.6rem .85rem; font-size:.85rem; font-weight:800; cursor:pointer;
  color:var(--o-accent); background:var(--o-tint); border:2px dashed color-mix(in srgb,var(--o-accent) 45%,transparent);
  transition: all .2s ease;
}
.offer-code-btn:hover{ background:var(--o-accent); color:#fff; border-style:solid; box-shadow:0 8px 18px -8px var(--o-accent); }
.offer-code-btn:active{ transform:scale(.97) }
.offer-code-btn[data-copied='true']{ background:#16a34a; color:#fff; border-color:#16a34a; animation: offerPop .35s ease; }

.offer-chip{
  display:inline-flex; flex-shrink:0; align-items:center; gap:.4rem; border-radius:9999px;
  padding:.5rem .9rem; font-size:.85rem; font-weight:800; cursor:pointer; white-space:nowrap;
  color:var(--chip-accent); background:var(--chip-tint); border:1.5px solid color-mix(in srgb,var(--chip-accent) 25%,transparent);
  transition: transform .2s ease, box-shadow .2s ease, background .2s ease, color .2s ease;
}
.offer-chip:hover{ transform:translateY(-2px); box-shadow:0 8px 16px -8px var(--chip-accent); }
.offer-chip[data-active='true']{
  color:#fff; background:var(--chip-gradient); background-size:200% 200%; border-color:transparent;
  animation: offerHue 6s ease infinite, offerPop .35s ease; box-shadow:0 10px 20px -10px var(--chip-accent);
}
.offer-chip-count{ border-radius:9999px; padding:0 .45rem; font-size:.7rem; line-height:1.15rem; background:color-mix(in srgb,var(--chip-accent) 15%,#fff); color:var(--chip-accent); }
.offer-chip[data-active='true'] .offer-chip-count{ background:rgba(255,255,255,.28); color:#fff; }

.offer-toast{ animation: offerToastIn .35s ease-out }

.offers-carousel-track{ display:flex; width:max-content; gap:20px; margin:0; padding:.5rem 0 1rem; list-style:none; animation: offerCarousel 40s linear infinite; will-change:transform; }
.offers-carousel-card{ width:280px; flex:0 0 280px; }
@media (min-width:640px){ .offers-carousel-card{ width:300px; flex-basis:300px } }

.offers-hero{
  position:relative; overflow:hidden; border-radius:1.5rem; padding:2rem 1.5rem; color:#fff;
  background:linear-gradient(120deg,#d9141e,#ff6a3d,#ec4899,#7c3aed,#2563eb); background-size:300% 300%;
  animation: offerHue 12s ease infinite;
}
.offers-hero .blob{ position:absolute; border-radius:9999px; background:rgba(255,255,255,.18); }
.offers-hero .b1{ width:220px; height:220px; right:-60px; top:-80px; animation: offerFloatA 9s ease-in-out infinite }
.offers-hero .b2{ width:140px; height:140px; left:25%; bottom:-70px; animation: offerFloatB 8s ease-in-out infinite }
.offers-hero .b3{ width:90px; height:90px; left:-30px; top:20%; animation: offerFloatA 7s ease-in-out infinite }

@media (prefers-reduced-motion: reduce){
  .offer-card,.offer-card-head,.offer-card-head::after,.offer-orb,.offer-card-bgicon,.offer-card-tag,
  .offer-chip[data-active='true'],.offers-hero,.offers-hero .blob,.offers-carousel-track,.offer-toast{ animation:none !important }
}
`;

/** Extra CSS for the redBus / AbhiBus-style offers page (service tabs, hero slider, ticket cards). */
export const OFFER_PAGE_CSS = `
@keyframes otkIn{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:none}}
@keyframes otkPulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.45)}50%{box-shadow:0 0 0 7px rgba(239,68,68,0)}}
@keyframes ohsPulse{from{transform:scale(1)}to{transform:scale(1.05)}}
@keyframes tabBounce{0%{transform:translateY(0)}40%{transform:translateY(-6px)}100%{transform:translateY(0)}}

.otk{position:relative;display:flex;overflow:hidden;border-radius:1.2rem;background:#fff;
  border:1px solid color-mix(in srgb,var(--o-accent) 18%,#e5e7eb);animation:otkIn .45s ease-out both;
  box-shadow:0 6px 18px -10px color-mix(in srgb,var(--o-accent) 55%,transparent);transition:transform .25s ease,box-shadow .25s ease}
.otk:hover{transform:translateY(-4px);box-shadow:0 20px 34px -16px color-mix(in srgb,var(--o-accent) 65%,transparent)}
.otk-stub{position:relative;overflow:hidden;flex:0 0 38%;max-width:200px;min-width:130px;padding:1.1rem 1rem;color:#fff;
  background:var(--o-gradient);background-size:200% 200%;animation:offerHue 8s ease infinite;display:flex;flex-direction:column;justify-content:center}
.otk-stub:after{content:'';position:absolute;top:0;bottom:0;left:0;width:35%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.4),transparent);animation:offerSweep 4.5s ease-in-out infinite;pointer-events:none}
.otk-stub:before{content:'';position:absolute;right:-9px;top:0;bottom:0;width:18px;
  background:radial-gradient(circle at 9px 9px,#fff 7px,transparent 7.5px) 0 0/18px 18px repeat-y}
.otk-orb{position:absolute;width:110px;height:110px;border-radius:50%;background:rgba(255,255,255,.2);left:-30px;bottom:-40px;animation:offerFloatA 6s ease-in-out infinite}
.otk-bgicon{position:absolute;right:.4rem;top:.4rem;width:2.8rem;height:2.8rem;opacity:.22;animation:offerWiggle 5s ease-in-out infinite}
.otk-svc{position:relative;display:inline-flex;align-items:center;gap:.3rem;align-self:flex-start;border-radius:9999px;padding:.15rem .55rem;font-size:.62rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;background:rgba(255,255,255,.22)}
.otk-value{position:relative;margin-top:.6rem;font-size:1.65rem;line-height:1.05;font-weight:900;letter-spacing:-.02em;text-shadow:0 2px 8px rgba(0,0,0,.18)}
.otk-min{position:relative;margin-top:.4rem;font-size:.68rem;font-weight:700;opacity:.9}
.otk-body{flex:1;min-width:0;padding:1rem 1.25rem 1rem 1.5rem}
.otk-type{border-radius:9999px;padding:.15rem .6rem;font-size:.68rem;font-weight:800;background:var(--o-tint);color:var(--o-accent)}
.otk-tag{border-radius:9999px;padding:.15rem .6rem;font-size:.68rem;font-weight:800;background:#f3f4f6;color:#4b5563}
.otk-soon{display:inline-flex;align-items:center;gap:.2rem;border-radius:9999px;padding:.15rem .6rem;font-size:.68rem;font-weight:800;background:#fee2e2;color:#dc2626;animation:otkPulse 1.5s ease-in-out infinite}
.otk-cta{display:inline-flex;align-items:center;gap:.35rem;border-radius:.8rem;padding:.6rem 1rem;font-size:.85rem;font-weight:800;color:#fff;background:var(--o-accent);transition:transform .2s ease,filter .2s ease}
.otk-cta:hover{filter:brightness(1.1);transform:translateX(3px)}
.otk-terms{margin-top:.85rem;border-top:1px dashed #e5e7eb;padding-top:.6rem}
.otk-terms summary{display:flex;align-items:center;justify-content:space-between;cursor:pointer;list-style:none;font-size:.78rem;font-weight:800;color:var(--o-accent)}
.otk-terms summary::-webkit-details-marker{display:none}
.otk-chev{transition:transform .25s ease}.otk-terms[open] .otk-chev{transform:rotate(180deg)}
.otk-terms ul{margin-top:.5rem;padding-left:1.1rem;list-style:disc;font-size:.75rem;line-height:1.5;color:#6b7280}
@media (max-width:520px){.otk{flex-direction:column}.otk-stub{flex:none;max-width:none;flex-direction:row;align-items:center;justify-content:space-between;gap:.5rem}.otk-stub:before{display:none}.otk-value{margin-top:0}}

/* Service tabs (icon on top, like bus-app category rails) */
.otabs{position:sticky;top:var(--header-height,4rem);z-index:30;margin:0 -1rem;padding:.6rem 1rem;background:rgba(247,249,252,.92);backdrop-filter:blur(10px);display:flex;gap:.6rem;overflow-x:auto;scrollbar-width:none}
@media(min-width:640px){.otabs{margin:0;border-radius:1.2rem}}
.otab{flex:0 0 auto;min-width:92px;display:flex;flex-direction:column;align-items:center;gap:.35rem;border-radius:1rem;padding:.7rem .8rem;font-size:.78rem;font-weight:800;cursor:pointer;
  color:var(--t-accent);background:var(--t-tint);border:1.5px solid color-mix(in srgb,var(--t-accent) 22%,transparent);transition:transform .2s ease,box-shadow .2s ease}
.otab:hover{transform:translateY(-3px);box-shadow:0 10px 18px -10px var(--t-accent)}
.otab .ic{display:grid;place-items:center;width:2.4rem;height:2.4rem;border-radius:.8rem;background:#fff;box-shadow:0 3px 8px -3px var(--t-accent)}
.otab[data-on='true']{color:#fff;background:var(--t-gradient);background-size:200% 200%;border-color:transparent;animation:offerHue 6s ease infinite;box-shadow:0 12px 22px -12px var(--t-accent)}
.otab[data-on='true'] .ic{color:var(--t-accent);animation:tabBounce .6s ease}
.otab em{font-style:normal;font-size:.65rem;border-radius:9999px;padding:0 .4rem;background:color-mix(in srgb,var(--t-accent) 14%,#fff);color:var(--t-accent)}
.otab[data-on='true'] em{background:rgba(255,255,255,.3);color:#fff}

/* Hero slider */
.ohs{position:relative;overflow:hidden;border-radius:1.5rem;box-shadow:0 20px 36px -22px rgba(15,23,42,.6)}
.ohs-track{display:flex;transition:transform .6s cubic-bezier(.22,1,.36,1)}
.ohs-slide{position:relative;flex:0 0 100%;overflow:hidden;color:#fff;padding:2rem 1.5rem 3rem;min-height:260px;display:flex;align-items:center;
  background:var(--o-gradient);background-size:250% 250%;animation:offerHue 10s ease infinite}
@media(min-width:640px){.ohs-slide{padding:2.5rem 3.5rem 3.2rem;min-height:290px}}
.ohs-blob{position:absolute;border-radius:50%;background:rgba(255,255,255,.18)}
.ohs-b1{width:260px;height:260px;right:-60px;top:-90px;animation:offerFloatA 8s ease-in-out infinite}
.ohs-b2{width:150px;height:150px;right:28%;bottom:-70px;animation:offerFloatB 7s ease-in-out infinite}
.ohs-icon{position:absolute;right:6%;top:50%;width:11rem;height:11rem;margin-top:-5.5rem;opacity:.2;animation:offerWiggle 5s ease-in-out infinite}
.ohs-pill{display:inline-block;border-radius:9999px;padding:.25rem .8rem;font-size:.7rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;background:rgba(255,255,255,.25)}
.ohs-big{margin-top:.7rem;font-size:clamp(2.6rem,7vw,4.4rem);line-height:1;font-weight:900;letter-spacing:-.03em;text-shadow:0 4px 16px rgba(0,0,0,.2);animation:ohsPulse 1.5s ease-in-out infinite alternate;transform-origin:left center}
.ohs-code{margin-top:1.1rem;display:inline-flex;gap:.4rem;align-items:center;border-radius:.9rem;padding:.65rem 1.1rem;font-size:.85rem;font-weight:800;color:#111;background:#fff;border:2px dashed rgba(0,0,0,.25);cursor:pointer;transition:transform .2s ease}
.ohs-code:hover{transform:scale(1.04)}
.ohs-nav{position:absolute;top:50%;margin-top:-1.2rem;display:none;place-items:center;width:2.4rem;height:2.4rem;border-radius:50%;background:rgba(255,255,255,.9);color:#111;cursor:pointer;box-shadow:0 6px 14px rgba(0,0,0,.2)}
@media(min-width:640px){.ohs-nav{display:grid}}
.ohs-prev{left:.9rem}.ohs-next{right:.9rem}
.ohs-dots{position:absolute;left:0;right:0;bottom:.9rem;display:flex;justify-content:center;gap:.4rem}
.ohs-dots button{width:.55rem;height:.55rem;border-radius:9999px;background:rgba(255,255,255,.5);transition:all .3s ease;cursor:pointer}
.ohs-dots button[data-on='true']{width:1.6rem;background:#fff}
@media (prefers-reduced-motion:reduce){.otk,.otk-stub,.otk-stub:after,.otk-orb,.otk-bgicon,.otk-soon,.otab[data-on='true'],.ohs-slide,.ohs-blob,.ohs-icon,.ohs-big{animation:none!important}.ohs-track{transition:none}}
`;
