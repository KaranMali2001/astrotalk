# PWA Setup Guide

This guide will help you complete the PWA setup for your TakeCare application.

## Prerequisites

1. Install the `next-pwa` package:
   ```bash
   npm install next-pwa
   ```

## Icon Setup

You need to create PWA icons for your application. You have two options:

### Option 1: Using the Icon Generator Script (Recommended)

1. Install sharp (for image processing):
   ```bash
   npm install --save-dev sharp
   ```

2. Create a source icon:
   - Create a square icon image (512x512px or larger recommended)
   - Save it as `public/icons/icon-source.png`
   - This should be your app logo/icon

3. Run the generator script:
   ```bash
   node scripts/generate-icons.js
   ```

This will generate all required icon sizes automatically.

### Option 2: Manual Icon Generation

1. Use an online tool to generate PWA icons:
   - [PWA Builder Image Generator](https://www.pwabuilder.com/imageGenerator)
   - [RealFaviconGenerator](https://realfavicongenerator.net/)

2. Place the generated icons in `public/icons/` with these exact names:
   - `icon-72x72.png`
   - `icon-96x96.png`
   - `icon-128x128.png`
   - `icon-144x144.png`
   - `icon-152x152.png`
   - `icon-192x192.png`
   - `icon-384x384.png`
   - `icon-512x512.png`

## Build and Test

1. Build your application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm run start
   ```

3. Test PWA installation:
   - Open your app in a browser (Chrome, Edge, Safari)
   - Look for the install prompt or use the browser's install option
   - On mobile devices, you'll see an "Add to Home Screen" option

## Verification

After setup, verify that:

1. ✅ `next-pwa` is installed in `package.json`
2. ✅ Icons exist in `public/icons/` directory
3. ✅ `manifest.json` exists in `public/` directory
4. ✅ Build completes without errors
5. ✅ Service worker is registered (check browser DevTools > Application > Service Workers)

## Customization

You can customize the PWA settings by editing:

- **App Name & Description**: `public/manifest.json`
- **Theme Colors**: `public/manifest.json` and `src/app/layout.tsx` metadata
- **PWA Behavior**: `next.config.ts` (next-pwa configuration)

## Troubleshooting

### Icons not showing
- Ensure all icon files exist in `public/icons/`
- Check that icon paths in `manifest.json` match actual file names
- Clear browser cache and rebuild

### Service worker not registering
- Check that `next-pwa` is installed
- Verify the build completed successfully
- Check browser console for errors
- Ensure you're testing in production mode (`npm run start`, not `npm run dev`)

### PWA install prompt not appearing
- PWA install prompts appear based on browser criteria (HTTPS required, manifest valid, service worker active)
- Test in production build, not development
- Check that all PWA requirements are met (see browser DevTools > Application > Manifest)

