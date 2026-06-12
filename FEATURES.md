# Features — Polla Mundial 2026

Grupo único de 10–15 jugadores. Reglas de juego en [REGLAS.md](REGLAS.md).

## MVP (v1) — lo necesario para jugar

### 1. Acceso y autenticación
- Login exclusivamente con **"Entrar con Google"** (Auth.js). Sin passwords, sin magic links.
- **Allowlist de emails**: solo entran cuentas Google cuyo email fue invitado por el admin. Cualquier otro email se rechaza con un mensaje claro.
- Roles: **admin** (Diego) y **jugador**. El admin también juega.
- El admin puede agregar/quitar emails del allowlist desde la app.

### 2. Fixture
- Los 104 partidos importados desde football-data.org con: fase, grupo, equipos, estadio, ciudad y kickoff en UTC.
- Horarios mostrados siempre en la **zona horaria del navegador** del usuario.
- Estados de partido: `programado` → `en_juego` → `finalizado`.
- Vista por jornada/fecha y por grupo; los partidos eliminatorios muestran "por definir" hasta conocer los cruces.

### 3. Pronósticos
- Marcador exacto por partido. En eliminatorias, si el pronóstico es empate, se pide además **quién clasifica**.
- Crear/editar libremente **hasta el kickoff**. El deadline se valida en el servidor contra la hora oficial del fixture — nunca contra el reloj del cliente.
- Los pronósticos de otros jugadores **no se envían al cliente** antes del kickoff (no solo se ocultan en la UI).
- **Audit log**: cada guardado registra jugador, partido, marcador anterior, marcador nuevo y timestamp.
- Indicador visible de pronósticos pendientes de la próxima jornada.

### 4. Bonus
- Campeón, goleador y los 2 finalistas. Se eligen una vez y quedan **bloqueados en el deadline de bonus** (configurable por el admin).
- Ocultos entre jugadores hasta el bloqueo; visibles para todos después.

### 5. Resultados y puntaje
- Resultados **sincronizados automáticamente desde football-data.org** vía cron (ver STACK.md), con **override manual del admin** como respaldo (API caída o dato erróneo).
- En eliminatorias se registra: marcador a los 90', y equipo clasificado.
- Motor de puntaje según REGLAS.md: 3 exacto / 1 resultado / +1 clasificado / bonus 15-10-5.
- El cálculo es **idempotente y re-ejecutable**: corregir un resultado recalcula todos los puntos afectados.
- Toda corrección de un resultado ya cargado queda en el audit log.

### 6. Tabla de posiciones
- Ranking con puntaje total y desglose: exactos, resultados, clasificados, bonus.
- Desempates de REGLAS.md aplicados y señalizados (ej. ícono cuando un empate se resolvió por exactos).

### 7. Vista de partido
- Antes del kickoff: solo mi pronóstico.
- Después del kickoff: pronósticos de todos + puntos obtenidos por cada uno.

### 8. Pozo y pagos
- El admin define el monto de entrada y marca **pagó / no pagó** por jugador.
- La app muestra: pozo acumulado, premios proyectados (60/30/10) y quién falta por pagar.
- **La app nunca procesa dinero** — los pagos son transferencias entre amigos, esto es solo registro.

## v1.1 — siguiente iteración (en orden de impacto)

1. **Recordatorio de deadline por email** (Resend): aviso unas horas antes del primer partido de la jornada a quien tenga pronósticos pendientes. Es el feature que mantiene viva la polla.
2. **Puntos provisorios en vivo** durante los partidos.
3. **Ganador de la jornada** (mini-premio por fase/semana, según REGLAS.md).
4. **Gráfico de evolución** de posiciones a lo largo del torneo.
5. **Estadísticas**: % de aciertos, rachas, "el más arriesgado", partido más fallado por todos.
6. **Reacciones/comentarios** por partido.

## Modelo de datos (bosquejo)

- `players` — email, nombre, avatar (de Google), rol, pagó (bool)
- `teams` — los 48 equipos
- `matches` — fase, grupo, equipos (nullable hasta definirse cruces), kickoff UTC, estado, marcador 90', clasificado
- `predictions` — jugador + partido, marcador, clasificado (solo eliminatorias), actualizado_en
- `prediction_audit` — historial de cambios de pronósticos y de resultados
- `bonus_picks` — jugador: campeón, goleador, finalista_1, finalista_2
- `settings` — monto de entrada, deadline de bonus, % de premios
