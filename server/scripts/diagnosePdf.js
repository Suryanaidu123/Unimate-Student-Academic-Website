/**
 * Run: node scripts/diagnosePdf.js <path-to-your-pdf>
 * Dumps everything pdf-parse extracts so we can diagnose parsing failures.
 */
const fs   = require('fs');
const path = require('path');

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node scripts/diagnosePdf.js <path-to-pdf>');
  process.exit(1);
}

const buffer = fs.readFileSync(path.resolve(filePath));

require('pdf-parse')(buffer).then((data) => {
  const text = data.text || '';

  console.log('=== METADATA ===');
  console.log('Pages :', data.numpages);
  console.log('Text length:', text.length, 'chars');

  console.log('\n=== RAW TEXT (JSON-encoded — shows \\n, \\t, spaces exactly) ===');
  console.log(JSON.stringify(text));

  console.log('\n=== LINE-BY-LINE BREAKDOWN ===');
  const allLines = text.split(/\r?\n/);
  allLines.forEach((line, i) => {
    // Show EVERY line (even blank) so we can see exact structure
    const tA = line.trim().split(/[\t|]+|\s{2,}/).map(t => t.trim()).filter(t => t.length > 0);
    const tB = line.trim().split(/\s+/).filter(t => t.length > 0);
    console.log(`L${String(i).padStart(3,'0')} RAW   : ${JSON.stringify(line)}`);
    if (tA.length) console.log(`     splitA: ${JSON.stringify(tA)}`);
    if (tB.length) console.log(`     splitB: ${JSON.stringify(tB)}`);
  });

  console.log('\n=== ROLL NUMBER SEARCH ===');
  // Try several patterns
  const patterns = [
    { name: 'Standard  XX[A-Z]XX[A-Z]XXXX', re: /[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{4}/gi },
    { name: 'With dash  XX-XXXXX',           re: /[0-9]{2}[-][A-Z0-9]{5,}/gi },
    { name: 'Any 10-char alnum',             re: /\b[A-Z0-9]{10}\b/gi },
    { name: 'Any 9-char alnum',              re: /\b[A-Z0-9]{9}\b/gi },
    { name: 'Any 8-char alnum',              re: /\b[A-Z0-9]{8}\b/gi },
  ];
  for (const { name, re } of patterns) {
    const matches = [...text.matchAll(re)].map(m => m[0]);
    console.log(`  ${name}: ${matches.length > 0 ? JSON.stringify(matches) : 'NO MATCHES'}`);
  }

}).catch(e => console.error('pdf-parse error:', e.message));
