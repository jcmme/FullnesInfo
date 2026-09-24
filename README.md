# Fuellness

Panel personal de crecimiento: guardas lo que viste en Instagram o TikTok y la app encuentra el video original en YouTube; cada día registras lo que aprendiste; si no cumples antes de las 2:30 AM, gira la ruleta de castigos físicos. Además, una caja misteriosa con un tema nuevo cada día y fichas investigadas de los temas que tú elijas.

Hecho con Next.js 16, Supabase y Vercel. Se instala en iPhone, iPad y Mac como app (PWA).

## Puesta en marcha

### 1. Supabase (base de datos y login)

1. En [supabase.com](https://supabase.com) crea un proyecto nuevo. Región: la más cercana (por ejemplo `us-east-1`).
2. Ve a **SQL Editor**, pega todo el contenido de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) y ejecútalo.
3. Ve a **Authentication > Users > Add user > Create new user**. Pon tu correo y una contraseña, y marca **Auto Confirm User**. Luego ejecuta [`0002_username.sql`](supabase/migrations/0002_username.sql) y ponle nombre de usuario a tu perfil: `update profiles set username = 'tu_usuario';`. En la app entras con ese usuario.
4. Ve a **Authentication > Sign In / Providers** y desactiva **Allow new users to sign up**. Así nadie más puede crear cuenta.
5. En **Project Settings > API Keys** copia:
   - la URL del proyecto,
   - la **publishable key** (`sb_publishable_…`),
   - la **secret key** (`sb_secret_…`). Esta no se comparte con nadie.

### 2. Llave de YouTube (para buscar los videos originales)

1. Entra a [console.cloud.google.com](https://console.cloud.google.com) y crea un proyecto.
2. En **APIs y servicios > Biblioteca** busca **YouTube Data API v3** y actívala.
3. En **Credenciales > Crear credenciales > Clave de API**. Edítala y en **Restricciones de API** elige solo YouTube Data API v3.

La cuota gratuita alcanza para unas 100 búsquedas al día. Libros (Open Library) y podcasts (Apple Podcasts) no necesitan llave.

### 3. Vercel (publicarla en internet)

1. Sube este repositorio a GitHub.
2. En [vercel.com](https://vercel.com) elige **Add New > Project** e importa el repositorio.
3. En **Environment Variables** agrega las cuatro de [`.env.example`](.env.example):

   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |
   | `SUPABASE_SECRET_KEY` | `sb_secret_…` |
   | `YOUTUBE_API_KEY` | la clave de Google |

4. Presiona **Deploy**. Cada `git push` a `main` vuelve a publicar solo.

### 4. Instalarla en tus dispositivos

- **iPhone y iPad:** abre la URL de Vercel en Safari, toca Compartir y luego **Agregar a pantalla de inicio**.
- **Mac:** en Safari, **Archivo > Agregar al Dock**.

### 5. Atajos de iOS

En la app, **Ajustes > Atajos de iPhone** tiene tu token y los pasos para dos Atajos:

- **Guardar en Fuellness:** desde el menú Compartir de Instagram. Escribes el nombre y la app busca el original.
- **Recordatorio de las 8:15 AM:** una automatización que te dice qué tienes pendiente. Hay una segunda opcional a las 10:30 PM que solo avisa si falta tu registro.

## Desarrollo local

```bash
cp .env.example .env.local   # y llena las variables
npm install
npm run dev
```

## Cómo funcionan las reglas

- **El día cierra a las 2:30 AM** (la hora y la zona horaria se cambian en Ajustes). Lo que registres a las 2:00 AM cuenta para el día anterior.
- **Cumplir el día** = sumar el mínimo de palabras (50 por defecto) entre todas tus notas del día. Una nota de hoy se puede abrir y continuar.
- **Fallar un día** crea una ruleta. Si no la giras, en 24 h se gira sola. Cada día fallado seguido sube el nivel (1 a 4).
- **Castigos de ventana** (lagartijas, sentadillas, burpees, plancha, abdominales, zancadas, fondos): tienes 48 h para empezar; al empezar corre su ventana, por ejemplo 100 lagartijas en 4 h.
- **Castigo de distancia**: km caminando o trotando en varios días; el plazo corre desde que se asigna.
- **Si no cumples un castigo**, aparece el mismo reto un nivel arriba (o 25% más si ya estaba en nivel 4).
- **Comodines**: 1 al mes por defecto. Se usan antes de que cierre el día o sobre un día fallado antes de girar la ruleta.
- **La caja misteriosa** se bloquea mientras tengas ruletas pendientes.
- **Tus temas** (Descubrir > Temas) tienen ficha propia: datos curiosos con su fuente, línea de tiempo, los términos del tema y qué ver o leer después. Los temas que todavía no están investigados muestran el resumen de Wikipedia.
- **Cada nota se revisa** contra el material del que dice hablar. El relleno evidente (manazos en el teclado, la misma frase repetida, una nota copiada de otra del mismo día) no suma para el día, y se puede apelar con un toque. Escribir de otra cosa o copiar el material sí suma, pero te lo dice.

No hay tareas programadas en el servidor: los días se evalúan cada vez que abres la app o que un Atajo consulta `/api/status`.

## Estructura

```
supabase/migrations/   esquema, seguridad por usuario (RLS) y vista de totales por día
src/lib/engine.ts      evaluación de días, rachas, fallos, castigos y escalamiento
src/lib/challenges.ts  catálogo de castigos, niveles y planes sugeridos
src/lib/media.ts       YouTube (búsqueda, duración, capítulos), Open Library, Apple Podcasts
src/lib/review.ts      revisión de notas (reglas, sin red ni IA) y qué te faltó del tema
src/lib/topics.ts      fichas investigadas, tus temas y el respaldo de Wikipedia
src/data/              150 temas de la caja misteriosa y las fichas de temas
src/app/(app)/         pantallas: Hoy, Guardados, Descubrir, Castigos, Ajustes, Registrar
src/app/api/           capture y status (para Atajos), search (para la app)
```

Diseño: ver [DESIGN.md](DESIGN.md). Contexto de producto: [PRODUCT.md](PRODUCT.md).
