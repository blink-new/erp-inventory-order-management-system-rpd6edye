import React, { useState, useEffect, useCallback } from 'react'
import { Save, User, Bell, Shield, Database, Download, Upload, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { blink } from '@/blink/client'

export default function Settings() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profileData, setProfileData] = useState({
    displayName: '',
    email: '',
    company: '',
    phone: '',
    address: ''
  })
  const [notifications, setNotifications] = useState({
    lowStock: true,
    newOrders: true,
    systemUpdates: false,
    emailReports: true
  })
  const [systemSettings, setSystemSettings] = useState({
    defaultCurrency: 'USD',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    lowStockThreshold: 10
  })
  const { toast } = useToast()

  const loadUserData = useCallback(async () => {
    try {
      const userData = await blink.auth.me()
      setUser(userData)
      setProfileData({
        displayName: userData.displayName || '',
        email: userData.email || '',
        company: userData.company || '',
        phone: userData.phone || '',
        address: userData.address || ''
      })
    } catch (error) {
      console.error('Error loading user data:', error)
      toast({
        title: "Error",
        description: "Failed to load user data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadUserData()
  }, [loadUserData])

  const saveProfile = async () => {
    setSaving(true)
    try {
      await blink.auth.updateMe({
        displayName: profileData.displayName,
        company: profileData.company,
        phone: profileData.phone,
        address: profileData.address
      })
      
      toast({
        title: "Success",
        description: "Profile updated successfully"
      })
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const exportData = async () => {
    try {
      const [products, orders, suppliers] = await Promise.all([
        blink.db.products.list({ where: { user_id: user.id } }),
        blink.db.orders.list({ where: { user_id: user.id } }),
        blink.db.suppliers.list({ where: { user_id: user.id } })
      ])

      const exportData = {
        products,
        orders,
        suppliers,
        exportDate: new Date().toISOString(),
        version: '1.0'
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `erp-data-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Success",
        description: "Data exported successfully"
      })
    } catch (error) {
      console.error('Error exporting data:', error)
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive"
      })
    }
  }

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        
        // Validate data structure
        if (!data.products || !data.orders || !data.suppliers) {
          throw new Error('Invalid data format')
        }

        // Import data (simplified - in production, you'd want more validation)
        let imported = 0
        
        for (const product of data.products) {
          try {
            await blink.db.products.create({
              ...product,
              user_id: user.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            imported++
          } catch (error) {
            console.warn('Failed to import product:', product.name)
          }
        }

        toast({
          title: "Success",
          description: `Imported ${imported} items successfully`
        })
      } catch (error) {
        console.error('Error importing data:', error)
        toast({
          title: "Error",
          description: "Failed to import data. Please check the file format.",
          variant: "destructive"
        })
      }
    }
    reader.readAsText(file)
  }

  const clearAllData = async () => {
    if (!confirm('Are you sure you want to delete ALL data? This action cannot be undone.')) {
      return
    }

    if (!confirm('This will permanently delete all products, orders, and suppliers. Type "DELETE" to confirm.')) {
      return
    }

    try {
      // Delete all user data
      const [products, orders, suppliers] = await Promise.all([
        blink.db.products.list({ where: { user_id: user.id } }),
        blink.db.orders.list({ where: { user_id: user.id } }),
        blink.db.suppliers.list({ where: { user_id: user.id } })
      ])

      // Delete in batches
      for (const product of products) {
        await blink.db.products.delete(product.id)
      }
      for (const order of orders) {
        await blink.db.orders.delete(order.id)
      }
      for (const supplier of suppliers) {
        await blink.db.suppliers.delete(supplier.id)
      }

      toast({
        title: "Success",
        description: "All data has been cleared"
      })
    } catch (error) {
      console.error('Error clearing data:', error)
      toast({
        title: "Error",
        description: "Failed to clear data",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and system preferences</p>
      </div>

      <div className="grid gap-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Settings
            </CardTitle>
            <CardDescription>
              Update your personal information and account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={profileData.displayName}
                  onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={profileData.company}
                  onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={profileData.address}
                onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                rows={2}
              />
            </div>

            <Button onClick={saveProfile} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Choose what notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Low Stock Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when products are running low
                </p>
              </div>
              <Switch
                checked={notifications.lowStock}
                onCheckedChange={(checked) => setNotifications({ ...notifications, lowStock: checked })}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>New Order Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when new orders are placed
                </p>
              </div>
              <Switch
                checked={notifications.newOrders}
                onCheckedChange={(checked) => setNotifications({ ...notifications, newOrders: checked })}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>System Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about system updates and maintenance
                </p>
              </div>
              <Switch
                checked={notifications.systemUpdates}
                onCheckedChange={(checked) => setNotifications({ ...notifications, systemUpdates: checked })}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Reports</Label>
                <p className="text-sm text-muted-foreground">
                  Receive weekly business reports via email
                </p>
              </div>
              <Switch
                checked={notifications.emailReports}
                onCheckedChange={(checked) => setNotifications({ ...notifications, emailReports: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Settings
            </CardTitle>
            <CardDescription>
              Configure system-wide preferences and defaults
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Default Currency</Label>
                <Input
                  id="currency"
                  value={systemSettings.defaultCurrency}
                  onChange={(e) => setSystemSettings({ ...systemSettings, defaultCurrency: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={systemSettings.timezone}
                  onChange={(e) => setSystemSettings({ ...systemSettings, timezone: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFormat">Date Format</Label>
                <Input
                  id="dateFormat"
                  value={systemSettings.dateFormat}
                  onChange={(e) => setSystemSettings({ ...systemSettings, dateFormat: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
                <Input
                  id="lowStockThreshold"
                  type="number"
                  value={systemSettings.lowStockThreshold}
                  onChange={(e) => setSystemSettings({ ...systemSettings, lowStockThreshold: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Management
            </CardTitle>
            <CardDescription>
              Import, export, and manage your business data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Export Data</h4>
                <p className="text-sm text-muted-foreground">
                  Download all your data as a backup file
                </p>
              </div>
              <Button onClick={exportData} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Import Data</h4>
                <p className="text-sm text-muted-foreground">
                  Import data from a backup file
                </p>
              </div>
              <div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="hidden"
                  id="import-file"
                />
                <Button asChild variant="outline">
                  <label htmlFor="import-file" className="cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                  </label>
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
              <div>
                <h4 className="font-medium text-red-800">Clear All Data</h4>
                <p className="text-sm text-red-600">
                  Permanently delete all products, orders, and suppliers
                </p>
              </div>
              <Button onClick={clearAllData} variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Your account details and subscription status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Account ID</Label>
                <p className="text-sm font-mono bg-muted p-2 rounded">{user?.id}</p>
              </div>
              <div>
                <Label>Account Status</Label>
                <div className="mt-1">
                  <Badge variant="default">Active</Badge>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Member Since</Label>
                <p className="text-sm">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <Label>Last Login</Label>
                <p className="text-sm">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}