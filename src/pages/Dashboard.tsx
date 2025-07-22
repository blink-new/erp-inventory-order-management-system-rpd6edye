import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  AlertTriangle,
  Plus,
  Eye
} from 'lucide-react'
import { blink } from '@/blink/client'
import type { DashboardStats, Product, Order } from '@/types'

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    lowStockItems: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    totalSuppliers: 0
  })
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const loadDashboardData = async () => {
    try {
      // Load products for inventory stats
      const products = await blink.db.products.list<Product>({
        orderBy: { createdAt: 'desc' }
      })

      // Load orders for order stats
      const orders = await blink.db.orders.list<Order>({
        orderBy: { createdAt: 'desc' },
        limit: 5
      })

      // Load suppliers
      const suppliers = await blink.db.suppliers.list({})

      // Calculate stats
      const lowStock = products.filter(p => p.stockQuantity <= p.minStockLevel)
      const pendingOrdersCount = orders.filter(o => o.status === 'pending').length
      const totalRevenue = orders
        .filter(o => o.type === 'sales' && o.status !== 'cancelled')
        .reduce((sum, o) => sum + o.totalAmount, 0)

      setStats({
        totalProducts: products.length,
        lowStockItems: lowStock.length,
        totalOrders: orders.length,
        pendingOrders: pendingOrdersCount,
        totalRevenue,
        totalSuppliers: suppliers.length
      })

      setRecentOrders(orders.slice(0, 5))
      setLowStockProducts(lowStock.slice(0, 5))
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'processing': return 'bg-purple-100 text-purple-800'
      case 'shipped': return 'bg-indigo-100 text-indigo-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening with your business.</p>
        </div>
        <div className="flex space-x-2">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Quick Add
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Active inventory items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alert</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Items need restocking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingOrders} pending orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From completed sales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest orders in your system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No orders yet</p>
              ) : (
                recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">#{order.orderNumber}</span>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{order.customerName}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(order.orderDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${order.totalAmount.toLocaleString()}</p>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
              Low Stock Alert
            </CardTitle>
            <CardDescription>Items that need immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockProducts.length === 0 ? (
                <p className="text-gray-500 text-center py-4">All items are well stocked</p>
              ) : (
                lowStockProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg border-amber-200 bg-amber-50">
                    <div className="flex-1">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                      <p className="text-xs text-gray-500">{product.location}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        <span className="text-red-600 font-medium">{product.stockQuantity}</span>
                        <span className="text-gray-500"> / {product.minStockLevel} min</span>
                      </p>
                      <Button variant="outline" size="sm" className="mt-1">
                        Reorder
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}