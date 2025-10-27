import { usePage, useForm } from '@inertiajs/react'
import { FormEvent } from 'react'
import Layout from '@/components/Layout'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function TenantManagement() {
  const { tenants } = usePage().props as any
  const { data, setData, post, processing, errors } = useForm({ name: '' })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    post('/api/tenants', {
      onSuccess: () => setData('name', '')
    })
  }

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-4">Tenant Management</h1>
        
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-medium">Create New Tenant</h3>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="Tenant Name"
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
                required
              />
              {errors.name && <div className="text-red-500 text-sm">{errors.name}</div>}
              <Button type="submit" disabled={processing}>
                {processing ? 'Creating...' : 'Create Tenant'}
              </Button>
            </form>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-medium">Existing Tenants</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants && tenants.length > 0 ? (
                tenants.map((tenant: any) => (
                  <TableRow key={tenant.id}>
                    <TableCell>{tenant.id}</TableCell>
                    <TableCell>{tenant.name}</TableCell>
                    <TableCell>{new Date(tenant.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                    No tenants found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  )
}
