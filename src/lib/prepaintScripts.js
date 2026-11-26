// Inline scripts that must run before first paint (theme, perf tier, boot-screen gate). Shared by the Next
// root layout and the Vite app's index.html so there is one copy.
export const PREPAINT_THEME_PERF = `
              (function() {
                try {
                  var mode = localStorage.getItem('themeMode');
                  var legacy = localStorage.getItem('themeVariant') || localStorage.getItem('theme');
                  if (mode !== 'auto' && mode !== 'dark' && mode !== 'light') {
                    mode = (legacy === 'dark' || legacy === 'light') ? legacy : 'auto';
                  }

                  var resolved = mode === 'auto'
                    ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                    : mode;

                  document.documentElement.setAttribute('data-theme', resolved);
                  document.documentElement.style.backgroundColor = resolved === 'dark' ? '#0d1117' : '#ffffff';
                } catch (e) {
                  document.documentElement.setAttribute('data-theme', 'dark');
                  document.documentElement.style.backgroundColor = '#0d1117';
                }

                // Pre-paint performance tier. Set before first paint so CSS can
                // drop expensive effects (backdrop-filter, infinite animations,
                // blur reveals) on low-end / data-saver / reduced-motion devices
                // with no FOUC or layout shift. Read by globals.css ([data-perf])
                // and gsapScroll.js for animation level-of-detail.
                try {
                  var n = navigator, mm = window.matchMedia;
                  var reduce = mm && mm('(prefers-reduced-motion: reduce)').matches;
                  var conn = n.connection || {};
                  var saveData = conn.saveData === true;
                  var slowNet = /(^|-)2g$|(^|-)3g$|slow-2g/.test(conn.effectiveType || '');
                  var cores = n.hardwareConcurrency || 8;
                  var mem = n.deviceMemory || 8; // undefined on iOS/Safari -> treated as capable
                  var coarse = mm && mm('(pointer: coarse)').matches;
                  var narrow = window.innerWidth < 1024;
                  // Weak hardware only counts as "lite" on small / touch screens, so
                  // capable laptops with few cores still get the full experience.
                  var weakHw = (cores <= 4 || mem <= 4) && (coarse || narrow);
                  var lite = !!(reduce || saveData || slowNet || weakHw);
                  document.documentElement.setAttribute('data-perf', lite ? 'lite' : 'full');
                } catch (e) {
                  document.documentElement.setAttribute('data-perf', 'full');
                }
              })();
            `;

export const PREPAINT_BOOT_GATE = `
              (function() {
                try {
                  var path = location.pathname || '';
                  // The boot screen and its loading bar belong to the home page
                  // only: every other route loads straight into its content.
                  var skipRoute = path !== '/';
                  // Skip boot screen during e2e tests. Playwright/WebDriver
                  // automation sets navigator.webdriver = true in both headed
                  // and headless modes (the UA does NOT contain 'Playwright').
                  var testEnv = navigator.webdriver === true;
                  // Cross-tab presence: another instance is "alive" if a heartbeat
                  // was written very recently (covers reload + new tab / duplicate
                  // while a foreground tab is open). Backgrounded tabs are caught
                  // post-mount via BroadcastChannel.
                  var last = parseInt(localStorage.getItem('aiyu:lastSeen') || '0', 10) || 0;
                  var alive = (Date.now() - last) < 3000;
                  if (skipRoute || alive || testEnv) {
                    document.documentElement.setAttribute('data-booted', '1');
                    // Hide before first paint without waiting for the CSS bundle.
                    var s = document.createElement('style');
                    s.textContent = '#boot-screen{display:none!important}';
                    document.head.appendChild(s);
                  }
                  // Mark our presence immediately so a tab opening right now sees us.
                  localStorage.setItem('aiyu:lastSeen', String(Date.now()));
                } catch (e) {}

                // Swarm build (opt-in, see swarmStore.js): keep the page blank
                // from the first paint so it does not flash before the cursors
                // start. The timeout restores it if the animation never mounts.
                try {
                  if (
                    localStorage.getItem('aiyu:swarmBuild') === '1' &&
                    !/^\\/(?:admin|desktop|games)(?:\\/|$)/.test(location.pathname) &&
                    window.self === window.top
                  ) {
                    var html = document.documentElement;
                    html.setAttribute('data-swarm-boot', '1');
                    var hide = document.createElement('style');
                    hide.textContent = 'html[data-swarm-boot] main,html[data-swarm-boot] footer{visibility:hidden!important}';
                    document.head.appendChild(hide);
                    setTimeout(function() { html.removeAttribute('data-swarm-boot'); }, 8000);
                  }
                } catch (e) {}
              })();
            `;
