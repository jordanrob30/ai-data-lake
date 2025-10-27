<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class TestIngestionController extends Controller
{
    public function index()
    {       
        return Inertia::render('TestIngestion');
    }
}
