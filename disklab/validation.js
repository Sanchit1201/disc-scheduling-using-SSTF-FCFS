/**
 * DiskLab - validation.js
 * Input parsing, validation, and edge-case detection for disk scheduling simulation.
 * Handles single-cylinder disks, duplicate requests, head-at-target, and malformed inputs.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DiskLab = root.DiskLab || {};
    root.DiskLab.validation = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Checks if a string represents a strict non-negative integer without decimals or extra chars.
   * @param {string|number} value
   * @returns {boolean}
   */
  function isStrictIntegerString(value) {
    if (typeof value === 'number') {
      return Number.isInteger(value) && value >= 0;
    }
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    return /^\d+$/.test(trimmed);
  }

  /**
   * Validates all disk scheduling inputs.
   *
   * @param {string|number} rawDiskSize - Total cylinders (e.g. 200)
   * @param {string|number} rawInitialHead - Starting cylinder position (e.g. 53)
   * @param {string|Array<number>} rawQueue - Comma-separated list of cylinder requests
   * @returns {{
   *   isValid: boolean,
   *   errors: { diskSize: string|null, initialHead: string|null, queue: string|null, general: string|null },
   *   warnings: string[],
   *   parsed: { diskSize: number, initialHead: number, queue: number[] }
   * }}
   */
  function validateInputs(rawDiskSize, rawInitialHead, rawQueue) {
    const errors = {
      diskSize: null,
      initialHead: null,
      queue: null,
      general: null
    };
    const warnings = [];
    let diskSize = NaN;
    let initialHead = NaN;
    let queue = [];

    // --- 1. Disk Size Validation ---
    const strDiskSize = String(rawDiskSize ?? '').trim();
    if (!strDiskSize) {
      errors.diskSize = 'Disk size is required.';
    } else if (!isStrictIntegerString(strDiskSize)) {
      if (strDiskSize.includes('.') || strDiskSize.includes(',')) {
        errors.diskSize = 'Disk size must be a whole integer, not a decimal.';
      } else if (strDiskSize.startsWith('-')) {
        errors.diskSize = 'Disk size cannot be negative.';
      } else {
        errors.diskSize = 'Disk size must be a valid positive whole number.';
      }
    } else {
      diskSize = parseInt(strDiskSize, 10);
      if (diskSize <= 0) {
        errors.diskSize = 'Disk size must be greater than 0 cylinders.';
      } else if (diskSize > 100000) {
        errors.diskSize = 'Disk size is too large for realistic simulation (max: 100,000).';
      }
    }

    // --- 2. Initial Head Position Validation ---
    const strHead = String(rawInitialHead ?? '').trim();
    if (!strHead) {
      errors.initialHead = 'Initial head position is required.';
    } else if (!isStrictIntegerString(strHead)) {
      if (strHead.includes('.') || strHead.includes(',')) {
        errors.initialHead = 'Head position must be a whole integer.';
      } else if (strHead.startsWith('-')) {
        errors.initialHead = 'Head position cannot be negative (must be >= 0).';
      } else {
        errors.initialHead = 'Head position must be a valid whole number.';
      }
    } else {
      initialHead = parseInt(strHead, 10);
      if (!Number.isNaN(diskSize) && diskSize > 0) {
        if (initialHead < 0 || initialHead >= diskSize) {
          errors.initialHead = `Initial head position must be between 0 and ${diskSize - 1} (for a ${diskSize}-cylinder disk).`;
        }
      }
    }

    // --- 3. Request Queue Validation ---
    if (Array.isArray(rawQueue)) {
      if (rawQueue.length === 0) {
        errors.queue = 'The request queue cannot be empty.';
      } else {
        queue = [...rawQueue];
        for (let i = 0; i < queue.length; i++) {
          const item = queue[i];
          if (!Number.isInteger(item) || item < 0) {
            errors.queue = `Request at index ${i + 1} (${item}) is not a valid cylinder integer.`;
            break;
          }
          if (!Number.isNaN(diskSize) && diskSize > 0 && (item < 0 || item >= diskSize)) {
            errors.queue = `Request ${item} is outside the valid disk range [0, ${diskSize - 1}].`;
            break;
          }
        }
      }
    } else {
      const strQueue = String(rawQueue ?? '').trim();
      if (!strQueue) {
        errors.queue = 'The request queue cannot be empty.';
      } else {
        if (strQueue.startsWith(',')) {
          errors.queue = 'Queue cannot start with a leading comma.';
        } else if (strQueue.endsWith(',')) {
          errors.queue = 'Queue cannot end with a trailing comma.';
        } else if (/,,+/.test(strQueue.replace(/\s+/g, ''))) {
          errors.queue = 'Queue contains empty items (e.g. consecutive commas ",,").';
        } else {
          const tokens = strQueue.split(',');
          const parsedNumbers = [];
          const outOfRange = [];

          for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i].trim();
            if (token === '') {
              errors.queue = `Item ${i + 1} is empty. Check for extra commas.`;
              break;
            }
            if (!isStrictIntegerString(token)) {
              if (token.includes('.')) {
                errors.queue = `Item "${token}" at position ${i + 1} is a decimal. Cylinders must be whole numbers.`;
              } else if (token.startsWith('-')) {
                errors.queue = `Item "${token}" at position ${i + 1} is negative. Cylinders must be >= 0.`;
              } else {
                errors.queue = `Item "${token}" at position ${i + 1} is not a valid numeric cylinder.`;
              }
              break;
            }

            const cyl = parseInt(token, 10);
            parsedNumbers.push(cyl);

            if (!Number.isNaN(diskSize) && diskSize > 0) {
              if (cyl < 0 || cyl >= diskSize) {
                outOfRange.push(cyl);
              }
            }
          }

          if (!errors.queue) {
            if (outOfRange.length > 0) {
              const uniqueOut = Array.from(new Set(outOfRange));
              const displayList = uniqueOut.slice(0, 3).join(', ') + (uniqueOut.length > 3 ? '...' : '');
              errors.queue = `Requests [${displayList}] fall outside valid cylinders [0, ${diskSize - 1}].`;
            } else if (parsedNumbers.length === 0) {
              errors.queue = 'Please provide at least one cylinder request.';
            } else {
              queue = parsedNumbers;
            }
          }
        }
      }
    }

    // --- 4. Edge-Case Warnings & Informational Notes ---
    if (!errors.diskSize && !errors.initialHead && !errors.queue) {
      if (diskSize === 1) {
        warnings.push('Single-cylinder disk: all seek distances will be 0.');
      }
      if (queue.length === 1) {
        warnings.push('Single-request queue: FCFS and SSTF will produce identical single-step movement.');
      }
      const headMatches = queue.filter(r => r === initialHead).length;
      if (headMatches > 0) {
        warnings.push(`The queue contains ${headMatches} request(s) matching initial head position ${initialHead} (zero seek distance).`);
      }
      const uniqueCount = new Set(queue).size;
      if (uniqueCount < queue.length) {
        const dupCount = queue.length - uniqueCount;
        warnings.push(`The queue contains ${dupCount} duplicate request(s). DiskLab processes duplicates in FIFO arrival order.`);
      }
    }

    const isValid = !errors.diskSize && !errors.initialHead && !errors.queue && !errors.general;

    return {
      isValid,
      errors,
      warnings,
      parsed: {
        diskSize: isValid ? diskSize : NaN,
        initialHead: isValid ? initialHead : NaN,
        queue: isValid ? queue : []
      }
    };
  }

  return {
    validateInputs,
    isStrictIntegerString
  };
});
