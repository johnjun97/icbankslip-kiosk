import { useState, useRef, useEffect } from 'react'
import './App.css'
import { QRCodeCanvas } from 'qrcode.react'
import logo from './assets/logo.png'
import { supabase } from './lib/supabase'
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'
import { kioskLogin } from './lib/supabaseLogin'

function App() {
  const PRINT_MODE = import.meta.env.VITE_PRINT_MODE || "TEST"
  // TEST = simulate print
  // SILENT = real silent print
  // Accidentally running Electron without .env will not print real documents.

  const version = import.meta.env.VITE_APP_VERSION
  const kioskName = import.meta.env.VITE_KIOSK_NAME

  const [reference, setReference] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  const [downloading, setDownloading] = useState(false)

  const inputRef = useRef(null)

  const focusInput = () => {
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  useEffect(() => {

    const init = async () => {

      await kioskLogin()

      focusInput()

    }

    init()

  }, [])

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
      setMessageType("error")
      setMessage("No document found.")

      setTimeout(() => {
        setMessage('')
        setMessageType('')
      }, 3000)

      inputRef.current?.focus()
      return
    }

    console.log("Found:", data)
    setReference('')
    setMessage('')

    await handleDownload(data)

    inputRef.current?.focus()
  }

  const getFileUrl = async (path) => {

    const { data, error } = await supabase.storage
      .from('uploads')
      .createSignedUrl(path, 60)

    if (error) {

      console.error("Signed URL error:", error)

      if (
        error.message.includes("not found") ||
        error.message.includes("Object not found")
      ) {
        throw new Error("FILE_EXPIRED")
      }

      throw error
    }

    return data.signedUrl
  }

  const downloadFiles = async (submission) => {

    let icFrontBlob = null
    let icBackBlob = null
    let bankSlipBlob = null

    if (submission.ic_front_path) {
      const url = await getFileUrl(submission.ic_front_path)
      icFrontBlob = await (await fetch(url)).blob()
    }


    if (submission.ic_back_path) {
      const url = await getFileUrl(submission.ic_back_path)
      icBackBlob = await (await fetch(url)).blob()
    }


    if (submission.bank_slip_path) {
      const url = await getFileUrl(submission.bank_slip_path)

      const response = await fetch(url)

      const blob = await response.blob()

      bankSlipBlob = new File(
        [blob],
        submission.bank_slip_path,
        {
          type: blob.type
        }
      )

      console.log(
        "Bank slip type:",
        bankSlipBlob.type,
        bankSlipBlob.name
      )
    }

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


    // watermark
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
      const filename = files.bankSlipBlob.name?.toLowerCase() || ""

      console.log(
        "BANK DECISION:",
        {
          type,
          filename
        }
      )

      if (
        filename.endsWith(".pdf")
      ) {

        const bankPdfBytes = await files.bankSlipBlob.arrayBuffer()

        const bankPdf = await PDFDocument.load(bankPdfBytes)

        const copiedPages = await pdfDoc.copyPages(
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

        const bankImage = await embedImage(
          pdfDoc,
          files.bankSlipBlob
        )

        const page = pdfDoc.addPage([
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

    const pages = pdfDoc.getPages()

    // Start from page 2
    for (let i = 0; i < pages.length; i++) {

        const page = pages[i]

        const { width, height } = page.getSize()

        const text = "FOR NIRVANA ASIA\nREFERENCE ONLY"

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


      const finalPdf = await pdfDoc.save()

      return finalPdf
    }

    const deleteUploadedFiles = async (submission) => {

      console.log("DELETE FUNCTION CALLED", submission)

      const { data: updateData, error: updateError } = await supabase
        .from('submissions')
        .update({
          status: "Printed",
          printed_from: kioskName,
          printed_date: new Date().toISOString()
        })
        .eq(
          "id",
          submission.id
        )
        .select()


      console.log("UPDATE RESULT:", {
        updateData,
        updateError
      })


      if (updateError || !updateData?.length) {
        console.error("Update status failed:", updateError)
        throw new Error("STATUS_UPDATE_FAILED")
      }


      const files = [
        submission.ic_front_path,
        submission.ic_back_path,
        submission.bank_slip_path
      ].filter(Boolean)


      console.log("Attempting to delete:", files)

      const storage = supabase.storage.from('uploads')

      const { data: deleteResult, error: deleteError } = await storage.remove(files)

      if (deleteError) {
        console.error("Delete failed:", deleteError)
      }

      console.log("BULK DELETE RESULT:", {
        deleteResult,
        deleteError
      })

      console.log("Storage delete test completed")

    }



    function uint8ToBase64(bytes) {
      let binary = ""

      const chunkSize = 0x8000

      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(
          ...bytes.subarray(i, i + chunkSize)
        )
      }

      return btoa(binary)
    }

    const handleDownload = async (submission) => {

      if (submission.status === "Printed") {

        setMessageType("error")
        setMessage("Already printed.")

        return

      }


      if (submission.status === "Expired") {

        setMessageType("error")
        setMessage(
          "Documents expired. Please upload again."
        )

        setTimeout(() => {
          setMessage('')
          setMessageType('')
        }, 5000)

        return

      }

      setDownloading(true)
      setMessage('')

      try {

        const files = await downloadFiles(submission)

        const pdf = await createPDF(files)
        console.log(
          "PDF SIZE:",
          pdf.length
        )


        if (window.electronAPI) {

          let printSuccess = false


          if (PRINT_MODE === "TEST") {

            console.log("TEST MODE - open PDF")

            const blob = new Blob(
              [pdf],
              { type: "application/pdf" }
            )

            const url = URL.createObjectURL(blob)

            window.open(url, "_blank")

            printSuccess = false

          }


          if (PRINT_MODE === "SILENT") {

            console.log("REAL SILENT PRINT")

            const base64 = uint8ToBase64(
              new Uint8Array(pdf)
            )

            printSuccess = await window.electronAPI.printPDF(base64)

          }

          if (!PRINT_MODE) {

            console.warn("PRINT_MODE not set")

          }


          if (printSuccess) {

            if (PRINT_MODE === "SILENT") {
              await deleteUploadedFiles(submission)
            }

            setMessageType("success")

            setMessage(
              PRINT_MODE === "TEST"
                ? "Test print completed"
                : "Print successfully"
            )


          } else {

            setMessageType("error")

            setMessage("Print failed")

          }


          setTimeout(() => {
            setMessage('')
            setMessageType('')
          }, 5000)


        } else {

          console.log("Browser mode - opening PDF")

          const blob = new Blob(
            [pdf],
            { type: "application/pdf" }
          )

          const url = URL.createObjectURL(blob)

          window.open(url)

        }


      } catch (error) {

        console.error("Generate error:", error)

        if (error.message === "FILE_EXPIRED") {

          setMessageType("error")
          setMessage(
            "Documents expired. Please upload again."
          )

        } else {

          setMessageType("error")
          setMessage(
            "Unable to prepare document. Please try again."
          )

        }

      } finally {

        setDownloading(false)

      }

    }

    return (
      <>
        {downloading && (
          <div className="loading-overlay">
            <div className="loading-box">
              Preparing document...
            </div>
          </div>
        )}

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
                {kioskName}
              </h3>

              <h2>
                Enter your qrcode
              </h2>

              <div className="search-box">

                <input
                  ref={inputRef}
                  autoFocus
                  type="text"
                  placeholder="NIR-XXXXXXXX"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  onBlur={focusInput}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch()
                    }
                  }}
                />

                <button
                  className="search-button"
                  onClick={handleSearch}
                >
                  &gt;
                </button>

              </div>

              <div className="message-container">
                {message && (
                  <div className={messageType === "success" ? "success-message" : "error-message"}>
                    {message}
                  </div>
                )}
              </div>

              <p className="app-version">
                Version {version}
              </p>

            </div>

          </div>

        </div>

      </>
    )
  }

  export default App