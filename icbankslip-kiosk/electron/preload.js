const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld(
    'electronAPI',
    {
printPDF: (pdfData) => {
    return ipcRenderer.invoke(
        "print-pdf",
        pdfData
    )
}
    }
)