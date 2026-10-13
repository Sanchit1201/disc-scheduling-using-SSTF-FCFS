import http.server
import socketserver
import subprocess
import threading
import time
import os
import sys

PORT = 8126
Handler = http.server.SimpleHTTPRequestHandler
httpd = socketserver.TCPServer(('', PORT), Handler)

thread = threading.Thread(target=httpd.serve_forever)
thread.daemon = True
thread.start()

time.sleep(1)

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
workspace_dir = r'C:\Users\ashut\.gemini\antigravity\scratch\disklab'
artifact_dir = r'C:\Users\ashut\.gemini\antigravity\brain\6f000d89-e689-4215-a4b7-595524b65cd8'

# 1. Desktop Screenshot (1440x900)
desktop_screen_path = os.path.join(workspace_dir, 'disklab_desktop_preview.png')
desktop_artifact_path = os.path.join(artifact_dir, 'disklab_desktop_preview.png')

cmd_desktop = [
    chrome_path,
    '--headless=new',
    '--disable-gpu',
    '--window-size=1440,900',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=3000',
    f'--screenshot={desktop_screen_path}',
    f'http://127.0.0.1:{PORT}/index.html'
]
print("Capturing desktop screenshot...")
subprocess.run(cmd_desktop, capture_output=True)

# Copy to artifacts
if os.path.exists(desktop_screen_path):
    with open(desktop_screen_path, 'rb') as f:
        data = f.read()
    with open(desktop_artifact_path, 'wb') as f:
        f.write(data)
    print(f"Saved desktop screenshot: {len(data)} bytes")

# 2. Mobile Screenshot (375x812)
mobile_screen_path = os.path.join(workspace_dir, 'disklab_mobile_preview.png')
mobile_artifact_path = os.path.join(artifact_dir, 'disklab_mobile_preview.png')

cmd_mobile = [
    chrome_path,
    '--headless=new',
    '--disable-gpu',
    '--window-size=375,812',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=3000',
    f'--screenshot={mobile_screen_path}',
    f'http://127.0.0.1:{PORT}/index.html'
]
print("Capturing mobile screenshot...")
subprocess.run(cmd_mobile, capture_output=True)

# Copy to artifacts
if os.path.exists(mobile_screen_path):
    with open(mobile_screen_path, 'rb') as f:
        data = f.read()
    with open(mobile_artifact_path, 'wb') as f:
        f.write(data)
    print(f"Saved mobile screenshot: {len(data)} bytes")

httpd.shutdown()
print("Screenshots captured successfully.")
