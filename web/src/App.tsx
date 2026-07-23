// XAVFSIZ XONADON — App router

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/auth';
import { AppLayout } from '@/components/AppLayout';
import { Skeleton } from '@/components/Skeleton';
import LoginPage from '@/pages/LoginPage';

// Sahifalar lazy yuklanadi — route-level code splitting
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const XonadonlarPage = lazy(() => import('@/pages/XonadonlarPage'));
const XonadonDetailPage = lazy(() => import('@/pages/XonadonDetailPage'));
const MuammolarPage = lazy(() => import('@/pages/MuammolarPage'));
const MuammoDetailPage = lazy(() => import('@/pages/MuammoDetailPage'));
const HududPage = lazy(() => import('@/pages/HududPage'));
const BoshqaruvPage = lazy(() => import('@/pages/BoshqaruvPage'));
const XaritaPage = lazy(() => import('@/pages/XaritaPage'));
const AnalitikaPage = lazy(() => import('@/pages/AnalitikaPage'));
const TopshiriqPage = lazy(() => import('@/pages/TopshiriqPage'));
const IntizomPage = lazy(() => import('@/pages/IntizomPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/kirish" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/kirish" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/xonadonlar" element={<XonadonlarPage />} />
          <Route path="/xonadonlar/:id" element={<XonadonDetailPage />} />
          <Route path="/muammolar" element={<MuammolarPage />} />
          <Route path="/muammolar/:id" element={<MuammoDetailPage />} />
          <Route path="/hudud" element={<HududPage />} />
          <Route path="/xarita" element={<XaritaPage />} />
          <Route path="/boshqaruv" element={<BoshqaruvPage />} />
          <Route path="/analitika" element={<AnalitikaPage />} />
          <Route path="/topshiriq" element={<TopshiriqPage />} />
          <Route path="/intizom" element={<IntizomPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function PageFallback() {
  return (
    <div role="status" aria-label="Sahifa yuklanmoqda" className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <span className="sr-only">Sahifa yuklanmoqda...</span>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
    </div>
  );
}
