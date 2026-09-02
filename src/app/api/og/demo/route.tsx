import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getDemoBySlug, slugToTitle } from "@/lib/demo-registry";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug") || "demo";
  const demo = getDemoBySlug(slug);

  const title = demo?.title || slugToTitle(slug);
  const category = demo?.category || "Landing Page";
  const goalLabel = demo?.goalLabel || "Demo";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0B1B3A",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 30,
          }}
        >
          <svg width="60" height="60" viewBox="0 0 48 48" fill="none">
            <rect x="4" y="32" width="40" height="8" rx="2" fill="white" fillOpacity="0.4" />
            <rect x="8" y="20" width="32" height="8" rx="2" fill="white" fillOpacity="0.7" />
            <rect x="12" y="8" width="24" height="8" rx="2" fill="white" />
          </svg>
        </div>

        {/* Category Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px 24px",
            backgroundColor: "rgba(8, 145, 178, 0.3)",
            borderRadius: 24,
            marginBottom: 24,
          }}
        >
          <span style={{ color: "#22D3EE", fontSize: 20, fontWeight: 500 }}>
            {category}
          </span>
        </div>

        {/* Demo Title */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "white",
            marginBottom: 16,
            letterSpacing: "-1px",
            textAlign: "center",
            maxWidth: "80%",
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: "#94A3B8",
            fontWeight: 400,
            marginBottom: 40,
          }}
        >
          Landing Page Template
        </div>

        {/* Goal Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px 28px",
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: 8,
          }}
        >
          <span style={{ color: "#E2E8F0", fontSize: 18, fontWeight: 500 }}>
            {goalLabel} &bull; StrataLanding
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
