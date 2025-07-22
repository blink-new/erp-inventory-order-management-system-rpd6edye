import React, { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart, AlertTriangle, Calendar, Download } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { blink } from '@/blink/client'
import type { Product, Order } from '@/types'

const COLORS = ['#2563eb', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#f97316']

export default function Analytics() {
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30')
  const { toast } = useToast()

  const loadData = useCallback(async () => {
    try {
      const user = await blink.auth.me()
      
      const [productsData, ordersData] = await Promise.all([
        blink.db.products.list({
          where: { user_id: user.id },
          orderBy: { created_at: 'desc' }
        }),
        blink.db.orders.list({
          where: { user_id: user.id },
          orderBy: { created_at: 'desc' }
        })
      ])
      
      setProducts(productsData)
      setOrders(ordersData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter orders by time range
  const getFilteredOrders = () => {
    const days = parseInt(timeRange)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    
    return orders.filter(order => new Date(order.created_at) >= cutoffDate)
  }

  const filteredOrders = getFilteredOrders()

  // Calculate key metrics
  const metrics = {
    totalRevenue: filteredOrders.filter(o => o.type === 'sales' && o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0),
    totalOrders: filteredOrders.length,
    averageOrderValue: filteredOrders.length > 0 ? filteredOrders.reduce((sum, o) => sum + o.total, 0) / filteredOrders.length : 0,
    lowStockItems: products.filter(p => p.quantity <= p.reorder_point).length,
    outOfStockItems: products.filter(p => p.quantity === 0).length,
    totalProducts: products.length,
    inventoryValue: products.reduce((sum, p) => sum + (p.quantity * p.cost), 0)
  }

  // Revenue trend data
  const getRevenueTrendData = () => {
    const days = parseInt(timeRange)
    const data = []
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayOrders = filteredOrders.filter(order => {
        const orderDate = new Date(order.created_at).toISOString().split('T')[0]
        return orderDate === dateStr && order.type === 'sales' && order.status !== 'cancelled'
      })
      
      const revenue = dayOrders.reduce((sum, order) => sum + order.total, 0)
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: revenue,
        orders: dayOrders.length
      })
    }
    
    return data
  }

  // Order status distribution
  const getOrderStatusData = () => {
    const statusCounts = filteredOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count
    }))
  }

  // Top products by revenue
  const getTopProductsData = () => {
    const productRevenue = products.map(product => {
      const productOrders = filteredOrders.filter(order => 
        order.type === 'sales' && order.status !== 'cancelled'
      )
      
      // This is simplified - in a real app, you'd join with order_items
      const estimatedRevenue = product.price * Math.max(0, product.quantity)
      
      return {
        name: product.name,
        revenue: estimatedRevenue,
        stock: product.quantity,
        category: product.category
      }
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

    return productRevenue
  }

  // Category distribution
  const getCategoryData = () => {
    const categoryCount = products.reduce((acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(categoryCount).map(([category, count]) => ({
      name: category,
      value: count
    }))
  }

  const revenueTrendData = getRevenueTrendData()
  const orderStatusData = getOrderStatusData()
  const topProductsData = getTopProductsData()
  const categoryData = getCategoryData()

  const exportData = () => {
    const data = {
      metrics,
      revenueTrend: revenueTrendData,
      orderStatus: orderStatusData,
      topProducts: topProductsData,
      categories: categoryData,
      exportDate: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `erp-analytics-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast({
      title: "Success",
      description: "Analytics data exported successfully"
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading analytics...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics & Reports</h1>
          <p className="text-muted-foreground">Business insights and performance metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportData} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Last {timeRange} days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              Avg: ${metrics.averageOrderValue.toFixed(2)} per order
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.inventoryValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalProducts} products in stock
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{metrics.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.outOfStockItems} out of stock
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Daily revenue over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
            <CardDescription>Breakdown of order statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Products by Value</CardTitle>
            <CardDescription>Products with highest inventory value</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProductsData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Value']} />
                <Bar dataKey="revenue" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Categories</CardTitle>
            <CardDescription>Distribution of products by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Insights and Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Business Insights</CardTitle>
          <CardDescription>AI-powered recommendations based on your data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.lowStockItems > 0 && (
              <div className="flex items-start space-x-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800">Low Stock Alert</h4>
                  <p className="text-sm text-amber-700">
                    You have {metrics.lowStockItems} products running low on stock. Consider reordering to avoid stockouts.
                  </p>
                </div>
              </div>
            )}
            
            {metrics.averageOrderValue > 0 && (
              <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800">Revenue Opportunity</h4>
                  <p className="text-sm text-blue-700">
                    Your average order value is ${metrics.averageOrderValue.toFixed(2)}. Consider bundling products or offering upsells to increase this metric.
                  </p>
                </div>
              </div>
            )}
            
            {topProductsData.length > 0 && (
              <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <Package className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-800">Top Performer</h4>
                  <p className="text-sm text-green-700">
                    "{topProductsData[0]?.name}" is your highest-value product. Consider promoting similar items or increasing its stock levels.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}