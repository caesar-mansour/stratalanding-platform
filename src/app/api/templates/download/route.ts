import { NextResponse, type NextRequest } from 'next/server';
import { verifyDownloadToken } from '@/lib/template-delivery';
import { getServerUser } from '@/lib/auth-server';
import { getFile } from '@/lib/storage';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token = searchParams.get('token');
  const purchaseId = searchParams.get('purchaseId');

  let buyerEmail: string;
  let resolvedPurchaseId: string;

  // Mode A: Token-based (email links)
  if (token) {
    const verified = verifyDownloadToken(token);
    if (!verified) {
      return NextResponse.json(
        { error: 'Invalid or expired download link. Log in to /portal/my-templates to re-download.' },
        { status: 401 }
      );
    }
    buyerEmail = verified.email;
    resolvedPurchaseId = verified.purchaseId;
  }
  // Mode B: Authenticated (portal)
  else if (purchaseId) {
    // SECURITY (audit H1): validate the session against the DB (revocation/expiry/AAL), not the
    // JWT alone, before serving a paid template to a "logged-in" buyer.
    const { user } = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    buyerEmail = user.email;
    resolvedPurchaseId = purchaseId;
  } else {
    return NextResponse.json({ error: 'Missing token or purchaseId' }, { status: 400 });
  }

  // Look up the purchase
  const [purchase] = await sql`
    SELECT id, buyer_email, template_id, plan, download_consumed_at
    FROM template_purchases
    WHERE id = ${resolvedPurchaseId}
    LIMIT 1
  `;

  if (!purchase) {
    return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
  }

  // Verify email matches (for auth mode)
  if (purchase.buyer_email.toLowerCase() !== buyerEmail.toLowerCase()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // SECURITY (audit F85): the emailed token is a 72h bearer that survived logout/password-reset
  // and was infinitely replayable. Make it SINGLE-USE — once consumed, the buyer re-downloads
  // from their (authenticated) portal instead. Authenticated portal downloads (Mode B) are exempt.
  if (token && purchase.download_consumed_at) {
    return NextResponse.json(
      { error: 'This download link was already used. Log in to /portal/my-templates to re-download.' },
      { status: 410 }
    );
  }

  // Look up template file
  const [templateFile] = await sql`
    SELECT storage_key, display_name
    FROM template_files
    WHERE template_id = ${purchase.template_id} AND active = true
    LIMIT 1
  `;

  if (!templateFile) {
    return NextResponse.json(
      { error: 'Template file not available. Contact support at stratalanding@gmail.com' },
      { status: 404 }
    );
  }

  // Fetch the file
  const { data, error } = await getFile(templateFile.storage_key);
  if (error || !data) {
    console.error('Failed to fetch template file:', error);
    return NextResponse.json({ error: 'Failed to retrieve template file' }, { status: 500 });
  }

  // Increment download count; mark the token consumed when this was a token (Mode A) download.
  if (token) {
    sql`
      UPDATE template_purchases
      SET download_count = download_count + 1, download_consumed_at = COALESCE(download_consumed_at, now())
      WHERE id = ${resolvedPurchaseId}
    `.catch(() => {});
  } else {
    sql`
      UPDATE template_purchases SET download_count = download_count + 1 WHERE id = ${resolvedPurchaseId}
    `.catch(() => {});
  }

  // Serve the zip file
  const fileName = `${templateFile.display_name.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-')}.zip`;

  const body = new Uint8Array(data);

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': body.byteLength.toString(),
      'Cache-Control': 'no-store',
    },
  });
}
