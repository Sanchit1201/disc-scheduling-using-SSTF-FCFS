import http.server
import socketserver
import subprocess
import threading
import time
import os
import sys

PORT = 8127
Handler = http.server.SimpleHTTPRequestHandler
httpd = socketserver.TCPServer(('', PORT), Handler)

thread = threading.Thread(target=httpd.serve_forever)
thread.daemon = True
thread.start()

time.sleep(1)

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

# Test widths: 320, 375, 390, 768, 1440
test_widths = [320, 375, 390, 768, 1440]

for w in test_widths:
    js_check = f'''
    (() => {{
      const docWidth = document.documentElement.scrollWidth;
      const winWidth = window.innerWidth;
      const elementsWithOverflow = [];
      document.querySelectorAll('*').forEach(el => {{
        const rect = el.getBoundingClientRect();
        if (rect.right > winWidth + 1) {{
          elementsWithOverflow.push({{
            tag: el.tagName,
            id: el.id,
            className: el.className,
            right: rect.right,
            width: rect.width
          }});
        }}
      }});
      return JSON.stringify({{
        docWidth: docWidth,
        winWidth: winWidth,
        hasOverflow: docWidth > winWidth,
        overflowingElements: elementsWithOverflow.slice(0, 5)
      }});
    }})()
    '''
    
    # We can run chrome with --dump-dom or print evaluation
    # Alternatively evaluate via CDP or write a node script using puppeteer/playwright or simple evaluation
    pass

httpd.shutdown()
