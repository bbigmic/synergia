const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sourceImage = path.join(__dirname, '../public/logos/synergia-logo512x512px.png');
const outputDir = path.join(__dirname, '../public/icons');

// Tworzenie katalogu jeśli nie istnieje
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Rozmiary ikon wymagane dla TWA/PWA
const iconSizes = [
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 72, name: 'icon-72x72.png' },
  { size: 48, name: 'icon-48x48.png' },
];

async function generateIcons() {
  console.log('Generowanie ikon z:', sourceImage);
  
  if (!fs.existsSync(sourceImage)) {
    console.error('Błąd: Plik źródłowy nie istnieje:', sourceImage);
    process.exit(1);
  }

  for (const { size, name } of iconSizes) {
    const outputPath = path.join(outputDir, name);
    try {
      await sharp(sourceImage)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      console.log(`✓ Wygenerowano: ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`✗ Błąd przy generowaniu ${name}:`, error.message);
    }
  }
  
  console.log('\nWszystkie ikony zostały wygenerowane!');
}

generateIcons().catch(console.error);

