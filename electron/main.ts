import path from "node:path"
import { app, BrowserWindow } from "electron"

const devServerUrl = process.env.VITE_DEV_SERVER_URL
const rendererDist = process.env.ELECTRON_RENDERER_DIST
  ? path.join(process.cwd(), process.env.ELECTRON_RENDERER_DIST)
  : path.join(process.cwd(), "dist")

const preloadPath = path.join(__dirname, "preload.js")

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

  if (devServerUrl) {
    window.loadURL(devServerUrl)
  } else {
    window.loadFile(path.join(rendererDist, "index.html"))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})
