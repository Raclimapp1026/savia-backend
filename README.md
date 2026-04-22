# Sistema de Soporte Técnico QR - Backend API

API REST desarrollada con **NestJS + Prisma + PostgreSQL** para el Sistema de Gestión de Soporte Técnico mediante QR.

## Requisitos previos

- Node.js v18+
- PostgreSQL (local o Supabase/Neon)
- npm o yarn

## Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno
cp .env.example .env
# Editar .env con tus datos reales

# 3. Generar cliente de Prisma
npx prisma generate

# 4. Ejecutar migraciones
npx prisma migrate dev --name init

# 5. Cargar datos iniciales
npm run db:seed

# 6. Iniciar en modo desarrollo
npm run start:dev
```

## Endpoints de la API

### Públicos (sin autenticación)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/tickets | Crear ticket (formulario QR) |
| GET | /api/tickets/consultar/:codigo | Consultar estado de ticket |
| GET | /api/oficinas/activas | Listar oficinas activas |
| GET | /api/tipos-falla/activos | Listar tipos de falla activos |

### Auth
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/login | Iniciar sesión |
| GET | /api/auth/perfil | Ver perfil actual |

### Tickets (protegidos)
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | /api/tickets | Admin, Supervisor | Listar con filtros |
| GET | /api/tickets/mis-tickets | Técnico | Tickets asignados |
| GET | /api/tickets/metricas | Admin, Supervisor | Dashboard métricas |
| GET | /api/tickets/:id | Todos | Detalle de ticket |
| PUT | /api/tickets/:id/asignar | Admin | Asignar a técnico |
| PUT | /api/tickets/:id/estado | Admin, Técnico | Cambiar estado |

### Usuarios (Admin)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/usuarios | Listar todos |
| GET | /api/usuarios/tecnicos | Listar técnicos |
| POST | /api/usuarios | Crear usuario |
| PUT | /api/usuarios/:id | Actualizar |
| DELETE | /api/usuarios/:id | Desactivar |

### Oficinas (Admin)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/oficinas | Listar todas |
| POST | /api/oficinas | Crear oficina |
| PUT | /api/oficinas/:id | Actualizar |
| DELETE | /api/oficinas/:id | Desactivar |

### Tipos de Falla (Admin)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/tipos-falla | Listar todos |
| POST | /api/tipos-falla | Crear tipo |
| PUT | /api/tipos-falla/:id | Actualizar |
| DELETE | /api/tipos-falla/:id | Desactivar |

### Comentarios
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/comentarios | Agregar comentario |
| GET | /api/comentarios/ticket/:id | Ver por ticket |

## Credenciales de prueba (seed)

- **Admin:** admin@entidad.gov.co / Admin123*
- **Supervisor:** supervisor@entidad.gov.co / Supervisor123*
- **Técnicos:** tecnico1@entidad.gov.co / Tecnico123*

## Formato del código de ticket

`TIC` + últimos 2 dígitos del año + mes + día + consecutivo

Ejemplo: `TIC260330-001` (primer ticket del 30 de marzo de 2026)
