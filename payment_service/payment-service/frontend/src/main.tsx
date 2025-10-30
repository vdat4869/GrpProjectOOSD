import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import VNPayReturn from './VNPayReturn'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/vnpay-return" element={<VNPayReturn />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
