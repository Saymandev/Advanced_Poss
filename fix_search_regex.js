const fs = require('fs');

const file = 'frontend/src/app/dashboard/retail-pos/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /(<Input\s+value=\{searchQuery\}\s+onChange=\{\(e\) => setSearchQuery\(e\.target\.value\)\}\s+placeholder="Search products\.\.\.")/g;

if (content.match(regex)) {
  content = content.replace(regex, `<Input\n              ref={searchInputRef}\n              value={searchQuery}\n              onChange={(e) => setSearchQuery(e.target.value)}\n              placeholder="Search products..."`);
  console.log("Replaced search input ref");
} else {
  console.log("Still could not find search input");
}

fs.writeFileSync(file, content);
