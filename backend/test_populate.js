const mongoose = require('mongoose');
async function run() {
  const uri = "mongodb+srv://Advanced_Poss:Advanced_Poss@cluster0.9c6dj6z.mongodb.net/Advanced_Poss?retryWrites=true&w=majority&appName=Cluster0";
  await mongoose.connect(uri);
  
  const ingredientSchema = new mongoose.Schema({ name: String, currentStock: Number });
  const Ingredient = mongoose.models.Ingredient || mongoose.model('Ingredient', ingredientSchema);
  
  const menuItemSchema = new mongoose.Schema({
    name: String,
    ingredients: [{
      ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient' },
      quantity: Number,
      unit: String
    }]
  });
  const MenuItem = mongoose.models.MenuItem || mongoose.model('MenuItem', menuItemSchema);
  
  const item = await MenuItem.findOne({ name: /MoJo Complet/i }).populate('ingredients.ingredientId');
  console.log("Item populated:", JSON.stringify(item.ingredients, null, 2));
  
  process.exit(0);
}
run();
