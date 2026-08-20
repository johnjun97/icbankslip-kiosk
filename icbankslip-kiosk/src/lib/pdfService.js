import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'

export const embedImage = async (pdfDoc, blob) => {

  const bytes = await blob.arrayBuffer()

  try {
    return await pdfDoc.embedPng(bytes)
  } catch (pngError) {
    return await pdfDoc.embedJpg(bytes)
  }
}


export const createPDF = async (files) => {

  const pdfDoc = await PDFDocument.create()

  const A4_WIDTH = 595
  const A4_HEIGHT = 842

  /*
    PAGE 1
    IC Front + IC Back
  */

  let page1 = null

  if (files.icFrontBlob || files.icBackBlob) {

    page1 = pdfDoc.addPage([
      A4_WIDTH,
      A4_HEIGHT
    ])

  }

  // IC Front
  if (files.icFrontBlob) {

    const icFrontImage = await embedImage(
      pdfDoc,
      files.icFrontBlob
    )

    const frontWidth = 400
    const frontHeight =
      (icFrontImage.height / icFrontImage.width) * frontWidth

    page1?.drawImage(icFrontImage, {
      x: (A4_WIDTH - frontWidth) / 2,
      y: (A4_HEIGHT / 2) + 100,
      width: frontWidth,
      height: frontHeight
    })

  }

  // IC Back
  if (files.icBackBlob) {

    const icBackImage = await embedImage(
      pdfDoc,
      files.icBackBlob
    )

    const backWidth = 400
    const backHeight =
      (icBackImage.height / icBackImage.width) * backWidth

    page1?.drawImage(icBackImage, {
      x: (A4_WIDTH - backWidth) / 2,
      y: 100,
      width: backWidth,
      height: backHeight
    })

  }

  // Watermark
  const boldFont = await pdfDoc.embedFont(
    StandardFonts.HelveticaBold
  )

  if (files.icFrontBlob) {

    page1?.drawText("FOR NIRVANA ASIA", {
      x: 395,
      y: 815,
      size: 23,
      font: boldFont,
      color: rgb(0.3, 0.3, 0.3),
      opacity: 0.3,
      rotate: degrees(-45)
    })

    page1?.drawText("REFERENCE ONLY", {
      x: 385,
      y: 795,
      size: 23,
      font: boldFont,
      color: rgb(0.3, 0.3, 0.3),
      opacity: 0.3,
      rotate: degrees(-45)
    })

  }

  if (files.icBackBlob) {

    page1?.drawText("FOR NIRVANA ASIA", {
      x: 395,
      y: 390,
      size: 23,
      font: boldFont,
      color: rgb(0.3, 0.3, 0.3),
      opacity: 0.3,
      rotate: degrees(-45)
    })

    page1?.drawText("REFERENCE ONLY", {
      x: 385,
      y: 370,
      size: 23,
      font: boldFont,
      color: rgb(0.3, 0.3, 0.3),
      opacity: 0.3,
      rotate: degrees(-45)
    })

  }


  /*
    PAGE 2
    Bank Slip PDF
  */

  if (files.bankSlipBlob) {

    const type = files.bankSlipBlob.type
    const filename =
      files.bankSlipBlob.name?.toLowerCase() || ""

    console.log(
      "BANK DECISION:",
      {
        type,
        filename
      }
    )

    if (filename.endsWith(".pdf")) {

      const bankPdfBytes =
        await files.bankSlipBlob.arrayBuffer()

      const bankPdf =
        await PDFDocument.load(bankPdfBytes)

      const copiedPages =
        await pdfDoc.copyPages(
          bankPdf,
          bankPdf.getPageIndices()
        )

      copiedPages.forEach((page) => {
        pdfDoc.addPage(page)
      })

    } else if (
      type.startsWith("image/") ||
      filename.endsWith(".jpg") ||
      filename.endsWith(".jpeg") ||
      filename.endsWith(".png")
    ) {

      const bankImage =
        await embedImage(
          pdfDoc,
          files.bankSlipBlob
        )

      const page =
        pdfDoc.addPage([
          A4_WIDTH,
          A4_HEIGHT
        ])

      const width = 400

      const height =
        (bankImage.height / bankImage.width) * width

      page.drawImage(bankImage, {
        x: (A4_WIDTH - width) / 2,
        y: (A4_HEIGHT - height) / 2,
        width,
        height
      })

    }

  }


  // Only watermark bank slip pages
  const pages = pdfDoc.getPages()

  const bankSlipStartPage =
    files.icFrontBlob || files.icBackBlob
      ? 1
      : 0

  for (
    let i = bankSlipStartPage;
    i < pages.length;
    i++
  ) {

    const page = pages[i]

    const { width, height } =
      page.getSize()

    const text =
      "FOR NIRVANA ASIA\nREFERENCE ONLY"

    const fontSize = 60

    page.drawText(text, {
      x: width / 2 - 200,
      y: height / 2 - 200,
      size: fontSize,
      font: boldFont,
      color: rgb(0.3, 0.3, 0.3),
      opacity: 0.3,
      lineHeight: 80,
      rotate: degrees(45)
    })

  }

  const finalPdf =
    await pdfDoc.save()

  return finalPdf
}


export function uint8ToBase64(bytes) {

  let binary = ""

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

  return btoa(binary)
}