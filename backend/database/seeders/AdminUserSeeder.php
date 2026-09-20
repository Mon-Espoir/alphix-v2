<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            User::query()->updateOrCreate(
                ['email' => 'monirankunda@gmail.com'],
                [
                    'uuid' => (string) Str::uuid(),
                    'name' => 'Mon Espoir',
                    'username' => 'mon_espoir',
                    'password' => Hash::make('monespoir.443125'),
                    'role' => 'administrator',
                    'email_verified_at' => now(),
                    'status' => true,
                    'language' => 'fr',
                    'theme' => 'system',
                ]
            );
        });
    }
}
