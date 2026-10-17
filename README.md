# Obesidad: MVP de la app web

App web instalable (PWA) que guía sesiones de ejercicio para adultos con sobrepeso u obesidad. La intensidad se controla solo con la **escala de esfuerzo percibido (RPE, 0-10)**: no hace falta pulsómetro y no se registra la frecuencia cardiaca.

Nombre e imagen provisionales: **Pauta**.

## Estado

Paso 1 y 2 del MVP:

- [x] Base del proyecto: React + TypeScript + Vite, instalable en el móvil (manifest + service worker).
- [x] Sesión guiada de aeróbico:
  - temporizador por bloques (calentamiento, parte principal, vuelta a la calma);
  - pregunta de esfuerzo en pantalla cada 5 minutos, con respuesta inmediata;
  - zona de esfuerzo objetivo sobre la escala 0-10;
  - pausar, y subir o bajar 1-2 puntos «solo hoy» o «de ahora en adelante», dentro de los límites de cada fase;
  - voz en los cambios de bloque (se puede silenciar);
  - pantalla siempre encendida durante la sesión;
  - valoración final (RPE de sesión y sensación de intensidad) y carga (RPE × minutos).
- [ ] Alta, cuestionario PAR-Q+ y preferencias.
- [ ] Inicio con calendario, medallas y test de marcha de 6 minutos.
- [ ] Sesión de fuerza (estructura provisional y huecos para vídeos).
- [ ] Supabase y panel de la clínica.

La pantalla de inicio actual es **de prueba**: permite elegir la semana del plan y acelerar el tiempo (×10, ×60) para probar una sesión entera en un minuto.

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
    storage.ts      guardado local provisional (luego Supabase)
    session.test.ts pruebas
  features/
    home/           inicio (de prueba)
    session/        sesión guiada, escala, selector de RPE y resumen
  lib/
    voice.ts        voz sintetizada del navegador
    wakeLock.ts     mantener la pantalla encendida
public/             manifest, service worker e iconos
```

### Decisiones técnicas

- **El tiempo se calcula con marcas de tiempo**, no con un contador. Si el navegador frena la app (pantalla apagada, otra app delante), al volver el tiempo es correcto.
- **Las reglas del plan están en `src/domain/plan.ts`**. Cambiar duraciones, zonas o límites de una fase es editar esa tabla.
- **Los datos se guardan de momento solo en el navegador** (`localStorage`). No subas nunca claves ni datos de pacientes a este repositorio: es público.
