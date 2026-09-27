<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Refuse l'accès si le rôle de l'utilisateur authentifié ne figure pas
     * parmi les rôles autorisés (insensibles à la casse).
     * Usage : ->middleware('check.role:admin,administrator,super_admin,superadmin')
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        $allowed = array_map(
            fn (string $role): string => strtolower(trim($role)),
            $roles === [] ? ['administrator', 'admin', 'super_admin', 'superadmin'] : $roles,
        );

        if (! $user || ! in_array(strtolower((string) ($user->role ?? '')), $allowed, true)) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        return $next($request);
    }
}
