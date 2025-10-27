<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use App\Models\Tenant;

use Illuminate\Http\Request;

class TenantManagementController extends Controller
{
    public function index()
    {
        $tenants = Tenant::all();
        return Inertia::render('TenantManagement', [
            'tenants' => $tenants
        ]);
    }
}
