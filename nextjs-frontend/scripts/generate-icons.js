/**
 * PWA Icon Generator
 * 
 * This script helps generate PWA icons using sharp (if available)
 * or provides instructions for manual icon generation.
 * 
 * To use:
 * 1. Install sharp: npm install --save-dev sharp
 * 2. Create a source icon (icon.png) in the public/icons directory (at least 512x512)
 * 3. Run: node scripts/generate-icons.js
 * 
 * Or use an online tool like:
 * - https://www.pwabuilder.com/imageGenerator
 * - https://realfavicongenerator.net/
 */

const fs = require('fs');
const path = require('path');

const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('⚠️  sharp is not installed. Installing...');
  console.log('   Run: npm install --save-dev sharp');
  console.log('\nAlternatively, you can:');
  console.log('1. Create icons manually using an online tool:');
  console.log('   - https://www.pwabuilder.com/imageGenerator');
  console.log('   - https://realfavicongenerator.net/');
  console.log('2. Place icon files in public/icons/ with names:');
  iconSizes.forEach(size => {
    console.log(`   - icon-${size}x${size}.png`);
  });
  process.exit(1);
}

// Check if source icon exists
const sourceIcon = path.join(iconsDir, 'icon-source.png');
if (!fs.existsSync(sourceIcon)) {
  console.log('❌ Source icon not found!');
  console.log(`   Please create: ${sourceIcon}`);
  console.log('   Recommended size: 512x512px or larger');
  process.exit(1);
}

// Generate icons
console.log('🎨 Generating PWA icons...\n');

(async () => {
  try {
    for (const size of iconSizes) {
      const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
      await sharp(sourceIcon)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outputPath);
      console.log(`✅ Generated icon-${size}x${size}.png`);
    }
    console.log('\n✨ All icons generated successfully!');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
})();

