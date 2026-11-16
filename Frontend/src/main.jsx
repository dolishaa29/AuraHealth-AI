import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import axios from 'axios'
import Cookies from 'js-cookie'

axios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && err.response?.data?.expired && window.location.pathname !== '/login') {
      Cookies.remove('token')
      Cookies.remove('emtoken')
      Cookies.remove('emstoken')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
