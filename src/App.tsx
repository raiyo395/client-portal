import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import AdminProjectsPage from './pages/admin/AdminProjectsPage'
import AdminProjectDetailPage from './pages/admin/AdminProjectDetailPage'
import ClientProjectsPage from './pages/ClientProjectsPage'
import ClientProjectPage from './pages/ClientProjectPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Any logged-in user */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
        </Route>
      </Route>

      {/* Client area */}
      <Route element={<ProtectedRoute clientOnly />}>
        <Route element={<Layout />}>
          <Route path="/projects" element={<ClientProjectsPage />} />
          <Route path="/projects/:id" element={<ClientProjectPage />} />
        </Route>
      </Route>

      {/* Admin-only area */}
      <Route element={<ProtectedRoute adminOnly />}>
        <Route element={<Layout />}>
          <Route path="/admin" element={<Navigate to="/admin/projects" replace />} />
          <Route path="/admin/projects/:id" element={<AdminProjectDetailPage />} />
          <Route path="/admin/projects" element={<AdminProjectsPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
