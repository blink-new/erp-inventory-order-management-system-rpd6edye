import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Dashboard } from '@/pages/Dashboard'
import InventoryManagement from '@/pages/InventoryManagement'
import OrderManagement from '@/pages/OrderManagement'
import SupplierManagement from '@/pages/SupplierManagement'
import Analytics from '@/pages/Analytics'
import Settings from '@/pages/Settings'
import { blink } from '@/blink/client'
import { Toaster } from '@/components/ui/toaster'

function App() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ERP System...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ERP System</h1>
          <p className="text-gray-600 mb-6">Please sign in to access your inventory and order management system</p>
          <button
            onClick={() => blink.auth.login()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          <Sidebar />
          <div className="flex-1 lg:ml-64">
            <Header />
            <main className="min-h-[calc(100vh-4rem)]">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/inventory" element={<InventoryManagement />} />
                <Route path="/orders" element={<OrderManagement />} />
                <Route path="/suppliers" element={<SupplierManagement />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </main>
          </div>
        </div>
        <Toaster />
      </div>
    </Router>
  )
}

export default App