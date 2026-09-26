import React from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { Button } from '@/components/common'
import { RootLayout } from '@/components/layout/RootLayout'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { OrganizerRoute } from '@/routes/OrganizerRoute'
import {
  HomePage,
  CatalogPage,
  EventDetailPage,
  MyOrdersPage,
  OrganizerStudioPage,
  GateScannerPage,
  DevTestingPage,
} from '@/pages'

const NotFoundPage: React.FC = () => (
  <div className="container mx-auto py-16 px-6 text-center">
    <h1 className="text-6xl font-extrabold text-text-primary mb-4">404</h1>
    <p className="text-text-secondary mb-6">Trang bạn tìm kiếm không tồn tại hoặc đã được di chuyển.</p>
    <Link to="/"><Button variant="primary">Trở Về Trang Chủ</Button></Link>
  </div>
)

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          {/* Public Storefront Routes */}
          <Route path="/" element={<CatalogPage />} />
          <Route path="/events" element={<CatalogPage />} />
          <Route path="/schedule" element={<CatalogPage defaultTab="upcoming" />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/home" element={<HomePage />} />
          {import.meta.env.DEV && <Route path="/dev" element={<DevTestingPage />} />}

          {/* Protected Customer Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/my-orders" element={<MyOrdersPage />} />
          </Route>

          {/* Organizer Routes (Task 16D) */}
          <Route element={<OrganizerRoute />}>
            <Route path="/organizer" element={<OrganizerStudioPage />} />
            <Route path="/scanner" element={<GateScannerPage />} />
          </Route>


          {/* 404 Catch-All */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
