const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld(
    'electronAPI',
    {
        printPDF: (pdfData) => {
            ipcRenderer.send(
                "print-pdf",
                pdfData
            )
        }
    }
)