# Fullstack Users API

Aplicación full stack para administrar usuarios. Incluye una API REST en Express, una interfaz Next.js en español, persistencia local con SQLite, paginación, filtros y exportación CSV mediante streaming.

## Tecnologías

- Node.js 20 o superior y npm
- Backend: Express, TypeScript y SQLite (`better-sqlite3`)
- Frontend: Next.js, React y TanStack Query
- Pruebas: Vitest y Supertest
- Monorepo: npm workspaces

## Instalación y ejecución

Instala las dependencias desde la raíz:

```bash
npm install
```

Inicia backend y frontend juntos:

```bash
npm run dev
```

La aplicación queda disponible en:

- Frontend: http://localhost:3001
- API: http://localhost:4001
- Health check: http://localhost:4001/health

El comando conjunto asigna los puertos `3001` y `4001`. Para ejecutar un workspace por separado, usa `npm run dev --workspace apps/backend` o `npm run dev --workspace apps/frontend`; sus puertos predeterminados son `4000` y `3000`.

## Configuración

El backend acepta `PORT` y `DATABASE_PATH`. La ruta predeterminada de la base es `apps/backend/data/users.sqlite` al arrancar desde el workspace backend. El frontend acepta `NEXT_PUBLIC_API_URL`; en el arranque conjunto se configura como `http://localhost:4001/api/v1`.

Se incluye [.env.example](.env.example) como referencia de estas variables. Deben definirse en el entorno del proceso que corresponda; Next.js carga sus archivos `.env*` desde `apps/frontend`.

SQLite guarda los datos en disco y no requiere un servicio de base de datos externo. La base se crea al iniciar el backend y está excluida del control de versiones.

## API REST

### Crear usuario

```http
POST /api/v1/users
Content-Type: application/json
```

Ejemplo:

```json
{
  "name": "Ana García",
  "email": "ana@example.com",
  "role": "admin",
  "active": true
}
```

La respuesta incluye el usuario creado dentro de `data` y un mensaje de confirmación.

```json
{
  "data": {
    "id": "uuid",
    "name": "Ana García",
    "email": "ana@example.com",
    "role": "admin",
    "active": true,
    "createdAt": "2026-10-12T00:00:00.000Z",
    "updatedAt": "2026-10-12T00:00:00.000Z"
  },
  "message": "Usuario creado correctamente"
}
```

### Generar datos de demostración

El botón **Generar 5.000 usuarios** del panel llama una sola vez a este endpoint:

```http
POST /api/v1/users/generate
```

El endpoint crea 5.000 usuarios en lotes de 250. El frontend muestra el estado de carga, impide solicitudes duplicadas y actualiza la tabla al finalizar. La operación está deshabilitada en producción.

Los registros usan combinaciones de nombres y apellidos de muestra. Los nombres y correos de demostración pueden repetirse; los correos usan el dominio reservado `example.test`. El CRUD manual mantiene correos únicos.

Respuesta:

```json
{
  "count": 5000,
  "total": 5003,
  "message": "Se generaron 5000 usuarios de prueba."
}
```

### Listar usuarios paginados

```http
GET /api/v1/users?page=1&pageSize=10
```

Respuesta:

```json
{
  "data": [
    {
      "id": "user-1",
      "name": "Alice",
      "email": "alice@example.com",
      "role": "admin",
      "active": true,
      "createdAt": "2024-01-01T09:00:00.000Z",
      "updatedAt": "2024-01-01T09:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 10,
  "total": 3,
  "totalPages": 1
}
```

### Filtrar usuarios

Los filtros se pueden combinar con la paginación. Los filtros de nombre y correo buscan coincidencias parciales sin distinguir mayúsculas; `id` y `role` son exactos, `active` acepta `true` o `false`, y `q` busca en nombre o correo.

```http
GET /api/v1/users?id=user-2
GET /api/v1/users?name=ali&role=admin&active=true
GET /api/v1/users?q=example.com&page=1&pageSize=5
GET /api/v1/users?email=alice@example.com
```

También está disponible la consulta individual por ruta:

```http
GET /api/v1/users/user-2
```

`page` debe ser un entero positivo y `pageSize` debe estar entre 1 y 100. Un rol o estado inválido devuelve HTTP 400. El `total` y `totalPages` de la respuesta se calculan después de aplicar los filtros.

### Obtener usuario por ID

```http
GET /api/v1/users/:id
```

### Actualizar usuario

```http
PUT /api/v1/users/:id
Content-Type: application/json
```

Ejemplo:

```json
{
  "name": "Ana Actualizada",
  "email": "ana.nueva@example.com",
  "role": "manager",
  "active": false
}
```

### Eliminar usuario

```http
DELETE /api/v1/users/:id
```

### Eliminar todos los registros

```http
DELETE /api/v1/users
```

El panel pide confirmación antes de eliminar todos los registros. El endpoint, al igual que el generador de datos, está deshabilitado en producción.

### Exportar usuarios a CSV

```http
GET /api/v1/users/export
```

La exportación devuelve un archivo CSV con cabecera:

```csv
id,name,email,role,active,createdAt
"user-1","Alice","alice@example.com","admin","true","2024-01-01T09:00:00.000Z"
```

## Arquitectura y persistencia

### Backend

El backend separa responsabilidades en:

- Dominio: entidad `User`, validaciones, errores y puerto `UserRepository`
- Aplicación: casos de uso para operaciones CRUD, listado, generación y exportación
- Infraestructura: adaptador SQLite para ejecución, adaptador en memoria para pruebas y controladores HTTP

Los controladores traducen HTTP a operaciones de aplicación. Las reglas de negocio permanecen fuera de Express y la persistencia depende del puerto del repositorio.

### Frontend

El frontend consume la API real con React Query y presenta:

- listado paginado
- filtros combinables por ID, nombre, correo, rol, estado y búsqueda general
- formulario para crear/editar usuario
- IDs visibles y navegación de página inicial, anterior, directa, siguiente y última
- generación de registros de demostración y limpieza total con confirmación
- eliminación con confirmación
- exportación CSV
- estados de carga, error y lista vacía

Archivos principales:

- [apps/frontend/app/page.tsx](apps/frontend/app/page.tsx)
- [apps/frontend/components/users-dashboard.tsx](apps/frontend/components/users-dashboard.tsx)
- [apps/frontend/components/user-form.tsx](apps/frontend/components/user-form.tsx)
- [apps/frontend/lib/api.ts](apps/frontend/lib/api.ts)

## Exportación y escalabilidad

`GET /api/v1/users/export` transmite CSV compatible con Excel. El controlador conecta un `Readable` a la respuesta HTTP con `pipe`, aprovechando backpressure. El adaptador SQLite lee los registros ordenados en lotes de 250 mediante un cursor compuesto por fecha e ID, evitando cargar el conjunto completo en memoria de Node y evitando offsets crecientes.

La generación de demostración también procesa lotes de 250 y utiliza transacciones SQLite. El archivo de base de datos persiste entre reinicios y no se incluye en Git.

## Pruebas

Desde la raíz del monorepo, instala dependencias si es la primera ejecución y corre todos los tests del backend:

```bash
npm install
npm test
```

Comandos equivalentes y ejecución enfocada:

```bash
npm run test --workspace apps/backend
npm run test --workspace apps/backend -- --run src/infrastructure/http/user-api.test.ts
```

La suite actual tiene 21 pruebas en 5 archivos:

- casos de uso: normalización y orden determinista
- adaptador HTTP: respuesta de creación y delegación simulada
- API HTTP: filtros, conteo filtrado, validaciones 400, usuario no encontrado 404, correo duplicado 409, generación de 5.000 usuarios y operaciones masivas restringidas en producción
- adaptador SQLite: persistencia entre aperturas, filtro SQL, unicidad del correo, borrado sin resembrado y generación/lectura de 5.000 registros
- exportación: consumo de 5.001 filas desde un flujo asíncrono

La suite cubre casos de uso, rutas HTTP con Supertest, persistencia SQLite en una base temporal y exportación de más de 5.000 filas. No incluye pruebas de navegador.

## Validaciones y build

### Backend

```bash
npm run build --workspace apps/backend
```

### Frontend

```bash
npm run build --workspace apps/frontend
```

### Type check / lint del frontend

```bash
npm run lint --workspace apps/frontend
```

## Criterios de evaluación

| Criterio oficial | Peso | Implementación |
| --- | ---: | --- |
| Arquitectura y diseño | 30 pts | Dominio, casos de uso, puerto de repositorio, adaptadores de persistencia y controladores HTTP separados. |
| Calidad del CRUD y paginación | 20 pts | Crear, consultar, editar, eliminar y listar; filtros combinables, orden determinista, metadatos de paginación y errores HTTP explícitos. |
| Escalabilidad y exportación | 20 pts | CSV transmitido por streaming; lectura SQLite en lotes de 250 y prueba sobre más de 5.000 registros. |
| Pruebas unitarias | 15 pts | Pruebas de casos de uso, controlador con mocks, API HTTP, adaptador SQLite y exportación. |
| Frontend | 15 pts | Next.js con React Query; CRUD, filtros, paginación, carga, error, vacío, exportación y acciones de demostración. |

## Conclusión

La aplicación puede instalarse y ejecutarse localmente con npm. Implementa CRUD de usuarios, filtros y paginación, persistencia SQLite, exportación CSV en streaming y una interfaz web con estados de carga, error y vacío.
