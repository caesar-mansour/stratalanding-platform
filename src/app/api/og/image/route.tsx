import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0B1B3A",
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "white",
              letterSpacing: "-0.5px",
            }}
          >
            StrataLanding
          </div>
          <div style={{ flex: 1 }} />
          <div
            style={{
              fontSize: 16,
              color: "rgba(255,255,255,0.5)",
            }}
          >
            stratalanding.com
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 54,
              fontWeight: 800,
              color: "white",
              lineHeight: 1.15,
              letterSpacing: "-2px",
            }}
          >
            High-performance landing pages that turn clicks into Qualified Leads
          </div>

          <div
            style={{
              fontSize: 22,
              color: "rgba(255,255,255,0.55)",
              marginTop: 24,
              lineHeight: 1.5,
            }}
          >
            Premium UI/UX. Next.js performance. Fixed price, fixed scope. 100% async.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "12px 28px",
              backgroundColor: "#0891B2",
              borderRadius: "8px",
              fontSize: 16,
              fontWeight: 600,
              color: "white",
            }}
          >
            Start Project Brief
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
