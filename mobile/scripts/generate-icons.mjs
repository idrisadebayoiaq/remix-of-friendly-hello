/**
 * Generate Lovli icon set from master PNG for web + Expo Android/iOS.
 * Run from mobile/: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(mobileRoot, '..');
const master = path.join(mobileRoot, 'assets', 'lovli-icon-master.png');
const ROSE = { r: 225, g: 29, b: 72, alpha: 1 }; // #e11d48

async function ensureDir(p) {
  await fs.promises.mkdir(p, { recursive: true });
}

async function resizeSquare(size, out) {
  await sharp(master).resize(size, size, { fit: 'cover' }).png().toFile(out);
  console.log('wrote', out);
}

async function solidBg(size, out) {
  await sharp({
    create: { width: size, height: size, channels: 4, background: ROSE },
  })
    .png()
    .toFile(out);
  console.log('wrote', out);
}

async function heartOnTransparent(size, out, { invert = false } = {}) {
  const { data, info } = await sharp(master)
    .resize(size, size, { fit: 'cover' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (r + g + b) / 3;
    const isHeart = brightness > 200 && r > 180 && g > 180 && b > 180;
    if (isHeart) {
      if (invert) {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 255;
      } else {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 255;
      }
    } else {
      data[i + 3] = 0;
    }
  }

  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(out);
  console.log('wrote', out);
}

async function main() {
  if (!fs.existsSync(master)) {
    throw new Error(`Missing master icon at ${master}`);
  }

  const mobileAssets = path.join(mobileRoot, 'assets');
  const publicDir = path.join(repoRoot, 'public');
  const publicIcons = path.join(publicDir, 'icons');
  await ensureDir(mobileAssets);
  await ensureDir(publicIcons);

  await resizeSquare(1024, path.join(mobileAssets, 'icon.png'));
  await resizeSquare(1024, path.join(mobileAssets, 'splash-icon.png'));
  await resizeSquare(48, path.join(mobileAssets, 'favicon.png'));
  await resizeSquare(192, path.join(publicIcons, 'icon-192.png'));
  await resizeSquare(512, path.join(publicIcons, 'icon-512.png'));
  await resizeSquare(32, path.join(publicDir, 'favicon.png'));
  await sharp(master).resize(32, 32).png().toFile(path.join(publicDir, 'favicon.ico'));

  await heartOnTransparent(1024, path.join(mobileAssets, 'android-icon-foreground.png'));
  await solidBg(1024, path.join(mobileAssets, 'android-icon-background.png'));
  await heartOnTransparent(1024, path.join(mobileAssets, 'android-icon-monochrome.png'));
  await heartOnTransparent(96, path.join(mobileAssets, 'notification-icon.png'));

  console.log('Done generating Lovli icons.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
