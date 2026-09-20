<?php

namespace App\Repositories;

use App\Models\Course;
use Illuminate\Database\Eloquent\Collection;

/**
 * Data-access layer for the courses table.
 */
class CourseRepository extends BaseRepository
{
    /**
     * Create a new course repository instance.
     */
    public function __construct(Course $model)
    {
        parent::__construct($model);
    }

    /**
     * Find a course by its unique code.
     */
    public function findByCode(string $code): ?Course
    {
        /** @var Course|null */
        return $this->query()->where('code', $code)->first();
    }

    /**
     * Find a course by its unique slug.
     */
    public function findBySlug(string $slug): ?Course
    {
        /** @var Course|null */
        return $this->query()->where('slug', $slug)->first();
    }

    /**
     * Retrieve courses for a given department.
     *
     * @return Collection<int, Course>
     */
    public function getByDepartmentId(int $departmentId): Collection
    {
        return $this->query()
            ->withCount('documents')
            ->with(['department.faculty', 'level', 'semester'])
            ->where('department_id', $departmentId)
            ->orderBy('name')
            ->get();
    }

    /**
     * Retrieve courses for a given level.
     *
     * @return Collection<int, Course>
     */
    public function getByLevelId(int $levelId): Collection
    {
        return $this->query()
            ->withCount('documents')
            ->with(['department.faculty', 'level', 'semester'])
            ->where('level_id', $levelId)
            ->orderBy('name')
            ->get();
    }

    /**
     * Retrieve courses for a given semester.
     *
     * @return Collection<int, Course>
     */
    public function getBySemesterId(int $semesterId): Collection
    {
        return $this->query()
            ->withCount('documents')
            ->with(['department.faculty', 'level', 'semester'])
            ->where('semester_id', $semesterId)
            ->orderBy('name')
            ->get();
    }

    /**
     * Retrieve active courses.
     *
     * @return Collection<int, Course>
     */
    public function getActive(): Collection
    {
        return $this->query()
            ->withCount('documents')
            ->with(['department.faculty', 'level', 'semester'])
            ->where('status', true)
            ->orderBy('name')
            ->get();
    }

    /**
     * Retrieve all courses with real document counts (LEFT JOIN).
     *
     * @return Collection<int, Course>
     */
    public function getAllWithDocumentCounts(): Collection
    {
        return $this->query()
            ->withCount('documents')
            ->with(['department.faculty', 'level', 'semester'])
            ->orderBy('name')
            ->get();
    }

    /**
     * Search courses by code/name with document counts.
     *
     * Recherche tolérante : insensible a la casse, aux accents (equations =
     * Équations), aux espaces multiples (CHI 3509 = CHI3509) et aux chiffres
     * romains (3 = III). Le haystack couvre TOUTE la hiérarchie académique :
     * code, nom, description, enseignant, département, faculté, niveau (BAC),
     * semestre et documents liés (titre, nom de fichier, type, année).
     * Le volume de cours est faible (~1 000) : la normalisation est appliquée
     * en PHP après chargement.
     *
     * @return Collection<int, Course>
     */
    public function searchWithDocumentCounts(string $term): Collection
    {
        // Phrases exigees en bloc : "bac3"/"bac iii" -> "baccalaureat 3",
        // "S5"/"semestre 5" -> "semestre 5". Les mots consommes ne sont
        // pas re-evalues seuls (evite que "5" colle aux codes CHI35xx).
        $normalized = self::normalizeText($term);
        $phrases = [];
        $normalized = (string) preg_replace_callback(
            '/\bbac\s?(\d+|[ivxlcdm]+)\b/u',
            function (array $m) use (&$phrases): string {
                $number = ctype_digit($m[1]) ? (int) $m[1] : self::romanToArabic($m[1]);
                if ($number !== null) {
                    $phrases[] = 'baccalaureat '.$number;

                    return ' ';
                }

                return $m[0];
            },
            $normalized,
        );
        $normalized = (string) preg_replace_callback(
            '/\b(?:s|semestre)\s?(\d+)\b/u',
            function (array $m) use (&$phrases): string {
                $phrases[] = 'semestre '.$m[1];

                return ' ';
            },
            $normalized,
        );

        $terms = array_values(array_filter(preg_split('/\s+/u', trim($normalized)) ?: []));

        $query = $this->query()
            ->withCount('documents')
            ->with(['department.faculty', 'level', 'semester', 'documents:id,course_id,title,original_name,doc_type,academic_year', 'documents.tags:id,name']);

        if ($terms === [] && $phrases === []) {
            return $query->orderBy('name')->get();
        }

        $wanted = array_map(
            fn (string $word): array => $this->termVariants($word),
            $terms,
        );

        $courses = $query->orderBy('name')->get();

        return $courses->filter(function (Course $course) use ($wanted, $phrases): bool {
            $haystack = self::normalizeText(implode(' ', array_filter([
                $course->code,
                $course->name,
                $course->description,
                $course->teacher,
                $course->department?->name,
                $course->department?->faculty?->name,
                $course->level?->name,
                $course->semester?->name,
            ])));

            // Les documents liés participent aussi à la recherche
            // (titre, nom de fichier, type, année, tags/mots-clés).
            $documentHaystack = self::normalizeText($course->documents->map(
                static fn ($doc): string => implode(' ', array_filter([
                    $doc->title,
                    $doc->original_name,
                    $doc->doc_type,
                    $doc->academic_year,
                    $doc->tags->pluck('name')->implode(' '),
                ])),
            )->implode(' '));

            $compact = str_replace(' ', '', $haystack.' '.$documentHaystack);

            foreach ($phrases as $phrase) {
                if (! str_contains($haystack, $phrase)
                    && ! str_contains($compact, str_replace(' ', '', $phrase))) {
                    return false;
                }
            }

            foreach ($wanted as $variants) {
                $found = false;
                foreach ($variants as $variant) {
                    if ($variant === '') {
                        continue;
                    }
                    // Correspondance directe OU forme compacte (espaces ignorés).
                    if (str_contains($haystack, $variant)
                        || str_contains($documentHaystack, $variant)
                        || str_contains($compact, str_replace(' ', '', $variant))) {
                        $found = true;
                        break;
                    }
                }
                if (! $found) {
                    return false;
                }
            }

            return true;
        })->values();
    }

    /**
     * Variantes de recherche d'un mot : forme normalisee + equivalents
     * chiffres romains <-> chiffres arabes ("iii" <-> "3"), niveaux BAC
     * ("bac3" / "bac iii" -> "baccalaureat 3") et semestres
     * ("s5" / "semestre5" -> "semestre 5").
     *
     * @return list<string>
     */
    protected function termVariants(string $word): array
    {
        $base = self::normalizeText($word);
        $variants = [$base];

        // Niveau : "bac3", "bac-3", "bac iii" -> "baccalaureat 3".
        if (preg_match('/^bac(\d+|[ivxlcdm]+)$/', $base, $m) === 1) {
            $number = ctype_digit($m[1]) ? (int) $m[1] : self::romanToArabic($m[1]);
            if ($number !== null) {
                $variants[] = 'baccalaureat '.$number;
            }
        }

        // Semestre : "s5", "semestre5" -> "semestre 5".
        if (preg_match('/^(?:s|semestre)(\d+)$/', $base, $m) === 1) {
            $variants[] = 'semestre '.$m[1];
        }

        if (preg_match('/^[ivxlcdm]+$/', $base) === 1) {
            $arabic = self::romanToArabic($base);
            if ($arabic !== null) {
                $variants[] = (string) $arabic;
            }
        } elseif (ctype_digit($base)) {
            $roman = self::arabicToRoman((int) $base);
            if ($roman !== null) {
                $variants[] = $roman;
            }
        }

        return array_values(array_unique(array_filter($variants)));
    }

    /**
     * Recherche tolérante (fuzzy) quand la recherche stricte échoue.
     * Levenshtein <=2 pour mots >=5, préfixe long, compact sans espaces.
     *
     * @return \Illuminate\Database\Eloquent\Collection<int, Course>
     */
    public function searchWithDocumentCountsFuzzy(string $term): \Illuminate\Database\Eloquent\Collection
    {
        $norm = self::normalizeText($term);
        $words = array_values(array_filter(preg_split('/\s+/u', trim($norm)) ?: []));
        if ($words === []) return collect([]);

        $all = $this->query()->withCount('documents')->with(['department.faculty','level','semester','documents:id,course_id,title,original_name,doc_type,academic_year','documents.tags:id,name'])->orderBy('name')->get();
        return $all->filter(function (Course $course) use ($words): bool {
            $hay = self::normalizeText(implode(' ', array_filter([
                $course->code, $course->name, $course->description, $course->teacher,
                $course->department?->name, $course->department?->faculty?->name,
                $course->level?->name, $course->semester?->name,
            ])));
            $docHay = self::normalizeText($course->documents->map(fn($d)=> implode(' ', array_filter([$d->title,$d->original_name,$d->doc_type,$d->academic_year,$d->tags->pluck('name')->implode(' ')])))->implode(' '));
            $compact = str_replace(' ', '', $hay.' '.$docHay);
            foreach ($words as $w) {
                $found = false;
                foreach ([$hay, $docHay] as $h) {
                    if (str_contains($h, $w) || str_contains($compact, str_replace(' ', '', $w))) { $found=true; break; }
                }
                if (!$found) {
                    // fuzzy sur chaque mot du haystack (même garde-fous que SearchRepository)
                    $hayWords = preg_split('/\s+/u', $hay.' '.$docHay) ?: [];
                    foreach ($hayWords as $hw) {
                        if (mb_strlen($hw) < 3 || mb_strlen($w) < 3) continue;
                        $threshold = (mb_strlen($hw) >= 5 && mb_strlen($w) >= 5) ? 2 : 1;
                        if (abs(mb_strlen($hw)-mb_strlen($w)) > $threshold) continue;
                        if (mb_substr($hw, 0, 2) !== mb_substr($w, 0, 2)) continue;
                        if (levenshtein($hw, $w) <= $threshold) { $found=true; break; }
                        if (mb_strlen($w) >=4 && str_starts_with($hw, mb_substr($w,0,-1))) { $found=true; break; }
                        if (mb_strlen($hw) >=4 && str_starts_with($w, mb_substr($hw,0,-1))) { $found=true; break; }
                    }
                }
                if (!$found) return false;
            }
            return true;
        })->values();
    }

    /**
     * Normalisation recherche : minuscules + suppression des accents +
     * espaces multiples reduits a un seul espace.
     */
    public static function normalizeText(string $value): string
    {
        $lower = mb_strtolower(trim($value), 'UTF-8');
        $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $lower);

        $flat = $ascii === false ? $lower : strtolower($ascii);

        return trim((string) preg_replace('/\s+/u', ' ', $flat));
    }

    /**
     * Convertit un chiffre romain (i..mmm) en entier, null sinon.
     */
    protected static function romanToArabic(string $roman): ?int
    {
        $values = ['i' => 1, 'v' => 5, 'x' => 10, 'l' => 50, 'c' => 100, 'd' => 500, 'm' => 1000];
        $length = strlen($roman);
        $total = 0;

        for ($i = 0; $i < $length; $i++) {
            $current = $values[$roman[$i]] ?? null;
            if ($current === null) {
                return null;
            }
            $next = $i + 1 < $length ? ($values[$roman[$i + 1]] ?? 0) : 0;
            $total += $current < $next ? -$current : $current;
        }

        return $total > 0 && $total <= 3999 ? $total : null;
    }

    /**
     * Convertit un entier (1..3999) en chiffres romains, null sinon.
     */
    protected static function arabicToRoman(int $number): ?string
    {
        if ($number < 1 || $number > 3999) {
            return null;
        }

        $map = [
            1000 => 'm', 900 => 'cm', 500 => 'd', 400 => 'cd', 100 => 'c',
            90 => 'xc', 50 => 'l', 40 => 'xl', 10 => 'x', 9 => 'ix',
            5 => 'v', 4 => 'iv', 1 => 'i',
        ];

        $roman = '';
        foreach ($map as $value => $symbol) {
            while ($number >= $value) {
                $roman .= $symbol;
                $number -= $value;
            }
        }

        return $roman;
    }
}
