const fs = require('fs');
const code = fs.readFileSync('backend/server.js', 'utf8');
let braceCount = 0;
let lineNum = 1;

for (let i = 0; i < code.length; i++) {
  if (code[i] === '\n') lineNum++;
  if (code[i] === '{') {
    braceCount++;
  } else if (code[i] === '}') {
    braceCount--;
    if (braceCount < 0) {
      console.log(`Too many closing braces at line ${lineNum}`);
      process.exit(1);
    }
  }
}

console.log(`Final brace count: ${braceCount}`);
if (braceCount > 0) {
  console.log(`Missing ${braceCount} closing brace(s)`);
} else if (braceCount === 0) {
  console.log('Braces are balanced!');
}
