import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { execFile } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const sumatraPath = app.isPackaged
  ? path.join(process.resourcesPath, "tools", "SumatraPDF.exe")
  : path.join(__dirname, "tools", "SumatraPDF.exe");

console.log("APP PATH:", app.getAppPath())
console.log("__dirname:", __dirname)
console.log("SUMATRA PATH:", sumatraPath)
console.log("SUMATRA EXISTS:", fs.existsSync(sumatraPath))

if (!fs.existsSync(sumatraPath)) {
  throw new Error(`SumatraPDF not found: ${sumatraPath}`)
}

function createWindow() {

  console.log(
    "ICON PATH:",
    path.join(__dirname, "assets", "icon.ico")
  )

  console.log(
    "ICON EXISTS:",
    fs.existsSync(
      path.join(__dirname, "assets", "icon.ico")
    )
  )

  const mainWindow = new BrowserWindow({

    width: 1200,
    height: 800,

    fullscreen: true,

    autoHideMenuBar: true,

    icon: path.join(__dirname, "assets", "icon.ico"),

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


ipcMain.handle("print-pdf", async (event, pdfData) => {

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

    console.time("PRINT_TIME")
    console.log("Starting print")

    await new Promise((resolve, reject) => {

      execFile(
        sumatraPath,
        [
          "-silent",
          "-print-to-default",
          pdfPath
        ],
        (error, stdout, stderr) => {

          console.log("Sumatra callback received")

          if (error) {

            console.error("Sumatra error:", stderr)
            reject(error)
            return

          }

          resolve()

        }
      )

    })

    console.timeEnd("PRINT_TIME")
    console.log("Printed successfully")

    return true

  } catch (err) {

    console.error("Print process failed:", err)

    return false

  } finally {

    if (pdfPath) {

      setTimeout(async () => {

        try {

          await fs.promises.unlink(pdfPath)
          console.log("Temp PDF deleted")

        } catch (err) {

          console.error("Delete temp PDF failed:", err)

        }

      }, 10000)

    }

  }

})


app.whenReady().then(() => {
  createWindow()
})