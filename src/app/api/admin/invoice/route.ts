import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { packagePricing, type PackageType } from '@/lib/types';
import { verifyAdmin } from '@/lib/admin-auth';
import { escapeHtml } from '@/lib/html-utils';

// GET - Generate invoice/receipt HTML for a project or payment
export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const paymentId = searchParams.get('paymentId');
    const format = searchParams.get('format') || 'html'; // html or json

    if (!projectId && !paymentId) {
      return NextResponse.json({ error: 'Project ID or Payment ID required' }, { status: 400 });
    }

    // Get project + client + brief data
    let project;
    if (projectId) {
      [project] = await sql`
        SELECT p.*, c.name as client_name, c.email as client_email,
               bs.company_name, bs.industry
        FROM projects p
        INNER JOIN clients c ON c.id = p.client_id
        LEFT JOIN brief_submissions bs ON bs.project_id = p.id
        WHERE p.id = ${projectId}
        LIMIT 1
      `;
    } else {
      const [payment] = await sql`SELECT project_id FROM payments WHERE id = ${paymentId} LIMIT 1`;
      if (!payment) {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      }
      [project] = await sql`
        SELECT p.*, c.name as client_name, c.email as client_email,
               bs.company_name, bs.industry
        FROM projects p
        INNER JOIN clients c ON c.id = p.client_id
        LEFT JOIN brief_submissions bs ON bs.project_id = p.id
        WHERE p.id = ${payment.project_id}
        LIMIT 1
      `;
    }

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get payments for this project
    const payments = [...await sql`
      SELECT * FROM payments WHERE project_id = ${project.id} ORDER BY created_at ASC
    `] as { id: string; type: string; amount_cents: number; created_at: string; currency: string }[];

    const packageLabels: Record<string, string> = {
      starter: 'Presence Page',
      growth: 'Lead Page',
      scale: 'Purchase Page',
    };

    const totalPriceCents = packagePricing[project.package as PackageType] || 0;
    const totalPrice = (totalPriceCents / 100).toFixed(2);
    const depositAmount = (totalPriceCents / 200).toFixed(2);
    const paidTotal = payments.reduce((sum, p) => sum + p.amount_cents, 0);
    const balanceDue = ((totalPriceCents - paidTotal) / 100).toFixed(2);

    const invoiceData = {
      invoiceNumber: `INV-${project.id.slice(0, 8).toUpperCase()}`,
      date: new Date().toISOString(),
      client: {
        name: project.client_name || 'Client',
        email: project.client_email,
        company: project.company_name || '',
      },
      project: {
        id: project.id,
        package: packageLabels[project.package] || project.package,
        status: project.status,
        created: project.created_at,
      },
      lineItems: [{
        description: `${packageLabels[project.package] || project.package} — Landing Page Package`,
        amount: totalPrice,
      }],
      payments: payments.map((p) => ({
        id: p.id,
        type: p.type,
        amount: (p.amount_cents / 100).toFixed(2),
        date: p.created_at,
        currency: p.currency,
      })),
      totals: {
        subtotal: totalPrice,
        deposit: depositAmount,
        paid: (paidTotal / 100).toFixed(2),
        balance: balanceDue,
        currency: 'USD',
      },
    };

    if (format === 'json') {
      return NextResponse.json(invoiceData);
    }

    // Generate printable HTML invoice
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceData.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; background: #fff; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #0891B2; }
    .brand { font-size: 24px; font-weight: 700; color: #0B1B3A; }
    .brand-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
    .invoice-info { text-align: right; }
    .invoice-number { font-size: 20px; font-weight: 600; color: #0891B2; }
    .invoice-date { font-size: 14px; color: #64748b; margin-top: 4px; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .client-info p { font-size: 14px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { text-align: left; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; }
    td { padding: 12px 16px; border: 1px solid #e2e8f0; font-size: 14px; }
    .amount { text-align: right; font-variant-numeric: tabular-nums; }
    .totals { margin-top: 20px; display: flex; justify-content: flex-end; }
    .totals-table { width: 280px; }
    .totals-table tr td { padding: 8px 0; border: none; font-size: 14px; }
    .totals-table tr td:last-child { text-align: right; font-weight: 500; }
    .totals-table tr.total td { border-top: 2px solid #0f172a; font-weight: 700; font-size: 16px; padding-top: 12px; }
    .totals-table tr.balance td { color: #059669; font-weight: 600; }
    .payments-section { margin-top: 30px; }
    .payment-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .badge-deposit { background: #dbeafe; color: #1e40af; }
    .badge-final { background: #dcfce7; color: #166534; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">StrataLanding</div>
      <div class="brand-sub">Premium Landing Pages</div>
      <div class="brand-sub">stratalanding@gmail.com</div>
    </div>
    <div class="invoice-info">
      <div class="invoice-number">${invoiceData.invoiceNumber}</div>
      <div class="invoice-date">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Bill To</div>
    <div class="client-info">
      <p><strong>${escapeHtml(invoiceData.client.name)}</strong></p>
      ${invoiceData.client.company ? `<p>${escapeHtml(invoiceData.client.company)}</p>` : ''}
      <p>${escapeHtml(invoiceData.client.email)}</p>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Services</div>
    <table>
      <thead><tr><th>Description</th><th class="amount">Amount</th></tr></thead>
      <tbody>
        ${invoiceData.lineItems.map(item => `<tr><td>${item.description}</td><td class="amount">$${item.amount}</td></tr>`).join('')}
      </tbody>
    </table>
  </div>

  <div class="totals">
    <table class="totals-table">
      <tr><td>Subtotal</td><td>$${invoiceData.totals.subtotal}</td></tr>
      <tr><td>Paid</td><td>-$${invoiceData.totals.paid}</td></tr>
      <tr class="total"><td>Balance Due</td><td>$${invoiceData.totals.balance}</td></tr>
    </table>
  </div>

  ${payments.length > 0 ? `
  <div class="payments-section">
    <div class="section-title">Payment History</div>
    <table>
      <thead><tr><th>Date</th><th>Type</th><th class="amount">Amount</th></tr></thead>
      <tbody>
        ${payments.map((p) => `
          <tr>
            <td>${new Date(p.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
            <td><span class="payment-badge ${p.type === 'deposit' ? 'badge-deposit' : 'badge-final'}">${p.type === 'deposit' ? 'Deposit' : 'Final'}</span></td>
            <td class="amount">$${(p.amount_cents / 100).toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="footer">
    <p>StrataLanding — Premium Landing Pages</p>
    <p style="margin-top: 4px;">Thank you for your business!</p>
  </div>

  <div class="no-print" style="text-align: center; margin-top: 30px;">
    <button onclick="window.print()" style="padding: 10px 24px; background: #0891B2; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer;">Print / Save as PDF</button>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('Invoice generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
