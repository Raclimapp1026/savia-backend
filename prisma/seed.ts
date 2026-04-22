import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos...\n');

  // ==========================================
  // 1. CREAR USUARIO ADMIN
  // ==========================================
  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin123*', 12);
  
  const admin = await prisma.usuario.upsert({
    where: { correo: process.env.ADMIN_EMAIL || 'admin@entidad.gov.co' },
    update: {},
    create: {
      nombre: process.env.ADMIN_NAME || 'Administrador del Sistema',
      correo: process.env.ADMIN_EMAIL || 'admin@entidad.gov.co',
      passwordHash: adminPassword,
      rol: 'ADMIN',
    },
  });
  console.log(`✅ Admin creado: ${admin.nombre} (${admin.correo})`);

  // ==========================================
  // 2. CREAR USUARIO SUPERVISOR
  // ==========================================
  const supervisorPassword = await bcrypt.hash('Supervisor123*', 12);
  
  const supervisor = await prisma.usuario.upsert({
    where: { correo: 'supervisor@entidad.gov.co' },
    update: {},
    create: {
      nombre: 'Supervisor de Soporte',
      correo: 'supervisor@entidad.gov.co',
      passwordHash: supervisorPassword,
      rol: 'SUPERVISOR',
    },
  });
  console.log(`✅ Supervisor creado: ${supervisor.nombre} (${supervisor.correo})`);

  // ==========================================
  // 3. CREAR TÉCNICOS DE EJEMPLO
  // ==========================================
  const tecnicoPassword = await bcrypt.hash('Tecnico123*', 12);
  const tecnicos = [
    { nombre: 'Tecnico 1', correo: 'tecnico1@entidad.gov.co' },
    { nombre: 'Tecnico 2', correo: 'tecnico2@entidad.gov.co' },
    { nombre: 'Tecnico 3', correo: 'tecnico3@entidad.gov.co' },
  ];

  for (const tec of tecnicos) {
    const tecnico = await prisma.usuario.upsert({
      where: { correo: tec.correo },
      update: {},
      create: {
        nombre: tec.nombre,
        correo: tec.correo,
        passwordHash: tecnicoPassword,
        rol: 'TECNICO',
      },
    });
    console.log(`✅ Tecnico creado: ${tecnico.nombre} (${tecnico.correo})`);
  }

  // ==========================================
  // 4. CREAR OFICINAS (27 oficinas)
  // ==========================================
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const oficinasNombres = [
    'Direccion General',
    'Subdireccion Administrativa',
    'Subdireccion Tecnica',
    'Oficina Juridica',
    'Oficina de Planeacion',
    'Oficina de Control Interno',
    'Oficina de Sistemas',
    'Oficina de Talento Humano',
    'Oficina de Contabilidad',
    'Oficina de Tesoreria',
    'Oficina de Presupuesto',
    'Oficina de Contratacion',
    'Oficina de Archivo',
    'Oficina de Correspondencia',
    'Oficina de Atencion al Ciudadano',
    'Oficina de Comunicaciones',
    'Oficina de Bienes e Inventarios',
    'Oficina de Almacen',
    'Oficina de Gestion Ambiental',
    'Oficina de Seguridad y Salud en el Trabajo',
    'Oficina de Infraestructura',
    'Oficina de Proyectos',
    'Oficina de Gestion Documental',
    'Oficina Financiera',
    'Oficina de Transporte',
    'Recepcion',
    'Sala de Reuniones Principal',
  ];

  for (const nombre of oficinasNombres) {
    const oficina = await prisma.oficina.upsert({
      where: { nombre },
      update: {},
      create: {
        nombre,
        ubicacion: 'Sede Principal',
      },
    });

    // Actualizar URL del QR
    await prisma.oficina.update({
      where: { id: oficina.id },
      data: { codigoQr: `${frontendUrl}/reportar?oficina=${oficina.id}` },
    });

    console.log(`✅ Oficina creada: ${nombre}`);
  }

  // ==========================================
  // 5. CREAR TIPOS DE FALLA
  // ==========================================
  const tiposFalla = [
    { nombre: 'Equipo no enciende', descripcion: 'El computador o portatil no enciende o no da señal.' },
    { nombre: 'Pantalla azul / reinicio inesperado', descripcion: 'El equipo muestra pantalla azul o se reinicia solo.' },
    { nombre: 'Problema de conexion a internet / red', descripcion: 'Sin acceso a internet, red lenta o desconexion frecuente.' },
    { nombre: 'Impresora no imprime', descripcion: 'La impresora no responde, atasco de papel o error de impresion.' },
    { nombre: 'Correo electronico no funciona', descripcion: 'No se puede enviar o recibir correos, error de acceso.' },
    { nombre: 'Software no responde o presenta errores', descripcion: 'Una aplicacion se congela, cierra inesperadamente o muestra errores.' },
    { nombre: 'Solicitud de instalacion de software', descripcion: 'Se requiere instalar un programa o actualizar uno existente.' },
    { nombre: 'Problema con periferico', descripcion: 'Falla en mouse, teclado, monitor, escaner u otro periferico.' },
    { nombre: 'Lentitud del equipo', descripcion: 'El computador funciona muy lento o tarda en abrir programas.' },
    { nombre: 'Problema con telefonia IP', descripcion: 'El telefono IP no funciona, sin tono o llamadas cortadas.' },
    { nombre: 'Otro', descripcion: 'Otro tipo de falla no listada. Especificar en la descripcion.' },
  ];

  for (const tipo of tiposFalla) {
    await prisma.tipoFalla.upsert({
      where: { nombre: tipo.nombre },
      update: {},
      create: tipo,
    });
    console.log(`✅ Tipo de falla creado: ${tipo.nombre}`);
  }

  console.log('\n🎉 Seed completado exitosamente!');
  console.log('\n📋 Credenciales de acceso:');
  console.log('  Admin:      admin@entidad.gov.co / Admin123*');
  console.log('  Supervisor: supervisor@entidad.gov.co / Supervisor123*');
  console.log('  Tecnicos:   tecnico1@entidad.gov.co / Tecnico123*');
  console.log('              tecnico2@entidad.gov.co / Tecnico123*');
  console.log('              tecnico3@entidad.gov.co / Tecnico123*');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
