/**
 * DIRECTOR'S CUT — LOAD THEATER. The first second, authored.
 *
 * A pure-CSS curtain that ships inline in the SSR byte-stream: the cyan
 * waterline draws across a navy sea (0–450ms), then the sea PARTS at the
 * line (450–950ms) revealing the hero — already painted underneath. The
 * final keyframe retires the overlay itself (opacity:0 + visibility:hidden
 * with fill:forwards) — ZERO JavaScript in the choreography.
 *
 * LCP-safe by construction:
 *  - Chromium records LCP at each element's own paint; overlay occlusion is
 *    not tracked. The SSR h1 paints beneath at ~130ms and stays the entry.
 *  - The curtain contains zero LCP candidates: no <img>, no url()
 *    backgrounds, no text nodes. Flat navy panels + a 2px box.
 *  - Fixed, inset-0, pointer-events:none → out of flow → CLS 0.
 *
 * Gates: session repeat (3-line inline script sets html[data-theater-seen]
 * BEFORE the curtain node parses) and prefers-reduced-motion → display:none.
 * RSC — this file adds no client JS.
 */

const THEATER_ON = true; // one-line kill-switch

const CSS = `
#st-theater{position:fixed;inset:0;z-index:90;pointer-events:none;
  animation:st-th-retire 0s linear 1.05s forwards}
.st-th-panel{position:absolute;left:0;right:0;height:50.5%;
  background:linear-gradient(180deg,#f3efe4 0%,#f6f3ec 100%)}
.st-th-top{top:-0.5%;animation:st-th-part-up .5s cubic-bezier(.18,0,.04,1) .45s forwards}
.st-th-bottom{bottom:-0.5%;
  background:linear-gradient(0deg,#f3efe4 0%,#f6f3ec 100%);
  animation:st-th-part-down .5s cubic-bezier(.18,0,.04,1) .45s forwards}
.st-th-line{position:absolute;left:0;right:0;top:50%;height:2px;margin-top:-1px;
  background:linear-gradient(90deg,rgba(34,211,238,0) 0%,#22d3ee 12%,#67e8f9 50%,#22d3ee 88%,rgba(34,211,238,0) 100%);
  box-shadow:0 0 24px rgba(34,211,238,.8),0 0 80px rgba(34,211,238,.35);
  transform:scaleX(0);transform-origin:left center;
  animation:st-th-draw .45s cubic-bezier(.2,0,0,1) forwards,
            st-th-line-fade .35s linear .5s forwards}
@keyframes st-th-draw{to{transform:scaleX(1)}}
@keyframes st-th-part-up{to{transform:translateY(-101%)}}
@keyframes st-th-part-down{to{transform:translateY(101%)}}
@keyframes st-th-line-fade{to{opacity:0}}
@keyframes st-th-retire{to{opacity:0;visibility:hidden}}
html[data-theater-seen] #st-theater{display:none}
@media (prefers-reduced-motion: reduce){#st-theater{display:none}}
`;

const SESSION_GATE = `try{if(sessionStorage.getItem('st-theater')){document.documentElement.dataset.theaterSeen='1'}else{sessionStorage.setItem('st-theater','1')}}catch(e){}`;

export function LoadTheater() {
  if (!THEATER_ON) return null;
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SESSION_GATE }} />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div id="st-theater" aria-hidden="true">
        <div className="st-th-panel st-th-top" />
        <div className="st-th-panel st-th-bottom" />
        <div className="st-th-line" />
      </div>
    </>
  );
}
