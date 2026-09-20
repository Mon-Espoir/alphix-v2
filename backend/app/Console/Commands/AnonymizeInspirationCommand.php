<?php

namespace App\Console\Commands;

use App\Models\Course;
use App\Models\Document;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Anonymise les documents "modèles d'inspiration" (rapports, exposés, TP, TD).
 *
 * Repère les titres / noms de fichier contenant des prénoms-noms d'étudiants,
 * les renomme sous une forme anonyme valorisante, régénère le slug et le nom
 * d'affichage, et réattribue l'auteur à un contributeur générique
 * "Contribution Anonyme" (aucun nom exposé via l'API : ni titre, ni slug,
 * ni original_name, ni uploader).
 *
 * Le titre original est archivé dans metadata (non exposé, non recherché)
 * pour garder une traçabilité interne.
 */
class AnonymizeInspirationCommand extends Command
{
    protected $signature = 'documents:anonymize-inspiration
        {--types=report,presentation,tp,td : Types traités (virgule)}
        {--dry-run : Liste sans écrire en base}';

    protected $description = 'Anonymise les rapports/exposés/TP/TD en modèles d’inspiration';

    /** Motifs de prénoms-noms d'étudiants (insensible casse/accents, limites de mots). */
    private const NAME_PATTERNS = [
        'adelard', 'monespoir', 'mon\s+espoir', 'espoir', 'edouard', 'isaac', 'lewis',
        'chanella', 'fabrice', 'fontaine', 'franck', 'jean\s+belly', 'jean', 'belly',
        'pacifique', 'paterne', 'patterne', 'maulo', 'noella', 'gayson', 'mutama', 'eudes',
        'laurene', 'arsene', 'diella', 'jech', 'doku', 'jeremie', 'peaceful',
    ];

    /** Mots génériques retirés pour extraire le qualificatif distinctif. */
    private const STOPWORDS = [
        'rapport', 'rapports', 'expose', 'exposes', 'visite', 'visites', 'station',
        'epuration', 'eaux', 'chimie', 'environnement', 'bac', 'bacc', 'iii', 'ii',
        'methode', 'methodes', 'technique', 'techniques', 'recherche', 'tecniq',
        'techinque', 'methodo', 'version', 'developpee', 'copie', 'final', 'finals',
        'sujet', 'sujets', 'tuyau', 'tuyaux', 'ecue', 'cours', 'cpkmge', 'docx',
        'de', 'la', 'le', 'les', 'du', 'des', 'et', 'en', 'au', 'aux', 'un', 'une',
        'sur', 'dans', 'pour', 'par', 'avec', 'mon', 'ma', 'mes', 'son', 'sa',
        'examen', 'examens', 'exam', 'td', 'tp', 'tuyau', 'tuyaux', 'corrige',
        'correction', 'syllabus', 'wps', 'office', 'phoenix', 'pharmac',
    ];

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $types = array_values(array_filter(array_map(
            static fn ($t) => strtolower(trim((string) $t)),
            explode(',', (string) $this->option('types'))
        )));
        if ($types === []) {
            $this->error('Aucun type valide.');

            return self::FAILURE;
        }

        $courses = Course::query()->get()->keyBy('id');
        $query = Document::query()->whereIn('doc_type', $types);
        $total = (clone $query)->count();
        $this->info("{$total} document(s) de type [".implode(',', $types).'] en base.');

        $matched = [];
        foreach ($query->orderBy('id')->get() as $doc) {
            if ($this->containsName($doc->title.' '.$doc->original_name)) {
                $matched[] = $doc;
            }
        }
        $this->info(count($matched).' document(s) avec nom personnel détecté.');

        $anonymous = $dryRun ? null : $this->anonymousContributor();
        $renamed = 0;
        $seenTitles = [];
        $seqPerCourse = [];

        foreach ($matched as $doc) {
            $course = $courses->get($doc->course_id);
            $courseName = $course?->name ?? 'Cours';
            $qualifier = $this->extractQualifier($doc->original_name.' '.$doc->title, $courseName);

            $base = match ($doc->doc_type) {
                'report', 'presentation' => "Modèle d'inspiration — {$courseName}",
                'tp' => "Exemple rédigé — TP {$courseName}",
                'td' => "Exemple rédigé — TD {$courseName}",
                default => "Exemple rédigé — {$courseName}",
            };
            $title = $qualifier !== '' ? $base.' · '.$qualifier : $base;
            // Unicité du titre dans le cours (compteur discret, déterministe sec/dry-run).
            $tKey = $doc->course_id.'|'.$title;
            $seenTitles[$tKey] = ($seenTitles[$tKey] ?? 0) + 1;
            if ($seenTitles[$tKey] > 1) {
                $title .= ' · n°'.$seenTitles[$tKey];
            }

            $ext = strtolower(pathinfo((string) $doc->original_name, PATHINFO_EXTENSION));
            $ext = $ext !== '' && strlen($ext) <= 5 ? '.'.$ext : '';
            $code = strtolower((string) ($course?->code ?? 'doc'));
            $seqPerCourse[$doc->course_id] = ($seqPerCourse[$doc->course_id] ?? 0) + 1;
            $newOriginal = 'modele-inspiration-'.$code.'-'.str_pad((string) $seqPerCourse[$doc->course_id], 2, '0', STR_PAD_LEFT).$ext;
            $newSlug = $this->uniqueSlug($title, (string) $doc->file_hash, (int) $doc->id);

            if ($dryRun) {
                $this->line("  #{$doc->id} [{$doc->doc_type}] « {$doc->title} »");
                $this->line("      → « {$title} » | {$newOriginal} | {$newSlug}");
                $renamed++;
                continue;
            }

            // Traçabilité interne SANS conserver le nom : seul le hash du
            // titre d'origine est gardé (metadata non exposée, non recherchée).
            $metadata = $doc->metadata;
            if (! is_array($metadata)) {
                $metadata = [];
            }
            $metadata[] = 'anonymized:inspiration-2026-09';
            $metadata['original_title_sha1'] = sha1((string) $doc->getOriginal('title'));

            $doc->title = mb_substr($title, 0, 255);
            $doc->original_name = mb_substr($newOriginal, 0, 255);
            $doc->slug = mb_substr($newSlug, 0, 255);
            $doc->user_id = $anonymous->id;
            $doc->metadata = $metadata;
            $doc->save();
            $renamed++;
        }

        // Compteurs cours recalculés.
        if (! $dryRun) {
            foreach (Course::query()->get() as $course) {
                $course->update(['total_documents' => Document::query()->where('course_id', $course->id)->count()]);
            }
        }

        // Validation : rescan complet des champs exposés/recherchés.
        $leaks = $this->scanLeaks($types);
        $this->newLine();
        $this->info('=== BILAN ANONYMISATION ===');
        $this->table(['Indicateur', 'Valeur'], [
            ['Documents renommés', $renamed.($dryRun ? ' (dry-run)' : '')],
            ['Auteur masqué', $dryRun ? '— (dry-run)' : 'Contribution Anonyme (id '.$anonymous->id.')'],
            ['Noms restants (champs exposés)', count($leaks)],
        ]);
        foreach (array_slice($leaks, 0, 15) as $leak) {
            $this->warn("  Reste : #{$leak['id']} [{$leak['doc_type']}] {$leak['title']}");
        }

        return self::SUCCESS;
    }

    private function containsName(string $text): bool
    {
        $ascii = $this->ascii($text);
        foreach (self::NAME_PATTERNS as $pattern) {
            if (preg_match('/\b(?:'.$pattern.')\b/u', $ascii) === 1) {
                return true;
            }
        }

        return false;
    }

    private function extractQualifier(string $text, string $courseName = ''): string
    {
        $ascii = $this->ascii($text);
        // Retire extensions et tokens techniques.
        $ascii = (string) preg_replace('/\.[a-z0-9]{1,5}\b/', ' ', $ascii);
        // Le nom du cours lui-même ne doit pas revenir en qualificatif.
        $extraStop = preg_split('/[^a-z0-9]+/', $this->ascii($courseName)) ?: [];
        $stopwords = array_merge(self::STOPWORDS, array_filter($extraStop, static fn ($w) => mb_strlen($w) >= 3));
        $tokens = preg_split('/[^a-z0-9]+/', $ascii) ?: [];
        $kept = [];
        foreach ($tokens as $tok) {
            $tok = trim($tok);
            if ($tok === '' || is_numeric($tok) && strlen($tok) > 4) {
                // Garde les petits nombres (groupe 1, 19...) mais pas les codes longs.
                if (! (is_numeric($tok) && (int) $tok < 300)) {
                    continue;
                }
            }
            if (in_array($tok, $stopwords, true)) {
                continue;
            }
            if (mb_strlen($tok) < 3) {
                continue;
            }
            // Exclut les prénoms eux-mêmes.
            $isName = false;
            foreach (self::NAME_PATTERNS as $pattern) {
                if (preg_match('/^(?:'.$pattern.')$/u', $tok) === 1) {
                    $isName = true;
                    break;
                }
            }
            if ($isName) {
                continue;
            }
            $kept[] = $tok;
        }
        // Priorité aux lieux/sujets distinctifs connus, sinon premiers tokens.
        $priority = ['buterere', 'regideso', 'filtration', 'serpentine', 'cocaine', 'cafeine', 'senecionine', 'emetine', 'biere', 'bieres', 'moulage', 'rotation', 'injection', 'heterocycles', 'azotes', 'primus', 'amstel', 'mukaza', 'quinine'];
        $picked = [];
        foreach ($priority as $p) {
            if (in_array($p, $kept, true) && ! in_array($p, $picked, true)) {
                $picked[] = $p;
            }
        }
        foreach ($kept as $tok) {
            if (! in_array($tok, $picked, true) && count($picked) < 3) {
                $picked[] = $tok;
            }
        }
        $picked = array_slice($picked, 0, 3);
        if ($picked === []) {
            return '';
        }
        $label = implode(' ', array_map(static fn ($w) => mb_strtoupper(mb_substr($w, 0, 1)).mb_substr($w, 1), $picked));

        return mb_substr($label, 0, 40);
    }

    private function uniqueSlug(string $title, string $hash, int $selfId): string
    {
        $base = Str::slug(mb_substr($title, 0, 180));
        if ($base === '') {
            $base = 'document';
        }
        $slug = $base.'-'.substr($hash !== '' ? $hash : Str::uuid()->toString(), 0, 8);
        $i = 2;
        while (Document::query()->where('slug', $slug)->where('id', '!=', $selfId)->exists()) {
            $slug = $base.'-'.substr($hash !== '' ? $hash : 'x', 0, 8).'-'.$i;
            $i++;
        }

        return mb_substr($slug, 0, 255);
    }

    private function anonymousContributor(): User
    {
        $existing = User::query()->where('username', 'contribution-anonyme')->first();
        if ($existing instanceof User) {
            return $existing;
        }

        return User::query()->create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Contribution Anonyme',
            'username' => 'contribution-anonyme',
            'email' => null,
            'password' => Hash::make(Str::random(32)),
            'role' => 'student',
            'status' => true,
            'language' => 'fr',
        ]);
    }

    /**
     * Rescan les champs exposés via l'API et la recherche (titre, slug,
     * original_name, description). Retourne les fuites éventuelles.
     *
     * @return list<array{id: int, doc_type: string, title: string}>
     */
    private function scanLeaks(array $types): array
    {
        $leaks = [];
        foreach (Document::query()->whereIn('doc_type', $types)->orderBy('id')->get() as $doc) {
            $hay = ($doc->title ?? '').' '.($doc->slug ?? '').' '.($doc->original_name ?? '').' '.($doc->description ?? '');
            if ($this->containsName($hay)) {
                $leaks[] = ['id' => $doc->id, 'doc_type' => $doc->doc_type, 'title' => $doc->title];
            }
        }

        return $leaks;
    }

    private function ascii(string $value): string
    {
        $trans = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        if (! is_string($trans) || $trans === '') {
            $trans = $value;
        }

        return strtolower($trans);
    }
}
