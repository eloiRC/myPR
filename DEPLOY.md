# Instrucciones para desplegar MyPR en Cloudflare

Este documento contiene las instrucciones para desplegar la aplicación MyPR en Cloudflare Workers (backend) y Cloudflare Pages (frontend).

## Despliegue del Backend (Cloudflare Workers)

### Requisitos previos
- Cuenta en Cloudflare
- Wrangler CLI instalado (`npm install -g wrangler`)
- Autenticación en Wrangler (`wrangler login`)

### Pasos para el despliegue

1. **Configurar las variables secretas**

   Configura las variables secretas necesarias para el funcionamiento del backend:

    ```bash
    wrangler secret put jwt_secret
    # Ingresa tu clave secreta para JWT cuando se te solicite
    
    wrangler secret put test_password
    # Ingresa la contraseña de prueba cuando se te solicite

    wrangler secret put GARMIN_API_KEY
    # Ingresa una clave aleatoria (ej. generada con OpenSSL o uuidgen)

    wrangler secret put GARMIN_ENCRYPTION_KEY
    # Ingresa una clave aleatoria de 64+ caracteres para AES-256-GCM
    ```

2. **Verificar la configuración de la base de datos D1**

   Asegúrate de que la configuración de la base de datos D1 en `wrangler.jsonc` sea correcta:

   ```json
   "d1_databases": [
     {
       "binding": "DB",
       "database_name": "mypr",
       "database_id": "63087dd2-d370-47cc-9702-5bde7da4a4c1"
     }
   ]
   ```

    Si necesitas crear una nueva base de datos:

    ```bash
    wrangler d1 create mypr
    # Luego actualiza el database_id en wrangler.jsonc
    ```

2b. **Aplicar migraciones de base de datos**

    ```bash
    # Crear tablas Garmin (si no existen)
    wrangler d1 execute mypr --remote --file=migrations/0001_create_garmin_tables.sql
    ```

3. **Desplegar el Worker**

   ```bash
   wrangler deploy
   ```

4. **Verificar el despliegue**

   Visita la URL de tu Worker (por ejemplo, `https://mypr.username.workers.dev`) para verificar que el backend está funcionando correctamente.

## Despliegue del Frontend (Cloudflare Pages)

### Requisitos previos
- Cuenta en Cloudflare
- Repositorio Git (GitHub, GitLab, etc.) con el código del frontend

### Pasos para el despliegue

1. **Construir el frontend para producción**

   ```bash
   cd mypr-fr
   npm run build
   ```

   Esto generará los archivos estáticos en el directorio `dist`.

2. **Configurar el proyecto en Cloudflare Pages**

   a. Ve al panel de control de Cloudflare.
   b. Navega a "Pages" y haz clic en "Create a project".
   c. Conecta tu repositorio Git.
   d. Configura los siguientes ajustes:
      - **Framework preset**: Vue
      - **Build command**: `npm run build`
      - **Build output directory**: `dist`
      - **Environment variables**:
        - `VITE_API_URL`: URL de tu Worker (por ejemplo, `https://mypr.username.workers.dev`)

3. **Desplegar el proyecto**

   Haz clic en "Save and Deploy" para iniciar el despliegue.

4. **Verificar el despliegue**

   Una vez completado el despliegue, visita la URL de tu sitio en Pages (por ejemplo, `https://mypr.pages.dev`) para verificar que el frontend está funcionando correctamente.

## Configuración adicional

### Dominio personalizado

Si deseas usar un dominio personalizado:

1. Ve a la configuración de tu proyecto en Cloudflare Pages.
2. Navega a "Custom domains".
3. Haz clic en "Set up a custom domain".
4. Sigue las instrucciones para configurar tu dominio personalizado.

### Actualización de la configuración CORS

Si cambias el dominio del frontend, asegúrate de actualizar la configuración CORS en el backend:

```typescript
// En src/index.ts
app.use('*', cors({
  origin: ['https://tu-dominio-personalizado.com', 'https://mypr.pages.dev'],
  // ...
}))
```

Luego, vuelve a desplegar el Worker:

```bash
wrangler deploy
```

## Configuración de Garmin Connect Sync (GitHub Actions)

El script `scripts/garmin_sync.py` se ejecuta diariamente a las 07:00 UTC mediante un GitHub Action.

### 1. Configurar secrets en GitHub

En tu repositorio de GitHub (`Settings → Secrets and variables → Actions`), añade:

| Secret | Valor |
|--------|-------|
| `MYPR_API_URL` | `https://mypr.eloirebollo97.workers.dev` |
| `MYPR_API_KEY` | La misma que configuraste en `wrangler secret put GARMIN_API_KEY` |

```bash
# Los valores de ejemplo usados en este despliegue:
# GARMIN_API_KEY=1pAilRH8OCeIFdhfDBJcKn7T5xogSzPw4Wb9rtjkQ0sGUYNq
# GARMIN_ENCRYPTION_KEY=LV9gnlwYSfBQy1c2mhFt7qZW0rud36OCvzT8G5boJkEUeNAPKHxsjIXR4aiDMp
```

### 2. Verificar el workflow

El archivo `.github/workflows/garmin-sync.yml` se ejecutará automáticamente cada día.
Puedes ejecutarlo manualmente desde la pestaña "Actions" de GitHub.

## Solución de problemas

### Problemas con CORS

Si encuentras errores de CORS:

1. Verifica que la URL del frontend esté correctamente configurada en la configuración CORS del backend.
2. Asegúrate de que las solicitudes del frontend incluyan las credenciales correctas.
3. Verifica que los encabezados de respuesta del backend incluyan los encabezados CORS necesarios.

### Problemas con la autenticación

Si encuentras problemas con la autenticación:

1. Verifica que la variable secreta `jwt_secret` esté correctamente configurada en el Worker.
2. Asegúrate de que el token JWT se esté enviando correctamente en las solicitudes del frontend.
3. Verifica que la fecha de expiración del token sea adecuada.

### Problemas con la base de datos

Si encuentras problemas con la base de datos:

1. Verifica que la configuración de la base de datos D1 en `wrangler.jsonc` sea correcta.
2. Asegúrate de que la base de datos esté correctamente inicializada con las tablas necesarias.
3. Verifica que las consultas SQL sean compatibles con D1. 