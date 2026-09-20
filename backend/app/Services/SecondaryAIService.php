<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Service IA secondaire (non-bloquant, lecture seule)
 * ---------------------------------------------------------------------------
 * Suggestions complementaires APRES la recherche SQL principale (source de
 * verite) et reconnaissance des televersements (cours + type de document).
 *
 * Garanties de fiabilite :
 *   - toggle admin global (Cache) : OFF => desactive partout, repli SQL seul ;
 *   - cle API invalide / quota epuise / endpoint injoignable => repli silencieux
 *     (jamais d'exception remontee aux utilisateurs) ;
 *   - timeout court borne et cache des suggestions ;
 *   - endpoint compatible « chat completions » (OpenAI, DeepSeek, Ollama...).
 *
 * La cle et le modele sont lus depuis les parametres admin (override en Cache)
 * en priorite, sinon depuis la configuration / variables d'environnement.
 */
class SecondaryAIService
{
    private const CACHE_ENABLED = 'secondary_ai.enabled';

    private const CACHE_KEY_OVERRIDE = 'secondary_ai.key_override';

    private const CACHE_MODEL_OVERRIDE = 'secondary_ai.model_override';

    private const CACHE_STATUS = 'secondary_ai.last_status';

    private const CACHE_CHECKED_AT = 'secondary_ai.last_checked_at';

    /**
     * Indique si le service IA est configure et actif pour tous les utilisateurs.
     * Toggle admin OFF => desactive globalement meme si cle presente.
     * Cle absente => actif uniquement si l'endpoint est local (ex. Ollama).
     */
    public function isEnabled(): bool
    {
        try {
            $toggled = Cache::get(self::CACHE_ENABLED);

            // null = jamais configure par l'admin => ON par defaut si config OK.
            if ($toggled === false) {
                return false;
            }

            if ($this->resolveApiKey() === '') {
                return $this->isLocalhostEndpoint($this->resolveEndpoint());
            }

            return true;
        } catch (\Throwable $e) {
            Log::debug('secondary_ai:isEnabled erreur', ['error' => $e->getMessage()]);

            return false;
        }
    }

    /**
     * Statut courant pour le panneau admin (sans jamais exposer la cle).
     *
     * @return array{enabled: bool, configured: bool, model: string, status: string, checked_at: string|null}
     */
    public function status(): array
    {
        try {
            return [
                'enabled' => $this->isEnabled(),
                'configured' => $this->resolveApiKey() !== '' && $this->resolveEndpoint() !== '',
                'model' => $this->resolveModel(),
                'status' => (string) Cache::get(self::CACHE_STATUS, 'unknown'),
                'checked_at' => Cache::get(self::CACHE_CHECKED_AT),
            ];
        } catch (\Throwable $e) {
            Log::debug('secondary_ai:status erreur', ['error' => $e->getMessage()]);

            return [
                'enabled' => false,
                'configured' => false,
                'model' => '',
                'status' => 'unknown',
                'checked_at' => null,
            ];
        }
    }

    /**
     * Active / desactive globalement le service (admin uniquement).
     */
    public function setEnabled(bool $enabled): void
    {
        Cache::forever(self::CACHE_ENABLED, $enabled);
    }

    /**
     * Met a jour la cle API (admin uniquement, stockee hors .env).
     * Chaine vide => efface l'override et retombe sur l'env.
     */
    public function setApiKey(string $key): void
    {
        $key = trim($key);

        if ($key === '') {
            Cache::forget(self::CACHE_KEY_OVERRIDE);
        } else {
            Cache::forever(self::CACHE_KEY_OVERRIDE, $key);
        }

        $this->resetHealth();
    }

    /**
     * Met a jour le modele (admin uniquement). Chaine vide => env/config.
     */
    public function setModel(string $model): void
    {
        $model = trim($model);

        if ($model === '') {
            Cache::forget(self::CACHE_MODEL_OVERRIDE);
        } else {
            Cache::forever(self::CACHE_MODEL_OVERRIDE, $model);
        }

        $this->resetHealth();
    }

    /**
     * Cle effective : override admin prioritaire, sinon env/config.
     */
    private function resolveApiKey(): string
    {
        try {
            $override = (string) Cache::get(self::CACHE_KEY_OVERRIDE, '');

            return trim($override !== '' ? $override : (string) config('services.secondary_ai.key', ''));
        } catch (\Throwable) {
            return '';
        }
    }

    /**
     * Modele effectif : override admin prioritaire, sinon env/config.
     */
    public function resolveModel(): string
    {
        try {
            $override = (string) Cache::get(self::CACHE_MODEL_OVERRIDE, '');
            $model = trim($override !== '' ? $override : (string) config('services.secondary_ai.model', 'gpt-4o-mini'));

            return $model !== '' ? $model : 'gpt-4o-mini';
        } catch (\Throwable) {
            return 'gpt-4o-mini';
        }
    }

    /**
     * Endpoint effectif (https://.../chat/completions ou /v1/chat/completions).
     */
    private function resolveEndpoint(): string
    {
        try {
            return trim((string) config('services.secondary_ai.endpoint', ''));
        } catch (\Throwable) {
            return '';
        }
    }

    private function resolveTimeout(): int
    {
        try {
            $timeout = (int) config('services.secondary_ai.timeout', 4);

            return max(1, min(8, $timeout));
        } catch (\Throwable) {
            return 4;
        }
    }

    private function resolveMaxSuggestions(): int
    {
        try {
            $max = (int) config('services.secondary_ai.max_suggestions', 10);

            return max(1, min(25, $max));
        } catch (\Throwable) {
            return 10;
        }
    }

    private function isLocalhostEndpoint(string $url): bool
    {
        $host = parse_url($url, PHP_URL_HOST);

        return $host === 'localhost' || $host === '127.0.0.1' || $host === '::1';
    }

    /**
     * Reinitialise le statut (quota/auth) lors d'un changement cle/modele.
     */
    private function resetHealth(): void
    {
        Cache::forget(self::CACHE_STATUS);
        Cache::forget(self::CACHE_CHECKED_AT);
    }

    /**
     * Memorise le dernier statut (ok / quota_exceeded / auth_error / error).
     */
    private function recordStatus(string $status): void
    {
        try {
            Cache::put(self::CACHE_STATUS, $status, now()->addDay());
            Cache::put(self::CACHE_CHECKED_AT, now()->toIso8601String(), now()->addDay());
        } catch (\Throwable) {
            // Statut informatif uniquement, jamais bloquant.
        }
    }

    /**
     * Suggestions IA complementaires pour une requete (non-bloquant).
     * Resultats mis en cache 6h : la recherche SQL repond toujours d'abord,
     * le premier appel paie la latence, les suivants sont instantanes.
     * Retourne toujours un tableau (vide en cas d'echec).
     *
     * @param  string  $query  Requete utilisateur deja validee
     * @param  array<string, mixed>  $context  Contexte optionnel (faculte, resultats SQL...)
     * @return list<array{label: string, score?: float}>
     */
    public function suggest(string $query, array $context = []): array
    {
        $query = trim($query);

        if ($query === '' || ! $this->isEnabled()) {
            return [];
        }

        $cacheKey = 'secondary_ai.suggestions:'.md5($query.'|'.$this->resolveModel());

        try {
            return Cache::remember($cacheKey, now()->addHours(6), function () use ($query, $context) {
                $system = 'Tu es un assistant de recherche documentaire pour une bibliotheque universitaire (cours, examens, TP, TD, syllabi). '
                    .'Reponds UNIQUEMENT en JSON avec un tableau sous la cle "suggestions" contenant des objets {label: string, score: number} '
                    .'(score entre 0 et 1). Propose des termes de recherche alternatifs ou plus precis, en francais, courts et utiles pour affiner une recherche documentaire.';

                $user = 'Requete : "'.$query.'"'
                    .(($context['doc_type'] ?? '') !== '' ? ' | Filtre type : '.$context['doc_type'] : '')
                    .' | Contexte : '.($context['total_results'] ?? 'inconnu').' resultats.';
                $user .= ' | Maximum '.$this->resolveMaxSuggestions().' suggestions.';

                $decoded = $this->chat($system, $user);

                $suggestions = $decoded['suggestions'] ?? $decoded['data'] ?? $decoded;

                if (! is_array($suggestions)) {
                    return [];
                }

                $clean = [];

                foreach ($suggestions as $entry) {
                    try {
                        if (is_string($entry) && trim($entry) !== '') {
                            $clean[] = ['label' => trim($entry)];
                        } elseif (is_array($entry) && isset($entry['label']) && is_string($entry['label']) && trim($entry['label']) !== '') {
                            $clean[] = [
                                'label' => trim($entry['label']),
                                'score' => isset($entry['score']) ? (float) $entry['score'] : null,
                            ];
                        }

                        if (count($clean) >= $this->resolveMaxSuggestions()) {
                            break;
                        }
                    } catch (\Throwable) {
                        continue;
                    }
                }

                return $clean;
            });
        } catch (\Throwable) {
            return [];
        }
    }

    /**
     * Analyse IA d'un nom de fichier pour suggerer le type de document et les
     * mots-cles du cours (non-bloquant). Sert a enrichir la reconnaissance
     * locale. Retourne un tableau vide si IA desactivee / en erreur.
     *
     * @return array{doc_type?: string, academic_year?: string|null, level_code?: string|null, semester_code?: string|null, course_keywords?: list<string>}
     */
    public function analyze(string $filename): array
    {
        $filename = trim($filename);

        if ($filename === '' || ! $this->isEnabled()) {
            return [];
        }

        $cacheKey = 'secondary_ai.analyze:'.md5($filename.'|'.$this->resolveModel());

        try {
            return Cache::remember($cacheKey, now()->addHours(12), function () use ($filename) {
                $allowedTypes = implode(',', [
                    'course', 'tp', 'td', 'exam', 'correction', 'syllabus',
                    'summary', 'book', 'thesis', 'report', 'presentation',
                    'video', 'external_link', 'other',
                ]);

                $system = 'Tu es un catalogueur documentaire universitaire. A partir d\'un nom de fichier, tu deduis le type de document et des mots-cles du cours. '
                    .'Reponds UNIQUEMENT en JSON strict avec ces cles : '
                    .'{"doc_type": "une des valeurs : '.$allowedTypes.'", '
                    .'"academic_year": "annee academique ou null", '
                    .'"level_code": "BAC1, BAC2, BAC3, M1, M2 ou null", '
                    .'"semester_code": "S1 ou S2 ou null", '
                    .'"course_keywords": ["mots-cles du nom du cours, en minuscules, sans accents"]}. '
                    .'Si tu ne peux pas determiner une valeur, renvoie null (ou un tableau vide).';

                $decoded = $this->chat($system, 'Nom du fichier : "'.$filename.'"');

                if ($decoded === []) {
                    return [];
                }

                return [
                    'doc_type' => isset($decoded['doc_type']) && is_string($decoded['doc_type']) && in_array($decoded['doc_type'], explode(',', $allowedTypes), true)
                        ? $decoded['doc_type']
                        : null,
                    'academic_year' => isset($decoded['academic_year']) && is_string($decoded['academic_year']) && $decoded['academic_year'] !== ''
                        ? $decoded['academic_year']
                        : null,
                    'level_code' => isset($decoded['level_code']) && is_string($decoded['level_code']) && preg_match('/^(BAC[123]|M[12])$/', $decoded['level_code'])
                        ? $decoded['level_code']
                        : null,
                    'semester_code' => isset($decoded['semester_code']) && is_string($decoded['semester_code']) && preg_match('/^S[12]$/', $decoded['semester_code'])
                        ? $decoded['semester_code']
                        : null,
                    'course_keywords' => isset($decoded['course_keywords']) && is_array($decoded['course_keywords'])
                        ? array_values(array_filter(array_map(
                            static fn ($k) => trim((string) $k),
                            $decoded['course_keywords']
                        ), static fn ($k) => $k !== ''))
                        : [],
                ];
            });
        } catch (\Throwable) {
            return [];
        }
    }

    /**
     * Appel unique vers un endpoint « chat completions » compatible OpenAI.
     * Non-bloquant : timeout court, reponse JSON toleree, repli silencieux.
     *
     * @return array<string, mixed> JSON decode (vide en cas d'echec)
     */
    private function chat(string $system, string $user): array
    {
        $endpoint = $this->resolveEndpoint();
        $model = $this->resolveModel();
        $apiKey = $this->resolveApiKey();
        $timeout = $this->resolveTimeout();

        if ($endpoint === '') {
            return [];
        }

        $payload = [
            'model' => $model,
            'messages' => [
                ['role' => 'system', 'content' => $system],
                ['role' => 'user', 'content' => $user],
            ],
            'temperature' => 0.1,
            'max_tokens' => 300,
            'stream' => false,
        ];

        $ch = curl_init();

        if ($ch === false) {
            return [];
        }

        try {
            curl_setopt($ch, CURLOPT_URL, $endpoint);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, $timeout);
            curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);

            $headers = ['Content-Type: application/json', 'Accept: application/json'];

            if ($apiKey !== '') {
                $headers[] = 'Authorization: Bearer '.$apiKey;
            }

            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

            $raw = curl_exec($ch);

            if ($raw === false) {
                return [];
            }

            $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);

            // Quota / auth / indisponible : repli silencieux + badge admin.
            if ($status === 429) {
                $this->recordStatus('quota_exceeded');

                return [];
            }

            if ($status === 401 || $status === 403) {
                $this->recordStatus('auth_error');

                return [];
            }

            if ($status < 200 || $status >= 300) {
                $this->recordStatus('error');

                return [];
            }

            $decoded = json_decode((string) $raw, true);

            if (! is_array($decoded)) {
                $this->recordStatus('error');

                return [];
            }

            $content = $decoded['choices'][0]['message']['content'] ?? null;

            if (is_array($content)) {
                // Certains providers renvoient un tableau de segments {type, text}.
                $content = implode('', array_map(
                    static fn ($seg) => is_array($seg) && isset($seg['text']) ? (string) $seg['text'] : '',
                    $content
                ));
            }

            $result = $this->extractJson((string) $content);

            if ($result === []) {
                $this->recordStatus('error');

                return [];
            }

            $this->recordStatus('ok');

            return $result;
        } catch (\Throwable $e) {
            Log::debug('secondary_ai:chat erreur', ['error' => $e->getMessage()]);

            return [];
        } finally {
            curl_close($ch);
        }
    }

    /**
     * Extrait du JSON depuis la reponse eventuellement entouree de markdown.
     *
     * @return array<string, mixed>
     */
    private function extractJson(string $content): array
    {
        $content = trim($content);

        if ($content === '') {
            return [];
        }

        if (preg_match('/```(?:json)?\s*(.*?)```/s', $content, $m)) {
            $content = trim($m[1]);
        }

        $decoded = json_decode($content, true);

        if (is_array($decoded)) {
            return $decoded;
        }

        if (preg_match('/\{.*\}/s', $content, $m)) {
            $decoded = json_decode($m[0], true);

            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return [];
    }
}
