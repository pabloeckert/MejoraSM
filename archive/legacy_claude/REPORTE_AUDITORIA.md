# Reporte de auditoría — MejoraSM

Fecha: 2026-09-10
Alcance: higiene técnica del repo (dependencias, lint, typecheck, build, tests, vulnerabilidades, workflows, archivos sensibles/basura, documentación). Parte de la auditoría integral de `C:\Github` pedida por Pablo. Retoma una auditoría anterior que se cortó por rate-limit de sesión a mitad de camino (había un `npm update` corriendo en background).

**Regla dura respetada: ningún commit, ningún push.** Todos los cambios de esta sesión quedan sin commitear en el working tree, listos para revisión.

## Resumen ejecutivo

El repo está sano. Es, con diferencia, el más documentado de todo `C:\Github` — `CLAUDE.md` (422 KB / 2023 líneas) es una bitácora obsesiva de meses de trabajo autónomo, con decisiones, evidencia real y hallazgos fechados. El `npm update` que había quedado a medias terminó bien (solo tocó `package-lock.json`, sin cambios en `package.json`) y no rompió nada — build, lint, typecheck y los 66 tests pasan limpio antes y después.

No hay secretos trackeados, no hay `dist/` colado en git, los 17 workflows de GitHub Actions tienen YAML válido. Se encontraron y corrigieron dos inconsistencias de documentación reales (una contradicción sobre el login, un número de migración desactualizado) y se completó el `npm update` de una dependencia que había quedado atrás (`lucide-react`). Quedan 4 vulnerabilidades moderadas/altas de `npm audit`, todas en dependencias de desarrollo (`vite`/`esbuild` dev-server, `vitest`), sin exposición real en producción — el fix requiere bumps mayores (breaking changes), documentado como pendiente de decisión humana, consistente con el criterio ya aplicado por las sesiones anteriores de este mismo repo.

## Estado del npm update que quedó a medias

- `git status` al arrancar: solo `package-lock.json` modificado (92 inserciones, 107 eliminaciones — consolidación de versiones transitivas), `package.json` sin cambios.
- Timestamps: `node_modules`/`package-lock.json` modificados a las 04:26, la sesión arrancó a las 08:53 — el update ya había terminado hacía horas, no había ningún proceso de npm corriendo en background para esta tarea.
- `npm run build` y `npm run lint` corridos de inmediato: limpios. El update no rompió nada.
- Decisión: no revertir. No hay ninguna señal de que haya quedado roto o inconsistente — exactamente lo contrario de lo que ameritaría un `git checkout -- package-lock.json`.
- De paso se encontró una dependencia que el update no había alcanzado a actualizar dentro de su propio rango declarado: `lucide-react` 1.43.0 a 1.44.0 (semver ^1.8.0, sin riesgo). Se completó con `npm update lucide-react`. Build y lint re-verificados limpios después.

## Acciones tomadas

1. `npm update lucide-react` (1.43.0 a 1.44.0, dentro del rango ya declarado en package.json) — sin cambios en package.json.
2. Corrección de documentación en `CLAUDE.md` (linea ~392): la tabla de páginas del EDA decía que Login "permite alta de cuenta", contradiciendo el resto del archivo (el snapshot "Estado actual del sistema" al inicio, la sección "Reinstauración del login" del 2026-08-31, y "Cierre de los 3 pendientes" del 2026-08-25 — las tres dicen explícitamente "sin alta de cuenta"). Corregido para reflejar el estado real: una sola cuenta compartida, sin alta, con blanqueo por email.
3. Corrección de documentación en `COLABORACION.md` (2 líneas): el tablero decía "próxima migración libre: 026" en dos lugares, pero la migración `026_fix_dimension_check_and_run_log_index.sql` ya se aplicó a producción el 2026-09-08 (documentado en CLAUDE.md). Corregido a 027 como próximo número libre, con una nota aclarando que el tablero de coordinación quedó desactualizado desde el 2026-09-05. Este era un riesgo real y no solo cosmético: una sesión nueva que siga la "regla de oro" del propio archivo (leer COLABORACION.md antes de tocar el repo) podía reusar el número 026 para una migración nueva y chocar con la ya aplicada.
4. Limpieza de artefactos generados localmente por esta sesión (dist/, tsconfig.*.tsbuildinfo) — ya estaban gitignoreados, no afectan al repo, solo higiene del checkout local.

## Verificaciones completadas (todas en verde)

| Check | Resultado |
|---|---|
| npm run build | limpio (38s primera corrida, 13s tras el update de lucide-react) |
| npm run lint (ESLint) | 0 errores, 0 warnings |
| npx tsc --noEmit -p tsconfig.app.json (typecheck) | limpio |
| npm run test (Vitest) | 66/66 tests, 12 archivos |
| npm audit | 4 vulnerabilidades (3 moderadas, 1 alta) — ver abajo |
| YAML de los 17 workflows (.github/workflows/*.yml) | los 17 válidos (js-yaml) |
| git ls-files — archivos sensibles | sin secretos trackeados (ver detalle abajo) |
| dist/ trackeado en git | no, correctamente gitignoreado |
| Duplicados / basura | sin duplicados obvios, sin .scheduled_tasks.lock versionado (archivo local de Claude Code, gitignoreado, no relacionado con el proyecto) |

### Detalle: archivos sensibles

`git ls-files | grep -iE "env|secret|credential|key|password|token"` devuelve 3 coincidencias, las 3 benignas:
- `.env.example` — template documentado, sin valores reales, con comentarios explicando qué va en cada secret store (Supabase/GitHub Actions).
- `src/pages/ResetPassword.tsx` — componente de UI para el flujo de blanqueo de contraseña, sin credenciales embebidas.
- `supabase/migrations/023_reclose_access_password.sql` — migración SQL de RLS/auth, sin claves ni contraseñas reales (solo la lógica de is_app_admin()).

`.env` real y `secrets/keys.local.txt` están correctamente gitignoreados (confirmado, no trackeados). `.gitignore` es extenso y deliberado — incluye reglas específicas para screenshots que puedan contener claves, documentado en el propio archivo como práctica ya establecida.

### Detalle: npm audit — 4 vulnerabilidades, todas dev-only

| Paquete | Severidad | Vía | Fix disponible |
|---|---|---|---|
| esbuild (<=0.24.2) | moderada | dev-server de Vite acepta requests de cualquier origen | requiere vite@8 (breaking) |
| vite (<=6.4.2) | alta | depende del esbuild vulnerable + path traversal en .map + server.fs.deny bypass en Windows | requiere vite@8 (breaking) |
| @vitest/mocker | moderada | path traversal / lectura arbitraria de archivos | requiere vitest@5 (breaking) |
| vitest | moderada | depende de @vitest/mocker vulnerable | requiere vitest@5 (breaking) |

Las cuatro son dependencias de build-time/dev-server — no viajan al bundle de producción. Sin exposición real en la app desplegada. `npm audit fix --force` bumpea a vite@8/vitest@5 (majors) — no se aplicó, requiere decisión humana. Es el mismo tipo de vulnerabilidad que otras sesiones de este mismo repo ya evaluaron y dejaron pendiente varias veces en la bitácora de CLAUDE.md.

## Documentación (CLAUDE.md, MejoraSM.md, COLABORACION.md)

Se completó la revisión que había quedado a medias, con una lectura directa de CLAUDE.md (422 KB) completo más un agente dedicado que sampleó MejoraSM.md (509 KB, transcripción de sesión) y leyó COLABORACION.md (71 KB) entero, cruzando referencias contra el estado real del repo.

Hallazgos, corregidos (ver "Acciones tomadas" arriba):
1. Contradicción sobre alta de cuenta en Login (CLAUDE.md) — corregida.
2. Número de próxima migración desactualizado (COLABORACION.md) — corregida.

Hallazgos, dejados como nota (no ameritan edición de código, son observaciones sobre el propio proceso de documentación):

3. El snapshot "Estado actual del sistema" de CLAUDE.md (la tabla que el propio archivo pide "mantener al día") sigue marcando Instagram como caída desde el 2026-09-07, pese a que una entrada de bitácora posterior (2026-09-08) ya reporta evidencia de que la cuenta podría estar reconectada (accountsHealth con disconnected vacío en una corrida real de metrics-collector-cron). No se puede confirmar desde esta sesión si Pablo efectivamente reconectó — se deja como está, sin tocar el snapshot, porque afirmar que está resuelto sin confirmación directa sería peor que dejar la advertencia. Pablo puede confirmarlo mirando el Dashboard del EDA o zernio.com y, si ya reconectó, actualizar esa fila.
4. COLABORACION.md como tablero "vivo" de coordinación entre sesiones no se actualizó desde el 2026-09-05, pese a que el trabajo real siguió (documentado en CLAUDE.md) hasta hoy. No es un bug — es un artefacto de que las últimas sesiones no volvieron a tocar ese archivo específico — pero vale que Pablo lo sepa si espera que ese tablero refleje el estado en tiempo real.

No se encontraron referencias rotas a archivos/carpetas inexistentes, ni comandos/scripts npm desalineados con package.json, ni contradicciones duras adicionales tipo "usar X" vs "nunca usar X" más allá de la del login.

## Lo que NO se tocó (a propósito)

- content/inbox, content/log, content/published, content/used, content/work — contenido de negocio real (fotos/copys/historial de publicaciones), tal como indicaban las reglas duras. No se inspeccionó su contenido más allá de confirmar que no hay nada trackeado fuera de lugar.
- secrets/, .claude/scheduled_tasks.lock — el lock file es un artefacto interno de Claude Code (de otra sesión/tarea programada), gitignoreado, sin relación con el código del proyecto. Se identificó pero no se tocó — borrar un lock file de una tarea que podría seguir activa es riesgoso sin confirmar primero.
- Las 4 vulnerabilidades de npm audit que requieren bump mayor — documentadas, no aplicadas.
- git checkout -- package-lock.json — evaluado y descartado explícitamente: el update terminó bien, revertirlo sería destructivo sin motivo.

## Pendientes que requieren decisión humana

1. npm audit fix --force (vite@8, vitest@5) — bump mayor, dev-only, sin exposición real en producción. Decidir si vale la pena el riesgo de breaking changes en config de build/tests para cerrar 4 vulns que no afectan el bundle desplegado.
2. Confirmar si Instagram sigue desconectado de Zernio (ver hallazgo de documentación #3 arriba) y, si ya se resolvió, actualizar el snapshot de CLAUDE.md.
3. COLABORACION.md — decidir si vale la pena mantenerlo actualizado como tablero en tiempo real, o si con CLAUDE.md (que sí se mantiene al día) alcanza y este archivo puede quedar como bitácora histórica de coordinación multi-sesión sin más actualizaciones.

## Conclusión

MejoraSM es el repo con mejor higiene documental de todo C:\Github — el npm update que había quedado a medias terminó bien, build/lint/typecheck/tests están todos verdes, no hay secretos ni basura trackeada, y los 17 workflows son válidos. El trabajo de esta sesión fue completar lo que había quedado cortado (documentación, una dependencia rezagada) y corregir dos inconsistencias reales y de bajo riesgo. No se encontró nada que ameritara revertir el trabajo en progreso de sesiones anteriores.
