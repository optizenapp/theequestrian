import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

export type VideoBrandStyle = {
  primary: string;
  secondary: string;
  foreground: string;
  background: string;
  fontFamily: string;
};

const DEFAULT_STYLE: VideoBrandStyle = {
  primary: '#BD7AB3',
  secondary: '#5DBEBD',
  foreground: '#2F3137',
  background: '#F8F9FC',
  fontFamily: 'Manrope, Arial, sans-serif',
};

function readCssVar(css: string, name: string, fallback: string): string {
  const match = css.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  return (match?.[1]?.trim() || fallback).replace('var(--font-manrope),', 'Manrope,');
}

export async function loadBrandStyle(): Promise<VideoBrandStyle> {
  try {
    const cssPath = path.join(process.cwd(), 'app', 'globals.css');
    const css = await readFile(cssPath, 'utf8');
    return {
      primary: readCssVar(css, '--primary', DEFAULT_STYLE.primary),
      secondary: readCssVar(css, '--secondary', DEFAULT_STYLE.secondary),
      foreground: readCssVar(css, '--foreground', DEFAULT_STYLE.foreground),
      background: readCssVar(css, '--background', DEFAULT_STYLE.background),
      fontFamily: readCssVar(css, '--font-primary', DEFAULT_STYLE.fontFamily),
    };
  } catch {
    return DEFAULT_STYLE;
  }
}

export async function loadLogoBuffer(): Promise<Buffer | null> {
  const candidates = ['logo-full.png', 'logo.png', 'email-logo.png'];
  for (const file of candidates) {
    const logoPath = path.join(process.cwd(), 'public', file);
    try {
      await access(logoPath);
      return await readFile(logoPath);
    } catch {
      continue;
    }
  }
  return null;
}
