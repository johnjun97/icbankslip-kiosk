import { useState } from 'react'
import './App.css'
import { QRCodeCanvas } from 'qrcode.react'
import logo from './assets/logo.png'
import { supabase } from './lib/supabase'

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

                  const files = [
                    result.ic_front_path,
                    result.ic_back_path,
                    result.bank_slip_path
                  ]

                  for (const file of files) {

                    const url = await getFileUrl(file)

                    if (url) {
                      window.open(url, "_blank")
                    }

                  }

                }}
              >
                Download All Documents
              </button>

            </div>
          )}

        </div>

      </div>

    </div>
  )
}

export default App