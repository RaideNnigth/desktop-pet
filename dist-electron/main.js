import { app, BrowserWindow, globalShortcut, shell } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
app.commandLine.appendSwitch("enable-features", "UseOzonePlatform");
app.commandLine.appendSwitch("ozone-platform", "x11");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win = null;
let ignoringMouse = false;
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    width: 420,
    height: 420,
    transparent: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: "#0040ffff",
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      sandbox: false,
      webgl: true
    }
  });
  win.setIgnoreMouseEvents(false, { forward: true });
  if (process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(path.join(__dirname, "../index.html"));
  }
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  var _a, _b;
  const gpu = (_b = (_a = app).getGPUFeatureStatus) == null ? void 0 : _b.call(_a);
  console.log("GPU feature status:", gpu);
  createWindow();
  globalShortcut.register("CommandOrControl+Shift+C", () => {
    ignoringMouse = !ignoringMouse;
    win == null ? void 0 : win.setIgnoreMouseEvents(ignoringMouse, { forward: true });
    console.log("Click-through:", ignoringMouse);
  });
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
