<?php

namespace Tests\Feature;

use App\Services\SecondaryAIService;
use Illuminate\Auth\Middleware\Authenticate;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class SecondaryAIServiceTest extends TestCase
{
    private function service(): SecondaryAIService
    {
        return app(SecondaryAIService::class);
    }

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();
    }

    protected function tearDown(): void
    {
        Cache::flush();

        parent::tearDown();
    }

    public function test_service_is_disabled_by_default_without_key(): void
    {
        config(['services.secondary_ai.key' => '']);
        config(['services.secondary_ai.endpoint' => 'https://api.openai.com/v1/chat/completions']);

        $this->assertFalse($this->service()->isEnabled());
        $this->assertSame([], $this->service()->suggest('math'));
        $this->assertSame([], $this->service()->analyze('mathematiques_bac1_examen.pdf'));
    }

    public function test_toggle_off_overrides_present_key(): void
    {
        $service = $this->service();
        $service->setEnabled(false);
        $service->setApiKey('sk-test');

        $this->assertFalse($service->isEnabled());

        $service->setEnabled(true);

        $this->assertTrue($service->isEnabled());
        $this->assertTrue($service->status()['enabled']);
        $this->assertTrue($service->status()['configured']);
    }

    public function test_key_and_model_override_are_shared_and_resolved(): void
    {
        $service = $this->service();
        config(['services.secondary_ai.key' => 'cle_env']);
        config(['services.secondary_ai.model' => 'deepseek-chat']);

        // Sans override : valeurs d'env/config.
        $service->setEnabled(true);
        $this->assertTrue($service->isEnabled());
        $this->assertSame('deepseek-chat', $service->resolveModel());

        // Override admin : partage pour tous les utilisateurs.
        $service->setApiKey('sk-admin');
        $service->setModel('gpt-4o-mini');

        $this->assertSame('sk-admin', (new \ReflectionMethod($service, 'resolveApiKey'))->invoke($service));
        $this->assertSame('gpt-4o-mini', $service->resolveModel());

        // Vider l'override -> retour aux valeurs d'environnement.
        $service->setApiKey('');
        $service->setModel('');

        $this->assertSame('cle_env', (new \ReflectionMethod($service, 'resolveApiKey'))->invoke($service));
        $this->assertSame('deepseek-chat', $service->resolveModel());
    }

    public function test_localhost_endpoint_is_enabled_without_key(): void
    {
        $service = $this->service();
        config(['services.secondary_ai.key' => '']);
        config(['services.secondary_ai.endpoint' => 'http://127.0.0.1:11434/v1/chat/completions']);
        $service->setEnabled(true);

        $this->assertTrue($service->isEnabled());
    }

    public function test_suggest_falls_back_silently_on_unreachable_endpoint(): void
    {
        $service = $this->service();
        $service->setEnabled(true);
        $service->setApiKey('sk-invalid');
        config(['services.secondary_ai.endpoint' => 'http://127.0.0.1:1/v1/chat/completions']);
        config(['services.secondary_ai.timeout' => 1]);

        // Non-bloquant : jamais d'exception, tableau vide en cas d'echec.
        $this->assertSame([], $service->suggest('algebre'));
        $this->assertSame([], $service->analyze('algebre_td.pdf'));
    }

    public function test_controller_status_and_update_roundtrip(): void
    {
        $this->withoutMiddleware(Authenticate::class);

        $response = $this->putJson('/api/v1/secondary-ai/settings', [
            'enabled' => true,
            'api_key' => 'sk-tmp',
            'model' => 'llama-3',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.enabled', true)
            ->assertJsonPath('data.model', 'llama-3');

        $status = $this->getJson('/api/v1/secondary-ai/status');

        $status->assertOk()
            ->assertJsonPath('data.enabled', true)
            ->assertJsonPath('data.model', 'llama-3')
            ->assertJsonPath('data.configured', true);
    }

    public function test_invalid_payload_is_rejected(): void
    {
        $this->withoutMiddleware(Authenticate::class);

        $this->putJson('/api/v1/secondary-ai/settings', ['enabled' => 'pas-un-boolean'])
            ->assertStatus(422);
    }
}
