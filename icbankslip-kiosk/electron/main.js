import { app, BrowserWindow } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


function createWindow() {

  const mainWindow = new BrowserWindow({

    width: 1200,
    height: 800,

    fullscreen: true,

    autoHideMenuBar: true,

    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }

  })

  mainWindow.loadFile(
    path.join(__dirname, '../dist/index.html')
  ).catch((err) => {
    console.error(err)
  })

}


app.whenReady().then(() => {
  createWindow()
})