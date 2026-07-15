import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { pathToFileURL } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


function createWindow() {

  const mainWindow = new BrowserWindow({

    width: 1200,
    height: 800,

    fullscreen: true,

    autoHideMenuBar: true,

    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
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


ipcMain.on("print-pdf", async (event, pdfData) => {

  console.log("Received print request")

  const win = new BrowserWindow({
    show: false,
    width: 800,
    height: 600
  })

  const pdfPath = path.join(
    app.getPath("temp"),
    "print-document.pdf"
  )

  const pdfBuffer = Buffer.from(
    pdfData,
    "base64"
  )

  await fs.promises.writeFile(
    pdfPath,
    pdfBuffer
  )

  win.webContents.on("did-finish-load", () => {
    console.log("PDF page ready")
  })

  await win.loadURL(
    pathToFileURL(pdfPath).href
  )

  console.log("PDF loaded")

  const printers = await win.webContents.getPrintersAsync()

  console.log("Printers:", printers)

  setTimeout(() => {

    console.log("Starting print")



    console.log("About to call print")
    win.webContents.print({
      silent: true,
      printBackground: true,
      deviceName: ""
    }, (success, failureReason) => {

      console.log(
        "Print result:",
        success,
        failureReason
      )

      win.close()

    })

  }, 5000)

})


app.whenReady().then(() => {
  createWindow()
})