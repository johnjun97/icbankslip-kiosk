import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { execFile } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const sumatraPath = path.join(
  __dirname,
  "tools",
  "SumatraPDF.exe"
)
if (!fs.existsSync(sumatraPath)) {
  throw new Error(`SumatraPDF not found: ${sumatraPath}`)
}

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

  let pdfPath

  try {

    console.log("Received print request")

    pdfPath = path.join(
      app.getPath("temp"),
      `print-${Date.now()}.pdf`
    )

    const pdfBuffer = Buffer.from(
      pdfData,
      "base64"
    )

    await fs.promises.writeFile(
      pdfPath,
      pdfBuffer
    )

    console.log("Starting print")

    await new Promise((resolve, reject) => {

      execFile(
        sumatraPath,
        [
          "-print-to-default",
          pdfPath
        ],
        (error, stdout, stderr) => {

          if (error) {
            reject(error)
            return
          }

          resolve()

        }
      )

    })

    console.log("Printed successfully")

  } catch (err) {

    console.error("Print process failed:", err)

  } finally {

    if (pdfPath) {

      try {

        await fs.promises.unlink(pdfPath)
        console.log("Temp PDF deleted")

      } catch (err) {

        console.error("Delete temp PDF failed:", err)

      }

    }

  }

})


app.whenReady().then(() => {
  createWindow()
})