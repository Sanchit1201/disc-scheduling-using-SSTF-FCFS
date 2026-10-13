/**
 * DiskLab - metrics.js
 * Performance analysis, comparative metrics, and educational summaries
 * for FCFS and SSTF disk scheduling algorithms.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DiskLab = root.DiskLab || {};
    root.DiskLab.metrics = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Calculates comprehensive performance metrics for a single algorithm run.
   *
   * @param {{
   *   totalMovement: number,
   *   movements: number[],
   *   servicedRequests: number[]
   * }} result
   * @returns {{
   *   totalMovement: number,
   *   requestCount: number,
   *   averageMovement: number,
   *   maxMovement: number,
   *   minMovement: number,
   *   formattedTotal: string,
   *   formattedAverage: string
   * }}
   */
  function calculateAlgorithmMetrics(result) {
    const total = result.totalMovement || 0;
    const count = result.servicedRequests ? result.servicedRequests.length : 0;
    const moves = result.movements && result.movements.length > 0 ? result.movements : [0];
    const avg = count > 0 ? total / count : 0;
    const maxMove = Math.max(...moves);
    const minMove = Math.min(...moves);

    return {
      totalMovement: total,
      requestCount: count,
      averageMovement: Number(avg.toFixed(2)),
      maxMovement: maxMove,
      minMovement: minMove,
      formattedTotal: `${total} cylinders`,
      formattedAverage: `${avg.toFixed(2)} cyl/req`
    };
  }

  /**
   * Compares FCFS and SSTF results side-by-side.
   * Handles division-by-zero safely when baseline FCFS movement is 0.
   *
   * @param {Object} fcfsResult - Return value from runFCFS
   * @param {Object} sstfResult - Return value from runSSTF
   * @returns {{
   *   fcfs: Object,
   *   sstf: Object,
   *   difference: number,
   *   percentageReduction: number|null,
   *   reductionFormatted: string,
   *   winner: 'SSTF'|'FCFS'|'TIED',
   *   headline: string,
   *   educationalTakeaway: string
   * }}
   */
  function compareAlgorithms(fcfsResult, sstfResult) {
    const fcfsMetrics = calculateAlgorithmMetrics(fcfsResult);
    const sstfMetrics = calculateAlgorithmMetrics(sstfResult);

    const diff = fcfsMetrics.totalMovement - sstfMetrics.totalMovement;
    let percentageReduction = null;
    let reductionFormatted = 'N/A';

    if (fcfsMetrics.totalMovement > 0) {
      percentageReduction = Number(((diff / fcfsMetrics.totalMovement) * 100).toFixed(2));
      reductionFormatted = `${percentageReduction >= 0 ? '' : '+'}${percentageReduction}%`;
    } else if (fcfsMetrics.totalMovement === 0 && sstfMetrics.totalMovement === 0) {
      percentageReduction = 0;
      reductionFormatted = '0.00% (Zero Seek Baseline)';
    }

    let winner = 'TIED';
    let headline = 'Both algorithms traveled identical total distance.';

    if (sstfMetrics.totalMovement < fcfsMetrics.totalMovement) {
      winner = 'SSTF';
      headline = `SSTF reduced total head movement by ${Math.abs(percentageReduction).toFixed(2)}% (${diff} cylinders less than FCFS).`;
    } else if (fcfsMetrics.totalMovement < sstfMetrics.totalMovement) {
      winner = 'FCFS';
      headline = `FCFS traveled less head movement by ${Math.abs(diff)} cylinders.`;
    }

    let educationalTakeaway = '';
    if (winner === 'SSTF') {
      educationalTakeaway =
        'SSTF achieved superior overall mechanical efficiency by prioritizing proximity. However, note that requests on the extremes may experience high variance in latency (starvation risk).';
    } else if (winner === 'TIED') {
      educationalTakeaway =
        'For this queue topology, proximity-based scheduling matched FIFO arrival order. Both algorithms required the exact same physical movement.';
    } else {
      educationalTakeaway =
        'FCFS maintained strict arrival fairness without incurring seek thrashing in this specific sequence.';
    }

    return {
      fcfs: fcfsMetrics,
      sstf: sstfMetrics,
      difference: diff,
      percentageReduction,
      reductionFormatted,
      winner,
      headline,
      educationalTakeaway
    };
  }

  return {
    calculateAlgorithmMetrics,
    compareAlgorithms
  };
});
