<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Symfony\Component\Process\Process;
use Throwable;

/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Service de transfert réel vers Google Drive (Rclone)
 * ---------------------------------------------------------------------------
 * Aucune simulation : chaque méthode exécute le binaire rclone configuré
 * sur le serveur (remote OAuth déjà authentifié via `rclone config`).
 *
 * Flux d'upload :
 *   rclone copyto <local> <remote:folder/name>
 *   -> vérification du code retour
 *   -> rclone lsjson <remote:folder/name>  (preuve d'existence réelle)
 *   -> Drive File ID + Size + MimeType réels
 *   -> liens webViewLink / downloadLink construits depuis l'ID réel.
 */
class RcloneService
{
    /**
     * Téléverse un fichier local et retourne ses informations Drive réelles.
     *
     * @param  string  $localAbsolutePath  Chemin absolu du fichier temporaire.
     * @param  string  $remoteName         Nom du fichier sur Google Drive.
     * @return array{id: string, name: string, size: int, mime_type: string, remote_path: string, web_view_link: string, download_link: string}
     *
     * @throws \RuntimeException En cas d'échec rclone (code retour != 0 ou fichier absent).
     */
    public function upload(string $localAbsolutePath, string $remoteName): array
    {
        $safeName = $this->sanitizeName($remoteName);
        $target = $this->target($safeName);

        // 1) Transfert réel
        $process = $this->run(['copyto', $localAbsolutePath, $target]);
        if (! $process->isSuccessful()) {
            throw new \RuntimeException(
                "Rclone copy a échoué (code {$process->getExitCode()}) : ".$process->getErrorOutput()
            );
        }

        // 2) Vérification réelle d'existence + récupération de l'ID Drive
        $info = $this->objectInfo($target);
        if ($info === null || empty($info['ID'])) {
            throw new \RuntimeException(
                "Rclone n'a pas retourné de Drive File ID pour {$target} après transfert."
            );
        }

        // 3) Partage public par lien — sans cela, l'apercu et le
        // telechargement echouent pour tout compte autre que le proprietaire.
        $this->share($target);

        return [
            'id' => (string) $info['ID'],
            'name' => (string) ($info['Name'] ?? $safeName),
            'size' => (int) ($info['Size'] ?? 0),
            'mime_type' => (string) ($info['MimeType'] ?? 'application/octet-stream'),
            'remote_path' => $target,
            'web_view_link' => "https://drive.google.com/file/d/{$info['ID']}/view",
            'download_link' => "https://drive.google.com/uc?export=download&id={$info['ID']}",
        ];
    }

    /**
     * Interroge rclone pour un objet distant précis (lsjson).
     *
     * @return array|null Métadonnées rclone (ID, Name, Size, MimeType...) ou null si absent.
     */
    public function objectInfo(string $remotePath): ?array
    {
        $process = $this->run(['lsjson', $remotePath]);

        // rclone renvoie exit code 3 quand l'objet n'existe pas.
        if (! $process->isSuccessful()) {
            return null;
        }

        $entries = json_decode($process->getOutput(), true);
        if (! is_array($entries) || $entries === []) {
            return null;
        }

        return $entries[0];
    }

    /**
     * Supprime un objet distant (nettoyage réel).
     */
    public function delete(string $remotePath): bool
    {
        return $this->run(['deletefile', $remotePath])->isSuccessful();
    }

    /**
     * Rend un fichier accessible "toutes personnes avec le lien" (rclone link).
     * Indispensable pour que l'apercu (iframe /preview) et le telechargement
     * fonctionnent hors du compte proprietaire du Drive.
     *
     * @return string|null Lien de partage, null si le partage a echoue
     *                     (non bloquant : le transfert reste valide).
     */
    public function share(string $remotePath): ?string
    {
        $process = $this->run(['link', $remotePath]);

        if (! $process->isSuccessful()) {
            report(new \RuntimeException(
                "Rclone link a échoué pour {$remotePath} : ".$process->getErrorOutput()
            ));

            return null;
        }

        $link = trim($process->getOutput());

        return $link !== '' ? $link : null;
    }

    /**
     * Exécute rclone avec les arguments donnés.
     * Le --config explicite contourne l'absence de $HOME dans les contexts
     * serveur (php artisan serve / FPM) — sinon rclone ne trouve pas le
     * remote OAuth et échoue avec "didn't find section in config file".
     *
     * @param  list<string>  $args
     */
    protected function run(array $args): Process
    {
        $binary = (string) config('rclone.binary', 'rclone');
        $configPath = $this->resolveConfigPath();

        $command = [$binary];
        if ($configPath !== null) {
            $command[] = '--config';
            $command[] = $configPath;
        }
        $command = [...$command, ...$args];

        $process = new Process($command, base_path());
        $process->setTimeout((int) config('rclone.timeout', 300));
        $process->run();

        return $process;
    }

    /**
     * Résout le chemin de la configuration rclone (env > HOME > null).
     */
    protected function resolveConfigPath(): ?string
    {
        $configured = config('rclone.config');
        if ($configured) {
            return $configured;
        }

        $home = getenv('HOME') ?: ($_SERVER['HOME'] ?? null);

        return $home ? rtrim($home, '/').'/.config/rclone/rclone.conf' : null;
    }

    /**
     * Construit la cible distante complète (ex. mon_drive:ALPHIX/fichier.pdf).
     */
    protected function target(string $name): string
    {
        $remote = rtrim((string) config('rclone.remote', 'mon_drive'), ':');
        $folder = trim((string) config('rclone.folder', 'ALPHIX'), '/');

        return "{$remote}:{$folder}/{$name}";
    }

    /**
     * Neutralise tout risque de traversal / separateur dans le nom distant.
     *
     * Conserve les accents (Drive les supporte) mais supprime les caracteres
     * de controle, normalise les espaces et borne la longueur pour eviter les
     * echecs rclone sur les noms issus de WhatsApp ou de scans Windows.
     */
    protected function sanitizeName(string $name): string
    {
        $clean = str_replace(['\\', '/'], '-', $name);
        $clean = basename($clean);
        if (class_exists(\Normalizer::class)) {
            $normalized = \Normalizer::normalize($clean, \Normalizer::FORM_C);
            if (is_string($normalized) && $normalized !== '') {
                $clean = $normalized;
            }
        }
        $clean = trim($clean);
        $clean = (string) preg_replace('/[\x00-\x1F\x7F]/u', '', $clean);
        $clean = (string) preg_replace('/\s+/u', ' ', $clean);
        $clean = trim($clean, ' .');
        if ($clean === '') {
            $clean = 'document-sans-nom';
        }
        if (mb_strlen($clean) > 200) {
            $ext = pathinfo($clean, PATHINFO_EXTENSION);
            $base = pathinfo($clean, PATHINFO_FILENAME);
            $keep = 200 - ($ext !== '' ? mb_strlen($ext) + 1 : 0);
            $clean = mb_substr($base, 0, max(1, $keep)).($ext !== '' ? '.'.$ext : '');
        }

        return $clean;
    }
}
