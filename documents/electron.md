
# npm run electron (Developer mode)

npm run build
npm run electron 

.. this will only load /dist 
as package.json 
"electron": "electron electron/main.js"
and main.js 
mainWindow.loadFile(
  path.join(__dirname, '../dist/index.html')
)

if you dont npm run build it will not load your latest version

# Before production build
Update your package.json

{
  "name": "icbankslip-kiosk",
  "version": "1.0.0",
  "description": "Nirvana IC BankSlip Kiosk",
  "author": "Nirvana",
  "main": "electron/main.js"
}


Every release increase this:
Example:
Bug fix: 1.0.
New feature: 1.1.0
Big change: 2.0.0

# update version in .env as well (VITE_APP_VERSION)

VITE_APP_VERSION=1.0.2

# update .env location

VITE_KIOSK_NAME=Kulai

# update package.json productName 

 "productName": "Nirvana IC BankSlip Kiosk (Kulai)",

# Build React production files

npm run build

this create dist/index.html & assets


# Create Windows installer (.exe)

npm run dist

Electron-builder will create: 

release/Nirvana IC BankSlip Kiosk Setup 1.0.0.exe
release/win-unpacked/

The setup file is what you install on another PC.

# Open developer tools in electron

Ctrl + Shift + I