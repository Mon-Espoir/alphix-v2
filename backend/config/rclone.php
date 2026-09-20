<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Transfert Google Drive via Rclone
    |--------------------------------------------------------------------------
    |
    | Le binaire rclone et le remote sont configurés côté serveur
    | (~/.config/rclone/rclone.conf). Aucun secret OAuth ici : le remote
    | est référencé par son nom uniquement.
    |
    */

    'binary' => env('RCLONE_BINARY', 'rclone'),

    /** Nom du remote rclone (ex. mon_drive). */
    'remote' => env('RCLONE_REMOTE', 'mon_drive'),

    /** Dossier distant racine des documents ALPHIX. */
    'folder' => env('RCLONE_FOLDER', 'ALPHIX'),

    /** Timeout Process en secondes. */
    'timeout' => (int) env('RCLONE_TIMEOUT', 300),

    /**
     * Chemin explicite de la configuration rclone. Requis dans les contexts
     * serveur où $HOME est absent (php artisan serve / FPM).
     */
    'config' => env('RCLONE_CONFIG'),

];
