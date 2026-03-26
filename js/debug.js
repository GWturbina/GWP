// Dev/production error handler — runs early
(function() {
  var isDevelopment = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname.includes('192.168.') ||
                      window.location.protocol === 'file:';

  if (isDevelopment) {
    // Dev: create debug panel
    window.addEventListener('DOMContentLoaded', function() {
      var debug = document.createElement('div');
      debug.id = 'debug';
      debug.style.cssText = 'position:fixed;top:0;left:0;background:rgba(255,0,0,0.8);color:white;padding:8px 12px;z-index:9999;font-size:11px;border-radius:0 0 8px 0;max-width:90%;word-wrap:break-word;';
      debug.textContent = 'Loading...';
      document.body.insertBefore(debug, document.body.firstChild);

      setTimeout(function() {
        if (debug) {
          debug.textContent = '✅ No errors - Dev mode';
          debug.style.background = 'rgba(0,128,0,0.8)';
        }
        setTimeout(function() { 
          if (debug) debug.style.display = 'none'; 
        }, 1500);
      }, 2000);
    });

    window.onerror = function(msg, url, line, col, error) {
      var debug = document.getElementById('debug');
      if (debug) {
        debug.textContent = '❌ Error: ' + msg + ' | Line: ' + line + ' | File: ' + (url ? url.split('/').pop() : 'unknown');
        debug.style.background = 'rgba(255,0,0,0.9)';
      }
      console.error('Global error:', msg, url, line, col, error);
      return true;
    };
  } else {
    // Production
    window.onerror = function(msg, url, line, col, error) {
      console.error('Error:', msg, 'at', url, 'line', line);
      return false;
    };
  }
})();
