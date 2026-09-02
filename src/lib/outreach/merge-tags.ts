// Pre-send audit: reject emails that still contain unfilled {{merge_tag}} placeholders.
// Prevents the classic "Hi {{first_name}}" embarrassment from ever shipping.

const MERGE_TAG_PATTERN = /\{\{\s*[A-Za-z0-9_.-]+\s*\}\}/g;

export interface MergeTagAudit {
  ok: boolean;
  offenders: string[];
}

export function auditMergeTags(fields: { subject: string; body: string; body_html?: string | null }): MergeTagAudit {
  const offenders: string[] = [];
  const check = (label: string, s: string | null | undefined) => {
    if (!s) return;
    const matches = s.match(MERGE_TAG_PATTERN);
    if (matches && matches.length) {
      offenders.push(...matches.map((m) => `${label}: ${m}`));
    }
  };
  check('subject', fields.subject);
  check('body', fields.body);
  check('body_html', fields.body_html);
  return { ok: offenders.length === 0, offenders };
}

// Fill merge tags with values. Unknown tags are left as-is so the audit catches them.
export function fillMergeTags(template: string, vars: Record<string, string | number | null | undefined>): string {
  return template.replace(MERGE_TAG_PATTERN, (match) => {
    const key = match.replace(/[{}]/g, '').trim();
    const v = vars[key];
    if (v === null || v === undefined) return match;
    return String(v);
  });
}
