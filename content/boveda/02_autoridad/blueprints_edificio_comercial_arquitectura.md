# BLUEPRINTS OFICIALES: LA ARQUITECTURA DEL EDIFICIO COMERCIAL AUTÓNOMO B2B

## 1. Principio Fundamental
"Un edificio comercial no se levanta sobre improvisaciones ni sobre la memoria de sus operarios; se diseña mediante planos maestros que desacoplan el servicio en capas limpias e inmutables."

## 2. Los 4 Planos Rectores del Sistema Mejora Continua
1. **System Blueprint (Arquitectura de Software Soberana):**
   - Clean Architecture + Domain-Driven Design (DDD).
   - Persistencia física soberana en SQLite con modo Write-Ahead Logging (WAL) y aislamiento estricto de hilos (busy_timeout = 5000 ms).
   - Patrón Outbox transaccional desacoplado de las llamadas de red externas, garantizando cero congelamiento de UI y cero duplicados.
2. **Service Blueprint (Experiencia del Servicio y Customer Journey):**
   - *Fase 1: Atracción Digital:* MejoraSM (LinkedIn / Instagram) emite 80% Jabs educativos y 20% Right Hooks.
   - *Fase 2: Vidriera & Autoridad:* Mejoraok (StoryBrand) expone los 3 perfiles heroicos al frente.
   - *Fase 3: Autodiagnóstico Express:* MejoraDiagnostico v3.5 (8 preguntas en 4D entregando claridad en < 1 min).
   - *Fase 4: Experiencia Inmersiva:* TallerMC (60m) o After Office Regional directivo (regla 12x12).
   - *Fase 5: Conversión B2B:* Seguimiento en MejoraCRM v2.0 con foco en propuesta estructurada en 3 niveles.
3. **Diagrama de Flujo (Lógica y Reglas de Negocio):**
   - Algoritmo de publicación con Framing Engine CSS (0% de recorte facial) y aprobación en lote atómica.
   - Máquina de Estados del Prospecto: `INICIAL` -> `CAPTURADO` -> `calificar()` -> `CALIFICADO` -> `iniciarSeguimiento()` -> `EN_SEGUIMIENTO` -> `cerrar(ganado)` -> `CERRADO_GANADO` / `CERRADO_PERDIDO`.
4. **User Story Map (Roadmap por Bloques Edilicios):**
   - *Cimientos:* MejoraIdentidad (Manifiesto, Tono/Voz y Tricolor Institucional).
   - *Planta Baja:* MejoraSM, Mejoraok, MejoraDiagnostico.
   - *Pisos Intermedios:* MejoraCRM v2.0 + WhatsApp comercial.
   - *Pisos Superiores:* MejoraApp + Comunidad After Office.

## 3. Metadatos de Autoridad
- **Autores:** Equipo de Arquitectura y Operaciones — Mejora Continua © 2026
- **Obras de Referencia:** System Blueprint, Service Blueprint, Diagrama de Flujo, User Story Map (2026)
- **Dimensión:** Profesionalización / Organizacional
- **Fase de Funnel:** TOFU / MOFU / BOFU (Fundacional)
