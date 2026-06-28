require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Find "Pen" menu item
  const menuItem = await mongoose.connection.collection('menuitems').findOne({ name: 'Pen' });
  console.log('MenuItem Pen:');
  console.dir(menuItem, { depth: null });

  // Find "BOI" menu item
  const boi = await mongoose.connection.collection('menuitems').findOne({ name: 'BOI' });
  console.log('\nMenuItem BOI:');
  console.dir(boi, { depth: null });

  // Find "Pen" ingredient
  const penIng = await mongoose.connection.collection('ingredients').findOne({ name: 'Pen' });
  console.log('\nIngredient Pen:');
  console.dir(penIng, { depth: null });

  // Find "BOI" ingredient
  const boiIng = await mongoose.connection.collection('ingredients').findOne({ name: 'BOI' });
  console.log('\nIngredient BOI:');
  console.dir(boiIng, { depth: null });

  process.exit(0);
}
check().catch(console.error);
