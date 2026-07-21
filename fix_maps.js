const fs = require('fs');

function fixFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');

  // Fix cart JSON parse
  code = code.replace(
    /const cart = JSON\.parse\(saved\);/g,
    'let cart = JSON.parse(saved);\n          if (!Array.isArray(cart)) cart = [];'
  );

  code = code.replace(
    /let cart: CartItem\[\] = saved \? JSON\.parse\(saved\) : \[\];/g,
    'let parsed = saved ? JSON.parse(saved) : [];\n      let cart: CartItem[] = Array.isArray(parsed) ? parsed : [];'
  );

  code = code.replace(
    /setCart\(JSON\.parse\(savedCart\)\);/g,
    'const parsed = JSON.parse(savedCart);\n          setCart(Array.isArray(parsed) ? parsed : []);'
  );
  
  // Fix productReviews JSON parse
  code = code.replace(
    /setProductReviews\(json\.data \|\| \[\]\);/g,
    'setProductReviews(Array.isArray(json.data) ? json.data : []);'
  );

  fs.writeFileSync(filePath, code);
}

fixFile('frontend/src/components/public/templates/ecommerce/item/EcommerceItemTemplate.tsx');
fixFile('frontend/src/components/public/templates/ecommerce/shop/EcommerceShopTemplate.tsx');

