const fs = require('fs');
const path = require('path');

const filePath = path.join('C:', 'Users', 'LENOVO', 'Downloads', 'EmailSpy', 'src', 'App.jsx');
const content = fs.readFileSync(filePath, 'utf8');

// Simple verify of braces
let openBrace = 0;
let closeBrace = 0;
let openParen = 0;
let closeParen = 0;

for (let char of content) {
    if (char === '{') openBrace++;
    if (char === '}') closeBrace++;
    if (char === '(') openParen++;
    if (char === ')') closeParen++;
}

console.log(`Braces: ${openBrace} open, ${closeBrace} close`);
console.log(`Parens: ${openParen} open, ${closeParen} close`);

if (openBrace !== closeBrace) console.log("MISMATCH BRACES!");
if (openParen !== closeParen) console.log("MISMATCH PARENS!");

// Check for specific known bad patterns
if (content.includes(">>>>")) console.log("Found git merge conflict markers!");
if (content.includes("<<<<")) console.log("Found git merge conflict markers!");
