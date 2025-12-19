import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { ShopAnalyzer } from './pages/ShopAnalyzer'
import { ProductSelection } from './pages/ProductSelection'
import { ProductCloner } from './pages/ProductCloner'
import { VideoGenerator } from './pages/VideoGenerator'
import { History } from './pages/History'
import { AnalysisResults } from './pages/AnalysisResults'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/analyze" element={<ShopAnalyzer />} />
                  <Route path="/analysis/:analysisId" element={<AnalysisResults />} />
                  <Route path="/products" element={<ProductSelection />} />
                  <Route path="/clone" element={<ProductCloner />} />
                  <Route path="/videos" element={<VideoGenerator />} />
                  <Route path="/history" element={<History />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
