# Obesidad: MVP de la app web

App web instalable (PWA) que guía sesiones de ejercicio para adultos con sobrepeso u obesidad. La intensidad se controla solo con la **escala de esfuerzo percibido (RPE, 0-10)**: no hace falta pulsómetro y no se registra la frecuencia cardiaca.

Nombre e imagen provisionales: **Pauta**.

## Estado

Pasos 1 a 3 del MVP:

- [x] Base del proyecto: React + TypeScript + Vite, instalable en el móvil (manifest + service worker).
- [x] Sesión guiada de aeróbico:
  - temporizador por bloques (calentamiento, parte principal, vuelta a la calma);
  - pregunta de esfuerzo en pantalla cada 5 minutos, con respuesta inmediata;
  - zona de esfuerzo objetivo sobre la escala 0-10;
  - pausar, y subir o bajar 1-2 puntos «solo hoy» o «de ahora en adelante», dentro de los límites de cada fase;
  - aviso sonoro (y vibración en Android) cada vez que toca valorar el esfuerzo; se puede silenciar;
  - pantalla siempre encendida durante la sesión;
  - valoración final (RPE de sesión y sensación de intensidad) y carga (RPE × minutos).
- [x] Alta: bienvenida con código de la consulta, datos (edad, sexo, altura, peso), cuestionario de cribado (7 preguntas generales del PAR-Q+, adaptación provisional), explicación de la escala RPE, tipo de ejercicio y actividad, preferencias («hazme el mejor plan» o «a mi medida», días, duración y hora) y resumen.
- [x] Inicio: sesión de hoy o próxima sesión, semana del plan calculada por fechas, días de la semana hechos y previstos, bloqueo hasta el visto bueno si el cribado lo pide.
- [ ] Inicio con calendario, medallas y test de marcha de 6 minutos.
- [ ] Sesión de fuerza (estructura provisional y huecos para vídeos).
- [ ] Supabase y panel de la clínica.

En el inicio hay unas **opciones de prueba** (plegadas) para cambiar la semana del plan, acelerar el tiempo (×10, ×60), quitar el ajuste de intensidad o repetir el alta. Mientras no exista el panel de la clínica, el visto bueno médico se simula con un botón.

## Cómo arrancarlo

Necesitas Node.js 20 o superior.

```bash
npm install
npm run dev      # servidor local en http://localhost:5173
npm test         # pruebas de la lógica (plan, sesión, escala RPE)
npm run build    # versión de producción en dist/
```

Para probarlo en el móvil dentro de tu red: `npm run dev -- --host` y abre en el móvil la dirección que aparece (Network). La pantalla encendida y la instalación requieren HTTPS, así que para pruebas reales conviene publicarlo (por ejemplo, conectando este repositorio a Vercel o Netlify: detectan Vite solos).

## Estructura

```
src/
  domain/           lógica pura, sin React (fácil de probar)
    rpe.ts          escala 0-10, descripciones y comparación con la zona objetivo
    plan.ts         fases del piloto (semanas 1-40) en RPE
    session.ts      motor de la sesión: bloques, tiempo, preguntas, ajustes
    profile.ts      datos del alta, cribado, preferencias y semana del plan
    storage.ts      guardado local provisional (luego Supabase)
    *.test.ts       pruebas
  features/
    onboarding/     alta en 6 pasos
    home/           inicio con el plan y opciones de prueba
    session/        sesión guiada, escala, selector de RPE y resumen
  lib/
    sound.ts        aviso sonoro de la pregunta de esfuerzo (Web Audio)
    wakeLock.ts     mantener la pantalla encendida
public/             manifest, service worker e iconos
```

### Decisiones técnicas

- **El tiempo se calcula con marcas de tiempo**, no con un contador. Si el navegador frena la app (pantalla apagada, otra app delante), al volver el tiempo es correcto.
- **Las reglas del plan están en `src/domain/plan.ts`**. Cambiar duraciones, zonas o límites de una fase es editar esa tabla.
- **Los datos se guardan de momento solo en el navegador** (`localStorage`). No subas nunca claves ni datos de pacientes a este repositorio: es público.
