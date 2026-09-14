const fs = require('fs');
const code = fs.readFileSync('backend/server.js', 'utf8');
const lines = code.split('\n');
let braceCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    if (line[j] === '{') braceCount++;
    else if (line[j] === '}') braceCount--;
  }
  
  // Print every 100 lines or when count changes significantly
  if ((i + 1) % 200 === 0 || (i > 1800 && i < 1900)) {
    console.log(`Line ${i + 1}: brace count = ${braceCount}`);
  }
}

console.log(`\nFinal brace count: ${braceCount}`);
