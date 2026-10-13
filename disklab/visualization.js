/**
 * DiskLab - visualization.js
 * Renders an Apple-inspired living physical disk platter with:
 * 1. Continuously spinning metallic disc surface with unmistakable sector markings,
 *    fine radial tick lines, micro-groove tracks, and iridescent reflections.
 * 2. Visual separation between platter rotation and mechanical actuator head seeking.
 * 3. Centered, rock-steady spindle hub.
 * 4. Realistic actuator arm and head carrier with glowing read/write lens.
 * 5. Distinct pending, target, and serviced node states with satisfying completion ripple.
 * 6. Platter rotation toggle (pause/resume) and speed adaptation.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DiskLab = root.DiskLab || {};
    root.DiskLab.visualization = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Coordinate and geometry constants
  const VIEW_SIZE = 600;
  const CENTER_X = 300;
  const CENTER_Y = 300;
  const DISK_OUTER_R = 270;
  const DISK_INNER_R = 90;
  const SPINDLE_HOLE_R = 32;

  // Track radius bounds for logical cylinders [0, diskSize - 1]
  const TRACK_MIN_R = 100;
  const TRACK_MAX_R = 255;

  /**
   * Helper: computes radial distance on platter for a given cylinder.
   */
  function cylinderToRadius(cylinder, diskSize) {
    if (diskSize <= 1) return (TRACK_MIN_R + TRACK_MAX_R) / 2;
    const ratio = Math.max(0, Math.min(1, cylinder / (diskSize - 1)));
    return TRACK_MIN_R + ratio * (TRACK_MAX_R - TRACK_MIN_R);
  }

  /**
   * Generates radial sector tick lines and perimeter strobe calibration marks
   * to make platter rotation clearly and unmistakably visible.
   */
  function generatePlatterSurfaceMarkings() {
    let linesSvg = '';

    // 16 Main Radial Sector Division Lines (every 22.5 degrees)
    for (let i = 0; i < 16; i++) {
      const angle = (i * 22.5 * Math.PI) / 180;
      const x1 = CENTER_X + (DISK_INNER_R + 4) * Math.cos(angle);
      const y1 = CENTER_Y + (DISK_INNER_R + 4) * Math.sin(angle);
      const x2 = CENTER_X + (DISK_OUTER_R - 4) * Math.cos(angle);
      const y2 = CENTER_Y + (DISK_OUTER_R - 4) * Math.sin(angle);
      const isQuarter = i % 4 === 0;

      linesSvg += `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"
        stroke="${isQuarter ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)'}"
        stroke-width="${isQuarter ? '1.5' : '0.8'}" stroke-dasharray="${isQuarter ? 'none' : '4 6'}" />`;
    }

    // 32 Outer Strobe / Servo Calibration Ticks along perimeter
    for (let j = 0; j < 32; j++) {
      const angle = (j * 11.25 * Math.PI) / 180;
      const x1 = CENTER_X + (DISK_OUTER_R - 8) * Math.cos(angle);
      const y1 = CENTER_Y + (DISK_OUTER_R - 8) * Math.sin(angle);
      const x2 = CENTER_X + (DISK_OUTER_R - 2) * Math.cos(angle);
      const y2 = CENTER_Y + (DISK_OUTER_R - 2) * Math.sin(angle);

      linesSvg += `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"
        stroke="rgba(255,255,255,0.3)" stroke-width="1.2" />`;
    }

    // Concentric micro-groove rings (texture like vinyl / optical tracks)
    const microGrooveRadii = [115, 135, 155, 175, 195, 215, 235, 250];
    microGrooveRadii.forEach(r => {
      linesSvg += `<circle cx="${CENTER_X}" cy="${CENTER_Y}" r="${r}" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1" stroke-dasharray="2 3" />`;
    });

    return linesSvg;
  }

  /**
   * Class managing the Platter Visualization and Timeline.
   */
  class PlatterVisualizer {
    /**
     * @param {HTMLElement|string} container - Element or selector
     * @param {Object} options - Configuration callbacks and settings
     */
    constructor(container, options = {}) {
      this.container = typeof container === 'string' ? document.querySelector(container) : container;
      if (!this.container) {
        throw new Error(`DiskLab Visualizer: container ${container} not found.`);
      }

      this.options = Object.assign({
        onStepChange: null,
        onPlaybackEnd: null,
        theme: 'light'
      }, options);

      this.diskSize = 200;
      this.initialHead = 53;
      this.algorithmResult = null;
      this.currentStepIndex = 0;
      this.isPlaying = false;
      this.playbackSpeed = 1.0; // 0.5, 1.0, 2.0
      this.isPlatterSpinning = true;
      this.animationTimer = null;
      this.markerCoords = [];

      this.initDOM();
    }

    /**
     * Initializes the SVG platter structure and layers.
     */
    initDOM() {
      const surfaceMarkingsHtml = generatePlatterSurfaceMarkings();

      this.container.innerHTML = `
        <div class="platter-wrapper" role="region" aria-label="Living Disk Platter Simulation">
          <svg class="platter-svg" viewBox="0 0 ${VIEW_SIZE} ${VIEW_SIZE}" preserveAspectRatio="xMidYMid meet">
            <defs>
              <!-- Metallic Platter Radial Gradient: warm charcoal and brushed alloy -->
              <radialGradient id="platterMetal" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#151719" />
                <stop offset="28%" stop-color="#24272a" />
                <stop offset="30%" stop-color="#2f3338" />
                <stop offset="55%" stop-color="#1d2023" />
                <stop offset="85%" stop-color="#2c3036" />
                <stop offset="97%" stop-color="#181a1c" />
                <stop offset="100%" stop-color="#101113" />
              </radialGradient>

              <!-- Anisotropic Reflections: Soft Dusty Rose (#C88E89) & Muted Blue (#8DA9C2) -->
              <linearGradient id="cdSheen1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="rgba(250,249,245,0.06)" />
                <stop offset="26%" stop-color="rgba(200,142,137,0.24)" />
                <stop offset="52%" stop-color="rgba(141,169,194,0.26)" />
                <stop offset="78%" stop-color="rgba(200,142,137,0.18)" />
                <stop offset="100%" stop-color="rgba(250,249,245,0.02)" />
              </linearGradient>

              <linearGradient id="cdSheen2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="rgba(250,249,245,0.05)" />
                <stop offset="32%" stop-color="rgba(141,169,194,0.24)" />
                <stop offset="66%" stop-color="rgba(200,142,137,0.22)" />
                <stop offset="100%" stop-color="rgba(250,249,245,0.02)" />
              </linearGradient>

              <!-- Spindle Metallic Hub Gradient: Warm Metallic Silver (#B9BDC2) -->
              <radialGradient id="spindleHub" cx="45%" cy="45%" r="55%">
                <stop offset="0%" stop-color="#FAF9F5" />
                <stop offset="35%" stop-color="#d8dbdf" />
                <stop offset="70%" stop-color="#B9BDC2" />
                <stop offset="88%" stop-color="#6f7379" />
                <stop offset="100%" stop-color="#202426" />
              </radialGradient>

              <!-- Head Glow Filter -->
              <filter id="headGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <!-- Subtle Drop Shadow for Nodes -->
              <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.5)" />
              </filter>
            </defs>

            <!-- 1. Platter Base Shadow (Static outer frame) -->
            <circle cx="${CENTER_X}" cy="${CENTER_Y}" r="${DISK_OUTER_R + 6}" fill="rgba(0,0,0,0.3)" filter="blur(8px)" />

            <!-- Static Outer Rim & Warm Metallic Silver Bezel -->
            <circle cx="${CENTER_X}" cy="${CENTER_Y}" r="${DISK_OUTER_R + 2}" fill="#191c1e" stroke="#B9BDC2" stroke-width="1.8" />
            <circle cx="${CENTER_X}" cy="${CENTER_Y}" r="${DISK_OUTER_R}" fill="#121315" stroke="rgba(255,255,255,0.12)" stroke-width="1" />

            <!-- 2. CONTINUOUSLY SPINNING PLATTER DISC SURFACE -->
            <!-- Rotates smoothly around (300, 300) with visible sector markings & sheen -->
            <g class="spinning-disc-group" id="spinningDiscGroup">
              <!-- Metallic Alloy Surface -->
              <circle cx="${CENTER_X}" cy="${CENTER_Y}" r="${DISK_OUTER_R - 1}" fill="url(#platterMetal)" />

              <!-- CD Prismatic Surface Sheens: Dusty Rose & Muted Blue -->
              <path d="M ${CENTER_X - DISK_OUTER_R} ${CENTER_Y} A ${DISK_OUTER_R} ${DISK_OUTER_R} 0 0 1 ${CENTER_X} ${CENTER_Y - DISK_OUTER_R} L ${CENTER_X} ${CENTER_Y - DISK_INNER_R} A ${DISK_INNER_R} ${DISK_INNER_R} 0 0 0 ${CENTER_X - DISK_INNER_R} ${CENTER_Y} Z" fill="url(#cdSheen1)" opacity="0.9" />
              <path d="M ${CENTER_X + DISK_OUTER_R} ${CENTER_Y} A ${DISK_OUTER_R} ${DISK_OUTER_R} 0 0 1 ${CENTER_X} ${CENTER_Y + DISK_OUTER_R} L ${CENTER_X} ${CENTER_Y + DISK_INNER_R} A ${DISK_INNER_R} ${DISK_INNER_R} 0 0 0 ${CENTER_X + DISK_INNER_R} ${CENTER_Y} Z" fill="url(#cdSheen2)" opacity="0.9" />

              <!-- Visible Strobe & Radial Sector Markings -->
              <g class="surface-markings-group">
                ${surfaceMarkingsHtml}
              </g>

              <!-- Subtle Optical Sweep Highlight -->
              <path d="M ${CENTER_X} ${CENTER_Y} L ${CENTER_X + 240} ${CENTER_Y - 90} A ${DISK_OUTER_R} ${DISK_OUTER_R} 0 0 1 ${CENTER_X + 210} ${CENTER_Y + 140} Z" fill="rgba(22, 131, 248, 0.10)" />
            </g>

            <!-- 3. Concentric Cylinder Track Overlays (Reference tracks for scheduler) -->
            <g class="tracks-layer" id="tracksLayer"></g>

            <!-- Active Target Cylinder Highlighting Ring -->
            <circle id="activeTrackHighlight" cx="${CENTER_X}" cy="${CENTER_Y}" r="0" fill="none" stroke="rgba(22, 131, 248, 0.65)" stroke-width="2.5" stroke-dasharray="4 4" opacity="0" />

            <!-- Seek Paths Trajectory Layer -->
            <g class="paths-layer" id="pathsLayer"></g>

            <!-- Request Nodes Layer -->
            <g class="nodes-layer" id="nodesLayer"></g>

            <!-- 4. MECHANICAL ACTUATOR ARM & READ/WRITE HEAD ASSEMBLY -->
            <!-- Arm extends from external base to current track radius -->
            <g class="actuator-layer" id="actuatorLayer">
              <!-- Radial Guide Line from Hub to Outer Rim -->
              <line id="headSeekAxis" x1="${CENTER_X}" y1="${CENTER_Y - DISK_INNER_R}" x2="${CENTER_X}" y2="${CENTER_Y - DISK_OUTER_R + 10}" stroke="rgba(255,255,255,0.18)" stroke-width="1.5" stroke-dasharray="3 3" />

              <!-- Actuator Arm Body (Pivots/reaches toward the track) -->
              <g id="actuatorArmBeamGroup">
                <line id="actuatorArmBeam" x1="${CENTER_X + 180}" y1="${CENTER_Y + 180}" x2="${CENTER_X}" y2="${CENTER_Y - cylinderToRadius(53, 200)}" stroke="#B9BDC2" stroke-width="3" stroke-linecap="round" opacity="0.55" />
              </g>

              <!-- Actuator Head Carrier assembly -->
              <g id="headAssembly" transform="translate(${CENTER_X}, ${CENTER_Y - cylinderToRadius(53, 200)})">
                <!-- Optical/Magnetic Head Bracket -->
                <rect x="-16" y="-8" width="32" height="16" rx="4" fill="#202426" stroke="#B9BDC2" stroke-width="1.2" />
                <!-- Precision Laser / Magnetic Pickup Lens -->
                <circle cx="0" cy="0" r="5" fill="#1683F8" filter="url(#headGlow)" />
                <circle cx="0" cy="0" r="2" fill="#ffffff" />
                <!-- Seeking Crosshairs -->
                <line x1="-12" y1="0" x2="-6" y2="0" stroke="rgba(255,255,255,0.7)" stroke-width="1" />
                <line x1="6" y1="0" x2="12" y2="0" stroke="rgba(255,255,255,0.7)" stroke-width="1" />
                <line x1="0" y1="-6" x2="0" y2="-3" stroke="rgba(255,255,255,0.7)" stroke-width="1" />
                <line x1="0" y1="3" x2="0" y2="6" stroke="rgba(255,255,255,0.7)" stroke-width="1" />
                <!-- Live Cylinder Tooltip Pip -->
                <g class="head-live-tag" transform="translate(20, -4)">
                  <rect x="0" y="-8" width="58" height="16" rx="4" fill="rgba(22, 131, 248, 0.9)" />
                  <text id="headLiveTagText" x="29" y="3" text-anchor="middle" font-size="8" font-family="-apple-system, BlinkMacSystemFont, monospace" font-weight="700" fill="#ffffff">CYL 53</text>
                </g>
              </g>
            </g>

            <!-- 5. ROCK-STEADY CENTER SPINDLE HUB (Static, visually aligned) -->
            <g class="spindle-hub-static" id="spindleHubGroup">
              <circle cx="${CENTER_X}" cy="${CENTER_Y}" r="${DISK_INNER_R}" fill="#202426" stroke="#484c52" stroke-width="2" />
              <circle cx="${CENTER_X}" cy="${CENTER_Y}" r="${DISK_INNER_R - 8}" fill="url(#spindleHub)" stroke="#B9BDC2" stroke-width="1.5" />
              <circle cx="${CENTER_X}" cy="${CENTER_Y}" r="${DISK_INNER_R - 22}" fill="#191c1e" stroke="#484c52" stroke-width="1" />
              <circle cx="${CENTER_X}" cy="${CENTER_Y}" r="${SPINDLE_HOLE_R}" fill="#121315" stroke="#2c2d30" stroke-width="2" />
              <circle cx="${CENTER_X}" cy="${CENTER_Y}" r="${SPINDLE_HOLE_R - 8}" fill="#000000" />
              <circle cx="${CENTER_X - 10}" cy="${CENTER_Y - 10}" r="2" fill="rgba(255,255,255,0.6)" />
              <text x="${CENTER_X}" y="${CENTER_Y + 4}" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.8)" font-weight="600" letter-spacing="1">SPINDLE</text>
            </g>
          </svg>

          <!-- Interactive Platter Info Overlay / Floating Badges -->
          <div class="platter-overlay-info">
            <div class="platter-head-badge" id="headBadge">
              <span class="badge-label">HEAD POSITION</span>
              <span class="badge-value" id="currentHeadDisplay">Cylinder 53</span>
            </div>
            <div class="platter-step-badge" id="stepBadge">
              <span class="badge-label">STEP</span>
              <span class="badge-value" id="currentStepDisplay">0 / 8</span>
            </div>
          </div>
        </div>
      `;

      this.spinningDiscGroup = this.container.querySelector('#spinningDiscGroup');
      this.tracksLayer = this.container.querySelector('#tracksLayer');
      this.pathsLayer = this.container.querySelector('#pathsLayer');
      this.nodesLayer = this.container.querySelector('#nodesLayer');
      this.activeTrackHighlight = this.container.querySelector('#activeTrackHighlight');
      this.headAssembly = this.container.querySelector('#headAssembly');
      this.actuatorArmBeam = this.container.querySelector('#actuatorArmBeam');
      this.headLiveTagText = this.container.querySelector('#headLiveTagText');
      this.currentHeadDisplay = this.container.querySelector('#currentHeadDisplay');
      this.currentStepDisplay = this.container.querySelector('#currentStepDisplay');
    }

    /**
     * Loads a new simulation dataset and builds tracks and nodes.
     *
     * @param {number} diskSize
     * @param {number} initialHead
     * @param {Object} algorithmResult
     */
    loadSimulation(diskSize, initialHead, algorithmResult) {
      this.stopPlayback();
      this.diskSize = diskSize;
      this.initialHead = initialHead;
      this.algorithmResult = algorithmResult;
      this.currentStepIndex = 0;

      this.renderTracks();
      this.computeNodeCoordinates();
      this.renderNodes();
      this.updateState(0);
    }

    /**
     * Renders representative concentric cylinder tracks with labels.
     */
    renderTracks() {
      if (!this.tracksLayer) return;
      this.tracksLayer.innerHTML = '';

      const trackCount = 5;
      for (let i = 0; i < trackCount; i++) {
        const cyl = Math.round((i / (trackCount - 1)) * (this.diskSize - 1));
        const r = cylinderToRadius(cyl, this.diskSize);

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', CENTER_X);
        circle.setAttribute('cy', CENTER_Y);
        circle.setAttribute('r', r);
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', 'rgba(255, 255, 255, 0.1)');
        circle.setAttribute('stroke-width', '1');
        circle.setAttribute('stroke-dasharray', i === 0 || i === trackCount - 1 ? 'none' : '3 4');
        this.tracksLayer.appendChild(circle);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', CENTER_X);
        text.setAttribute('y', CENTER_Y + r - 3);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '8.5');
        text.setAttribute('fill', 'rgba(255, 255, 255, 0.4)');
        text.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif');
        text.textContent = `Cyl ${cyl}`;
        this.tracksLayer.appendChild(text);
      }
    }

    /**
     * Computes clean 2D coordinates for all request positions on the platter.
     */
    computeNodeCoordinates() {
      this.markerCoords = [];
      if (!this.algorithmResult) return;

      const queue = this.algorithmResult.servicedRequests || [];
      const count = queue.length;

      // Initial Head position at top of platter (angle -90 deg)
      const headR = cylinderToRadius(this.initialHead, this.diskSize);
      const headAngle = -Math.PI / 2;
      this.initialHeadCoord = {
        cylinder: this.initialHead,
        x: CENTER_X + headR * Math.cos(headAngle),
        y: CENTER_Y + headR * Math.sin(headAngle),
        r: headR,
        angle: headAngle
      };

      // Distribute requests evenly across circular angle space
      const startAngle = -Math.PI / 3;
      const angleSpan = 1.8 * Math.PI;

      for (let i = 0; i < count; i++) {
        const cyl = queue[i];
        const r = cylinderToRadius(cyl, this.diskSize);
        const angle = count === 1 ? 0 : startAngle + (i / count) * angleSpan;

        this.markerCoords.push({
          stepIndex: i + 1,
          cylinder: cyl,
          x: CENTER_X + r * Math.cos(angle),
          y: CENTER_Y + r * Math.sin(angle),
          r: r,
          angle: angle
        });
      }
    }

    /**
     * Renders SVG request nodes and initial head marker.
     */
    renderNodes() {
      if (!this.nodesLayer) return;
      this.nodesLayer.innerHTML = '';

      // Render Initial Head Node
      if (this.initialHeadCoord) {
        const gHead = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        gHead.setAttribute('class', 'platter-node initial-head-node');
        gHead.setAttribute('tabindex', '0');
        gHead.setAttribute('role', 'button');
        gHead.setAttribute('aria-label', `Initial head position at cylinder ${this.initialHead}`);

        gHead.innerHTML = `
          <circle cx="${this.initialHeadCoord.x}" cy="${this.initialHeadCoord.y}" r="11" fill="rgba(255,255,255,0.12)" />
          <polygon points="
            ${this.initialHeadCoord.x},${this.initialHeadCoord.y - 7}
            ${this.initialHeadCoord.x + 6},${this.initialHeadCoord.y}
            ${this.initialHeadCoord.x},${this.initialHeadCoord.y + 7}
            ${this.initialHeadCoord.x - 6},${this.initialHeadCoord.y}"
            fill="#FAF9F5" stroke="#1683F8" stroke-width="1.8" />
          <text x="${this.initialHeadCoord.x}" y="${this.initialHeadCoord.y - 13}" text-anchor="middle" font-size="9" font-weight="600" fill="#FAF9F5">START (${this.initialHead})</text>
        `;

        this.nodesLayer.appendChild(gHead);
      }

      // Render Request Nodes
      this.markerCoords.forEach((node, idx) => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'platter-node request-node');
        g.setAttribute('id', `nodeStep${node.stepIndex}`);
        g.setAttribute('data-step', node.stepIndex);
        g.setAttribute('data-cylinder', node.cylinder);
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'button');
        g.setAttribute('aria-label', `Request ${idx + 1}: Cylinder ${node.cylinder}`);

        g.innerHTML = `
          <!-- Pulsing halo for active target -->
          <circle class="node-halo" cx="${node.x}" cy="${node.y}" r="18" fill="rgba(22,131,248,0.35)" opacity="0" />
          <!-- Ripple burst ring on completion -->
          <circle class="node-ripple" cx="${node.x}" cy="${node.y}" r="8" fill="none" stroke="#1683F8" stroke-width="2" opacity="0" />
          <!-- Main node circle -->
          <circle class="node-circle" cx="${node.x}" cy="${node.y}" r="8.5" fill="#202426" stroke="#B9BDC2" stroke-width="1.8" filter="url(#nodeShadow)" />
          <!-- Inner status pip -->
          <circle class="node-pip" cx="${node.x}" cy="${node.y}" r="3" fill="#B9BDC2" />
          <!-- Label -->
          <text class="node-label" x="${node.x}" y="${node.y + 20}" text-anchor="middle" font-size="9" font-weight="600" fill="#B9BDC2">${node.cylinder}</text>
          <!-- Sequence Badge -->
          <circle class="node-badge-bg" cx="${node.x + 7}" cy="${node.y - 7}" r="5" fill="#202426" stroke="rgba(255,255,255,0.2)" stroke-width="0.8" opacity="0.95" />
          <text class="node-badge-text" x="${node.x + 7}" y="${node.y - 5}" text-anchor="middle" font-size="6.5" font-weight="700" fill="#FAF9F5">${node.stepIndex}</text>
        `;

        g.addEventListener('click', () => this.jumpToStep(node.stepIndex));
        g.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.jumpToStep(node.stepIndex);
          }
        });

        this.nodesLayer.appendChild(g);
      });
    }

    /**
     * Renders seek trajectory paths connecting visited steps up to current step.
     */
    renderPaths(currentStep) {
      if (!this.pathsLayer) return;
      this.pathsLayer.innerHTML = '';
      if (this.markerCoords.length === 0) return;

      const allCoords = [this.initialHeadCoord, ...this.markerCoords];

      for (let i = 1; i <= this.markerCoords.length; i++) {
        const fromCoord = allCoords[i - 1];
        const toCoord = allCoords[i];
        const isCompleted = i <= currentStep;
        const isActive = i === currentStep;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = `M ${fromCoord.x} ${fromCoord.y} Q ${CENTER_X} ${CENTER_Y} ${toCoord.x} ${toCoord.y}`;
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');

        if (isCompleted) {
          path.setAttribute('stroke', isActive ? '#1683F8' : '#73B9AE');
          path.setAttribute('stroke-width', isActive ? '2.5' : '1.8');
          path.setAttribute('opacity', '0.9');
          path.setAttribute('stroke-linecap', 'round');
        } else {
          path.setAttribute('stroke', 'rgba(255,255,255,0.15)');
          path.setAttribute('stroke-width', '1');
          path.setAttribute('stroke-dasharray', '3 4');
          path.setAttribute('opacity', '0.35');
        }

        this.pathsLayer.appendChild(path);
      }
    }

    /**
     * Updates visual state to a specific step index.
     * @param {number} stepIndex - 0 for initial head, 1..N for completed steps.
     */
    updateState(stepIndex) {
      this.currentStepIndex = stepIndex;
      const totalSteps = this.markerCoords.length;

      // Determine current cylinder position
      let currentCylinder = this.initialHead;
      if (stepIndex > 0 && stepIndex <= totalSteps) {
        currentCylinder = this.markerCoords[stepIndex - 1].cylinder;
      }

      // 1. Update Actuator Head Position along radial seek axis
      const targetR = cylinderToRadius(currentCylinder, this.diskSize);
      if (this.headAssembly) {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!prefersReducedMotion) {
          this.headAssembly.style.transition = `transform ${0.45 / this.playbackSpeed}s cubic-bezier(0.2, 0.8, 0.2, 1)`;
          if (this.actuatorArmBeam) {
            this.actuatorArmBeam.style.transition = `all ${0.45 / this.playbackSpeed}s cubic-bezier(0.2, 0.8, 0.2, 1)`;
          }
        } else {
          this.headAssembly.style.transition = 'none';
          if (this.actuatorArmBeam) this.actuatorArmBeam.style.transition = 'none';
        }
        this.headAssembly.setAttribute('transform', `translate(${CENTER_X}, ${CENTER_Y - targetR})`);
        if (this.actuatorArmBeam) {
          this.actuatorArmBeam.setAttribute('x2', CENTER_X);
          this.actuatorArmBeam.setAttribute('y2', CENTER_Y - targetR);
        }
        if (this.headLiveTagText) {
          this.headLiveTagText.textContent = `CYL ${currentCylinder}`;
        }
      }

      // 2. Active Track Highlight Ring
      if (this.activeTrackHighlight) {
        this.activeTrackHighlight.setAttribute('r', targetR);
        this.activeTrackHighlight.setAttribute('opacity', stepIndex > 0 ? '0.7' : '0.2');
      }

      // 3. Update Node Visual States & Completion Ripples
      this.markerCoords.forEach(node => {
        const el = this.container.querySelector(`#nodeStep${node.stepIndex}`);
        if (!el) return;

        const halo = el.querySelector('.node-halo');
        const ripple = el.querySelector('.node-ripple');
        const circle = el.querySelector('.node-circle');
        const pip = el.querySelector('.node-pip');
        const label = el.querySelector('.node-label');

        if (node.stepIndex < stepIndex) {
          // Past completed: Soft Teal (#73B9AE)
          if (halo) halo.setAttribute('opacity', '0');
          if (circle) {
            circle.setAttribute('fill', '#73B9AE');
            circle.setAttribute('stroke', '#FAF9F5');
          }
          if (pip) pip.setAttribute('fill', '#202426');
          if (label) {
            label.setAttribute('fill', '#FAF9F5');
            label.setAttribute('font-weight', '600');
          }
        } else if (node.stepIndex === stepIndex) {
          // Just serviced / Active step: Restrained Electric Blue (#1683F8)
          if (halo) halo.setAttribute('opacity', '0.9');
          if (circle) {
            circle.setAttribute('fill', '#1683F8');
            circle.setAttribute('stroke', '#ffffff');
          }
          if (pip) pip.setAttribute('fill', '#ffffff');
          if (label) {
            label.setAttribute('fill', '#4ea4ff');
            label.setAttribute('font-weight', '700');
          }
          // Trigger brief ripple animation
          if (ripple) {
            ripple.classList.remove('anim-ripple');
            void ripple.offsetWidth; // trigger reflow
            ripple.classList.add('anim-ripple');
          }
        } else if (node.stepIndex === stepIndex + 1) {
          // Next pending target: Muted Slate Blue (#8DA9C2) outline
          if (halo) halo.setAttribute('opacity', '0.45');
          if (circle) {
            circle.setAttribute('fill', '#202426');
            circle.setAttribute('stroke', '#8DA9C2');
          }
          if (pip) pip.setAttribute('fill', '#8DA9C2');
          if (label) {
            label.setAttribute('fill', '#FAF9F5');
            label.setAttribute('font-weight', '600');
          }
        } else {
          // Future pending: Warm Metallic Silver (#B9BDC2) outline
          if (halo) halo.setAttribute('opacity', '0');
          if (circle) {
            circle.setAttribute('fill', '#191c1e');
            circle.setAttribute('stroke', 'rgba(185, 189, 194, 0.45)');
          }
          if (pip) pip.setAttribute('fill', '#848c92');
          if (label) {
            label.setAttribute('fill', '#848c92');
            label.setAttribute('font-weight', '500');
          }
        }
      });

      // 4. Update Seek Paths
      this.renderPaths(stepIndex);

      // 5. Update Badge Displays
      if (this.currentHeadDisplay) {
        this.currentHeadDisplay.textContent = `Cylinder ${currentCylinder}`;
      }
      if (this.currentStepDisplay) {
        this.currentStepDisplay.textContent = `${stepIndex} / ${totalSteps}`;
      }

      // External callback for outside UI sync (linear track & step inspector)
      if (typeof this.options.onStepChange === 'function') {
        const stepData = stepIndex > 0 && this.algorithmResult && this.algorithmResult.steps
          ? this.algorithmResult.steps[stepIndex - 1]
          : null;
        this.options.onStepChange(stepIndex, totalSteps, currentCylinder, stepData);
      }
    }

    /**
     * Stepper: advances to next step.
     */
    nextStep() {
      const totalSteps = this.markerCoords.length;
      if (this.currentStepIndex < totalSteps) {
        this.updateState(this.currentStepIndex + 1);
        return true;
      }
      return false;
    }

    /**
     * Stepper: goes back to previous step.
     */
    prevStep() {
      if (this.currentStepIndex > 0) {
        this.updateState(this.currentStepIndex - 1);
        return true;
      }
      return false;
    }

    /**
     * Jumps directly to a specific step.
     */
    jumpToStep(stepIndex) {
      const totalSteps = this.markerCoords.length;
      const clamped = Math.max(0, Math.min(totalSteps, stepIndex));
      this.updateState(clamped);
    }

    /**
     * Restarts animation from step 0.
     */
    restart() {
      this.stopPlayback();
      this.updateState(0);
    }

    /**
     * Starts continuous playback.
     */
    play() {
      if (this.isPlaying) return;
      const totalSteps = this.markerCoords.length;
      if (this.currentStepIndex >= totalSteps) {
        this.updateState(0);
      }
      this.isPlaying = true;
      this.runPlaybackLoop();
    }

    /**
     * Pauses playback.
     */
    pause() {
      this.stopPlayback();
    }

    /**
     * Stops and clears animation timer safely.
     */
    stopPlayback() {
      this.isPlaying = false;
      if (this.animationTimer) {
        clearTimeout(this.animationTimer);
        this.animationTimer = null;
      }
    }

    /**
     * Toggles continuous platter spinning.
     */
    togglePlatterSpin() {
      this.isPlatterSpinning = !this.isPlatterSpinning;
      this.setPlatterSpin(this.isPlatterSpinning);
      return this.isPlatterSpinning;
    }

    /**
     * Sets platter spinning on or off.
     */
    setPlatterSpin(enabled) {
      this.isPlatterSpinning = Boolean(enabled);
      if (this.spinningDiscGroup) {
        if (this.isPlatterSpinning) {
          this.spinningDiscGroup.classList.remove('spin-paused');
        } else {
          this.spinningDiscGroup.classList.add('spin-paused');
        }
      }
    }

    /**
     * Sets playback speed multiplier.
     * @param {number} speed - 0.5, 1.0, 2.0
     */
    setSpeed(speed) {
      this.playbackSpeed = speed;
      if (this.spinningDiscGroup) {
        this.spinningDiscGroup.classList.remove('spin-speed-slow', 'spin-speed-normal', 'spin-speed-fast');
        if (speed === 0.5) this.spinningDiscGroup.classList.add('spin-speed-slow');
        else if (speed === 2.0) this.spinningDiscGroup.classList.add('spin-speed-fast');
        else this.spinningDiscGroup.classList.add('spin-speed-normal');
      }
    }

    /**
     * Internal animation loop with speed factoring.
     */
    runPlaybackLoop() {
      if (!this.isPlaying) return;

      const totalSteps = this.markerCoords.length;
      if (this.currentStepIndex < totalSteps) {
        this.nextStep();

        const delay = Math.round(1100 / this.playbackSpeed);
        this.animationTimer = setTimeout(() => {
          this.runPlaybackLoop();
        }, delay);
      } else {
        this.stopPlayback();
        if (typeof this.options.onPlaybackEnd === 'function') {
          this.options.onPlaybackEnd();
        }
      }
    }
  }

  return {
    PlatterVisualizer,
    cylinderToRadius
  };
});
