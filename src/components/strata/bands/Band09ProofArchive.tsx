"use client";

/**
 * ST.05 — THE PROOF + THE ARCHIVE.
 * (a) The real client as an engraved record plate — verbatim quote, live
 *     URL, the honesty line as a signed note. No invented numbers, ever.
 * (b) The Archive drawer: four specimens as slabs. Tier B: pull a slab and
 *     it goes LIVE (ArchiveTakeover). Tier A / mobile: plain links, zero
 *     iframes. Count is computed upstream, never typed.
 *
 * Carries BOTH legacy contracts: testimonials (+#testimonials) on the
 * record, demo_preview on the drawer.
 */

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSectionView, useCut, useStrataTier } from "../tier";
import { ArchiveTakeover } from "../ArchiveTakeover";
import { CurrentBand, SpotlightCard } from "@/components/motion/liquid";
import { trackDemoView, trackCtaClick } from "@/lib/analytics";
import { cta } from "@/lib/brand";

const RECORD = [
  {
    pull: "black and gold, and no form between them and a booking",
    quote:
      "A dark-luxury brand page for a Dubai chauffeur service: a fleet showcase, and every call to action routed straight to phone or WhatsApp rather than a form.",
    author: "VIP High Class",
    role: "LUXURY CAR SERVICE",
    url: "https://viphighclass.com",
    domain: "viphighclass.com",
  },
] as const;

const DRAWER = [
  { slug: "agency-niche", title: "AGENCY NICHE", goal: "CLIENT ACQUISITION", img: "/demos/agency-niche-desktop.png" },
  { slug: "saas-waitlist", title: "SAAS WAITLIST", goal: "WAITLIST SIGNUPS", img: "/demos/saas-waitlist-desktop.png" },
  { slug: "gaming-tournament", title: "GAMING TOURNAMENT", goal: "REGISTRATIONS", img: "/demos/gaming-tournament-desktop.png" },
  { slug: "meditation-app", title: "MEDITATION APP", goal: "TRIAL SIGNUPS", img: "/demos/meditation-app-desktop.png" },
] as const;

export function Band09ProofArchive({ demoCount }: { demoCount: number }) {
  const recordRef = useRef<HTMLElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  useSectionView(recordRef, "testimonials");
  useSectionView(drawerRef, "demo_preview");
  useCut(recordRef);
  useCut(drawerRef);
  const tier = useStrataTier();

  return (
    <>
      {/* (a) ON THE RECORD */}
      <section
        ref={recordRef}
        id="testimonials"
        data-strata-band="proof"
        className="st-grain st-grain-deep st-column-mid relative text-strata-bone-body"
      >
        <div className="mx-auto max-w-6xl px-6 py-24 lg:px-10 lg:py-32">
          <div className="flex items-baseline justify-between">
            <p data-scramble className="st-mono text-strata-bone-mute">
              ST.05 / THE PROOF — TRUST, PLACED WHERE DOUBT HAPPENS
            </p>
            <p className="st-mono-sm hidden text-strata-bone-mute sm:block">
              ONE CLIENT · PUBLIC
            </p>
          </div>
          <div className="st-score mt-3 !bg-strata-hairline-deep" />

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {RECORD.map((r, i) => (
              <figure
                key={r.domain}
                className="st-open st-plate-deep relative p-8 lg:p-10"
                data-cut-step={i + 1}
              >
                <p
                  className="text-[clamp(1.4rem,2.2vw,1.9rem)] italic leading-snug text-strata-bone"
                  style={{ fontFamily: "var(--font-strata-body)" }}
                >
                  &ldquo;{r.pull}&rdquo;
                </p>
                <blockquote className="st-body mt-5 !text-[15px] text-strata-bone-body">
                  &ldquo;{r.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6 flex items-baseline justify-between border-t border-strata-hairline-deep pt-4">
                  <span className="st-mono text-strata-bone">
                    {r.author}
                    <span className="ml-3 text-strata-bone-mute">{r.role}</span>
                  </span>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="st-mono-sm text-strata-live underline-offset-4 hover:underline"
                  >
                    {r.domain} ↗
                  </a>
                </figcaption>
                {/* the record seal */}
                <span
                  aria-hidden
                  className="st-mono-sm absolute -right-3 -top-3 flex h-16 w-16 rotate-[-12deg] items-center justify-center rounded-full border-2 border-strata-seam text-center leading-tight text-strata-seam"
                >
                  ON THE
                  <br />
                  RECORD
                </span>
              </figure>
            ))}
          </div>

          <p className="st-body mt-10 max-w-2xl text-strata-bone-body">
            New studio. One public client. Every number on this page is a
            promise or a live measurement —{" "}
            <span className="text-strata-bone">
              never a statistic we invented.
            </span>
          </p>
        </div>
      </section>

      {/* (b) THE ARCHIVE */}
      <section
        ref={drawerRef}
        id="demo-preview"
        data-strata-band="archive"
        className="st-grain st-grain-deep st-column-deep relative border-t border-strata-hairline-deep text-strata-bone-body"
      >
        <div className="mx-auto max-w-6xl px-6 py-24 lg:px-10 lg:py-32">
          <div className="flex items-baseline justify-between">
            <p data-scramble className="st-mono text-strata-bone-mute">
              THE ARCHIVE — {demoCount} SPECIMENS ON FILE
            </p>
            <p className="st-mono-sm hidden text-strata-bone-mute sm:block">
              PULL A SLAB · IT GOES LIVE
            </p>
          </div>
          <div className="st-score mt-3 !bg-strata-hairline-deep" />

          {/* the current — demo titles ride the scroll velocity */}
          <div className="mt-8">
            <CurrentBand
              items={[
                "AGENCY NICHE",
                "SAAS WAITLIST",
                "GAMING TOURNAMENT",
                "MEDITATION APP",
                `${demoCount} SPECIMENS ON FILE`,
                "PULL A SLAB — IT GOES LIVE",
              ]}
              className="st-mono-sm border-y border-strata-hairline-deep py-2 text-strata-bone-mute"
            />
          </div>

          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            {DRAWER.map((d, i) => {
              const face = (
                <SpotlightCard max={4} className="block">
                  <span data-skew className="st-glow-soft relative block aspect-[16/10] overflow-hidden border border-strata-live/25">
                    <Image
                      src={d.img}
                      alt={`${d.title} demo page`}
                      fill
                      loading="lazy"
                      quality={70}
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover object-top transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] group-hover:scale-[1.02]"
                    />
                  </span>
                  <span className="mt-3 flex items-baseline justify-between">
                    <span className="st-mono text-strata-bone">{d.title}</span>
                    <span className="st-mono-sm text-strata-bone-mute">
                      {d.goal}
                    </span>
                  </span>
                  <span className="st-mono-sm mt-1 flex items-center gap-2 text-strata-bone-mute">
                    <span className="h-1 w-1 rounded-full bg-strata-live" />
                    FICTIONAL SHOWCASE · LIVE PAGE
                  </span>
                </SpotlightCard>
              );
              return (
                <div key={d.slug} className="st-open group" data-cut-step={Math.min(3, i + 1)}>
                  {tier === "B" ? (
                    <ArchiveTakeover
                      slug={d.slug}
                      screenshot={d.img}
                      alt={`${d.title} — live demo`}
                      className="block w-full text-left"
                      onOpen={() => trackDemoView(d.slug)}
                    >
                      {face}
                    </ArchiveTakeover>
                  ) : (
                    <Link
                      href={`/demos/${d.slug}`}
                      onClick={() => trackDemoView(d.slug)}
                      className="block"
                    >
                      {face}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-10 flex items-baseline justify-between border-t border-strata-hairline-deep pt-5">
            <p className="st-mono-sm text-strata-bone-mute">
              + {Math.max(0, demoCount - DRAWER.length)} MORE ON FILE
            </p>
            <Link
              href={cta.secondary.href}
              className="st-mono text-strata-bone underline-offset-4 hover:underline"
              onClick={() =>
                trackCtaClick("archive", "secondary", cta.secondary.href)
              }
            >
              {cta.secondary.label} →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
