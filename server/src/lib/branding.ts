import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';

/**
 * Optional branding: a mounted folder (BRANDING_DIR, /app/branding in the container by
 * default) can replace BiFi's name, colours, logo and icons. Without the folder nothing
 * changes.
 *
 * Folder contents (all optional):
 *   branding.json  { name, shortName, description, themeColor, backgroundColor }
 *   theme.css      overrides the CSS variables from client/src/main.css
 *   logo.svg       replaces the beer icon in the top bar and on the login page
 *   favicon.ico, favicon.svg, favicon-96x96.png, apple-touch-icon.png,
 *   web-app-manifest-192x192.png, web-app-manifest-512x512.png
 *                  replace the files of the same name from client/public
 */

export const BRANDING_ICONS = [
  'favicon.ico',
  'favicon.svg',
  'favicon-96x96.png',
  'apple-touch-icon.png',
  'web-app-manifest-192x192.png',
  'web-app-manifest-512x512.png',
] as const;

export interface BrandingConfig {
  name?: string;
  shortName?: string;
  description?: string;
  themeColor?: string;
  backgroundColor?: string;
}

export interface Branding {
  dir: string;
  config: BrandingConfig;
  hasCss: boolean;
  hasLogo: boolean;
  icons: string[];
}

const CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

export function getBrandingDir(): string {
  return process.env.BRANDING_DIR ?? join(process.cwd(), 'branding');
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

function pickString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

/** Reads the branding folder. Returns null if there is none. */
export async function loadBranding(dir: string = getBrandingDir()): Promise<Branding | null> {
  try {
    if (!(await stat(dir)).isDirectory()) return null;
  } catch {
    return null;
  }

  let config: BrandingConfig = {};
  const configPath = join(dir, 'branding.json');
  if (await isFile(configPath)) {
    try {
      const raw = JSON.parse(await readFile(configPath, 'utf8')) as Record<string, unknown>;
      config = {
        name: pickString(raw.name),
        shortName: pickString(raw.shortName),
        description: pickString(raw.description),
        themeColor: pickString(raw.themeColor),
        backgroundColor: pickString(raw.backgroundColor),
      };
    } catch (err) {
      console.error(`Branding: ${configPath} is not valid JSON and is ignored.`, err);
    }
  }

  const icons: string[] = [];
  for (const icon of BRANDING_ICONS) {
    if (await isFile(join(dir, icon))) icons.push(icon);
  }

  return {
    dir,
    config,
    hasCss: await isFile(join(dir, 'theme.css')),
    hasLogo: await isFile(join(dir, 'logo.svg')),
    icons,
  };
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Adjusts the served index.html: title, theme-color, iOS app title, the stylesheet from the
 * branding folder and data attributes on <html> for name and logo. The CSP forbids inline
 * scripts, so name and logo are passed as attributes.
 */
export function brandIndexHtml(html: string, branding: Branding): string {
  const { config } = branding;
  let out = html;

  if (config.name) {
    out = out.replace(/<title>[^<]*<\/title>/, `<title>${escapeText(config.name)}</title>`);
    out = out.replace(
      /(<meta name="apple-mobile-web-app-title" content=")[^"]*(")/,
      `$1${escapeAttr(config.shortName ?? config.name)}$2`,
    );
  }
  if (config.themeColor) {
    out = out.replace(
      /(<meta name="theme-color" content=")[^"]*(")/,
      `$1${escapeAttr(config.themeColor)}$2`,
    );
  }

  const attrs: string[] = [];
  if (config.name) attrs.push(`data-brand-name="${escapeAttr(config.name)}"`);
  if (config.description) {
    attrs.push(`data-brand-description="${escapeAttr(config.description)}"`);
  }
  if (branding.hasLogo) attrs.push('data-brand-logo="/branding/logo.svg"');
  if (attrs.length > 0) {
    out = out.replace(/<html([^>]*)>/, `<html$1 ${attrs.join(' ')}>`);
  }

  if (branding.hasCss) {
    // after the app stylesheets, so these variables win
    out = out.replace(
      '</head>',
      '    <link rel="stylesheet" href="/branding/theme.css" />\n  </head>',
    );
  }
  return out;
}

/** Overrides name, description and colours in the PWA manifest. */
export function brandManifest(manifestJson: string, branding: Branding): string {
  const manifest = JSON.parse(manifestJson) as Record<string, unknown>;
  const { config } = branding;
  if (config.name) manifest.name = config.name;
  if (config.shortName ?? config.name) manifest.short_name = config.shortName ?? config.name;
  if (config.description) manifest.description = config.description;
  if (config.themeColor) manifest.theme_color = config.themeColor;
  if (config.backgroundColor) manifest.background_color = config.backgroundColor;
  return JSON.stringify(manifest);
}

/**
 * Reads a file from the branding folder. Only flat file names with a known extension, so
 * nothing outside the folder can be reached.
 */
export async function readBrandingFile(
  branding: Branding,
  name: string,
): Promise<{ data: Uint8Array<ArrayBuffer>; contentType: string } | null> {
  const type = CONTENT_TYPES[extname(name)];
  if (!type || name.includes('/') || name.includes('\\') || name.includes('..')) return null;
  try {
    return { data: new Uint8Array(await readFile(join(branding.dir, name))), contentType: type };
  } catch {
    return null;
  }
}
