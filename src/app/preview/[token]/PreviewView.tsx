'use client';

/*
 * PreviewView — "The Letterhead".
 * The gate a cold-called practice opens from Caesar's text. The welcome stage is
 * a daylight typeset letter (Letterhead: their name as the masthead, a polaroid
 * of the new site that develops, one plainly asked question — concept bake-off
 * winner 2026-07-13, replacing the dark Command Seal, which replaced the 5-act
 * Premiere the same week; git history holds both). Every other stage renders the
 * focused centered card (StageCards).
 *
 * LOAD-BEARING (verbatim from the pre-redesign gate — do not rename):
 *  - stage machine + API calls (send-code / approve / decline)
 *  - tracking: initPreviewTracker(surface:'gate'), withSiteTracking (?sv=),
 *    click labels 'like' | 'not_for_me' | 'exploring' | 'send_proposal' |
 *    'resend_code' | 'resend_login' | 'reason: …'
 */

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useReducedMotion } from 'framer-motion';
import { initPreviewTracker, withSiteTracking, type Tracker } from '@/lib/preview-tracker';
import { SANS, type Comparison } from './_components/bits';
import Letterhead from './_components/Letterhead';
import StickyBar from './_components/StickyBar';
import StageCards from './_components/StageCards';

export type { SiteScores, Comparison } from './_components/bits';

const Burst = dynamic(() => import('./_components/burst'), { ssr: false });

interface Props {
  token: string;
  vid: string;
  practiceName: string;
  slug: string;
  previewUrl: string;
  status: string;
  contactEmail: string;
  expired: boolean;
  expiresAt: string | null;
  hasShot: boolean;
  comparison?: Comparison | null;
}

type Stage = 'welcome' | 'proposal' | 'code' | 'decline' | 'done-approved' | 'done-emailed' | 'done-declined' | 'done-exploring';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const DECLINE_REASONS = ['Too expensive', 'Not the right time', 'Happy with my current site', 'Already have someone', 'Just not for me'];

export default function PreviewView({ token, vid, practiceName, slug, previewUrl, status, contactEmail, expired, expiresAt, hasShot, comparison }: Props) {
  const [stage, setStage] = useState<Stage>('welcome');
  const [email, setEmail] = useState(contactEmail);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [resent, setResent] = useState(false);
  const [emailed, setEmailed] = useState(false); // approve fell back to emailing a login link
  const [otpLeft, setOtpLeft] = useState(0);     // seconds left on the current code
  const [resendLeft, setResendLeft] = useState(0); // cooldown before another code can be requested
  const [otpKey, setOtpKey] = useState(0);       // remount the inputs on send/retry
  const [declineReason, setDeclineReason] = useState('');
  const [siteViewed, setSiteViewed] = useState(false);
  const [burstOn, setBurstOn] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);   // one-shot attention pulse on the sticky CTA
  const reduce = useReducedMotion();

  // Engagement tracking — opened, scroll depth, dwell, tab hide/return, and each micro-commit
  // stage. Best-effort beacons; never blocks or affects the prospect's experience.
  const tracker = useRef<Tracker | null>(null);
  useEffect(() => {
    const t = initPreviewTracker({ vid, surface: 'gate' });
    tracker.current = t;
    t.track({ kind: 'open' });
    return () => { t.stop(); tracker.current = null; };
  }, [vid]);
  // Report each stage the prospect advances to (skip the initial 'welcome' — 'open' covers it).
  useEffect(() => {
    if (stage !== 'welcome') tracker.current?.track({ kind: 'stage', stage });
  }, [stage]);
  // The welcome page is now a long scroll — bring focused cards back to the top.
  useEffect(() => {
    if (stage !== 'welcome') window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [stage]);

  // "View your new website" → record the click-through before the new tab opens.
  // The gate's own URL rides along in the fragment so the spec site's "I love it"
  // bar can bring them straight back here (build-inlined env — never window.location,
  // which would mismatch the SSR href and break hydration).
  const siteHref = withSiteTracking(previewUrl, vid, `${process.env.NEXT_PUBLIC_SITE_URL || ''}/preview/${token}`);
  const onViewSite = () => { tracker.current?.track({ kind: 'view_site' }); setSiteViewed(true); };
  // Record which buttons they press on the gate page ("did they like it? press here and there?").
  const logClick = (label: string) => tracker.current?.track({ kind: 'click', label });

  // Returning from the spec site's "I love it" bar (?yes=1): the yes was already
  // declared there (the bar beacons the `like` — don't re-fire it), so skip the
  // scroll page and land them straight on the proposal card.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('yes') !== '1') return;
    window.history.replaceState(null, '', window.location.pathname);
    if (expired || status === 'approved') return;
    setSiteViewed(true);
    if (!reduce) setBurstOn(true);
    setStage('proposal');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown on the active code + on the resend cooldown
  useEffect(() => {
    if (stage !== 'code' || otpLeft <= 0) return;
    const t = setTimeout(() => setOtpLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [stage, otpLeft]);
  useEffect(() => {
    if (stage !== 'code' || resendLeft <= 0) return;
    const t = setTimeout(() => setResendLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [stage, resendLeft]);

  // Step 1 of approve: email a 6-digit code, move to the on-site entry step.
  async function sendCode() {
    setErr('');
    if (!EMAIL_RE.test(email)) { setErr('Please enter a valid email.'); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/preview/${token}/send-code`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || 'Could not send the code. Try again.');
        // Cooldown 429 mid-resend: reflect the server's clock on the resend button.
        if (res.status === 429 && data.retryInSec) setResendLeft(data.retryInSec);
        setBusy(false);
        return;
      }
      setOtpLeft(data.expiresInSec || 600);
      setResendLeft(data.resendInSec ?? 45);
      setOtpKey((k) => k + 1);
      setStage('code');
    } catch { setErr('Network error. Try again.'); }
    setBusy(false);
  }

  // Step 2 of approve: confirm the code → create the lead → instant login.
  async function verifyCode(fullCode: string) {
    setErr('');
    setBusy(true);
    try {
      const res = await fetch(`/api/preview/${token}/approve`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, message, code: fullCode }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'Something went wrong. Try again.'); setOtpKey((k) => k + 1); setBusy(false); return; }
      if (data.verifyUrl) { window.location.href = data.verifyUrl; return; }
      setEmailed(!!data.emailed);
      setStage('done-emailed');
    } catch { setErr('Network error. Try again.'); }
    setBusy(false);
  }

  async function resend() { if (resendLeft <= 0 && !busy) await sendCode(); }

  // Already-approved revisit: re-issue a login link (the approve endpoint emails it on replay).
  async function resendLogin() {
    setBusy(true);
    try {
      const res = await fetch(`/api/preview/${token}/approve`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email || contactEmail }),
      });
      const data = await res.json();
      if (data.verifyUrl) { window.location.href = data.verifyUrl; return; }
      setResent(true);
    } catch { /* graceful */ }
    setBusy(false);
  }

  async function decline(reason: 'not_for_me' | 'exploring', msg?: string) {
    setBusy(true);
    try {
      await fetch(`/api/preview/${token}/decline`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason, email, message: msg !== undefined ? msg : message }),
      });
    } catch { /* never block the prospect on a network hiccup */ }
    setBusy(false);
    setStage(reason === 'exploring' ? 'done-exploring' : 'done-declined');
  }

  const approvedView = status === 'approved' || stage === 'done-approved';
  const premiere = stage === 'welcome' && !expired && !approvedView;

  // One-shot return-moment nudge (desktop): when they come back from the spec-site tab
  // still on the scroll page, bring the decision card into view and pulse the CTA —
  // mobile already gets the morphing sticky bar. Prospects arriving via ?yes=1 never
  // hit this (stage is already 'proposal').
  const nudgedRef = useRef(false);
  useEffect(() => {
    if (!premiere || !siteViewed) return;
    const onVis = () => {
      if (document.hidden || nudgedRef.current) return;
      if (!window.matchMedia('(min-width: 1024px)').matches) return;
      nudgedRef.current = true;
      document.querySelector('[data-act="decision"]')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      setPulseKey((k) => k + 1);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [premiere, siteViewed, reduce]);

  const onLike = () => {
    logClick('like');
    if (!reduce) setBurstOn(true);
    setStage('proposal');
  };
  const onNotForMe = () => { logClick('not_for_me'); setStage('decline'); };

  const expiresText = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    : null;

  return (
    <>
      {burstOn && <Burst onDone={() => setBurstOn(false)} />}
      {premiere ? (
        <div style={{ fontFamily: SANS, background: '#EFECE7' }}>
          <StickyBar siteHref={siteHref} onViewSite={onViewSite} siteViewed={siteViewed} onLike={onLike} pulseKey={pulseKey} />
          <Letterhead
            practiceName={practiceName}
            expiresText={expiresText}
            slug={slug}
            hasShot={hasShot}
            siteHref={siteHref}
            siteViewed={siteViewed}
            comparison={comparison ?? null}
            pulseKey={pulseKey}
            onViewSite={onViewSite}
            onLike={onLike}
            onNotForMe={onNotForMe}
          />
        </div>
      ) : (
        <StageCards
          stage={stage}
          expired={expired}
          approvedView={approvedView}
          resent={resent}
          emailed={emailed}
          busy={busy}
          err={err}
          email={email}
          message={message}
          declineReason={declineReason}
          otpLeft={otpLeft}
          resendLeft={resendLeft}
          otpKey={otpKey}
          contactEmail={contactEmail}
          fmtTime={fmtTime}
          declineReasons={DECLINE_REASONS}
          setEmail={setEmail}
          setMessage={setMessage}
          setDeclineReason={setDeclineReason}
          setErr={setErr}
          goTo={(s) => setStage(s)}
          logClick={logClick}
          sendCode={sendCode}
          verifyCode={verifyCode}
          resend={resend}
          resendLogin={resendLogin}
          decline={decline}
        />
      )}
    </>
  );
}
