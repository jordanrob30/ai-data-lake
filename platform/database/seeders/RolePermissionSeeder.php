<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Models\User;
use App\Models\Tenant;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Permissions
        Permission::create(['name' => 'manage-tenants']);
        Permission::create(['name' => 'view-data']);
        Permission::create(['name' => 'edit-data']);

        // Roles
        $landlord = Role::create(['name' => 'landlord']);
        $landlord->givePermissionTo('manage-tenants');
        $landlord->givePermissionTo('view-data');
        $landlord->givePermissionTo('edit-data');

        $tenantAdmin = Role::create(['name' => 'tenant-admin']);
        $tenantAdmin->givePermissionTo('view-data');
        $tenantAdmin->givePermissionTo('edit-data');

        $tenantViewer = Role::create(['name' => 'tenant-viewer']);
        $tenantViewer->givePermissionTo('view-data');

        // Sample data
        $tenant1 = Tenant::create(['id' => (string) \Illuminate\Support\Str::uuid(), 'name' => 'Tenant 1']);
        $tenant2 = Tenant::create(['id' => (string) \Illuminate\Support\Str::uuid(), 'name' => 'Tenant 2']);

        $landlordUser = User::create([
            'name' => 'Landlord',
            'email' => 'landlord@example.com',
            'password' => bcrypt('password'),
        ]);
        $landlordUser->assignRole('landlord');

        // Tenant 1 users
        $t1Admin = User::create([
            'name' => 'Tenant1 Admin',
            'email' => 't1admin@example.com',
            'password' => bcrypt('password'),
            'tenant_id' => $tenant1->id,
        ]);
        $t1Admin->assignRole('tenant-admin');

        $t1Viewer = User::create([
            'name' => 'Tenant1 Viewer',
            'email' => 't1viewer@example.com',
            'password' => bcrypt('password'),
            'tenant_id' => $tenant1->id,
        ]);
        $t1Viewer->assignRole('tenant-viewer');

        // Tenant 2 users
        $t2Admin = User::create([
            'name' => 'Tenant2 Admin',
            'email' => 't2admin@example.com',
            'password' => bcrypt('password'),
            'tenant_id' => $tenant2->id,
        ]);
        $t2Admin->assignRole('tenant-admin');

        $t2Viewer = User::create([
            'name' => 'Tenant2 Viewer',
            'email' => 't2viewer@example.com',
            'password' => bcrypt('password'),
            'tenant_id' => $tenant2->id,
        ]);
        $t2Viewer->assignRole('tenant-viewer');
    }
}
