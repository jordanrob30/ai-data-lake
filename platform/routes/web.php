<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\TenantManagementController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\TestIngestionController;

Route::get('/', function () {
    return Inertia::render('Welcome');
});

// Authentication routes
Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

// Protected routes
Route::middleware('auth')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/tenant-management', [TenantManagementController::class, 'index'])->name('tenant-management');
    Route::get('/test-ingestion', [TestIngestionController::class, 'index'])->name('test-ingestion');
});
