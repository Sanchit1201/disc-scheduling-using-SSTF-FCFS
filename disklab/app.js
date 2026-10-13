/**
 * DiskLab - app.js
 * Master Application Controller & UI Orchestrator.
 * Coordinates input validation, algorithm execution, performance metrics,
 * living SVG platter simulation, synchronized linear cylinder track,
 * timeline scrubbing, step inspector, and responsive UI states.
 */

(function () {
  'use strict';

  // Retrieve module references (supporting browser globals or UMD)
  const validation = window.DiskLab && window.DiskLab.validation;
  const algorithms = window.DiskLab && window.DiskLab.algorithms;
  const metrics = window.DiskLab && window.DiskLab.metrics;
  const PlatterVisualizer = window.DiskLab && window.DiskLab.visualization && window.DiskLab.visualization.PlatterVisualizer;

  if (!validation || !algorithms || !metrics || !PlatterVisualizer) {
    console.error('DiskLab Error: Core modules failed to load.');
    return;
  }

  // Predefined educational benchmark scenarios
  const PRESET_SCENARIOS = {
    default: {
      name: 'Default Benchmark (Standard OS Test)',
      diskSize: 200,
      initialHead: 53,
      queue: [98, 183, 37, 122, 14, 124, 65, 67]
    },
    high_dispersion: {
      name: 'High Dispersion (Severe Seek Thrash)',
      diskSize: 200,
      initialHead: 100,
      queue: [10, 190, 15, 185, 20, 180, 25, 175]
    },
    locality_clusters: {
      name: 'Clustered Locality (SSTF High Win)',
      diskSize: 200,
      initialHead: 50,
      queue: [48, 52, 45, 55, 170, 175, 168, 180]
    },
    starvation_danger: {
      name: 'Starvation Risk (Peripheral Outlier)',
      diskSize: 200,
      initialHead: 50,
      queue: [52, 48, 54, 46, 55, 45, 195]
    },
    sequential: {
      name: 'Near-Sequential Access',
      diskSize: 200,
      initialHead: 10,
      queue: [20, 35, 60, 95, 120, 150, 175, 190]
    }
  };

  // Application State
  const state = {
    diskSize: 200,
    initialHead: 53,
    queue: [98, 183, 37, 122, 14, 124, 65, 67],
    mode: 'compare', // 'compare' | 'FCFS' | 'SSTF'
    viewTab: 'active', // 'active' | 'dual'
    speed: 1.0,
    isPlaying: false,
    isPlatterSpinning: true,
    currentStep: 0,
    totalSteps: 0,

    // Run Results
    fcfsResult: null,
    sstfResult: null,
    comparison: null,

    // Visualizer instances
    mainVisualizer: null,
    dualFcfsVisualizer: null,
    dualSstfVisualizer: null
  };

  // DOM Elements Cache
  const DOM = {};

  /**
   * Initializes application on DOMContentLoaded.
   */
  function init() {
    cacheDOMElements();
    initVisualizers();
    bindEvents();
    initInteractiveDemos();

    // Run initial benchmark simulation
    runSimulation(state.diskSize, state.initialHead, state.queue, state.mode);
  }

  /**
   * Caches frequently queried DOM elements.
   */
  function cacheDOMElements() {
    DOM.form = document.getElementById('simulationForm');
    DOM.inputDiskSize = document.getElementById('inputDiskSize');
    DOM.inputInitialHead = document.getElementById('inputInitialHead');
    DOM.inputQueue = document.getElementById('inputQueue');
    DOM.diskSizeHint = document.getElementById('diskSizeHint');
    DOM.errDiskSize = document.getElementById('errDiskSize');
    DOM.errInitialHead = document.getElementById('errInitialHead');
    DOM.errQueue = document.getElementById('errQueue');
    DOM.formWarnings = document.getElementById('formWarnings');
    DOM.btnResetDefault = document.getElementById('btnResetDefault');
    DOM.scenarioPresets = document.getElementById('scenarioPresets');

    // Mode Buttons
    DOM.segmentBtns = document.querySelectorAll('.segmented-control .segment-btn');

    // Visualizer containers
    DOM.singlePlatterContainer = document.getElementById('singlePlatterContainer');
    DOM.dualPlatterContainer = document.getElementById('dualPlatterContainer');
    DOM.dualFcfsPlatter = document.getElementById('dualFcfsPlatter');
    DOM.dualSstfPlatter = document.getElementById('dualSstfPlatter');
    DOM.vizActiveAlgorithmName = document.getElementById('vizActiveAlgorithmName');
    DOM.platterViewTabs = document.getElementById('platterViewTabs');
    DOM.dualFcfsDist = document.getElementById('dualFcfsDist');
    DOM.dualSstfDist = document.getElementById('dualSstfDist');

    // Synchronized Linear Cylinder Track Elements
    DOM.linearMaxCyl = document.getElementById('linearMaxCyl');
    DOM.linearTrackStatus = document.getElementById('linearTrackStatus');
    DOM.linearTrackBar = document.getElementById('linearTrackBar');
    DOM.linearTrackTrail = document.getElementById('linearTrackTrail');
    DOM.linearHeadMarker = document.getElementById('linearHeadMarker');
    DOM.linearHeadMarkerLabel = document.getElementById('linearHeadMarkerLabel');
    DOM.linearPinsLayer = document.getElementById('linearPinsLayer');
    DOM.linearTrackScale = document.getElementById('linearTrackScale');

    // Playback Controls
    DOM.btnPlayPause = document.getElementById('btnPlayPause');
    DOM.iconPlay = document.getElementById('iconPlay');
    DOM.iconPause = document.getElementById('iconPause');
    DOM.btnPrevStep = document.getElementById('btnPrevStep');
    DOM.btnNextStep = document.getElementById('btnNextStep');
    DOM.btnRestart = document.getElementById('btnRestart');
    DOM.btnToggleSpin = document.getElementById('btnToggleSpin');
    DOM.timelineScrubber = document.getElementById('timelineScrubber');
    DOM.speedBtns = document.querySelectorAll('.speed-btn');

    // Enhanced Inspector Elements
    DOM.inspStepNumber = document.getElementById('inspStepNumber');
    DOM.inspFromCyl = document.getElementById('inspFromCyl');
    DOM.inspToCyl = document.getElementById('inspToCyl');
    DOM.inspDistance = document.getElementById('inspDistance');
    DOM.inspCumulative = document.getElementById('inspCumulative');
    DOM.inspPendingCount = document.getElementById('inspPendingCount');
    DOM.inspFormula = document.getElementById('inspFormula');
    DOM.inspCandidatesBox = document.getElementById('inspCandidatesBox');
    DOM.inspCandidatesChips = document.getElementById('inspCandidatesChips');
    DOM.inspReasonText = document.getElementById('inspReasonText');

    // Performance Results Elements
    DOM.verdictHeadline = document.getElementById('verdictHeadline');
    DOM.verdictSubtext = document.getElementById('verdictSubtext');
    DOM.fcfsTotalDist = document.getElementById('fcfsTotalDist');
    DOM.fcfsAvgDist = document.getElementById('fcfsAvgDist');
    DOM.fcfsMaxSeek = document.getElementById('fcfsMaxSeek');
    DOM.fcfsSeqDisplay = document.getElementById('fcfsSeqDisplay');
    DOM.sstfTotalDist = document.getElementById('sstfTotalDist');
    DOM.sstfAvgDist = document.getElementById('sstfAvgDist');
    DOM.sstfReductionVal = document.getElementById('sstfReductionVal');
    DOM.sstfSeqDisplay = document.getElementById('sstfSeqDisplay');
    DOM.fcfsResultCard = document.getElementById('fcfsResultCard');
    DOM.sstfResultCard = document.getElementById('sstfResultCard');

    // Breakdown Collapsible
    DOM.btnToggleBreakdown = document.getElementById('btnToggleBreakdown');
    DOM.breakdownContent = document.getElementById('breakdownContent');
    DOM.breakdownTableBody = document.getElementById('breakdownTableBody');

    // Section E Table Elements
    DOM.tableFcfsSeq = document.getElementById('tableFcfsSeq');
    DOM.tableSstfSeq = document.getElementById('tableSstfSeq');
    DOM.tableFcfsTotal = document.getElementById('tableFcfsTotal');
    DOM.tableSstfTotal = document.getElementById('tableSstfTotal');
    DOM.tableFcfsAvg = document.getElementById('tableFcfsAvg');
    DOM.tableSstfAvg = document.getElementById('tableSstfAvg');

    // Section F Tabs
    DOM.tabButtons = document.querySelectorAll('.tabs-nav .tab-button');
    DOM.tabPanels = document.querySelectorAll('.tab-panel');

    // Section B Interactive Problem Demo
    DOM.btnDemoRun = document.getElementById('btnDemoRun');
    DOM.demoHeadPin = document.getElementById('demoHeadPin');
    DOM.demoSeekTrail = document.getElementById('demoSeekTrail');
    DOM.demoHeadPos = document.getElementById('demoHeadPos');
    DOM.demoDistanceCounter = document.getElementById('demoDistanceCounter');
    DOM.demoStatusText = document.getElementById('demoStatusText');
  }

  /**
   * Instantiates visualizer objects.
   */
  function initVisualizers() {
    // 1. Primary Platter Visualizer
    state.mainVisualizer = new PlatterVisualizer(DOM.singlePlatterContainer, {
      onStepChange: handleStepChange,
      onPlaybackEnd: handlePlaybackEnd
    });

    // 2. Dual Platter Visualizers for synchronized side-by-side comparison
    state.dualFcfsVisualizer = new PlatterVisualizer(DOM.dualFcfsPlatter, {
      onStepChange: null,
      onPlaybackEnd: null
    });

    state.dualSstfVisualizer = new PlatterVisualizer(DOM.dualSstfPlatter, {
      onStepChange: null,
      onPlaybackEnd: null
    });
  }

  /**
   * Binds UI event handlers and forms.
   */
  function bindEvents() {
    // Form Submission
    DOM.form.addEventListener('submit', function (e) {
      e.preventDefault();
      handleFormSubmit();
    });

    // Dynamic Validation on Input Changes
    DOM.inputDiskSize.addEventListener('input', function () {
      const val = parseInt(DOM.inputDiskSize.value, 10);
      if (!Number.isNaN(val) && val > 0) {
        DOM.diskSizeHint.textContent = `Range: [0, ${val - 1}]`;
        DOM.inputInitialHead.max = String(val - 1);
      }
      clearFieldErrors();
    });

    DOM.inputInitialHead.addEventListener('input', clearFieldErrors);
    DOM.inputQueue.addEventListener('input', clearFieldErrors);

    // Preset Scenario Selection
    DOM.scenarioPresets.addEventListener('change', function () {
      const selected = PRESET_SCENARIOS[this.value];
      if (selected) {
        loadPreset(selected);
      }
    });

    // Reset Default Button
    DOM.btnResetDefault.addEventListener('click', function () {
      DOM.scenarioPresets.value = 'default';
      loadPreset(PRESET_SCENARIOS.default);
    });

    // Algorithm Mode Buttons
    DOM.segmentBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        DOM.segmentBtns.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-checked', 'false');
        });
        this.classList.add('active');
        this.setAttribute('aria-checked', 'true');
        state.mode = this.getAttribute('data-mode');
        handleFormSubmit();
      });
    });

    // Visualizer View Mode Tabs (Single vs Dual Side-by-Side)
    if (DOM.platterViewTabs) {
      DOM.platterViewTabs.querySelectorAll('.viz-tab-btn').forEach(tabBtn => {
        tabBtn.addEventListener('click', function () {
          DOM.platterViewTabs.querySelectorAll('.viz-tab-btn').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
          });
          this.classList.add('active');
          this.setAttribute('aria-selected', 'true');

          const tab = this.getAttribute('data-tab');
          state.viewTab = tab;
          updateViewTabDisplay();
        });
      });
    }

    // Playback Controls
    DOM.btnPlayPause.addEventListener('click', togglePlayPause);
    DOM.btnPrevStep.addEventListener('click', stepBackward);
    DOM.btnNextStep.addEventListener('click', stepForward);
    DOM.btnRestart.addEventListener('click', restartAnimation);

    // Platter Rotation Toggle Button
    if (DOM.btnToggleSpin) {
      DOM.btnToggleSpin.addEventListener('click', function () {
        state.isPlatterSpinning = !state.isPlatterSpinning;
        updatePlatterSpinUI(state.isPlatterSpinning);
      });
    }

    // Timeline Scrubber
    DOM.timelineScrubber.addEventListener('input', function () {
      const targetStep = parseInt(this.value, 10);
      pauseAnimation();
      jumpToTimelineStep(targetStep);
    });

    // Speed Selector Buttons
    DOM.speedBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        DOM.speedBtns.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-checked', 'false');
        });
        this.classList.add('active');
        this.setAttribute('aria-checked', 'true');

        state.speed = parseFloat(this.getAttribute('data-speed'));
        if (state.mainVisualizer) state.mainVisualizer.setSpeed(state.speed);
        if (state.dualFcfsVisualizer) state.dualFcfsVisualizer.setSpeed(state.speed);
        if (state.dualSstfVisualizer) state.dualSstfVisualizer.setSpeed(state.speed);
      });
    });

    // Breakdown Collapsible Toggle
    DOM.btnToggleBreakdown.addEventListener('click', function () {
      const isExpanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!isExpanded));
      DOM.breakdownContent.classList.toggle('hidden', isExpanded);
    });

    // Architecture Tabs (Section F)
    DOM.tabButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        DOM.tabButtons.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        DOM.tabPanels.forEach(p => p.classList.add('hidden'));

        this.classList.add('active');
        this.setAttribute('aria-selected', 'true');
        const targetId = this.getAttribute('data-target');
        const panel = document.querySelector(targetId);
        if (panel) panel.classList.remove('hidden');
      });
    });
  }

  /**
   * Toggles and updates platter rotation UI and visualizer state.
   */
  function updatePlatterSpinUI(spinning) {
    state.isPlatterSpinning = spinning;
    if (state.mainVisualizer) state.mainVisualizer.setPlatterSpin(spinning);
    if (state.dualFcfsVisualizer) state.dualFcfsVisualizer.setPlatterSpin(spinning);
    if (state.dualSstfVisualizer) state.dualSstfVisualizer.setPlatterSpin(spinning);

    if (DOM.btnToggleSpin) {
      if (spinning) {
        DOM.btnToggleSpin.classList.add('active');
        DOM.btnToggleSpin.classList.remove('paused');
        DOM.btnToggleSpin.setAttribute('title', 'Pause Platter Spin');
        DOM.btnToggleSpin.setAttribute('aria-label', 'Pause Platter Spin');
      } else {
        DOM.btnToggleSpin.classList.remove('active');
        DOM.btnToggleSpin.classList.add('paused');
        DOM.btnToggleSpin.setAttribute('title', 'Resume Platter Spin');
        DOM.btnToggleSpin.setAttribute('aria-label', 'Resume Platter Spin');
      }
    }
  }

  /**
   * Clears inline validation error texts.
   */
  function clearFieldErrors() {
    DOM.errDiskSize.textContent = '';
    DOM.errInitialHead.textContent = '';
    DOM.errQueue.textContent = '';
    DOM.formWarnings.textContent = '';
  }

  /**
   * Loads a preset scenario into the form and executes simulation.
   */
  function loadPreset(preset) {
    DOM.inputDiskSize.value = preset.diskSize;
    DOM.inputInitialHead.value = preset.initialHead;
    DOM.inputQueue.value = preset.queue.join(', ');
    DOM.diskSizeHint.textContent = `Range: [0, ${preset.diskSize - 1}]`;
    DOM.inputInitialHead.max = String(preset.diskSize - 1);
    clearFieldErrors();
    handleFormSubmit();
  }

  /**
   * Validates form and initiates simulation if valid.
   */
  function handleFormSubmit() {
    clearFieldErrors();

    const rawDiskSize = DOM.inputDiskSize.value;
    const rawHead = DOM.inputInitialHead.value;
    const rawQueue = DOM.inputQueue.value;

    const valResult = validation.validateInputs(rawDiskSize, rawHead, rawQueue);

    if (!valResult.isValid) {
      if (valResult.errors.diskSize) DOM.errDiskSize.textContent = valResult.errors.diskSize;
      if (valResult.errors.initialHead) DOM.errInitialHead.textContent = valResult.errors.initialHead;
      if (valResult.errors.queue) DOM.errQueue.textContent = valResult.errors.queue;
      return;
    }

    if (valResult.warnings && valResult.warnings.length > 0) {
      DOM.formWarnings.innerHTML = valResult.warnings.map(w => `&bull; ${w}`).join('<br>');
    }

    state.diskSize = valResult.parsed.diskSize;
    state.initialHead = valResult.parsed.initialHead;
    state.queue = valResult.parsed.queue;

    runSimulation(state.diskSize, state.initialHead, state.queue, state.mode);
  }

  /**
   * Runs the disk scheduling simulation pipelines.
   */
  function runSimulation(diskSize, initialHead, queue, mode) {
    pauseAnimation();

    // 1. Run pure algorithms
    state.fcfsResult = algorithms.runFCFS(initialHead, queue);
    state.sstfResult = algorithms.runSSTF(initialHead, queue);

    // 2. Compute performance metrics & comparative stats
    state.comparison = metrics.compareAlgorithms(state.fcfsResult, state.sstfResult);

    // 3. Determine active algorithm result to display in single platter
    let activeResult = state.sstfResult;
    if (mode === 'FCFS') activeResult = state.fcfsResult;
    else if (mode === 'SSTF') activeResult = state.sstfResult;

    state.totalSteps = activeResult.servicedRequests.length;
    DOM.timelineScrubber.max = String(state.totalSteps);
    DOM.timelineScrubber.value = '0';

    // 4. Update Header Platter Label
    if (mode === 'compare') {
      DOM.vizActiveAlgorithmName.textContent = 'Comparative Platter View (SSTF vs FCFS)';
    } else {
      DOM.vizActiveAlgorithmName.textContent = `${activeResult.name} Platter`;
    }

    // 5. Load simulation dataset into primary platter visualizer
    state.mainVisualizer.loadSimulation(diskSize, initialHead, activeResult);

    // 6. Load dual platters for simultaneous side-by-side mode
    state.dualFcfsVisualizer.loadSimulation(diskSize, initialHead, state.fcfsResult);
    state.dualSstfVisualizer.loadSimulation(diskSize, initialHead, state.sstfResult);

    DOM.dualFcfsDist.textContent = `${state.fcfsResult.totalMovement} cyl`;
    DOM.dualSstfDist.textContent = `${state.sstfResult.totalMovement} cyl`;

    // 7. Initialize Synchronized Horizontal Linear Track
    initLinearTrack(diskSize, initialHead, activeResult);

    // 8. Update Results Showcase UI
    updateResultsUI();

    // 9. Update Section E Comparative Table
    updateComparisonTable();

    // 10. Reset Step Inspector
    updateInspectorUI(0, state.totalSteps, initialHead, null);

    // 11. Sync platter spin state
    updatePlatterSpinUI(state.isPlatterSpinning);

    // 12. Update View Tab visibility
    updateViewTabDisplay();
  }

  /**
   * Initializes the Synchronized Linear Cylinder Track with scale ticks and request pins.
   */
  function initLinearTrack(diskSize, initialHead, algorithmResult) {
    if (!DOM.linearPinsLayer || !DOM.linearTrackScale) return;

    if (DOM.linearMaxCyl) DOM.linearMaxCyl.textContent = String(diskSize - 1);

    // 1. Render Linear Scale labels
    DOM.linearTrackScale.innerHTML = '';
    const tickCount = 5;
    for (let i = 0; i < tickCount; i++) {
      const cyl = Math.round((i / (tickCount - 1)) * (diskSize - 1));
      const span = document.createElement('span');
      span.textContent = String(cyl);
      DOM.linearTrackScale.appendChild(span);
    }

    // 2. Position Initial Head Marker
    const headPct = diskSize <= 1 ? 50 : (initialHead / (diskSize - 1)) * 100;
    if (DOM.linearHeadMarker) DOM.linearHeadMarker.style.left = `${headPct}%`;
    if (DOM.linearHeadMarkerLabel) DOM.linearHeadMarkerLabel.textContent = `Head: ${initialHead}`;
    if (DOM.linearTrackTrail) DOM.linearTrackTrail.style.width = '0%';

    // 3. Render Request Pins on Linear Track
    DOM.linearPinsLayer.innerHTML = '';
    const requests = algorithmResult ? algorithmResult.servicedRequests : [];

    requests.forEach((cyl, idx) => {
      const pct = diskSize <= 1 ? 50 : (cyl / (diskSize - 1)) * 100;
      const pin = document.createElement('div');
      pin.className = 'linear-pin';
      pin.id = `linearPinStep${idx + 1}`;
      pin.setAttribute('data-step', idx + 1);
      pin.setAttribute('data-cylinder', cyl);
      pin.setAttribute('title', `Step ${idx + 1}: Cylinder ${cyl}`);
      pin.style.left = `${pct}%`;
      pin.innerHTML = `
        <span class="lpin-dot"></span>
        <span class="lpin-label">${cyl}</span>
      `;

      pin.addEventListener('click', () => {
        pauseAnimation();
        jumpToTimelineStep(idx + 1);
      });

      DOM.linearPinsLayer.appendChild(pin);
    });

    updateLinearTrack(0, initialHead, null);
  }

  /**
   * Updates Synchronized Linear Cylinder Track markers, trail, and status.
   */
  function updateLinearTrack(stepIndex, currentCylinder, stepData) {
    if (!DOM.linearHeadMarker) return;

    const diskSize = state.diskSize;
    const headPct = diskSize <= 1 ? 50 : (currentCylinder / (diskSize - 1)) * 100;
    DOM.linearHeadMarker.style.left = `${headPct}%`;
    if (DOM.linearHeadMarkerLabel) {
      DOM.linearHeadMarkerLabel.textContent = `Head: ${currentCylinder}`;
    }

    // Update Linear Pin States
    const totalSteps = state.totalSteps;
    for (let i = 1; i <= totalSteps; i++) {
      const pin = document.getElementById(`linearPinStep${i}`);
      if (!pin) continue;

      pin.classList.remove('serviced', 'target', 'active');
      if (i < stepIndex) {
        pin.classList.add('serviced');
      } else if (i === stepIndex) {
        pin.classList.add('serviced', 'active');
      } else if (i === stepIndex + 1) {
        pin.classList.add('target');
      }
    }

    // Update Status string
    if (DOM.linearTrackStatus) {
      if (stepIndex === 0) {
        DOM.linearTrackStatus.textContent = `Head at Cylinder ${currentCylinder} • Ready`;
      } else {
        const distance = stepData ? stepData.distance : 0;
        DOM.linearTrackStatus.textContent = `Head at Cylinder ${currentCylinder} • Step ${stepIndex} / ${totalSteps} (Seek: ${distance} cyl)`;
      }
    }
  }

  /**
   * Updates Live Performance Results Panel and Verdict Banner.
   */
  function updateResultsUI() {
    const comp = state.comparison;
    const fcfs = state.fcfsResult;
    const sstf = state.sstfResult;

    // Verdict Banner
    DOM.verdictHeadline.textContent = comp.headline;
    DOM.verdictSubtext.textContent = comp.educationalTakeaway;

    // FCFS Metrics Card
    DOM.fcfsTotalDist.textContent = String(fcfs.totalMovement);
    DOM.fcfsAvgDist.textContent = `${fcfs.averageMovement.toFixed(2)} cyl`;
    const fcfsMax = fcfs.movements.length > 0 ? Math.max(...fcfs.movements) : 0;
    DOM.fcfsMaxSeek.textContent = `${fcfsMax} cyl`;
    DOM.fcfsSeqDisplay.innerHTML = fcfs.sequence.join(' &rarr; ');

    // SSTF Metrics Card
    DOM.sstfTotalDist.textContent = String(sstf.totalMovement);
    DOM.sstfAvgDist.textContent = `${sstf.averageMovement.toFixed(2)} cyl`;
    DOM.sstfReductionVal.textContent = comp.reductionFormatted;
    DOM.sstfSeqDisplay.innerHTML = sstf.sequence.join(' &rarr; ');

    // Highlight active / winner cards
    if (state.mode === 'FCFS') {
      DOM.fcfsResultCard.style.outline = '2px solid var(--accent-blue)';
      DOM.sstfResultCard.style.outline = 'none';
    } else if (state.mode === 'SSTF') {
      DOM.sstfResultCard.style.outline = '2px solid var(--accent-blue)';
      DOM.fcfsResultCard.style.outline = 'none';
    } else {
      DOM.fcfsResultCard.style.outline = 'none';
      DOM.sstfResultCard.style.outline = '2px solid var(--accent-blue)';
    }

    populateBreakdownTable(fcfs, sstf);
  }

  /**
   * Renders rows in the step-by-step movement breakdown table.
   */
  function populateBreakdownTable(fcfs, sstf) {
    DOM.breakdownTableBody.innerHTML = '';
    const maxSteps = Math.max(fcfs.steps.length, sstf.steps.length);

    for (let i = 0; i < maxSteps; i++) {
      const fStep = fcfs.steps[i];
      const sStep = sstf.steps[i];

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>Step ${i + 1}</td>
        <td>${fStep ? `${fStep.from} &rarr; ${fStep.to}` : '-'}</td>
        <td>${fStep ? `|${fStep.to} - ${fStep.from}| = ${fStep.distance} cyl` : '-'}</td>
        <td class="text-accent">${sStep ? `${sStep.from} &rarr; ${sStep.to}` : '-'}</td>
        <td class="text-accent">${sStep ? `|${sStep.to} - ${sStep.from}| = ${sStep.distance} cyl` : '-'}</td>
      `;
      DOM.breakdownTableBody.appendChild(tr);
    }
  }

  /**
   * Updates Section E Comparative Table with live values.
   */
  function updateComparisonTable() {
    const fcfs = state.fcfsResult;
    const sstf = state.sstfResult;

    if (DOM.tableFcfsSeq) DOM.tableFcfsSeq.innerHTML = fcfs.sequence.join(' &rarr; ');
    if (DOM.tableSstfSeq) DOM.tableSstfSeq.innerHTML = sstf.sequence.join(' &rarr; ');
    if (DOM.tableFcfsTotal) DOM.tableFcfsTotal.textContent = `${fcfs.totalMovement} cylinders`;
    if (DOM.tableSstfTotal) DOM.tableSstfTotal.textContent = `${sstf.totalMovement} cylinders`;
    if (DOM.tableFcfsAvg) DOM.tableFcfsAvg.textContent = `${fcfs.averageMovement.toFixed(2)} cylinders`;
    if (DOM.tableSstfAvg) DOM.tableSstfAvg.textContent = `${sstf.averageMovement.toFixed(2)} cylinders`;
  }

  /**
   * Updates step inspector panel and linear track on playback or stepping.
   */
  function handleStepChange(stepIndex, totalSteps, currentCylinder, stepData) {
    state.currentStep = stepIndex;
    DOM.timelineScrubber.value = String(stepIndex);

    // Sync dual visualizers if dual view is active
    if (state.dualFcfsVisualizer) state.dualFcfsVisualizer.jumpToStep(stepIndex);
    if (state.dualSstfVisualizer) state.dualSstfVisualizer.jumpToStep(stepIndex);

    // Sync Linear Track
    updateLinearTrack(stepIndex, currentCylinder, stepData);

    // Sync Inspector UI
    updateInspectorUI(stepIndex, totalSteps, currentCylinder, stepData);
  }

  /**
   * Updates textual details in the enhanced inspector card.
   */
  function updateInspectorUI(stepIndex, totalSteps, currentCylinder, stepData) {
    if (DOM.inspStepNumber) DOM.inspStepNumber.textContent = `Step ${stepIndex} of ${totalSteps}`;

    const remainingCount = Math.max(0, totalSteps - stepIndex);
    if (DOM.inspPendingCount) DOM.inspPendingCount.textContent = `${remainingCount} remaining`;

    if (stepIndex === 0 || !stepData) {
      if (DOM.inspFromCyl) DOM.inspFromCyl.textContent = `Initial Head`;
      if (DOM.inspToCyl) DOM.inspToCyl.textContent = `Cylinder ${state.initialHead}`;
      if (DOM.inspDistance) DOM.inspDistance.textContent = `0 cyl`;
      if (DOM.inspCumulative) DOM.inspCumulative.textContent = `0 cyl`;
      if (DOM.inspFormula) DOM.inspFormula.textContent = `|to - from| = 0 cyl`;
      if (DOM.inspReasonText) {
        DOM.inspReasonText.textContent = `Simulation ready at starting cylinder ${state.initialHead}. Press Play to begin or use Step Next to advance step by step.`;
      }
      if (DOM.inspCandidatesBox) DOM.inspCandidatesBox.classList.add('hidden');
    } else {
      if (DOM.inspFromCyl) DOM.inspFromCyl.textContent = `Cylinder ${stepData.from}`;
      if (DOM.inspToCyl) DOM.inspToCyl.textContent = `Cylinder ${stepData.to}`;
      if (DOM.inspDistance) DOM.inspDistance.textContent = `${stepData.distance} cyl`;
      if (DOM.inspCumulative) DOM.inspCumulative.textContent = `${stepData.cumulativeDistance} cyl`;
      if (DOM.inspFormula) DOM.inspFormula.textContent = `|${stepData.to} - ${stepData.from}| = ${stepData.distance} cyl`;

      // Candidate Distances Breakdown (Specifically for SSTF nearest evaluation)
      if (stepData.candidates && stepData.candidates.length > 0) {
        if (DOM.inspCandidatesBox) DOM.inspCandidatesBox.classList.remove('hidden');
        if (DOM.inspCandidatesChips) {
          DOM.inspCandidatesChips.innerHTML = stepData.candidates.map(c => `
            <span class="cand-chip ${c.isWinner ? 'winner' : ''}">
              Cyl ${c.cylinder} (|&Delta;|=${c.distance}${c.isWinner ? ' &bull; Selected' : ''})
            </span>
          `).join('');
        }
      } else {
        if (DOM.inspCandidatesBox) DOM.inspCandidatesBox.classList.add('hidden');
      }

      if (DOM.inspReasonText) {
        DOM.inspReasonText.textContent = stepData.reasoning || `Serviced cylinder ${stepData.to} with seek distance ${stepData.distance} cylinders.`;
      }
    }
  }

  /**
   * Called when playback finishes all steps.
   */
  function handlePlaybackEnd() {
    setPlayingUI(false);
  }

  /**
   * Toggles play and pause state.
   */
  function togglePlayPause() {
    if (state.isPlaying) {
      pauseAnimation();
    } else {
      playAnimation();
    }
  }

  function playAnimation() {
    state.isPlaying = true;
    setPlayingUI(true);

    if (state.mainVisualizer) state.mainVisualizer.play();
    if (state.dualFcfsVisualizer) state.dualFcfsVisualizer.play();
    if (state.dualSstfVisualizer) state.dualSstfVisualizer.play();
  }

  function pauseAnimation() {
    state.isPlaying = false;
    setPlayingUI(false);

    if (state.mainVisualizer) state.mainVisualizer.stopPlayback();
    if (state.dualFcfsVisualizer) state.dualFcfsVisualizer.stopPlayback();
    if (state.dualSstfVisualizer) state.dualSstfVisualizer.stopPlayback();
  }

  function stepForward() {
    pauseAnimation();
    if (state.mainVisualizer) state.mainVisualizer.nextStep();
  }

  function stepBackward() {
    pauseAnimation();
    if (state.mainVisualizer) state.mainVisualizer.prevStep();
  }

  function restartAnimation() {
    pauseAnimation();
    if (state.mainVisualizer) state.mainVisualizer.restart();
    if (state.dualFcfsVisualizer) state.dualFcfsVisualizer.restart();
    if (state.dualSstfVisualizer) state.dualSstfVisualizer.restart();
  }

  function jumpToTimelineStep(step) {
    if (state.mainVisualizer) state.mainVisualizer.jumpToStep(step);
    if (state.dualFcfsVisualizer) state.dualFcfsVisualizer.jumpToStep(step);
    if (state.dualSstfVisualizer) state.dualSstfVisualizer.jumpToStep(step);
  }

  function setPlayingUI(playing) {
    state.isPlaying = playing;
    if (playing) {
      DOM.iconPlay.classList.add('hidden');
      DOM.iconPause.classList.remove('hidden');
      DOM.btnPlayPause.setAttribute('title', 'Pause Simulation');
      DOM.btnPlayPause.setAttribute('aria-label', 'Pause Simulation');
    } else {
      DOM.iconPlay.classList.remove('hidden');
      DOM.iconPause.classList.add('hidden');
      DOM.btnPlayPause.setAttribute('title', 'Play Simulation');
      DOM.btnPlayPause.setAttribute('aria-label', 'Play Simulation');
    }
  }

  function updateViewTabDisplay() {
    if (state.viewTab === 'dual') {
      DOM.singlePlatterContainer.classList.add('hidden');
      DOM.dualPlatterContainer.classList.remove('hidden');
    } else {
      DOM.singlePlatterContainer.classList.remove('hidden');
      DOM.dualPlatterContainer.classList.add('hidden');
    }
  }

  /**
   * Initializes Section B interactive demo.
   */
  function initInteractiveDemos() {
    if (!DOM.btnDemoRun) return;

    let demoStep = 0;
    const demoSeq = [
      { cyl: 53, left: '26.5%' },
      { cyl: 98, left: '49%' },
      { cyl: 183, left: '91.5%' },
      { cyl: 37, left: '18.5%' },
      { cyl: 14, left: '7%' }
    ];
    let demoSeekTotal = 0;
    let isDemoRunning = false;

    DOM.btnDemoRun.addEventListener('click', function () {
      if (isDemoRunning) return;
      isDemoRunning = true;
      demoStep = 0;
      demoSeekTotal = 0;
      DOM.btnDemoRun.disabled = true;

      function runNextDemoStep() {
        if (demoStep < demoSeq.length - 1) {
          const from = demoSeq[demoStep];
          const to = demoSeq[demoStep + 1];
          const dist = Math.abs(to.cyl - from.cyl);
          demoSeekTotal += dist;

          DOM.demoHeadPin.style.left = to.left;
          DOM.demoHeadPos.textContent = String(to.cyl);
          DOM.demoDistanceCounter.textContent = `${demoSeekTotal} cylinders`;
          DOM.demoStatusText.textContent = `Jumped ${dist} cylinders (${from.cyl} &rarr; ${to.cyl})`;

          demoStep++;
          setTimeout(runNextDemoStep, 1000);
        } else {
          DOM.demoStatusText.textContent = `Completed 4 seeks: 323 cylinders accumulated!`;
          DOM.btnDemoRun.disabled = false;
          isDemoRunning = false;
        }
      }

      runNextDemoStep();
    });
  }

  // Self-execute initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
