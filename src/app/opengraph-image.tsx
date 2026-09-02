/**
 * THE OBSERVATORY — the social card. The first impression on every share,
 * drawn in the world: night field, the claim with the glowing emission
 * italic, THE APERTURE, THE SPECTRUM's eight lines, survey furniture.
 * Fonts here are server-only (satori needs OTF/TTF); nothing ships to the
 * client. Next convention file — /opengraph-image.
 */

import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

export const dynamic = "force-static";
export const alt =
  "StrataLanding — every landing page looks fine from the surface. We build all eight layers.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SPECTRUM = ["10%", "23%", "34%", "46%", "57%", "68%", "81%", "92%"];

export default async function OgImage() {
  const dir = join(process.cwd(), "src", "fonts", "og");
  const [display, displayItalic, mono] = await Promise.all([
    readFile(join(dir, "InstrumentSerif-Regular.ttf")),
    readFile(join(dir, "InstrumentSerif-Italic.ttf")),
    readFile(join(dir, "SpaceMono-Regular.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(180deg, #0A1526 0%, #081120 40%, #050B18 100%)",
          padding: "52px 64px",
          position: "relative",
        }}
      >
        {/* graticule hairlines */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 210, height: 1, background: "rgba(234,242,247,0.06)", display: "flex" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 420, height: 1, background: "rgba(234,242,247,0.06)", display: "flex" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 400, width: 1, background: "rgba(234,242,247,0.05)", display: "flex" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 800, width: 1, background: "rgba(234,242,247,0.05)", display: "flex" }} />

        {/* survey furniture */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "SpaceMono",
            fontSize: 17,
            letterSpacing: "0.14em",
            color: "rgba(234,242,247,0.6)",
          }}
        >
          <div>STRATALANDING — LANDING PAGE STUDIO</div>
          <div style={{ color: "#22D3EE" }}>THE OBSERVATORY · TRACKING</div>
        </div>

        {/* the claim */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 70,
            fontFamily: "Display",
            fontSize: 88,
            lineHeight: 1.02,
            color: "#EAF2F7",
            width: 860,
          }}
        >
          <div style={{ display: "flex" }}>
            Every landing page looks&nbsp;
            <span
              style={{
                fontFamily: "DisplayItalic",
                color: "#22D3EE",
                textShadow: "0 0 34px rgba(34,211,238,0.55)",
              }}
            >
              fine
            </span>
          </div>
          <div>from the surface.</div>
        </div>

        {/* THE SPECTRUM — eight emission lines */}
        <div
          style={{
            marginTop: 46,
            width: 620,
            height: 54,
            position: "relative",
            display: "flex",
            border: "1px solid rgba(234,242,247,0.16)",
            background: "#071020",
          }}
        >
          {SPECTRUM.map((left, i) => (
            <div
              key={left}
              style={{
                position: "absolute",
                left,
                top: 0,
                bottom: 0,
                width: 3,
                background: "#22D3EE",
                opacity: i % 3 === 1 ? 0.45 : 1,
                boxShadow: "0 0 12px rgba(34,211,238,0.8)",
                display: "flex",
              }}
            />
          ))}
        </div>
        <div
          style={{
            marginTop: 12,
            fontFamily: "SpaceMono",
            fontSize: 15,
            letterSpacing: "0.14em",
            color: "rgba(234,242,247,0.55)",
            display: "flex",
          }}
        >
          THE EIGHT LAYERS OF A PAGE THAT SELLS — ALL EIGHT LINES, OR IT&apos;S NOISE
        </div>

        {/* THE APERTURE */}
        <div
          style={{
            position: "absolute",
            right: 66,
            bottom: 96,
            width: 240,
            height: 240,
            borderRadius: 240,
            border: "2px solid rgba(234,242,247,0.35)",
            boxShadow:
              "0 0 60px rgba(34,211,238,0.35), inset 0 0 60px rgba(5,11,24,0.9)",
            background:
              "radial-gradient(circle at 42% 32%, #10233F 0%, #081428 65%, #050B18 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* crosshair */}
          <div style={{ position: "absolute", left: "50%", top: 8, bottom: 8, width: 1, background: "rgba(34,211,238,0.25)", display: "flex" }} />
          <div style={{ position: "absolute", top: "50%", left: 8, right: 8, height: 1, background: "rgba(34,211,238,0.25)", display: "flex" }} />
          <div
            style={{
              fontFamily: "SpaceMono",
              fontSize: 14,
              letterSpacing: "0.16em",
              color: "#22D3EE",
              display: "flex",
            }}
          >
            RESOLVED · LIVE
          </div>
        </div>

        {/* the offer, on the field */}
        <div
          style={{
            position: "absolute",
            left: 64,
            bottom: 64,
            display: "flex",
            gap: 34,
            fontFamily: "SpaceMono",
            fontSize: 19,
            letterSpacing: "0.14em",
            color: "#EAF2F7",
          }}
        >
          <div>8 LAYERS, EVERY BUILD</div>
          <div style={{ color: "#22D3EE" }}>·</div>
          <div>FIXED FROM $2,400</div>
          <div style={{ color: "#22D3EE" }}>·</div>
          <div>NO CALLS — EVER</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Display", data: display, weight: 400, style: "normal" },
        { name: "DisplayItalic", data: displayItalic, weight: 400, style: "italic" },
        { name: "SpaceMono", data: mono, weight: 400, style: "normal" },
      ],
    }
  );
}
