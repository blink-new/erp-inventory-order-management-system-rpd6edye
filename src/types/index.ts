export interface Product {
  id: string
  name: string
  sku: string
  description?: string
  category: string
  price: number
  cost: number
  stockQuantity: number
  minStockLevel: number
  maxStockLevel: number
  location: string
  supplier: string
  barcode?: string
  createdAt: string
  updatedAt: string
  userId: string
}

export interface Order {
  id: string
  orderNumber: string
  type: 'sales' | 'purchase'
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  customerId?: string
  supplierId?: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  shippingAddress?: string
  orderDate: string
  expectedDelivery?: string
  totalAmount: number
  notes?: string
  createdAt: string
  updatedAt: string
  userId: string
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string
  productName: string
  sku: string
  quantity: number
  unitPrice: number
  totalPrice: number
  userId: string
}

export interface Supplier {
  id: string
  name: string
  contactPerson: string
  email: string
  phone: string
  address: string
  city: string
  country: string
  paymentTerms: string
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
  userId: string
}

export interface DashboardStats {
  totalProducts: number
  lowStockItems: number
  totalOrders: number
  pendingOrders: number
  totalRevenue: number
  totalSuppliers: number
}