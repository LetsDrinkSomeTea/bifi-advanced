import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  brandIndexHtml,
  brandManifest,
  loadBranding,
  readBrandingFile,
  type Branding,
} from '../lib/branding.ts';

const INDEX = `<!doctype html>
<html lang="de">
  <head>
    <meta name="theme-color" content="#09090b" />
    <meta name="apple-mobile-web-app-title" content="BiFi" />
    <title>BiFi</title>
  </head>
  <body><div id="root"></div></body>
</html>`;

const MANIFEST = JSON.stringify({
  name: 'BiFi',
  short_name: 'BiFi',
  description: 'Vereins-Getränkeliste',
  theme_color: '#09090b',
  background_color: '#09090b',
  icons: [{ src: 'web-app-manifest-192x192.png' }],
});

function branding(overrides: Partial<Branding> = {}): Branding {
  return {
    dir: '/nonexistent',
    config: {},
    hasCss: false,
    hasLogo: false,
    icons: [],
    ...overrides,
  };
}

describe('branding', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'bifi-branding-'));
    await writeFile(
      join(dir, 'branding.json'),
      JSON.stringify({ name: 'Getränke & Co', themeColor: '#2a3d7c', backgroundColor: '' }),
    );
    await writeFile(join(dir, 'theme.css'), ':root { --primary: #2a3d7c; }');
    await writeFile(join(dir, 'logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    await writeFile(join(dir, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    await mkdir(join(dir, 'unterordner'));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('returns null without a branding folder', async () => {
    expect(await loadBranding(join(dir, 'gibt-es-nicht'))).toBeNull();
  });

  it('reads config, stylesheet, logo and icons', async () => {
    const b = await loadBranding(dir);
    expect(b).not.toBeNull();
    expect(b?.config).toEqual({
      name: 'Getränke & Co',
      shortName: undefined,
      description: undefined,
      themeColor: '#2a3d7c',
      backgroundColor: undefined,
    });
    expect(b?.hasCss).toBe(true);
    expect(b?.hasLogo).toBe(true);
    expect(b?.icons).toEqual(['favicon.svg']);
  });

  it('ignores invalid JSON but keeps the rest', async () => {
    const broken = await mkdtemp(join(tmpdir(), 'bifi-branding-broken-'));
    await writeFile(join(broken, 'branding.json'), '{ kein json');
    await writeFile(join(broken, 'theme.css'), '');
    const b = await loadBranding(broken);
    expect(b?.config).toEqual({});
    expect(b?.hasCss).toBe(true);
    await rm(broken, { recursive: true, force: true });
  });

  it('brands index.html and escapes the name', () => {
    const html = brandIndexHtml(
      INDEX,
      branding({
        config: { name: 'Getränke & "Co"', themeColor: '#2a3d7c', description: 'Unsere <Liste>' },
        hasCss: true,
        hasLogo: true,
      }),
    );
    expect(html).toContain('<title>Getränke &amp; "Co"</title>');
    expect(html).toContain('<meta name="theme-color" content="#2a3d7c" />');
    expect(html).toContain(
      '<meta name="apple-mobile-web-app-title" content="Getränke &amp; &quot;Co&quot;" />',
    );
    expect(html).toContain(
      '<html lang="de" data-brand-name="Getränke &amp; &quot;Co&quot;" data-brand-description="Unsere &lt;Liste&gt;" data-brand-logo="/branding/logo.svg">',
    );
    expect(html).toContain('<link rel="stylesheet" href="/branding/theme.css" />');
  });

  it('leaves index.html unchanged with empty branding', () => {
    expect(brandIndexHtml(INDEX, branding())).toBe(INDEX);
  });

  it('brands the manifest and keeps the icons', () => {
    const manifest = JSON.parse(
      brandManifest(
        MANIFEST,
        branding({
          config: {
            name: 'Lager-Bar',
            description: 'Unsere Strichliste',
            backgroundColor: '#f4f3ef',
          },
        }),
      ),
    ) as Record<string, unknown>;
    expect(manifest.name).toBe('Lager-Bar');
    expect(manifest.short_name).toBe('Lager-Bar');
    expect(manifest.description).toBe('Unsere Strichliste');
    expect(manifest.theme_color).toBe('#09090b');
    expect(manifest.background_color).toBe('#f4f3ef');
    expect(manifest.icons).toEqual([{ src: 'web-app-manifest-192x192.png' }]);
  });

  it('only reads flat files with known extensions', async () => {
    const b = branding({ dir });
    expect(await readBrandingFile(b, 'theme.css')).toMatchObject({
      contentType: 'text/css; charset=utf-8',
    });
    expect(await readBrandingFile(b, 'branding.json')).toBeNull();
    expect(await readBrandingFile(b, '../etc/passwd.css')).toBeNull();
    expect(await readBrandingFile(b, 'unterordner/x.css')).toBeNull();
    expect(await readBrandingFile(b, 'fehlt.svg')).toBeNull();
  });
});
