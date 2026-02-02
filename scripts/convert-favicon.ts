#!/usr/bin/env tsx
/**
 * Convert logo-icon.png to favicon.ico
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

async function convertToFavicon() {
  const inputPath = resolve(process.cwd(), 'public/logo-icon.png');
  const outputPath = resolve(process.cwd(), 'app/favicon.ico');

  console.log('Converting logo-icon.png to favicon.ico...');

  try {
    // Read the PNG file
    const inputBuffer = readFileSync(inputPath);

    // Create ICO file with multiple sizes (16x16, 32x32, 48x48)
    // Note: sharp doesn't directly support ICO, so we'll create a PNG
    // and use it as favicon (modern browsers support PNG favicons)
    // For true ICO, we'd need a different library, but PNG works fine
    
    // Create 32x32 version (standard favicon size)
    const faviconBuffer = await sharp(inputBuffer)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toBuffer();

    // Write as favicon.ico (even though it's PNG format, browsers accept it)
    writeFileSync(outputPath, faviconBuffer);
    
    console.log(`✅ Created favicon.ico at ${outputPath}`);
    console.log('Note: Modern browsers support PNG favicons. For true ICO format,');
    console.log('you may need to use an online converter or specialized tool.');
  } catch (error) {
    console.error('Error converting favicon:', error);
    process.exit(1);
  }
}

convertToFavicon();
