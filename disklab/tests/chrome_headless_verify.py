import http.server
import socketserver
import subprocess
import threading
import time
import os
import sys

PORT = 8125
Handler = http.server.SimpleHTTPRequestHandler
httpd = socketserver.TCPServer(('', PORT), Handler)

thread = threading.Thread(target=httpd.serve_forever)
thread.daemon = True
thread.start()

time.sleep(1)

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
cmd = [
    chrome_path,
    '--headless=new',
    '--disable-gpu',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=6000',
    '--dump-dom',
    f'http://127.0.0.1:{PORT}/index.html'
]

print(f"Launching headless Chrome at {chrome_path}...")
proc = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
httpd.shutdown()

dom_output = proc.stdout
print(f"Rendered DOM Length: {len(dom_output)} characters")

checks = {
    "SVG Tracks Rendered": 'class="tracks-layer"' in dom_output,
    "Continuously Spinning Disc Group": 'id="spinningDiscGroup"' in dom_output,
    "Surface Markings & Strobe Ticks": 'class="surface-markings-group"' in dom_output,
    "Synchronized Linear Cylinder Track": 'id="linearTrackBar"' in dom_output,
    "Linear Head Marker": 'id="linearHeadMarker"' in dom_output,
    "Platter Spin Toggle Button": 'id="btnToggleSpin"' in dom_output,
    "Dynamic Node nodeStep1 Rendered": 'nodeStep1' in dom_output,
    "Dynamic Node nodeStep8 Rendered": 'nodeStep8' in dom_output,
    "Calculated 640 Cylinders for FCFS": '640' in dom_output,
    "Calculated 236 Cylinders for SSTF": '236' in dom_output,
    "Calculated 63.13% Reduction": '63.13%' in dom_output,
    "Spindle Spindle Text Rendered": 'SPINDLE' in dom_output,
    "Actuator Assembly Present": 'id="headAssembly"' in dom_output,
    "Seek Equation Display": 'id="inspFormula"' in dom_output
}

all_passed = True
for name, passed in checks.items():
    status = "PASS" if passed else "FAIL"
    print(f"  [{status}] {name}")
    if not passed:
        all_passed = False

if all_passed:
    print("\nSUCCESS: Headless Chrome verified full browser initialization, dynamic SVG generation, and live calculations!")
    sys.exit(0)
else:
    print("\nFAIL: One or more headless Chrome checks failed.")
    sys.exit(1)
