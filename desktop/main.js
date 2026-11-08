// LSP Games desktop app: opens lspgames.onrender.com in its own window, full screen ready.
const { app, BrowserWindow, shell, Menu } = require('electron');
const SITE = process.env.LSP_SITE || 'https://lspgames.onrender.com/';
// Google and others refuse to sign in inside "Electron", so look like a normal Chrome browser.
const UA = () => app.userAgentFallback.replace(/\s?Electron\/[\d.]+/, '').replace(/\s?lsp-games\/[\d.]+/i, '');

function open() {
  const win = new BrowserWindow({ width: 1280, height: 800, minWidth: 360, minHeight: 500, backgroundColor: '#16203d', title: 'LSP Games', autoHideMenuBar: true, webPreferences: { contextIsolation: true, sandbox: true } });
  win.webContents.setUserAgent(UA());
  win.loadURL(SITE + '?source=desktop');
  // keep the game inside the app; sign-in and payment pages stay inside too; other sites open in the browser
  const ours = (u) => /^https:\/\/(lspgames\.onrender\.com|accounts\.google\.com|github\.com|login\.yahoo\.com|api\.login\.yahoo\.com|[a-z0-9-]+\.onrender\.com)\//i.test(u);
  win.webContents.setWindowOpenHandler(({ url }) => { if (ours(url)) return { action: 'allow' }; shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!ours(url)) { e.preventDefault(); shell.openExternal(url); } });
  win.webContents.on('before-input-event', (e, i) => { if (i.type === 'keyDown' && i.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); } });
  win.webContents.on('did-fail-load', () => win.loadURL('data:text/html,' + encodeURIComponent('<body style="font:18px system-ui;background:#16203d;color:#fff;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><h1>LSP Games</h1><p>No internet connection. Check your connection and try again.</p><button onclick="location.href=\'' + SITE + '\'" style="font-size:18px;padding:10px 20px;border-radius:12px;border:0">Try again</button></div></body>')));
}
Menu.setApplicationMenu(null);
app.whenReady().then(() => { app.userAgentFallback = UA(); open(); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) open(); }); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
