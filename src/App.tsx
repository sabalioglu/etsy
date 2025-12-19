import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { ShopAnalyzer } from './pages/ShopAnalyzer'
import { ProductSelection } from './pages/ProductSelection'
import { ProductCloner } from './pages/ProductCloner'
import { VideoGenerator } from './pages/VideoGenerator'
import { History } from './pages/History'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analyze" element={<ShopAnalyzer />} />
          <Route path="/products" element={<ProductSelection />} />
          <Route path="/clone" element={<ProductCloner />} />
          <Route path="/videos" element={<VideoGenerator />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
