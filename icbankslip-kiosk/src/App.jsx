import { useState, useRef, useEffect } from 'react'
import './App.css'
import { QRCodeCanvas } from 'qrcode.react'
import logo from './assets/logo.png'
import { kioskLogin } from './lib/supabaseLogin'
import {
  downloadFiles,
  deleteUploadedFiles
} from './lib/documentService'
import {
  createPDF
} from './lib/pdfService'

import {
  printPDF
} from './lib/printService'
import {
  findSubmissionByQRCode
} from './lib/submissionService'


const DEBUG = import.meta.env.VITE_DEBUG === "true"

if (!DEBUG) {
  console.log = () => { }
}

function App() {
  const PRINT_MODE = import.meta.env.VITE_PRINT_MODE || "TEST"
  // TEST = simulate print
  // SILENT = real silent print
  // Accidentally running Electron without .env will not print real documents.

  const version = import.meta.env.VITE_APP_VERSION
  const kioskName = import.meta.env.VITE_KIOSK_NAME

  const debugLabel = DEBUG ? " (Debug Mode)" : ""

  const printLabel = ""

  const [reference, setReference] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  const [downloading, setDownloading] = useState(false)
  const [loadingText, setLoadingText] = useState("")

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

  // Auto clear reference after 30 seconds of inactivity

  useEffect(() => {

    if (!reference) return

    const timer = setTimeout(() => {
      setReference('')
      inputRef.current?.focus()
    }, 30000)

    return () => clearTimeout(timer)

  }, [reference])

  const handleSearch = async () => {

    const { data, error } =
      await findSubmissionByQRCode(reference)

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

  const handleDownload = async (submission) => {

    if (submission.status === "Printed") {

      setMessageType("error")
      setMessage("Documents already printed. Please upload again")

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
    setLoadingText("Starting process...(1/5)")
    setMessage('')

    try {

      setLoadingText("Downloading files...(2/5)")
      const files = await downloadFiles(submission)

      setLoadingText("Generating PDF...(3/5)")
      const pdf = await createPDF(files)
      console.log(
        "PDF SIZE:",
        pdf.length
      )


      if (window.electronAPI) {

        setLoadingText("Sending to printer...(4/5)")

        const printSuccess =
          await printPDF(
            pdf,
            PRINT_MODE
          )

        console.log(
          "PRINT RESULT:",
          printSuccess
        )

        if (printSuccess) {

          if (PRINT_MODE === "SILENT") {
            await deleteUploadedFiles(
              submission,
              kioskName
            )
          }

          setMessageType("success")

          setMessage(
            PRINT_MODE === "TEST"
              ? "Test print completed"
              : "Document sent to printer. Please wait..."
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

        console.log(
          "Browser mode - opening PDF"
        )

        const blob = new Blob(
          [pdf],
          { type: "application/pdf" }
        )

        const url =
          URL.createObjectURL(blob)

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
      setLoadingText("")
      setDownloading(false)

    }

  }

  return (
    <>
      {downloading && (
        <div className="loading-overlay">
          <div className="loading-box">
            {loadingText}
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

            <a
              href="https://icbankslip-kiosk.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <QRCodeCanvas
                value="https://icbankslip-kiosk.vercel.app"
                size={280}
              />
            </a>

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
              {debugLabel}
              {printLabel}
            </p>

          </div>

        </div>

      </div>

    </>
  )
}

export default App