/**
 * DiskLab - DOM Integration and Static Verification Test
 * Verifies that all IDs, attributes, copy, and sections required by the prompt
 * exist in index.html and match app.js bindings.
 */

const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    console.log(`  PASS: ${msg}`);
    pass++;
  } else {
    console.error(`  FAIL: ${msg}`);
    fail++;
  }
}

console.log('--- 1. Verifying Website Sections (A through G) ---');
assert(html.includes('id="hero"') && html.includes('Every movement has a cost.'), 'Section A exists with required headline');
assert(html.includes('Your disk receives requests. Your operating system decides what happens next.'), 'Section A includes required supporting copy');
assert(html.includes('Explore the algorithms') && html.includes('Run a simulation'), 'Section A has two clear action buttons');

assert(html.includes('id="problem-context"') && html.includes('The requests don\'t arrive in a convenient order.'), 'Section B exists with required headline');
assert(html.includes('Disk Cylinders') && html.includes('Initial Head Position') && html.includes('Request Queue') && html.includes('Disk-Head Movement') && html.includes('Scheduling Algorithm'), 'Section B explains 5 core disk scheduling concepts');
assert(html.includes('CD Platter Metaphor') && html.includes('Logical Model vs. Physical Architecture'), 'Section B distinguishes logical cylinder model from physical geometry and CD optical metaphor');

assert(html.includes('First in. First served.'), 'Section C contains FCFS headline');
assert(html.includes('The nearest request gets served next.'), 'Section C contains SSTF headline');
assert(html.includes('How the algorithm decides'), 'Section C contains SSTF decision explanation');

assert(html.includes('id="simulation-lab"'), 'Section D Simulation Lab exists');
assert(html.includes('id="inputDiskSize"') && html.includes('id="inputInitialHead"') && html.includes('id="inputQueue"'), 'Section D contains all required inputs');
assert(html.includes('data-mode="compare"') && html.includes('data-mode="FCFS"') && html.includes('data-mode="SSTF"'), 'Section D has algorithm choices FCFS, SSTF, and Compare both');
assert(html.includes('id="btnRunSim"') && html.includes('id="btnResetDefault"'), 'Section D has Run simulation and Reset buttons');
assert(html.includes('id="btnPlayPause"') && html.includes('id="btnPrevStep"') && html.includes('id="btnNextStep"') && html.includes('id="btnRestart"'), 'Section D contains playback controls');
assert(html.includes('data-speed="0.5"') && html.includes('data-speed="1.0"') && html.includes('data-speed="2.0"'), 'Section D has at least three speed options');

assert(html.includes('id="comparison-matrix"') && html.includes('Understand the difference.'), 'Section E comparison section exists');
assert(html.includes('Scheduling Principle') && html.includes('Service Sequence') && html.includes('Total Head Movement') && html.includes('Average Movement') && html.includes('Starvation Risk'), 'Section E comparison table covers all required dimensions');
assert(html.includes('One algorithm follows arrival order. The other follows proximity. Their performance depends on the request workload.'), 'Section E contains exact takeaway quote');

assert(html.includes('id="system-architecture"') && html.includes('Behind the Logic'), 'Section F Behind the Logic exists');
assert(html.includes('FCFS</span>(initialHead, queue)') && html.includes('SSTF</span>(initialHead, queue)'), 'Section F includes readable pseudocode for both algorithms');
assert(html.includes('validation.js') && html.includes('algorithms.js') && html.includes('metrics.js') && html.includes('visualization.js') && html.includes('app.js'), 'Section F explains modular roles');

assert(html.includes('id="closing-takeaway"') && html.includes('Scheduling is a decision about movement.'), 'Section G exists with headline');
assert(html.includes('FCFS values arrival order. SSTF prioritizes proximity. Understanding the trade-off is the first step toward understanding storage performance.'), 'Section G contains required supporting text');
assert(html.includes('Run another simulation'), 'Section G contains action returning to simulation lab');
assert(html.includes('DiskLab &middot; Operating Systems Self-Learning Activity &middot; Traditional Disk Scheduling'), 'Section G contains required footer');

console.log('\n--- 2. Verifying DOM Elements Referenced in app.js ---');
const appJsPath = path.join(__dirname, '../app.js');
const appJs = fs.readFileSync(appJsPath, 'utf8');

// Extract all getElementById strings in app.js
const idMatches = [...appJs.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
const uniqueIds = Array.from(new Set(idMatches));

uniqueIds.forEach(id => {
  // Either in index.html directly or dynamically injected by visualization.js
  const inHtml = html.includes(`id="${id}"`);
  const dynamicInViz = ['currentHeadDisplay', 'currentStepDisplay', 'activeTrackHighlight'].includes(id);
  assert(inHtml || dynamicInViz, `Referenced ID "${id}" exists in markup or visualizer DOM`);
});

console.log(`\n========================================`);
console.log(`DOM Test Passed: ${pass}`);
console.log(`DOM Test Failed: ${fail}`);
console.log(`========================================`);

if (fail > 0) process.exit(1);
