require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Product = require('./models/Product');

const MONGO_URI = process.env.MONGO_URI;

async function seed() {
  try {
    console.log('Connecting to:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('Connected to Atlas');

    await Product.deleteMany({});
    console.log('Cleared existing products');

    const uploadsDir = path.join(__dirname, 'public', 'uploads');
    const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.jpg'));

    const premiumNames = [
      "NOVA DUSK JACKET", "LUNAR VELVET TEE", "OBSIDIAN PARKA", "CELESTIAL KNIT", 
      "ECLIPSE SHIRT", "STARDUST HOODIE", "VOID CHINO", "METEOR BLAYZER", 
      "COMET CREW", "ORBITAL SHELL", "NEBULA CARDIGAN", "ZENITH CARGO", 
      "GALAXY TURTLENECK", "POLARIS BOMBER", "SOLSTICE VEST", "EQUINOX COAT", "AXIS OVERSIZED"
    ];

    const products = files.map((file, i) => ({
      name: premiumNames[i] || `MOON ITEM ${String(i + 1).padStart(2, '0')}`,
      description: 'A premium curated artifact from the MOON SENCE collection. Designed for the cultural avant-garde.',
      price: [240, 180, 550, 320, 150, 280, 210, 890, 140, 420, 310, 195, 220, 480, 340, 610, 190][i] || 250,
      imageUrl: `/uploads/${file}`
    }));

    await Product.insertMany(products);
    console.log(`Successfully seeded ${products.length} products to Atlas!`);

    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
