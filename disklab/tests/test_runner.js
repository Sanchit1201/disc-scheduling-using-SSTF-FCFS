/**
 * DiskLab - Automated Verification Test Suite
 * Tests validation, FCFS and SSTF algorithms, metrics calculations,
 * and all required edge cases.
 */

const validation = require('../validation.js');
const algorithms = require('../algorithms.js');
const metrics = require('../metrics.js');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  FAIL: ${message}`);
    failCount++;
  }
}

function assertEquals(actual, expected, message) {
  const isMatch = JSON.stringify(actual) === JSON.stringify(expected);
  assert(isMatch, `${message} | Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`);
}

console.log('--- 1. Testing Default Example (Benchmark Specification) ---');
const defaultDisk = 200;
const defaultHead = 53;
const defaultQueue = [98, 183, 37, 122, 14, 124, 65, 67];

// FCFS Check
const fcfs = algorithms.runFCFS(defaultHead, defaultQueue);
assertEquals(fcfs.sequence, [53, 98, 183, 37, 122, 14, 124, 65, 67], 'FCFS sequence matches');
assertEquals(fcfs.totalMovement, 640, 'FCFS total head movement is 640 cylinders');
assertEquals(fcfs.averageMovement, 80, 'FCFS average head movement is 80 cylinders/request');
assertEquals(fcfs.movements, [45, 85, 146, 85, 108, 110, 59, 2], 'FCFS individual movements match');

// SSTF Check
const sstf = algorithms.runSSTF(defaultHead, defaultQueue);
assertEquals(sstf.sequence, [53, 65, 67, 37, 14, 98, 122, 124, 183], 'SSTF sequence matches');
assertEquals(sstf.totalMovement, 236, 'SSTF total head movement is 236 cylinders');
assertEquals(sstf.averageMovement, 29.5, 'SSTF average head movement is 29.5 cylinders/request');
assertEquals(sstf.movements, [12, 2, 30, 23, 84, 24, 2, 59], 'SSTF individual movements match');

// Comparison Check
const comparison = metrics.compareAlgorithms(fcfs, sstf);
assertEquals(comparison.difference, 404, 'Movement difference is 404 cylinders');
assertEquals(comparison.percentageReduction, 63.13, 'SSTF percentage reduction is 63.13%');
assertEquals(comparison.winner, 'SSTF', 'SSTF is declared winner');

// Immutability Check
assertEquals(defaultQueue, [98, 183, 37, 122, 14, 124, 65, 67], 'Original input queue remains unmutated');

console.log('\n--- 2. Testing SSTF Tie-Breaking Determinism ---');
// Head at 50, requests at 40 (dist 10) and 60 (dist 10). 40 arrived earlier, so 40 must be picked first!
const tieQueue = [40, 60];
const tieResult = algorithms.runSSTF(50, tieQueue);
assertEquals(tieResult.sequence, [50, 40, 60], 'Tie-breaker picks earlier queue arrival first (40 before 60)');

// Reverse queue: 60 arrived first, so 60 should be picked first
const tieQueueRev = [60, 40];
const tieResultRev = algorithms.runSSTF(50, tieQueueRev);
assertEquals(tieResultRev.sequence, [50, 60, 40], 'Tie-breaker picks earlier queue arrival first (60 before 40)');

console.log('\n--- 3. Testing Edge Cases ---');

// 3a. Duplicate requests
// Head at 53, requests [98, 98, 14]: |14 - 53| = 39, |98 - 53| = 45. So 14 is closer, sequence is [53, 14, 98, 98]
const dupQueue = [98, 98, 14];
const dupSstf = algorithms.runSSTF(53, dupQueue);
assertEquals(dupSstf.sequence, [53, 14, 98, 98], 'Duplicate requests both handled gracefully in SSTF');
assertEquals(dupSstf.totalMovement, 39 + 84 + 0, 'Movement includes 0 seek distance between consecutive duplicate (39 + 84 + 0 = 123)');

// 3b. Request at current head position
const headReq = algorithms.runFCFS(53, [53, 70]);
assertEquals(headReq.sequence, [53, 53, 70], 'Request at head position handled');
assertEquals(headReq.movements, [0, 17], 'First movement is 0 cylinders');

// 3c. Single-request queue
const singleRun = algorithms.runSSTF(50, [80]);
assertEquals(singleRun.totalMovement, 30, 'Single-request total movement is 30');
assertEquals(singleRun.averageMovement, 30, 'Single-request average movement is 30');

// 3d. One-cylinder disk
const oneCylVal = validation.validateInputs(1, 0, '0');
assert(oneCylVal.isValid, 'One-cylinder disk with head 0 and request 0 is valid');
const oneCylRun = algorithms.runFCFS(0, [0]);
assertEquals(oneCylRun.totalMovement, 0, 'One-cylinder disk produces 0 movement');

// 3e. Zero baseline comparison
const zeroCompare = metrics.compareAlgorithms({ totalMovement: 0, servicedRequests: [53], movements: [0] }, { totalMovement: 0, servicedRequests: [53], movements: [0] });
assertEquals(zeroCompare.percentageReduction, 0, 'Zero baseline movement avoids NaN/Infinity');

console.log('\n--- 4. Testing Input Validation ---');

// Valid input string
const validRes = validation.validateInputs('200', '53', '98, 183, 37, 122, 14, 124, 65, 67');
assert(validRes.isValid, 'Valid string inputs parsed successfully');
assertEquals(validRes.parsed.diskSize, 200, 'Parsed disk size 200');
assertEquals(validRes.parsed.initialHead, 53, 'Parsed head 53');
assertEquals(validRes.parsed.queue.length, 8, 'Parsed 8 requests');

// Invalid disk sizes
assert(!validation.validateInputs('0', '0', '0').isValid, 'Disk size 0 rejected');
assert(!validation.validateInputs('-10', '0', '0').isValid, 'Negative disk size rejected');
assert(!validation.validateInputs('200.5', '0', '0').isValid, 'Decimal disk size rejected');
assert(!validation.validateInputs('two_hundred', '0', '0').isValid, 'Non-numeric disk size rejected');

// Invalid initial head
assert(!validation.validateInputs('200', '-1', '50').isValid, 'Negative initial head rejected');
assert(!validation.validateInputs('200', '200', '50').isValid, 'Head equal to disk size (out of range) rejected');
assert(!validation.validateInputs('200', '205', '50').isValid, 'Head > disk size rejected');
assert(!validation.validateInputs('200', '50.5', '50').isValid, 'Decimal head rejected');

// Invalid queue structures
assert(!validation.validateInputs('200', '50', '').isValid, 'Empty queue rejected');
assert(!validation.validateInputs('200', '50', '50,,98').isValid, 'Consecutive commas rejected');
assert(!validation.validateInputs('200', '50', ',50,98').isValid, 'Leading comma rejected');
assert(!validation.validateInputs('200', '50', '50,98,').isValid, 'Trailing comma rejected');
assert(!validation.validateInputs('200', '50', '50, -5, 98').isValid, 'Negative cylinder in queue rejected');
assert(!validation.validateInputs('200', '50', '50, 200, 98').isValid, 'Out of bounds cylinder in queue rejected');
assert(!validation.validateInputs('200', '50', '50, abc, 98').isValid, 'Alpha cylinder in queue rejected');
assert(!validation.validateInputs('200', '50', '50, 98.4, 12').isValid, 'Decimal cylinder in queue rejected');

console.log(`\n========================================`);
console.log(`Total Passed: ${passCount}`);
console.log(`Total Failed: ${failCount}`);
console.log(`========================================`);

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED SUCCESSFULLY!');
}
