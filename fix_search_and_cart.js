const fs = require('fs');

const file = 'frontend/src/app/dashboard/retail-pos/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix search input ref
const oldSearchInput = `<Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."`;
const newSearchInput = `<Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."`;
              
if (content.includes(oldSearchInput)) {
  content = content.replace(oldSearchInput, newSearchInput);
  console.log("Replaced search input ref");
} else {
  console.log("Could not find oldSearchInput");
}

// 2. Fix cart quantity input
const oldQuantitySpan = `<span className="text-sm font-bold w-6 text-center">{item.quantity}</span>`;
const newQuantityInput = `<input 
                    type="number"
                    min="1"
                    className="w-12 text-sm font-bold text-center bg-transparent border border-transparent focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded px-1 outline-none appearance-none"
                    value={item.quantity || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val > 0) {
                        setCart(prev => prev.map(c => c.id === item.id ? { ...c, quantity: val } : c));
                      } else if (e.target.value === '') {
                        // Allow empty string temporarily while typing
                        setCart(prev => prev.map(c => c.id === item.id ? { ...c, quantity: '' as any } : c));
                      }
                    }}
                    onBlur={(e) => {
                      if (!item.quantity) {
                         setCart(prev => prev.map(c => c.id === item.id ? { ...c, quantity: 1 } : c));
                      }
                    }}
                    style={{ WebkitAppearance: 'none', margin: 0, MozAppearance: 'textfield' }}
                  />`;

if (content.includes(oldQuantitySpan)) {
  content = content.replace(oldQuantitySpan, newQuantityInput);
  console.log("Replaced quantity span with input");
} else {
  console.log("Could not find oldQuantitySpan");
}

fs.writeFileSync(file, content);
