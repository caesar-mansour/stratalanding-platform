import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// SECURITY (audit F15): the client IP used for the outbound geo lookup is taken from the
// client-controllable leftmost X-Forwarded-For, then interpolated straight into ipinfo.io /
// ip-api.com URLs — a crafted value could inject path segments (SSRF). Only proceed with a lookup
// when the value is a syntactically valid IP, and URL-encode it.
const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6_RE = /^[0-9a-fA-F:]+$/;
function isValidIp(ip: string | null): boolean {
  if (!ip || ip.length > 45) return false;
  return IPV4_RE.test(ip) || (ip.includes(':') && IPV6_RE.test(ip));
}

// SECURITY (audit M2): this collect endpoint is public (the tracking beacon is embedded on client
// sites), so `site_id` is fully attacker-supplied. Accept events ONLY for the studio's own
// first-party site or a `site_id` that maps to a real project — otherwise anyone can inject
// fabricated/hostile rows into ANY client's analytics dashboard AND amplify Neon writes/storage.
// The known set is cached in-process, so this costs ZERO Neon reads for already-seen sites and at
// most one cheap indexed lookup for an unknown one (which then gates up to 50 row writes).
const SITE_CACHE_TTL_MS = 5 * 60 * 1000;
let knownSites: { ids: Set<string>; at: number } = { ids: new Set(), at: 0 };
// COST (Neon): NEGATIVE results must be cached too. Only positives were, so junk traffic POSTing a
// random site_id got a fresh indexed lookup every time — an unauthenticated way to wake the database
// and hold it awake. Remembering the misses makes a flood cost one query per unique id per window.
let unknownSites: { ids: Set<string>; at: number } = { ids: new Set(), at: 0 };

async function isKnownSite(siteId: string): Promise<boolean> {
  if (siteId === 'stratalanding') return true; // the studio's own first-party site
  const now = Date.now();
  if (knownSites.ids.has(siteId) && now - knownSites.at < SITE_CACHE_TTL_MS) return true;
  if (unknownSites.ids.has(siteId) && now - unknownSites.at < SITE_CACHE_TTL_MS) return false;
  try {
    const [row] = await sql`SELECT 1 AS ok FROM projects WHERE site_id = ${siteId} LIMIT 1`;
    if (row) {
      if (now - knownSites.at >= SITE_CACHE_TTL_MS) knownSites = { ids: new Set(), at: now };
      knownSites.ids.add(siteId);
      return true;
    }
    if (now - unknownSites.at >= SITE_CACHE_TTL_MS) unknownSites = { ids: new Set(), at: now };
    // Bound the miss cache so a randomized-id flood can't grow it without limit.
    if (unknownSites.ids.size < 5000) unknownSites.ids.add(siteId);
    return false;
  } catch {
    return true; // availability: never drop analytics on a transient DB error
  }
}


// Event shape from the client tracking library
interface IncomingEvent {
  session_id: string;
  event_type: string;
  url: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  props?: Record<string, unknown>;
  device_type?: string;
  browser?: string;
  os?: string;
  screen_width?: number;
  screen_height?: number;
  geo_lat?: number;
  geo_lng?: number;
}

interface CollectPayload {
  site_id?: string;
  events: IncomingEvent[];
}

const MAX_EVENTS_PER_REQUEST = 50;

// Known bot/crawler/email-prefetcher patterns to filter out
const BOT_UA_PATTERNS = [
  /bot/i, /crawl/i, /spider/i, /slurp/i, /mediapartners/i,
  /facebookexternalhit/i, /linkedinbot/i, /twitterbot/i, /whatsapp/i,
  /telegrambot/i, /discordbot/i, /slackbot/i,
  /googleimageproxy/i, /google-smtp-source/i,
  /yahoo.*slurp/i, /bingpreview/i, /msnbot/i,
  /applebot/i, /duckduckbot/i, /baiduspider/i, /yandexbot/i,
  /semrushbot/i, /ahrefsbot/i, /dotbot/i, /rogerbot/i,
  /screaming frog/i, /gtmetrix/i, /pingdom/i, /uptimerobot/i,
  /headlesschrome/i, /phantomjs/i, /puppeteer/i, /selenium/i,
  /curl/i, /wget/i, /python-requests/i, /httpx/i, /axios/i,
  /go-http-client/i, /java\//i, /libwww/i, /lwp-/i,
  // Email link pre-fetchers (Gmail, Outlook, etc.)
  /googlebot/i, /google-extended/i,
  /outlook/i, /microsoft office/i,
  /thunderbird/i, /yahoo.*mail/i,
  /barracuda/i, /symantec/i, /proofpoint/i, /mimecast/i,
  /forcepoint/i, /messagelabs/i, /fireeye/i,
];

function isBot(userAgent: string | null): boolean {
  if (!userAgent) return true; // No UA = likely bot
  return BOT_UA_PATTERNS.some(pattern => pattern.test(userAgent));
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Country code → full name
const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', GB: 'United Kingdom', CA: 'Canada', AU: 'Australia',
  DE: 'Germany', FR: 'France', JP: 'Japan', BR: 'Brazil', IN: 'India',
  NL: 'Netherlands', SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland',
  ES: 'Spain', IT: 'Italy', PT: 'Portugal', MX: 'Mexico', AR: 'Argentina',
  KR: 'South Korea', CN: 'China', SG: 'Singapore', HK: 'Hong Kong',
  NZ: 'New Zealand', IE: 'Ireland', CH: 'Switzerland', AT: 'Austria',
  BE: 'Belgium', PL: 'Poland', CZ: 'Czech Republic', IL: 'Israel',
  AE: 'UAE', SA: 'Saudi Arabia', ZA: 'South Africa', NG: 'Nigeria',
  EG: 'Egypt', KE: 'Kenya', PH: 'Philippines', TH: 'Thailand',
  ID: 'Indonesia', MY: 'Malaysia', VN: 'Vietnam', TW: 'Taiwan',
  CO: 'Colombia', CL: 'Chile', PE: 'Peru', RO: 'Romania',
  UA: 'Ukraine', TR: 'Turkey', PK: 'Pakistan', BD: 'Bangladesh',
  RU: 'Russia', GR: 'Greece', HU: 'Hungary', SK: 'Slovakia',
  HR: 'Croatia', RS: 'Serbia', BG: 'Bulgaria', LT: 'Lithuania',
  LV: 'Latvia', EE: 'Estonia', IS: 'Iceland', LU: 'Luxembourg',
};

function getCountryName(code: string | null): string | null {
  if (!code) return null;
  return COUNTRY_NAMES[code.toUpperCase()] || code.toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY (audit F15/F34): cap per-IP so this unauth endpoint can't be flooded. In-memory
    // limiter (NOT the DB-backed one) — analytics fires on every visitor, so the limiter itself
    // must add ZERO Neon writes; the existing event/session writes are the only DB cost here.
    const limiterIp = getClientIp(request);
    if (!rateLimit(`analytics:ip:${limiterIp}`, { max: 600, windowSeconds: 3600 }).allowed) {
      return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
    }

    // COST (Neon): reject bots/prefetchers FIRST. This check used to sit after the site lookup and
    // the geo enrichment, so crawler traffic paid for a database query (and up to two external geo
    // calls) before being discarded. Nothing above this line touches Neon, so bot noise is now free.
    const userAgent = request.headers.get('user-agent');
    if (isBot(userAgent) || request.headers.get('sec-fetch-dest') === 'prefetch') {
      return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
    }

    const body: CollectPayload = await request.json();
    const { site_id = 'stratalanding', events } = body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
    }

    if (events.length > MAX_EVENTS_PER_REQUEST) {
      return NextResponse.json(
        { error: `Max ${MAX_EVENTS_PER_REQUEST} events per request` },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // SECURITY (audit M2): drop events for unknown site_ids BEFORE any geo lookup or DB write.
    // Silent 204 so the endpoint doesn't reveal which site_ids are valid.
    if (!(await isKnownSite(site_id))) {
      return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
    }

    // Extract real client IP
    // IMPORTANT: x-nf-client-connection-ip on Netlify is the EDGE SERVER IP, not the client!
    // x-forwarded-for first entry is the real client IP on Netlify
    const ipAddress =
      request.headers.get('x-real-client-ip') ||           // Injected by our proxy.ts
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || // First entry = real client
      request.headers.get('x-real-ip') ||                  // Nginx
      null;

    // Extract geo from Netlify's x-nf-geo header (base64-encoded JSON)
    // Contains: city, country.code, country.name, subdivision, timezone, latitude, longitude
    let countryCode: string | null = null;
    let country: string | null = null;
    let city: string | null = null;
    let latitude: number | null = null;
    let longitude: number | null = null;

    const nfGeoB64 = request.headers.get('x-nf-geo');
    if (nfGeoB64) {
      try {
        const geoStr = Buffer.from(nfGeoB64, 'base64').toString('utf-8');
        const geo = JSON.parse(geoStr);
        if (geo.city) city = geo.city;
        if (geo.country?.code) countryCode = geo.country.code;
        if (geo.country?.name) country = geo.country.name;
        if (geo.latitude != null) latitude = parseFloat(geo.latitude);
        if (geo.longitude != null) longitude = parseFloat(geo.longitude);
      } catch { /* ignore parse errors */ }
    }

    // Fallback: individual geo headers
    if (!countryCode) {
      countryCode =
        request.headers.get('x-country') ||
        request.headers.get('x-vercel-ip-country') ||
        request.headers.get('cf-ipcountry') ||
        null;
    }
    if (!country && countryCode) country = getCountryName(countryCode);
    if (!city) {
      const rawCity =
        request.headers.get('x-nf-city') ||
        request.headers.get('x-vercel-ip-city') ||
        request.headers.get('cf-ipcity') ||
        null;
      if (rawCity) city = decodeURIComponent(rawCity);
    }

    // Fallback: Vercel lat/lng headers
    if (latitude === null) {
      const vLat = request.headers.get('x-vercel-ip-latitude');
      const vLng = request.headers.get('x-vercel-ip-longitude');
      if (vLat && vLng) {
        latitude = parseFloat(vLat);
        longitude = parseFloat(vLng);
      }
    }

    // Fallback: IP geolocation APIs when city or coordinates are missing
    // Try IPinfo.io first (more accurate), fall back to ip-api.com
    // SECURITY (audit F15): only look up a SYNTACTICALLY VALID IP — never interpolate an
    // attacker-controlled XFF value into the lookup URL (path-injection / SSRF).
    const needsGeoLookup = (!city || latitude === null) && isValidIp(ipAddress) && ipAddress !== '::1' && ipAddress !== '127.0.0.1';
    if (needsGeoLookup) {
      const safeIp = encodeURIComponent(ipAddress as string);
      let geoFound = false;
      // Primary: IPinfo.io (free 50K/month, better accuracy)
      try {
        const ipinfoToken = process.env.IPINFO_TOKEN;
        const ipinfoUrl = ipinfoToken
          ? `https://ipinfo.io/${safeIp}/json?token=${ipinfoToken}`
          : `https://ipinfo.io/${safeIp}/json`;
        const geoRes = await fetch(ipinfoUrl, { signal: AbortSignal.timeout(3000) });
        if (geoRes.ok) {
          const geo = await geoRes.json();
          if (geo.city && !geo.bogon) {
            if (!city) city = geo.city;
            if (!country) country = geo.country || null;
            if (!countryCode) countryCode = geo.country || null;
            if (latitude === null && geo.loc) {
              const [lat, lng] = geo.loc.split(',').map(Number);
              if (!isNaN(lat) && !isNaN(lng)) {
                latitude = lat;
                longitude = lng;
              }
            }
            geoFound = true;
          }
        }
      } catch { /* timeout — try fallback */ }

      // Fallback: ip-api.com (free, no key needed)
      if (!geoFound) {
        try {
          const geoRes = await fetch(`http://ip-api.com/json/${safeIp}?fields=status,country,countryCode,regionName,city,lat,lon,isp`, { signal: AbortSignal.timeout(3000) });
          if (geoRes.ok) {
            const geo = await geoRes.json();
            if (geo.status === 'success') {
              if (!city) city = geo.city || null;
              if (!country) country = geo.country || null;
              if (!countryCode) countryCode = geo.countryCode || null;
              if (latitude === null && geo.lat) latitude = geo.lat;
              if (longitude === null && geo.lon) longitude = geo.lon;
            }
          }
        } catch { /* timeout or network error — skip */ }
      }
    }

    // Validate coordinates are in valid ranges
    if (latitude !== null && (isNaN(latitude) || latitude < -90 || latitude > 90)) latitude = null;
    if (longitude !== null && (isNaN(longitude) || longitude < -180 || longitude > 180)) longitude = null;

    // (bots and prefetchers were already rejected above, before any Neon or geo work)

    // Parse device model from user-agent string
    let deviceModel: string | null = null;
    if (userAgent) {
      if (/iPhone/.test(userAgent)) deviceModel = 'Apple iPhone';
      else if (/iPad/.test(userAgent)) deviceModel = 'Apple iPad';
      else if (/Macintosh/.test(userAgent)) deviceModel = 'Apple Mac';
      else {
        // Android UAs include model: "... Android 14; SM-S928B) ..."
        const androidMatch = userAgent.match(/;\s*([^;)]+)\)\s*AppleWebKit/);
        if (androidMatch) {
          const raw = androidMatch[1].trim().replace(/Build\/.*/, '').trim();
          if (raw && raw.length > 1 && raw !== 'Linux' && raw !== 'U') deviceModel = raw;
        }
      }
    }

    // AUDIT 2026-08-12 (P2): cap every string that reaches Postgres. This endpoint is
    // unauthenticated by necessity (it is a beacon), its rate limiter is in-memory and therefore
    // resets on every lambda cold start, and NOTHING bounded field length — so a script could post
    // multi-megabyte strings for url/referrer/utm/props and write them straight into
    // strata_events. Truncation is the right response here rather than rejection: a legitimately
    // long URL should still be recorded, just bounded.
    const cap = (v: unknown, n: number): string | null => {
      if (v == null) return null;
      const str = String(v);
      return str.length > n ? str.slice(0, n) : str;
    };

    // Validate events
    const validEvents = events
      .filter((e) => e.session_id && e.event_type && e.url)
      .map((e) => ({
        ...e,
        session_id: cap(e.session_id, 128) as string,
        event_type: cap(e.event_type, 64) as string,
        url: cap(e.url, 2048) as string,
        referrer: cap(e.referrer, 2048),
        utm_source: cap(e.utm_source, 255),
        utm_medium: cap(e.utm_medium, 255),
        utm_campaign: cap(e.utm_campaign, 255),
        utm_term: cap(e.utm_term, 255),
        utm_content: cap(e.utm_content, 255),
        browser: cap(e.browser, 128),
        os: cap(e.os, 128),
        device_type: cap(e.device_type, 32),
        // props is JSON — bound the serialized size rather than the object shape.
        props: e.props && JSON.stringify(e.props).length > 4096 ? { truncated: true } : e.props,
      }));

    // Override with client-provided GPS coords if present (most accurate — GPS/WiFi triangulation)
    const clientLat = validEvents.find(e => e.geo_lat != null)?.geo_lat;
    const clientLng = validEvents.find(e => e.geo_lng != null)?.geo_lng;
    if (clientLat != null && clientLng != null &&
        clientLat >= -90 && clientLat <= 90 &&
        clientLng >= -180 && clientLng <= 180) {
      latitude = clientLat;
      longitude = clientLng;
    }

    if (validEvents.length === 0) {
      return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
    }

    // SECURITY (audit M2/F6): persist the TRUSTED (proxy-appended, rightmost) client IP, not the
    // spoofable leftmost X-Forwarded-For. Geo enrichment above still uses the edge-provided value.
    const storedIp = getClientIp(request);

    // Batch insert events via raw SQL
    const eventRows = validEvents.map((e) => ({
      site_id,
      session_id: e.session_id,
      event_type: e.event_type,
      url: e.url,
      referrer: e.referrer || null,
      utm_source: e.utm_source || null,
      utm_medium: e.utm_medium || null,
      utm_campaign: e.utm_campaign || null,
      utm_term: e.utm_term || null,
      utm_content: e.utm_content || null,
      props: JSON.stringify(e.props || {}),
      device_type: e.device_type || null,
      device_model: deviceModel,
      browser: e.browser || null,
      os: e.os || null,
      screen_width: e.screen_width || null,
      screen_height: e.screen_height || null,
      country,
      city,
      latitude,
      longitude,
      ip_address: storedIp,
    }));

    await sql`
      INSERT INTO strata_events ${sql(eventRows, 'site_id', 'session_id', 'event_type', 'url', 'referrer', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'props', 'device_type', 'device_model', 'browser', 'os', 'screen_width', 'screen_height', 'country', 'city', 'latitude', 'longitude', 'ip_address')}
    `;

    // Group events by session
    const sessionMap = new Map<string, {
      events: typeof validEvents;
      pageviews: number;
      eventCount: number;
    }>();

    for (const event of validEvents) {
      const existing = sessionMap.get(event.session_id);
      if (existing) {
        existing.events.push(event);
        if (event.event_type === 'pageview') existing.pageviews++;
        existing.eventCount++;
      } else {
        sessionMap.set(event.session_id, {
          events: [event],
          pageviews: event.event_type === 'pageview' ? 1 : 0,
          eventCount: 1,
        });
      }
    }

    // Upsert sessions
    const now = new Date().toISOString();

    for (const [sessionId, data] of sessionMap) {
      const firstEvent = data.events[0];
      const lastEvent = data.events[data.events.length - 1];

      // AUDIT 2026-08-12 (P2): was SELECT * then INSERT-or-UPDATE — a read-then-write race.
      // Two concurrent beacons for the same session both saw "not exists" and both INSERTed,
      // violating the primary key and 500ing the collector; it also cost 2-3 round trips per
      // session per 5-second flush, which is the kind of chatter that kept Neon awake.
      // One atomic upsert: race-safe, single round trip, and the counters accumulate correctly.
      await sql`
        INSERT INTO strata_sessions (
          id, site_id, started_at, last_seen_at, entry_page, exit_page,
          pageview_count, event_count, referrer, utm_source, utm_medium,
          device_type, device_model, browser, os, country, city, latitude, longitude, ip_address, is_bounce, duration_seconds
        ) VALUES (
          ${sessionId}, ${site_id}, ${now}, ${now}, ${firstEvent.url}, ${lastEvent.url},
          ${data.pageviews}, ${data.eventCount}, ${firstEvent.referrer || null},
          ${firstEvent.utm_source || null}, ${firstEvent.utm_medium || null},
          ${firstEvent.device_type || null}, ${deviceModel}, ${firstEvent.browser || null},
          ${firstEvent.os || null}, ${country}, ${city}, ${latitude}, ${longitude}, ${storedIp},
          ${data.pageviews <= 1}, ${0}
        )
        ON CONFLICT (id) DO UPDATE SET
          last_seen_at     = EXCLUDED.last_seen_at,
          exit_page        = EXCLUDED.exit_page,
          pageview_count   = strata_sessions.pageview_count + EXCLUDED.pageview_count,
          event_count      = strata_sessions.event_count + EXCLUDED.event_count,
          is_bounce        = (strata_sessions.pageview_count + EXCLUDED.pageview_count) <= 1,
          duration_seconds = GREATEST(0, EXTRACT(EPOCH FROM (now() - strata_sessions.started_at))::int)
      `;
    }

    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  } catch (error) {
    console.error('[StrataMetrics] Collect error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500, headers: CORS_HEADERS });
  }
}

// CORS preflight for future cross-domain client tracking
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
