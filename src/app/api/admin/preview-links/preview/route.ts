import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { previewLinkEmailContent, previewLinkFollowupEmailContent } from '@/lib/auth/emails';
import { escapeHtml } from '@/lib/html-utils';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// GET — render the EXACT preview-link email (or, with ?type=followup, the follow-up email)
// so the founder can see what gets sent before hitting "Send". No email is sent; the link
// shown is an example token.
export async function GET(request: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const practice = (searchParams.get('practice') || 'Your Practice').slice(0, 200);
  const exampleUrl = `${SITE_URL}/preview/EXAMPLE-LINK`;
  const { subject, html } = searchParams.get('type') === 'followup'
    ? previewLinkFollowupEmailContent(practice, exampleUrl, searchParams.get('opened') === '1')
    : previewLinkEmailContent(practice, exampleUrl);

  const page = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email preview — ${escapeHtml(practice)}</title></head>
<body style="margin:0;background:#f1f5f9;padding:24px;font-family:sans-serif">
  <div style="max-width:640px;margin:0 auto">
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin-bottom:12px;color:#475569;font-size:13px">
      <div><b>Subject:</b> ${escapeHtml(subject)}</div>
      <div style="color:#94a3b8;margin-top:4px">This is exactly what gets sent. On a real send, the button links to that lead's private preview.</div>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">${html}</div>
  </div>
</body></html>`;

  return new NextResponse(page, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
