<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('system_logs', function (Blueprint $table) {
            if (! Schema::hasColumn('system_logs', 'event_type')) {
                $table->string('event_type', 120)->nullable()->index()->after('user_id');
            }
            if (! Schema::hasColumn('system_logs', 'status')) {
                $table->string('status', 20)->nullable()->index()->after('level');
            }
            if (! Schema::hasColumn('system_logs', 'device_info')) {
                $table->json('device_info')->nullable()->after('ip_address');
            }
            if (! Schema::hasColumn('system_logs', 'details')) {
                $table->text('details')->nullable()->after('message');
            }
        });
    }

    public function down(): void
    {
        Schema::table('system_logs', function (Blueprint $table) {
            $table->dropColumn(['event_type', 'status', 'device_info', 'details']);
        });
    }
};
