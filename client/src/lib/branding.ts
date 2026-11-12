/**
 * Name, logo and description from the optional branding folder. The server sets them as data attributes
 * on <html> (see server/src/lib/branding.ts). Without branding BiFi keeps its defaults.
 */
const root = typeof document !== 'undefined' ? document.documentElement : undefined;

export const brandName: string = root?.dataset.brandName ?? 'BiFi';
export const brandLogo: string | undefined = root?.dataset.brandLogo;
export const brandDescription: string = root?.dataset.brandDescription ?? 'Vereins-Getränkeliste';
