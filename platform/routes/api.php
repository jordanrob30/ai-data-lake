<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\MappingController;
use App\Http\Controllers\Api\ConfirmationController;
use App\Http\Controllers\Api\TenantController;
use App\Http\Controllers\Api\SchemaController;
use App\Http\Controllers\Api\EntityController;

Route::apiResource('mappings', MappingController::class);
Route::post('confirm-mapping', [ConfirmationController::class, 'store']);
Route::get('pending-mappings', [ConfirmationController::class, 'index']);
Route::apiResource('tenants', TenantController::class);

// Schema management API endpoints for ingestion service
Route::prefix('schemas')->group(function () {
    Route::get('hash/{hash}', [SchemaController::class, 'getByHash']);
    Route::get('hash/{hash}/count', [SchemaController::class, 'getPendingRecordsCount']);
    Route::post('hash/{hash}/increment', [SchemaController::class, 'incrementPendingRecords']);
    Route::post('/', [SchemaController::class, 'create']);
    Route::get('confirmed', [SchemaController::class, 'getConfirmed']);
    Route::get('pending', [SchemaController::class, 'getPending']);
    Route::post('create-as-entity', [SchemaController::class, 'createAsEntity']);

    // Entity management endpoints
    Route::post('{schema}/entities', [EntityController::class, 'saveEntities']);
    Route::get('{schema}/entities', [EntityController::class, 'getEntities']);

    // Field-level similarity matching for auto-mapping
    Route::get('{schema}/entity-matches/{entity}', [SchemaController::class, 'getEntityFieldMatches']);

    // AI-powered schema analysis
    Route::post('{schema}/analyze', [SchemaController::class, 'analyzeSchema']);
    Route::get('{schema}/ai-recommendations', [SchemaController::class, 'getAIRecommendations']);
});
