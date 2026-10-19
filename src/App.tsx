import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoadingSpinner from './components/LoadingSpinner'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Login = lazy(() => import('./pages/Login'))
const AdminProjectsPage = lazy(() => import('./pages/admin/AdminProjectsPage'))
const AdminProjectDetailPage = lazy(() => import('./pages/admin/AdminProjectDetailPage'))
const ClientProjectsPage = lazy(() => import('./pages/ClientProjectsPage'))
const ClientProjectPage = lazy(() => import('./pages/ClientProjectPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

export default function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Any logged-in user */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="*" element={<NotFoundPage />} />
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
    </Suspense>
  )
}
