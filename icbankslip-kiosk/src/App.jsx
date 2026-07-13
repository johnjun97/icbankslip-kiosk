import { useState } from 'react'
import './App.css'
import { QRCodeCanvas } from 'qrcode.react'
import logo from './assets/logo.png'
import { supabase } from './lib/supabase'
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'

function App() {

  const [reference, setReference] = useState('')

  const [result, setResult] = useState(null)
  const handleSearch = async () => {

    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('qrcode', reference)
      .maybeSingle()

    if (error) {
      console.error("Search error:", error)
      return
    }

    if (!data) {
      console.log("No document found")
      setResult(null)
      return
    }

    console.log("Found:", data)

    setResult(data)
  }

  const getFileUrl = async (path) => {

    console.log("Trying download path:", path)

    const { data, error } = await supabase.storage
      .from('uploads')
      .createSignedUrl(path, 60)

    console.log("Signed URL result:", data, error)

    if (error) {
      console.error("Download error:", error)
      return null
    }

    return data.signedUrl
  }

  const downloadFiles = async (submission) => {

    const icFrontUrl = await getFileUrl(submission.ic_front_path)
    const icBackUrl = await getFileUrl(submission.ic_back_path)
    const bankSlipUrl = await getFileUrl(submission.bank_slip_path)

    const icFrontBlob = await (await fetch(icFrontUrl)).blob()
    const icBackBlob = await (await fetch(icBackUrl)).blob()
    const bankSlipBlob = await (await fetch(bankSlipUrl)).blob()

    return {
      icFrontBlob,
      icBackBlob,
      bankSlipBlob
    }
  }

  const embedImage = async (pdfDoc, blob) => {

    const bytes = await blob.arrayBuffer()

    try {
      // Try PNG first
      return await pdfDoc.embedPng(bytes)

    } catch (pngError) {

      // If not PNG, try JPG
      return await pdfDoc.embedJpg(bytes)

    }
  }

  const createPDF = async (files) => {

    const pdfDoc = await PDFDocument.create()


    // A4 size
    const A4_WIDTH = 595
    const A4_HEIGHT = 842


    /*
      PAGE 1
      IC Front + IC Back
    */

    const page1 = pdfDoc.addPage([
      A4_WIDTH,
      A4_HEIGHT
    ])


    // IC Front
    const icFrontImage = await embedImage(
      pdfDoc,
      files.icFrontBlob
    )

    const frontWidth = 400
    const frontHeight =
      (icFrontImage.height / icFrontImage.width) * frontWidth


    // IC Front (top half)
    page1.drawImage(icFrontImage, {
      x: (A4_WIDTH - frontWidth) / 2,
      y: (A4_HEIGHT / 2) + 100,
      width: frontWidth,
      height: frontHeight
    })


    // IC Back
    const icBackImage = await embedImage(
      pdfDoc,
      files.icBackBlob
    )


    const backWidth = 400
    const backHeight =
      (icBackImage.height / icBackImage.width) * backWidth


    // IC Back (bottom half)
    page1.drawImage(icBackImage, {
      x: (A4_WIDTH - backWidth) / 2,
      y: 100,
      width: backWidth,
      height: backHeight
    })

    const font = await pdfDoc.embedFont(
      StandardFonts.Helvetica
    )


    // IC Front watermark
    page1.drawText("Nirvana Usage Only", {
      x: 150,
      y: 600,
      size: 40,
      font,
      color: rgb(0.3, 0.3, 0.3),
      opacity: 0.3,
      rotate: degrees(45)
    })


    // IC Back watermark
    page1.drawText("Nirvana Usage Only", {
      x: 150,
      y: 200,
      size: 40,
      font,
      color: rgb(0.3, 0.3, 0.3),
      opacity: 0.3,
      rotate: degrees(45)
    })


    /*
      PAGE 2
      Bank Slip PDF
    */

    const bankPdfBytes = await files.bankSlipBlob.arrayBuffer()

    const bankPdf = await PDFDocument.load(bankPdfBytes)

    const copiedPages = await pdfDoc.copyPages(
      bankPdf,
      bankPdf.getPageIndices()
    )


    copiedPages.forEach((page) => {
      pdfDoc.addPage(page)
    })

    const pages = pdfDoc.getPages()

    const bankFont = await pdfDoc.embedFont(
      StandardFonts.Helvetica
    )


    // Start from page 2
    for (let i = 1; i < pages.length; i++) {

      const page = pages[i]

      const { width, height } = page.getSize()

      const text = "Nirvana Usage Only"
      const fontSize = 60

      const textWidth = bankFont.widthOfTextAtSize(
        text,
        fontSize
      )

      page.drawText(text, {
        x: width / 2 - 150,
        y: height / 2 + 150,
        size: fontSize,
        font: bankFont,
        color: rgb(0.3, 0.3, 0.3),
        opacity: 0.3,
        rotate: degrees(-45)
      })

    }


    const finalPdf = await pdfDoc.save()

    return finalPdf
  }




  return (
    <div className="kiosk-container">

      <div className="kiosk-card">

        {/* Left Side */}
        <div className="left-panel">

          <h2>
            Scan QR Code to upload your document
          </h2>

          <QRCodeCanvas
            value="https://icbankslip-kiosk.vercel.app"
            size={220}
          />

          <p>
            Scan using your phone camera
          </p>

        </div>


        {/* Right Side */}
        <div className="right-panel">

          <img
            src={logo}
            alt="Logo"
            className="logo"
          />

          <h3>
            Bandar Dato Onn
          </h3>

          <h2>
            Enter your qrcode
          </h2>

          <div className="search-box">

            <input
              type="text"
              placeholder="NIR-XXXXXXXX"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />

            <button onClick={handleSearch}>
              Search
            </button>

          </div>

          {result && (
            <div>

              <h3>Document Found</h3>

              <p>Status: {result.status}</p>

              <button
                onClick={async () => {

                  const files = await downloadFiles(result)

                  console.log("Downloaded files:", files)

                  const pdf = await createPDF(files)

                  const blob = new Blob(
                    [pdf],
                    { type: "application/pdf" }
                  )

                  const url = URL.createObjectURL(blob)
                  console.log("Generated new PDF")
                  window.open(url, "_blank", "noopener,noreferrer")

                }}
              >
                Download All Files
              </button>

            </div>
          )}

        </div>

      </div>

    </div>
  )
}

export default App