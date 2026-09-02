import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { getDemoPlan } from '@/lib/demo-plans';

// The generated lookup must agree with the catalogs it was derived from, for EVERY demo.
function grab(file: string): Record<string,string> {
  const src = fs.readFileSync(file, 'utf8');
  const out: Record<string,string> = {};
  const re = /id:\s*["']([a-z0-9-]+)["'][\s\S]{0,2000}?plan:\s*["']([a-z-]+)["']/g;
  let m; while ((m = re.exec(src))) out[m[1]] = m[2];
  return out;
}

describe('demo plan lookup matches the source catalogs', () => {
  const expected = { ...grab('src/lib/additional-demos.ts'), ...grab('src/app/demos/page.tsx') };

  // Guards the regex above: if the catalog format ever changes so nothing parses,
  // the tier assertion below would vacuously pass over an empty set.
  it('parses the catalogs', () => {
    expect(Object.keys(expected).length).toBeGreaterThan(0);
  });

  // The invariant that actually matters, and the one that catches drift: a demo
  // route on disk with no catalog entry silently falls back to presence-page.
  it('catalogues every demo route that exists on disk', () => {
    const routes = fs
      .readdirSync('src/app/demos', { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    expect(routes.length).toBeGreaterThan(0);
    expect(routes.filter((slug) => !(slug in expected))).toEqual([]);
  });

  it('returns the same tier as the catalog for every demo', () => {
    const wrong: string[] = [];
    for (const [slug, plan] of Object.entries(expected)) {
      if (getDemoPlan(slug) !== plan) wrong.push(`${slug}: got ${getDemoPlan(slug)}, catalog says ${plan}`);
    }
    expect(wrong).toEqual([]);
  });

  it('falls back to presence-page for an unknown slug', () => {
    expect(getDemoPlan('not-a-real-demo')).toBe('presence-page');
  });
});
