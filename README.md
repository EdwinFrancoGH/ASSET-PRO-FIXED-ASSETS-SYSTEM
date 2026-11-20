# ASSET PRO — Fixed Assets

Control de activos fijos: consolidado de activos, movimientos, levantamientos
físicos (auditorías) y acta de validación. Es la versión web del libro
**FIXED ASSET KERNEL V1.2.xlsm** y usa la misma arquitectura y diseño que
**ASSET PRO PAY** (paleta carmesí con el venado rojo en lugar del azul).

```
ASSET PRO FIXED ASSETS/
├── backend/    Express + Firebase Admin (Firestore)          → puerto 5001
│   ├── credentials/firebase-key.json   ← credencial del proyecto PROPIO (no se sube a git)
│   ├── scripts/seed.js                 ← primer Administrador + catálogos del Excel
│   └── src/
│       ├── config/        firebase, roles, reglas de activos (estados, movimientos, depreciación)
│       ├── middlewares/   verifyToken / verifyRoles
│       ├── routes/ controllers/ services/ validators/
│       └── utils/         mailer, errores, contadores, fechas
└── frontend/   Next.js 14 (App Router) + Tailwind 4            → puerto 3001
    ├── public/images/login-bg.jpg      ← venado rojo
    └── src/app/(app)/  dashboard, activos, movimientos, levantamientos,
                        notificaciones, catálogos, usuarios, perfil
```

Los puertos son distintos a los de Pay (5000/3000) para poder correr ambos sistemas a la vez.

## Del Excel al sistema

| Hoja del Excel | En el sistema |
|---|---|
| **BD** (NOMBRE_PERIFERICO, N_ESTADO, SUCURSALES, ASOCIADO/AREA) | **Catálogos**: Tipos de activo (con prefijo y vida útil), Sucursales, Áreas (con líder) y Asociados |
| **MAIN** — Consolidado de activos | **Activos**: IDActivo `ACT-00001`, CodigoActivo por tipo `LAP-0001` (=LEFT(EQUIPO,3)), descripción, marca, modelo, serie, estado, responsable, área, sucursal, ubicación, compra, vida útil, depreciación, foto y **etiqueta QR**. Excel con las mismas columnas. |
| **MOVIMIENTOS** | **Movimientos** `MOV-00001`: Asignación, Traslado, Préstamo, Devolución, Mantenimiento/Retorno y Baja, con origen/destino, responsable anterior/nuevo, usuario y fecha. Excel. |
| **AUDITORIA_AF** + macro *GuardarEnMain* | **Levantamientos** `LEV-2026-0001`: encabezado (sucursal/área, responsable, líder, auditor, fecha), carga de los activos del área, encontrado/no localizado, condición, observaciones, hallazgos. Al **cerrar** actualiza el consolidado. |
| **ACTA** + macro *GenerarActa* | **Acta de validación** en PDF con el texto del Excel, observaciones, firmas y anexo de activos levantados. |
| Formulario *frmNuevoAsociado* | Botón “Nuevo asociado” dentro del levantamiento. |

### Estados del activo
`Disponible → Asignado ⇄ Prestado`, `En reparación` (vuelve al estado anterior) y `Baja` (definitiva).
Responsable, ubicación y estado **solo** cambian con un movimiento (queda historial);
editar un activo cambia datos descriptivos, financieros, condición y foto.

| Movimiento | Desde | Resultado |
|---|---|---|
| Asignación | Disponible, Asignado | Nuevo responsable → Asignado |
| Traslado | Disponible, Asignado, Prestado | Cambia sucursal/área/ubicación (y opcionalmente responsable) |
| Préstamo | Disponible, Asignado | Responsable temporal → Prestado (fecha de devolución) |
| Devolución | Asignado, Prestado | Sin responsable → Disponible |
| Mantenimiento | Disponible, Asignado, Prestado | En reparación |
| Retorno de mantenimiento | En reparación | Estado anterior (+ condición) |
| Baja | Todos menos Baja | Baja (motivo obligatorio; avisa a Admin/Inventario) |

### Levantamiento (auditoría física)
1. **Nuevo levantamiento**: sucursal y/o área, responsable (opcional), líder de área (se propone el del área), auditor y fecha. Marca “Cargar los activos registrados” para traer la lista.
2. En sitio: desmarca los **no localizados**, ajusta la **condición** (Bueno/Regular/Malo), escribe observaciones, agrega activos con el buscador o registra **hallazgos** (activos que no estaban en el sistema). El sistema marca las **diferencias** (el activo está registrado en otra área/sucursal/responsable).
3. **Vista previa del acta** en cualquier momento.
4. **Cerrar**: cada activo recibe la última auditoría (fecha, auditor, condición); los no encontrados quedan como *No localizados*; los hallazgos se dan de alta; opcionalmente las diferencias se corrigen con un **Traslado**. Se avisa a Administración e Inventario.

### Depreciación
Línea recta, igual que la columna *DepreciacionMensual*: `ValorCompra ÷ (VidaUtilAnios × 12)`.
Se calcula además meses de uso, depreciación acumulada y valor en libros (ficha, panel y Excel).

### Roles

| Rol | Puede |
|---|---|
| Responsable inventario | Activos, movimientos, catálogos, levantamientos y Excel |
| Auditor | Levantamientos (crea, levanta en sitio, cierra y genera actas), programación y **catálogos según los permisos que le dé el Administrador**; consulta el resto. No gestiona usuarios |
| Consulta | Solo lectura (activos, movimientos, levantamientos, Excel) |
| Administrador | Todo, además usuarios y eliminar activos registrados por error |

**Permisos del auditor** (Catálogos → *Permisos del auditor*, solo Administrador): un interruptor por catálogo
(Tipos de activo, Sucursales, Áreas, Asociados). Activado = el Auditor puede crear, editar y eliminar; desactivado = solo lectura
(la pestaña muestra un candado). El permiso de **Asociados** también controla el botón “Nuevo asociado” dentro del levantamiento.
Por defecto todos están activados. Se guarda en Firestore en `configuracion/permisos` y el backend lo valida en cada cambio
(`backend/src/services/permisos.service.js`).

## Instalación

### 1. Firebase (proyecto nuevo, independiente de Pay)
1. Crea un proyecto en <https://console.firebase.google.com> (ej. `asset-pro-fixed-assets`).
2. **Authentication → Método de acceso →** habilita **Correo electrónico/contraseña**.
3. **Firestore Database →** crea la base de datos y cierra las reglas (todo pasa por el backend):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} { allow read, write: if false; }
     }
   }
   ```
4. **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada** → guárdala como `backend/credentials/firebase-key.json`.
5. **Configuración del proyecto → Tus apps → Web (</>)**: copia `apiKey`, `authDomain`, `projectId` y `appId`.

No hace falta Firebase Storage: las fotos se guardan comprimidas (JPEG) dentro del documento del activo.

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env
npm run seed -- admin@electrolabmedic.com.sv "UnaContraseñaSegura" "Nombre Apellido"
npm run dev                 # http://localhost:5001
```
El seed crea el Administrador y carga los 13 tipos de activo y las 7 sucursales de la hoja BD.

### 3. Frontend
```bash
cd frontend
npm install
cp env.local.example .env.local    # pega los datos web de Firebase (en Windows: copy env.local.example .env.local)
npm run dev                         # http://localhost:3001
```

### 4. Primeros pasos
1. **Catálogos → Asociados**: personas responsables de activos (incluye a los líderes).
2. **Catálogos → Áreas**: crea las áreas y asigna su líder.
3. Revisa **Tipos de activo** (prefijo y vida útil) y **Sucursales**.
4. **Usuarios**: crea Auditores, Responsables de inventario y usuarios de Consulta.
5. Registra los activos (**Nuevo activo**) y empieza los levantamientos.

## Personalización
- **Días para “sin auditar”**: `DIAS_SIN_AUDITAR` en `backend/src/config/activos.js` (180).
- **Estados, condiciones y tipos de movimiento**: `backend/src/config/activos.js` y `frontend/src/utils/activos.js` (mantener iguales).
- **Columnas del Excel**: `backend/src/services/exportar.service.js`.
- **Texto del acta**: `backend/src/services/actaPdf.service.js`.
- **Colores**: paleta `brand` en `frontend/src/app/globals.css`.

## Programación de levantamientos y sucursal más cercana
- **Programación** (menú lateral, roles Administrador, Responsable inventario y Auditor): vista semanal (lunes a domingo) para indicar qué día estarás en qué **sucursal y/o área**, con horario y nota. Botón **Copiar semana anterior** para repetir la ruta. Administrador/Inventario pueden programar a otros usuarios y ver **Todo el equipo**.
- **Panel principal → “Hoy te toca levantar”**: muestra la(s) visita(s) del día con **Iniciar levantamiento** (abre el formulario con la sucursal/área ya elegidas y marca la visita como *Realizada*) y **Cómo llegar** (Google Maps).
- **Panel principal → “Sucursal más cercana”**: usa la ubicación del navegador y ordena las sucursales por tiempo en carro (Google **Routes API**). Sin clave usa distancia en línea recta.
- **Catálogos → Sucursales**: nuevos campos *Dirección*, *Latitud* y *Longitud*. Botón **Usar mi ubicación actual** (estando en la sucursal) o deja las coordenadas vacías y se ubican con **Geocoding API** a partir de la dirección.

### Google Maps Platform
1. En <https://console.cloud.google.com> (con facturación activa; el uso de un equipo pequeño queda dentro del crédito mensual gratuito) habilita **Routes API**, **Geocoding API** y **Maps Embed API**.
2. Crea dos claves:
   - **Servidor** → `backend/.env`: `GOOGLE_MAPS_API_KEY=...` (restríngela por API: Routes y Geocoding).
   - **Navegador** → `frontend/.env.local`: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...` (restríngela a *Maps Embed API* y a los dominios `localhost:3001` y el de Vercel).
3. Reinicia backend y frontend. Ambas son opcionales: sin ellas todo funciona con línea recta y mapa simple.
4. La geolocalización del navegador solo funciona en `localhost` o con **https** (Vercel ya lo es).

| Método | Ruta | Rol |
|---|---|---|
| GET | `/api/programacion?desde&hasta&usuarioId` (o `todos=true`) | Admin, Inventario, Auditor (Auditor: solo lo suyo) |
| GET | `/api/programacion/hoy` | ídem |
| POST/PUT/DELETE | `/api/programacion/:id` | ídem |
| PATCH | `/api/programacion/:id/realizada` `{ levantamientoId }` | ídem |
| POST | `/api/programacion/copiar-semana` `{ desde, hacia, usuarioId }` | ídem |
| GET | `/api/ubicacion/cercanas?lat&lng&limite` | todos |

## Publicar en la web (Render + Vercel)

Igual que ASSET PRO PAY: **backend en Render** y **frontend en Vercel**, desde un repositorio de GitHub.

| Pieza | Servicio | Carpeta raíz | URL de ejemplo |
|---|---|---|---|
| API (Express) | Render — Web Service | `backend` | `https://asset-pro-fixed-assets-api.onrender.com` |
| App (Next.js) | Vercel | `frontend` | `https://asset-pro-fixed-assets.vercel.app` |

### 1. Subir a GitHub
```bash
cd "ASSET PRO FIXED ASSETS"
git init
git add .
git status        # revisa que NO aparezcan .env, .env.local ni credentials/firebase-key.json
git commit -m "ASSET PRO Fixed Assets"
git branch -M main
git remote add origin https://github.com/<tu-usuario>/asset-pro-fixed-assets.git
git push -u origin main
```

### 2. Backend en Render
1. Render → **New → Blueprint** → elige el repositorio (usa `render.yaml`). O bien **New → Web Service** con *Root Directory* `backend`, *Build* `npm ci`, *Start* `npm start`, *Health check* `/health`.
2. Variables de entorno:
   - `FIREBASE_SERVICE_ACCOUNT`: abre `backend/credentials/firebase-key.json` y pega **todo el JSON** (de `{` a `}`).
   - `FRONTEND_URL`: la URL de Vercel (la pones cuando la tengas; puedes poner varias separadas por coma).
   - Opcionales: `GOOGLE_MAPS_API_KEY`, `SMTP_*`, `CONSOLE_URL`, `CONSOLE_SENSOR_KEY`.
3. Comprueba `https://<servicio>.onrender.com/health` → `{"ok":true}`.

> El plan gratuito de Render "duerme" el servicio tras 15 min sin uso: la primera petición tarda ~30–50 s.

### 3. Frontend en Vercel
1. Vercel → **Add New → Project** → importa el repositorio → **Root Directory: `frontend`** (Framework: Next.js).
2. Environment Variables:
   - `NEXT_PUBLIC_API_URL` = `https://<servicio>.onrender.com/api`
   - `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` (los mismos de tu `.env.local`)
   - Opcional: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
3. **Deploy**. Copia la URL y ponla en `FRONTEND_URL` de Render (Render redespliega solo).

### 4. Ajustes finales
- **Firebase → Authentication → Configuración → Dominios autorizados**: agrega `<tu-proyecto>.vercel.app` (si no, el login y "recuperar contraseña" fallan).
- **Google Cloud** (si usas mapas): agrega el dominio de Vercel a las restricciones de la clave del navegador.
- Cada `git push` a `main` vuelve a publicar ambos automáticamente.

## API (resumen)
Todas requieren `Authorization: Bearer <token de Firebase>` y responden `{ ok, message, data }`.

| Método | Ruta | Rol |
|---|---|---|
| GET | `/api/auth/me` | todos |
| GET/POST/PUT/DELETE | `/api/catalogos/:catalogo` (`tipos-activo`, `sucursales`, `areas`, `asociados`) | leer: todos; escribir: Admin, Inventario y Auditor (si tiene permiso) |
| POST | `/api/catalogos/asociados/registro` | Admin, Inventario, Auditor (si tiene permiso en Asociados) |
| GET | `/api/activos` (filtros `q`, `estado`, `tipoId`, `sucursalId`, `areaId`, `responsableId`, `sinAuditar`, `noLocalizado`, `incluirBajas`) | todos |
| GET | `/api/activos/resumen`, `/api/activos/exportar` (.xlsx) | todos |
| GET/POST/PUT/DELETE | `/api/activos/:id` | escribir: Admin, Inventario (eliminar: Admin) |
| POST | `/api/activos/:id/movimientos` `{ tipo, fecha, responsableId, sucursalId, areaId, ubicacion, comentario… }` | Admin, Inventario |
| GET | `/api/movimientos`, `/api/movimientos/exportar` | todos |
| GET/POST | `/api/levantamientos` | crear: Admin, Inventario, Auditor |
| GET/PUT/DELETE | `/api/levantamientos/:id` | según rol / auditor asignado |
| POST | `/api/levantamientos/:id/cerrar` `{ aplicarDiferencias }` | ídem |
| GET | `/api/levantamientos/:id/acta` → PDF | quien puede verlo |
| GET/PATCH | `/api/notificaciones`, `/:id/leida`, `/leer-todas` | todos |
| GET/PUT | `/api/configuracion/permisos` `{ auditor: { catalogos: { asociados: false, … } } }` | leer: todos; cambiar: Admin |
