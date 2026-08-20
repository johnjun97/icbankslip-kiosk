export const printPDF = async (pdf, printMode) => {

  if (!window.electronAPI) {
    return false
  }

  if (printMode === "TEST") {

    console.log("TEST MODE - open PDF")

    const blob = new Blob(
      [pdf],
      { type: "application/pdf" }
    )

    const url = URL.createObjectURL(blob)

    window.open(url, "_blank")

    return true
  }


  if (printMode === "SILENT") {

    console.log("REAL SILENT PRINT")

    let binary = ""

    const bytes = new Uint8Array(pdf)
    const chunkSize = 0x8000

    for (
      let i = 0;
      i < bytes.length;
      i += chunkSize
    ) {

      binary += String.fromCharCode(
        ...bytes.subarray(
          i,
          i + chunkSize
        )
      )

    }

    const base64 = btoa(binary)

    return await window.electronAPI.printPDF(base64)
  }


  console.warn("PRINT_MODE not set")

  return false
}