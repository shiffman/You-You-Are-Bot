const fs = require('fs');

let allQuotes = [];

const files = fs.readdirSync('data');
let total = 0;
for (fileName of files) {
  if (fileName.indexOf('txt') > -1) {
    console.log(fileName);
    let all = fs.readFileSync(`data/${fileName}`, 'utf-8');
    let lines = all.split('\n');
    console.log(lines.length);
    total += lines.length;
    for (line of lines) {
      allQuotes.push(`${line}`);
    }
  }
}
console.log(total, allQuotes.length);
fs.writeFileSync('prompts.txt', allQuotes.join('\n'));
fs.writeFileSync('all.txt', allQuotes.join('  <|endoftext|>\n'));
