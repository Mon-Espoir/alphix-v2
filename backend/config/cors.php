<?php

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'up'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:5173',   // Vite dev server
        'http://localhost:4173',   // Vite preview
        'http://localhost:8000',   // Backend lui-même
        'http://localhost',        // Capacitor Android (http)
        'https://localhost',       // Capacitor Android (https)
        'capacitor://localhost',   // Capacitor iOS / WebView
        'ionic://localhost',       // Capacitor iOS (legacy)
    ],

    'allowed_origins_patterns' => [
        '#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#',
        '#^https://[a-z0-9-]+\.onrender\.com$#',   // Render free tier
        '#^capacitor://localhost$#',
        '#^ionic://localhost$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 3600,

    'supports_credentials' => false,

];
