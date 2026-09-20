<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | IA secondaire (recherche + reconnaissance de téléversements)
    |--------------------------------------------------------------------------
    | Endpoint compatible « chat completions » (OpenAI, DeepSeek, Ollama...).
    | Réglé par l'admin via les paramètres (toggle ON/OFF + clé + modèle),
    | avec repli sur les variables d'environnement ci-dessous.
    | La recherche SQL reste la source de vérité : tout appel IA est
    | non-bloquant (timeout court, repli silencieux si clé invalide/quota).
    */

    'secondary_ai' => [
        // URL du service compatible OpenAI : https://api.openai.com/v1/chat/completions,
        // https://api.deepseek.com/chat/completions, http://localhost:11434/v1/chat/completions (Ollama)
        'endpoint' => env('SECONDARY_AI_URL', 'https://api.openai.com/v1/chat/completions'),
        'key' => env('SECONDARY_AI_API_KEY', ''),
        'model' => env('SECONDARY_AI_MODEL', 'gpt-4o-mini'),
        'timeout' => (int) env('SECONDARY_AI_TIMEOUT', 4),
        'max_suggestions' => (int) env('SECONDARY_AI_MAX_SUGGESTIONS', 10),
    ],

];
