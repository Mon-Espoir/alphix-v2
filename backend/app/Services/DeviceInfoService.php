<?php

namespace App\Services;

use Illuminate\Http\Request;

class DeviceInfoService
{
    /**
     * Parse User-Agent and Capacitor headers to extract device info.
     * Never logs passwords or tokens.
     *
     * @return array{device_type: string, platform: string, browser: string, brand: string, model: string, device_info: string, raw: string}
     */
    public function parse(Request $request): array
    {
        $ua = (string) $request->header('User-Agent', $request->server('HTTP_USER_AGENT', ''));
        $uaLower = strtolower($ua);

        // Capacitor / custom headers (where available)
        $brandHeader = trim((string) $request->header('X-Device-Brand', $request->header('X-Device-Manufacturer', '')));
        $modelHeader = trim((string) $request->header('X-Device-Model', $request->header('X-Device', '')));
        $platformHeader = trim((string) $request->header('X-Device-Platform', $request->header('X-Platform', '')));

        // Device Type
        $deviceType = 'Desktop';
        if (preg_match('/tablet|ipad|playbook|kindle|silk/i', $ua)) {
            $deviceType = 'Tablet';
        } elseif (preg_match('/mobile|iphone|ipod|android.*mobile|windows phone|kindle|silk|blackberry|opera mini|opera mobi/i', $uaLower)) {
            $deviceType = 'Mobile';
        } elseif (preg_match('/android/i', $uaLower) && !preg_match('/mobile/i', $uaLower)) {
            // Many Android tablets report Android without Mobile
            $deviceType = 'Tablet';
        }

        // Platform / OS
        $platform = 'Unknown';
        if ($platformHeader !== '') {
            $platform = $platformHeader;
        } elseif (preg_match('/windows nt 10\.0/i', $ua)) {
            $platform = 'Windows 10/11';
        } elseif (preg_match('/windows nt 6\.3/i', $ua)) {
            $platform = 'Windows 8.1';
        } elseif (preg_match('/windows nt 6\.2/i', $ua)) {
            $platform = 'Windows 8';
        } elseif (preg_match('/windows nt 6\.1/i', $ua)) {
            $platform = 'Windows 7';
        } elseif (preg_match('/windows/i', $ua)) {
            $platform = 'Windows';
        } elseif (preg_match('/android\s+([\d\.]+)/i', $ua, $m)) {
            $platform = 'Android' . (isset($m[1]) ? ' ' . $m[1] : '');
        } elseif (preg_match('/iphone|ipad|ipod/i', $ua)) {
            if (preg_match('/os\s+([\d_\.]+)/i', $ua, $m)) {
                $platform = 'iOS ' . str_replace('_', '.', $m[1]);
            } else {
                $platform = 'iOS';
            }
        } elseif (preg_match('/mac os x\s+([\d_\.]+)/i', $ua, $m)) {
            $platform = 'macOS ' . str_replace('_', '.', $m[1]);
        } elseif (preg_match('/macintosh|mac os/i', $ua)) {
            $platform = 'macOS';
        } elseif (preg_match('/linux/i', $ua)) {
            if (preg_match('/ubuntu/i', $ua)) $platform = 'Ubuntu';
            elseif (preg_match('/mint/i', $ua)) $platform = 'Linux Mint';
            elseif (preg_match('/fedora/i', $ua)) $platform = 'Fedora';
            else $platform = 'Linux';
        } elseif (preg_match('/cros/i', $ua)) {
            $platform = 'Chrome OS';
        }

        // Browser
        $browser = 'Unknown';
        if (preg_match('/edg\/([\d\.]+)/i', $ua, $m)) {
            $browser = 'Edge ' . $m[1];
        } elseif (preg_match('/chrome\/([\d\.]+)/i', $ua, $m) && !preg_match('/chromium|edg/i', $uaLower)) {
            // Exclude Edge, Opera
            if (preg_match('/opr\/|opera/i', $uaLower)) {
                $browser = 'Opera';
                if (preg_match('/(?:opr|opera)\/([\d\.]+)/i', $ua, $mm)) $browser .= ' ' . $mm[1];
            } else {
                $browser = 'Chrome ' . $m[1];
            }
        } elseif (preg_match('/firefox\/([\d\.]+)/i', $ua, $m)) {
            $browser = 'Firefox ' . $m[1];
        } elseif (preg_match('/safari\/([\d\.]+)/i', $ua) && preg_match('/version\/([\d\.]+)/i', $ua, $m) && !preg_match('/chrome|chromium|edg/i', $uaLower)) {
            $browser = 'Safari ' . $m[1];
        } elseif (preg_match('/samsungbrowser\/([\d\.]+)/i', $ua, $m)) {
            $browser = 'Samsung Internet ' . $m[1];
        }

        // Brand / Model
        $brand = $brandHeader;
        $model = $modelHeader;

        // Fallback from UA for brand/model
        if ($brand === '' && $model === '') {
            if (preg_match('/iphone/i', $ua)) {
                $brand = 'Apple';
                if (preg_match('/iphone\s*os\s*[\d_]+.*?;\s*([^;\)]+)/i', $ua, $mm)) {
                    // not reliable, keep iPhone
                }
                $model = $model ?: 'iPhone';
            } elseif (preg_match('/ipad/i', $ua)) {
                $brand = 'Apple';
                $model = $model ?: 'iPad';
            } elseif (preg_match('/samsung/i', $ua)) {
                $brand = 'Samsung';
                if (preg_match('/samsung\s*([^;\)\/]+)/i', $ua, $mm)) $model = trim($mm[1]);
                if ($model === '' && preg_match('/sm-[a-z0-9\-]+/i', $ua, $mm)) $model = strtoupper($mm[0]);
            } elseif (preg_match('/tecno/i', $ua)) {
                $brand = 'Tecno';
                if (preg_match('/tecno\s*([^;\)]+)/i', $ua, $mm)) $model = trim($mm[1]);
            } elseif (preg_match('/infinix/i', $ua)) {
                $brand = 'Infinix';
            } elseif (preg_match('/xiaomi|redmi|poco/i', $ua)) {
                $brand = 'Xiaomi';
                if (preg_match('/(redmi|poco)[^;\)]*/i', $ua, $mm)) $model = trim($mm[0]);
            } elseif (preg_match('/huawei/i', $ua)) {
                $brand = 'Huawei';
            } elseif (preg_match('/dell/i', $ua)) {
                $brand = 'Dell';
                $model = $model ?: 'PC';
            } elseif (preg_match('/macintosh/i', $ua)) {
                $brand = $brand ?: 'Apple';
                $model = $model ?: 'Macintosh';
            }
        }

        // Normalize brand/model
        $brand = $brand !== '' ? $brand : ($deviceType === 'Desktop' ? 'PC' : 'Unknown');
        if ($brand === 'Unknown' && $deviceType === 'Desktop') $brand = 'PC';
        $model = $model !== '' ? $model : ($deviceType === 'Mobile' ? 'Smartphone' : ($deviceType === 'Tablet' ? 'Tablet' : 'PC'));

        // Formatted device_info string
        $parts = [];
        $parts[] = $deviceType;
        $parts[] = $platform;
        $parts[] = $browser;
        if ($brand !== 'PC' && $brand !== 'Unknown') {
            $parts[] = $brand . ($model && $model !== $brand && $model !== 'PC' && $model !== 'Smartphone' && $model !== 'Tablet' ? " $model" : '');
        } elseif ($model && $model !== 'PC' && $model !== 'Smartphone' && $model !== 'Tablet') {
            $parts[] = $model;
        }
        $deviceInfo = implode(' • ', array_filter(array_map('trim', $parts)));

        return [
            'device_type' => $deviceType,
            'platform' => $platform,
            'browser' => $browser,
            'brand' => $brand,
            'model' => $model,
            'device_info' => $deviceInfo,
            'raw' => $ua,
        ];
    }

    /**
     * Filter sensitive keys from payload before logging.
     *
     * @param  array<string,mixed>  $data
     * @return array<string,mixed>
     */
    public function filterSensitive(array $data): array
    {
        $sensitive = ['password', 'password_confirmation', 'current_password', 'token', 'access_token', 'refresh_token', 'secret', 'api_key', 'authorization'];
        $filtered = [];
        foreach ($data as $k => $v) {
            $lower = strtolower((string) $k);
            if (in_array($lower, $sensitive, true) || str_contains($lower, 'password') || str_contains($lower, 'token') || str_contains($lower, 'secret')) {
                $filtered[$k] = '[FILTERED]';
            } elseif (is_array($v)) {
                $filtered[$k] = $this->filterSensitive($v);
            } else {
                $filtered[$k] = $v;
            }
        }
        return $filtered;
    }
}
