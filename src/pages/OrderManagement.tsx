import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Search, ShoppingCart, Package, Clock, CheckCircle, XCircle, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { blink } from '@/blink/client'
import type { Order, Product } from '@/types'

export default function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<{ productId: string; quantity: number; price: number }[]>([
    { productId: '', quantity: 1, price: 0 }
  ])
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    shipping_address: '',
    notes: '',
    type: 'sales' as 'sales' | 'purchase'
  })
  const { toast } = useToast()

  const loadOrders = useCallback(async () => {
    try {
      const user = await blink.auth.me()
      const data = await blink.db.orders.list({
        where: { user_id: user.id },
        orderBy: { created_at: 'desc' }
      })
      setOrders(data)
    } catch (error) {
      console.error('Error loading orders:', error)
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive"
      })
    }
  }, [toast])

  const loadProducts = useCallback(async () => {
    try {
      const user = await blink.auth.me()
      const data = await blink.db.products.list({
        where: { user_id: user.id },
        orderBy: { name: 'asc' }
      })
      setProducts(data)
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const resetForm = () => {
    setFormData({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      shipping_address: '',
      notes: '',
      type: 'sales'
    })
    setOrderItems([{ productId: '', quantity: 1, price: 0 }])
  }

  useEffect(() => {
    loadOrders()
    loadProducts()
  }, [loadOrders, loadProducts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const user = await blink.auth.me()
      
      // Validate order items
      const validItems = orderItems.filter(item => item.productId && item.quantity > 0)
      if (validItems.length === 0) {
        toast({
          title: "Error",
          description: "Please add at least one product to the order",
          variant: "destructive"
        })
        return
      }

      // Calculate total
      const total = validItems.reduce((sum, item) => sum + (item.quantity * item.price), 0)

      // Create order
      const orderData = {
        ...formData,
        total,
        status: 'pending' as const,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const order = await blink.db.orders.create(orderData)

      // Create order items
      for (const item of validItems) {
        await blink.db.order_items.create({
          order_id: order.id,
          product_id: item.productId,
          quantity: item.quantity,
          price: item.price,
          user_id: user.id,
          created_at: new Date().toISOString()
        })

        // Update product stock for sales orders
        if (formData.type === 'sales') {
          const product = products.find(p => p.id === item.productId)
          if (product) {
            await blink.db.products.update(product.id, {
              quantity: Math.max(0, product.quantity - item.quantity),
              updated_at: new Date().toISOString()
            })
          }
        }
      }

      toast({
        title: "Success",
        description: "Order created successfully"
      })

      setIsAddDialogOpen(false)
      resetForm()
      loadOrders()
      loadProducts() // Refresh to show updated stock
    } catch (error) {
      console.error('Error creating order:', error)
      toast({
        title: "Error",
        description: "Failed to create order",
        variant: "destructive"
      })
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      await blink.db.orders.update(orderId, {
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      toast({
        title: "Success",
        description: "Order status updated successfully"
      })
      loadOrders()
    } catch (error) {
      console.error('Error updating order status:', error)
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      })
    }
  }

  const addOrderItem = () => {
    setOrderItems([...orderItems, { productId: '', quantity: 1, price: 0 }])
  }

  const removeOrderItem = (index: number) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((_, i) => i !== index))
    }
  }

  const updateOrderItem = (index: number, field: string, value: any) => {
    const updated = [...orderItems]
    updated[index] = { ...updated[index], [field]: value }
    
    // Auto-fill price when product is selected
    if (field === 'productId') {
      const product = products.find(p => p.id === value)
      if (product) {
        updated[index].price = product.price
      }
    }
    
    setOrderItems(updated)
  }

  const getStatusBadge = (status: Order['status']) => {
    const variants = {
      pending: { variant: 'secondary' as const, icon: Clock },
      processing: { variant: 'default' as const, icon: Package },
      shipped: { variant: 'default' as const, icon: ShoppingCart },
      delivered: { variant: 'default' as const, icon: CheckCircle },
      cancelled: { variant: 'destructive' as const, icon: XCircle }
    }
    
    const config = variants[status]
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const orderStats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    completed: orders.filter(o => ['delivered', 'shipped'].includes(o.status)).length,
    revenue: orders.filter(o => o.type === 'sales' && o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading orders...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Order Management</h1>
          <p className="text-muted-foreground">Manage sales and purchase orders</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Create Order
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Order</DialogTitle>
              <DialogDescription>
                Create a new sales or purchase order
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Order Type</Label>
                  <Select value={formData.type} onValueChange={(value: 'sales' | 'purchase') => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales Order</SelectItem>
                      <SelectItem value="purchase">Purchase Order</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Customer Name</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_email">Email</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_phone">Phone</Label>
                  <Input
                    id="customer_phone"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shipping_address">Shipping Address</Label>
                <Textarea
                  id="shipping_address"
                  value={formData.shipping_address}
                  onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Order Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addOrderItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                
                {orderItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Label>Product</Label>
                      <Select 
                        value={item.productId} 
                        onValueChange={(value) => updateOrderItem(index, 'productId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(product => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - ${product.price} (Stock: {product.quantity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="col-span-3">
                      <Label>Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateOrderItem(index, 'price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeOrderItem(index)}
                        disabled={orderItems.length === 1}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
                
                <div className="text-right">
                  <strong>
                    Total: ${orderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0).toFixed(2)}
                  </strong>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Order</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{orderStats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{orderStats.processing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{orderStats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${orderStats.revenue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders by customer, email, or order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>
            Manage your sales and purchase orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2">
                      <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No orders found</p>
                      <Button onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Order
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">
                      {order.id.slice(-8).toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customer_name}</div>
                        <div className="text-sm text-muted-foreground">{order.customer_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.type === 'sales' ? 'default' : 'secondary'}>
                        {order.type === 'sales' ? 'Sales' : 'Purchase'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">${order.total.toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingOrder(order)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Select
                          value={order.status}
                          onValueChange={(value: Order['status']) => updateOrderStatus(order.id, value)}
                        >
                          <SelectTrigger className="w-[120px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Order #{viewingOrder?.id.slice(-8).toUpperCase()}
            </DialogDescription>
          </DialogHeader>
          {viewingOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Customer</Label>
                  <p className="font-medium">{viewingOrder.customer_name}</p>
                  <p className="text-sm text-muted-foreground">{viewingOrder.customer_email}</p>
                  {viewingOrder.customer_phone && (
                    <p className="text-sm text-muted-foreground">{viewingOrder.customer_phone}</p>
                  )}
                </div>
                <div>
                  <Label>Order Info</Label>
                  <p className="font-medium">Type: {viewingOrder.type === 'sales' ? 'Sales' : 'Purchase'}</p>
                  <p className="text-sm text-muted-foreground">
                    Created: {new Date(viewingOrder.created_at).toLocaleString()}
                  </p>
                  <div className="mt-1">{getStatusBadge(viewingOrder.status)}</div>
                </div>
              </div>
              
              {viewingOrder.shipping_address && (
                <div>
                  <Label>Shipping Address</Label>
                  <p className="text-sm">{viewingOrder.shipping_address}</p>
                </div>
              )}
              
              {viewingOrder.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-sm">{viewingOrder.notes}</p>
                </div>
              )}
              
              <div>
                <Label>Total Amount</Label>
                <p className="text-2xl font-bold">${viewingOrder.total.toFixed(2)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewingOrder(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}