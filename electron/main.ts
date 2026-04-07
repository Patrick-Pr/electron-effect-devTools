import path from "node:path"
import { fileURLToPath } from "node:url"
import { app, BrowserWindow, ipcMain } from "electron"
import type { BackendCommand } from "../src/lib/contracts/backend.js"
import { DevtoolsBackend } from "./backend/devtools-backend.js"

const devServerUrl = process.env.VITE_DEV_SERVER_URL
const rendererDist = process.env.ELECTRON_RENDERER_DIST
  ? path.join(process.cwd(), process.env.ELECTRON_RENDERER_DIST)
  : path.join(process.cwd(), "dist")

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const preloadPath = path.join(currentDir, "preload.cjs")
const backend = new DevtoolsBackend()

function registerWindowSubscription(window: BrowserWindow) {
  const unsubscribe = backend.subscribe((snapshot) => {
    if (!window.isDestroyed()) {
      window.webContents.send("backend:state", { type: "backend:state", snapshot })
    }
  })

  window.on("closed", unsubscribe)
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1560,
    height: 980,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: "#11161f",
    title: "Effect DevTools",
    trafficLightPosition: { x: 18, y: 18 },
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  registerWindowSubscription(window)

  if (devServerUrl) {
    window.loadURL(devServerUrl)
  } else {
    window.loadFile(path.join(rendererDist, "index.html"))
  }
}

ipcMain.handle("backend:get-snapshot", () => backend.getSnapshot())
ipcMain.handle("backend:dispatch", (_event, command: BackendCommand) => backend.dispatch(command))

app.whenReady().then(() => {
  createWindow()
  void backend.dispatch({ type: "server:start" })

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on("before-quit", () => {
  void backend.dispose()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})
