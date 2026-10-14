import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Any logged-in user */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
      </Route>

      {/* Admin-only area (built in a later step) */}
      <Route element={<ProtectedRoute adminOnly />}>
        {/* <Route path="/admin" element={<AdminDashboard />} /> */}
      </Route>
    </Routes>
  )
}