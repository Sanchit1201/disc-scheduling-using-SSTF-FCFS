/**
 * DiskLab - algorithms.js
 * Implementation of FCFS (First Come, First Served) and SSTF (Shortest Seek Time First)
 * disk scheduling algorithms.
 *
 * Guarantees:
 * 1. Pure functions: Never mutates the caller's input array.
 * 2. Deterministic SSTF tie-breaking: selects the request that appeared earlier in the input queue.
 * 3. Rich step-by-step trace data for interactive animations and timeline scrubbing.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DiskLab = root.DiskLab || {};
    root.DiskLab.algorithms = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Runs First Come, First Served (FCFS) disk scheduling.
   *
   * @param {number} initialHead - Starting cylinder position
   * @param {Array<number>} queue - List of requested cylinders
   * @returns {{
   *   algorithm: 'FCFS',
   *   name: string,
   *   initialHead: number,
   *   sequence: number[],
   *   servicedRequests: number[],
   *   steps: Array<{
   *     stepIndex: number,
   *     from: number,
   *     to: number,
   *     distance: number,
   *     cumulativeDistance: number,
   *     remainingQueue: number[],
   *     reasoning: string
   *   }>,
   *   movements: number[],
   *   totalMovement: number,
   *   averageMovement: number
   * }}
   */
  function runFCFS(initialHead, queue) {
    if (!Array.isArray(queue) || queue.length === 0) {
      return {
        algorithm: 'FCFS',
        name: 'First Come, First Served',
        initialHead,
        sequence: [initialHead],
        servicedRequests: [],
        steps: [],
        movements: [],
        totalMovement: 0,
        averageMovement: 0
      };
    }

    // Defensive copy - do not mutate caller's array
    const requests = [...queue];
    const sequence = [initialHead];
    const steps = [];
    const movements = [];
    let currentHead = initialHead;
    let runningTotal = 0;

    for (let i = 0; i < requests.length; i++) {
      const target = requests[i];
      const distance = Math.abs(target - currentHead);
      runningTotal += distance;
      movements.push(distance);
      sequence.push(target);

      const remaining = requests.slice(i + 1);

      steps.push({
        stepIndex: i + 1,
        from: currentHead,
        to: target,
        distance,
        cumulativeDistance: runningTotal,
        remainingQueue: remaining,
        reasoning: `Servicing request #${i + 1} (${target}) in original arrival order. Distance: |${target} - ${currentHead}| = ${distance} cylinders.`
      });

      currentHead = target;
    }

    const totalMovement = runningTotal;
    const averageMovement = requests.length > 0 ? Number((totalMovement / requests.length).toFixed(4)) : 0;

    return {
      algorithm: 'FCFS',
      name: 'First Come, First Served',
      initialHead,
      sequence,
      servicedRequests: requests,
      steps,
      movements,
      totalMovement,
      averageMovement
    };
  }

  /**
   * Runs Shortest Seek Time First (SSTF) disk scheduling.
   * Repeatedly selects the pending request with the minimum absolute distance from current head.
   * Equal distances are broken by choosing whichever request appeared earlier in the input queue.
   *
   * @param {number} initialHead - Starting cylinder position
   * @param {Array<number>} queue - List of requested cylinders
   * @returns {{
   *   algorithm: 'SSTF',
   *   name: string,
   *   initialHead: number,
   *   sequence: number[],
   *   servicedRequests: number[],
   *   steps: Array<{
   *     stepIndex: number,
   *     from: number,
   *     to: number,
   *     distance: number,
   *     cumulativeDistance: number,
   *     requestId: number,
   *     originalIndex: number,
   *     candidates: Array<{ cylinder: number, distance: number, originalIndex: number, isWinner: boolean }>,
   *     remainingQueue: number[],
   *     reasoning: string
   *   }>,
   *   movements: number[],
   *   totalMovement: number,
   *   averageMovement: number
   * }}
   */
  function runSSTF(initialHead, queue) {
    if (!Array.isArray(queue) || queue.length === 0) {
      return {
        algorithm: 'SSTF',
        name: 'Shortest Seek Time First',
        initialHead,
        sequence: [initialHead],
        servicedRequests: [],
        steps: [],
        movements: [],
        totalMovement: 0,
        averageMovement: 0
      };
    }

    // Wrap elements with unique IDs & original indices to track duplicates stably
    let pending = queue.map((cylinder, idx) => ({
      id: idx,
      cylinder,
      originalIndex: idx
    }));

    const sequence = [initialHead];
    const servicedRequests = [];
    const steps = [];
    const movements = [];
    let currentHead = initialHead;
    let runningTotal = 0;
    let stepNum = 0;

    while (pending.length > 0) {
      stepNum++;

      // Evaluate candidate distances
      let bestIndex = 0;
      let minDistance = Math.abs(pending[0].cylinder - currentHead);

      for (let i = 1; i < pending.length; i++) {
        const dist = Math.abs(pending[i].cylinder - currentHead);
        if (dist < minDistance) {
          minDistance = dist;
          bestIndex = i;
        } else if (dist === minDistance) {
          // Tie-breaker: choose earlier arrival in original input queue
          if (pending[i].originalIndex < pending[bestIndex].originalIndex) {
            bestIndex = i;
          }
        }
      }

      const chosen = pending[bestIndex];
      const distance = minDistance;
      runningTotal += distance;
      movements.push(distance);
      sequence.push(chosen.cylinder);
      servicedRequests.push(chosen.cylinder);

      // Snapshot candidate options for educational inspector
      const candidates = pending.map(item => ({
        cylinder: item.cylinder,
        distance: Math.abs(item.cylinder - currentHead),
        originalIndex: item.originalIndex,
        isWinner: item.id === chosen.id
      }));

      // Remove chosen from pending
      pending.splice(bestIndex, 1);

      const remainingCylinders = pending.map(p => p.cylinder);

      steps.push({
        stepIndex: stepNum,
        from: currentHead,
        to: chosen.cylinder,
        distance,
        cumulativeDistance: runningTotal,
        requestId: chosen.id,
        originalIndex: chosen.originalIndex,
        candidates,
        remainingQueue: remainingCylinders,
        reasoning: `Selected cylinder ${chosen.cylinder} (from input #${chosen.originalIndex + 1}) because distance |${chosen.cylinder} - ${currentHead}| = ${distance} is minimal across ${candidates.length} pending candidate(s).`
      });

      currentHead = chosen.cylinder;
    }

    const totalMovement = runningTotal;
    const averageMovement = servicedRequests.length > 0 ? Number((totalMovement / servicedRequests.length).toFixed(4)) : 0;

    return {
      algorithm: 'SSTF',
      name: 'Shortest Seek Time First',
      initialHead,
      sequence,
      servicedRequests,
      steps,
      movements,
      totalMovement,
      averageMovement
    };
  }

  return {
    runFCFS,
    runSSTF
  };
});
