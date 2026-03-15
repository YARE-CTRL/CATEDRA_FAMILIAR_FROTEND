// ============================================
// DATOS MOCK - Cátedra de Familia
// ============================================

// Tipos de usuario
export type RolUsuario = 'acudiente' | 'docente_aula' | 'orientador' | 'coordinador' | 'rector' | 'admin' | 'admin_sistema';

export interface Usuario {
  id: number;
  nombre: string;
  apellidos: string;
  correo: string;
  email?: string; // Alias para compatibilidad
  rol: RolUsuario;
  telefono: string;
  avatar?: string;
  institucionId?: number;
  institucion?: string; // Nombre de institución para display
  documento?: string;
  tipoDocumento?: string;
  activo: boolean;
  aprobado?: boolean;
  rechazado?: boolean;
  requiere_revision?: boolean;
  motivo_rechazo?: string;
  fecha_aprobacion?: string;
  fecha_rechazo?: string;
  debe_cambiar_contrasena?: boolean; // Flag para forzar cambio de contraseña
  deletedAt?: string | null; // Eliminación suave
  eliminado_en?: string | null; // Alias para compatibilidad
  createdAt?: string;
  created_at?: string; // Alias para compatibilidad
  updatedAt?: string;
}

export interface Estudiante {
  id: number;
  nombre: string;
  apellidos: string;
  documento: string;
  tipoDocumento: string;
  fechaNacimiento?: string;
  cursoId: number;
  institucionId: number;
  activo: boolean;
  deletedAt?: string | null;
  createdAt?: string;
}

export interface EstudianteAcudiente {
  id: number;
  estudianteId: number;
  acudienteId: number;
  parentesco: string;
  esPrincipal: boolean;
  createdAt?: string;
}

export interface Periodo {
  id: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  institucionId: number;
  anio: number;
  estado: 'activo' | 'cerrado' | 'planificado';
  createdAt?: string;
}

export interface Grado {
  id: number;
  nombre: string;
  orden: number;
  institucionId: number;
  activo: boolean;
}

export interface Categoria {
  id: number;
  nombre: string;
  color: string;
  icono: string;
  institucionId?: number;
}

export interface Tarea {
  id: number;
  titulo: string;
  descripcion: string;
  categoriaId: number;
  categoria?: Categoria;
  frecuencia: 'semanal' | 'quincenal' | 'mensual' | 'unica';
  fechaInicio: string;
  fechaVencimiento: string;
  fechaCreacion?: string; // Alias para fechaInicio
  fechaLimite?: string; // Alias para fechaVencimiento
  cursoId: number;
  // Nuevos campos relacionados con institución/autoría
  institucionId?: number;
  institucion?: { id: number; nombre: string };
  creador?: { id: number; correo: string };
  docenteId: number;
  periodoId?: number;
  incluyeEnBoletin: boolean;
  estado: 'activa' | 'cerrada' | 'borrador' | 'completada' | 'pendiente' | 'vencida';
  createdAt?: string;
}

export interface Entrega {
  id: number;
  tareaId: number;
  estudianteId: number;
  acudienteId: number;
  textoEvidencia: string;
  archivos: string[];
  imagenes?: string[]; // URLs de imágenes de evidencia
  fechaEntrega: string;
  estado: 'pendiente' | 'enviada' | 'calificada';
  calificacion?: number | string;
  tipoCalificacion?: 'numerica' | 'cualitativa';
  retroalimentacion?: string;
}

export interface Curso {
  id: number;
  nombre: string;
  gradoId: number;
  grado?: string; // Alias para display (ej: "6°", "7°")
  jornada: 'mañana' | 'tarde' | 'completa';
  institucionId: number;
  docenteDirectorId?: number;
  activo: boolean;
  estudiantes?: Estudiante[]; // Lista de estudiantes del curso
}

export interface Departamento {
  id: number;
  nombre: string;
  codigo: string;
}

export interface Municipio {
  id: number;
  nombre: string;
  departamento_id: number;
  codigo: string;
}

export interface Institucion {
  id: number;
  nombre: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  naturaleza: 'publica' | 'privada' | 'mixta';
  municipio_id?: number;
  // Campos extendidos para mostrar info completa
  municipio?: string; // Nombre del municipio
  departamento?: string; // Nombre del departamento
  codigo_dane?: string;
  nit?: string;
  resolucion_aprobacion?: string;
  niveles_educativos?: string[];
  modalidad?: string;
  jornadas?: string[];
  telefono_principal?: string;
  telefono_secretaria?: string;
  correo_institucional?: string;
  correo_rectoria?: string;
  sitio_web?: string;
  direccion_completa?: string;
  barrio?: string;
  estrato?: number;
  coordenadas_gps?: string;
  capacidad_estudiantes?: number;
  ano_fundacion?: number;
  enfoque_pedagogico?: string;
  confesional?: boolean;
  religion?: string;
  rector_nombre?: string;
  rector_documento?: string;
  rector_telefono?: string;
  rector_correo?: string;
  activo: boolean;
  creado_en?: string;
  actualizado_en?: string;
  eliminado_en?: string;
  createdAt?: string; // Alias
}

export interface Notificacion {
  id: number;
  tipo: 'tarea_nueva' | 'entrega_calificada' | 'recordatorio' | 'sistema';
  titulo: string;
  mensaje: string;
  destinatarioId: number;
  tareaId?: number;
  leida: boolean;
  fechaEnvio: string;
}

export interface LogAuditoria {
  id: number;
  accion: 'crear' | 'actualizar' | 'eliminar' | 'login' | 'logout';
  entidad: string;
  entidadId: number;
  usuarioId: number;
  detalles: string;
  ip?: string;
  fecha: string;
}

// ============================================
// DATOS MOCK
// ============================================

export const usuariosMock: Record<string, Usuario> = {
  acudiente: { 
    id: 1, 
    nombre: "María", 
    apellidos: "López Hernández",
    correo: "maria@test.com", 
    rol: "acudiente",
    telefono: "3101234567",
    avatar: undefined,
    documento: "1061234567",
    tipoDocumento: "cedula",
    activo: true,
    createdAt: "2025-01-01"
  },
  docente: { 
    id: 2, 
    nombre: "Carlos", 
    apellidos: "García Mendoza",
    correo: "garcia@docente.com", 
    rol: "docente_aula",
    telefono: "3109876543",
    institucionId: 1,
    documento: "1067654321",
    tipoDocumento: "cedula",
    activo: true,
    createdAt: "2025-01-01"
  },
  orientador: { 
    id: 3, 
    nombre: "Diana", 
    apellidos: "Pérez Castro",
    correo: "perez@docente.com", 
    rol: "orientador",
    telefono: "3105551234",
    institucionId: 1,
    documento: "1068887777",
    tipoDocumento: "cedula",
    activo: true,
    createdAt: "2025-01-01"
  },
  coordinador: { 
    id: 4, 
    nombre: "Roberto", 
    apellidos: "Ruiz Vargas",
    correo: "ruiz@docente.com", 
    rol: "coordinador",
    telefono: "3107778899",
    institucionId: 1,
    documento: "1069990000",
    tipoDocumento: "cedula",
    activo: true,
    createdAt: "2025-01-01"
  },
  rector: { 
    id: 5, 
    nombre: "Fernando", 
    apellidos: "Gómez Jiménez",
    correo: "gomez@docente.com", 
    rol: "rector",
    telefono: "3102223344",
    institucionId: 1,
    documento: "1061112233",
    tipoDocumento: "cedula",
    activo: true,
    createdAt: "2025-01-01"
  },
  admin: { 
    id: 6, 
    nombre: "Admin", 
    apellidos: "Sistema",
    correo: "admin@educacionpopayan.gov.co", 
    rol: "admin_sistema",
    telefono: "3100000000",
    documento: "0000000000",
    tipoDocumento: "cedula",
    activo: true,
    createdAt: "2025-01-01"
  }
};

// Lista de usuarios para gestión
export const usuariosListMock: Usuario[] = [
  usuariosMock.admin,
  usuariosMock.rector,
  usuariosMock.coordinador,
  usuariosMock.orientador,
  usuariosMock.docente,
  usuariosMock.acudiente,
  {
    id: 7,
    nombre: "Ana",
    apellidos: "Martínez López",
    correo: "ana.martinez@docente.com",
    rol: "docente_aula",
    telefono: "3114445566",
    institucionId: 1,
    documento: "1062223334",
    tipoDocumento: "cedula",
    activo: true,
    createdAt: "2025-02-15"
  },
  {
    id: 8,
    nombre: "Pedro",
    apellidos: "Sánchez Ruiz",
    correo: "pedro@test.com",
    rol: "acudiente",
    telefono: "3119998877",
    documento: "1063334445",
    tipoDocumento: "cedula",
    activo: true,
    createdAt: "2025-03-01"
  }
];

export const estudiantesMock: Estudiante[] = [
  { id: 1, nombre: "Juan", apellidos: "López García", documento: "1234567890", tipoDocumento: "ti", cursoId: 8, institucionId: 1, activo: true, createdAt: "2025-01-15" },
  { id: 2, nombre: "Ana", apellidos: "López García", documento: "1234567891", tipoDocumento: "ti", cursoId: 5, institucionId: 1, activo: true, createdAt: "2025-01-15" },
  { id: 3, nombre: "Pedro", apellidos: "Martínez Ruiz", documento: "1234567892", tipoDocumento: "ti", cursoId: 8, institucionId: 1, activo: true, createdAt: "2025-01-20" },
  { id: 4, nombre: "Sofía", apellidos: "Rodríguez Pérez", documento: "1234567893", tipoDocumento: "ti", cursoId: 7, institucionId: 1, activo: true, createdAt: "2025-02-01" },
];

export const estudiantesAcudientesMock: EstudianteAcudiente[] = [
  { id: 1, estudianteId: 1, acudienteId: 1, parentesco: "madre", esPrincipal: true, createdAt: "2025-01-15" },
  { id: 2, estudianteId: 2, acudienteId: 1, parentesco: "madre", esPrincipal: true, createdAt: "2025-01-15" },
  { id: 3, estudianteId: 3, acudienteId: 8, parentesco: "padre", esPrincipal: true, createdAt: "2025-01-20" },
  { id: 4, estudianteId: 4, acudienteId: 8, parentesco: "padre", esPrincipal: false, createdAt: "2025-02-01" },
];

export const periodosMock: Periodo[] = [
  { id: 1, nombre: "Período 1", fechaInicio: "2025-01-15", fechaFin: "2025-03-30", institucionId: 1, anio: 2025, estado: "cerrado", createdAt: "2025-01-01" },
  { id: 2, nombre: "Período 2", fechaInicio: "2025-04-01", fechaFin: "2025-06-15", institucionId: 1, anio: 2025, estado: "cerrado", createdAt: "2025-03-15" },
  { id: 3, nombre: "Período 3", fechaInicio: "2025-07-01", fechaFin: "2025-09-15", institucionId: 1, anio: 2025, estado: "cerrado", createdAt: "2025-06-15" },
  { id: 4, nombre: "Período 4", fechaInicio: "2025-09-20", fechaFin: "2025-11-30", institucionId: 1, anio: 2025, estado: "activo", createdAt: "2025-09-01" },
  { id: 5, nombre: "Período 1", fechaInicio: "2026-01-15", fechaFin: "2026-03-30", institucionId: 1, anio: 2026, estado: "planificado", createdAt: "2025-12-01" },
];

export const gradosMock: Grado[] = [
  { id: 1, nombre: "Preescolar", orden: 0, institucionId: 1, activo: true },
  { id: 2, nombre: "1°", orden: 1, institucionId: 1, activo: true },
  { id: 3, nombre: "2°", orden: 2, institucionId: 1, activo: true },
  { id: 4, nombre: "3°", orden: 3, institucionId: 1, activo: true },
  { id: 5, nombre: "4°", orden: 4, institucionId: 1, activo: true },
  { id: 6, nombre: "5°", orden: 5, institucionId: 1, activo: true },
  { id: 7, nombre: "6°", orden: 6, institucionId: 1, activo: true },
  { id: 8, nombre: "7°", orden: 7, institucionId: 1, activo: true },
  { id: 9, nombre: "8°", orden: 8, institucionId: 1, activo: true },
  { id: 10, nombre: "9°", orden: 9, institucionId: 1, activo: true },
  { id: 11, nombre: "10°", orden: 10, institucionId: 1, activo: true },
  { id: 12, nombre: "11°", orden: 11, institucionId: 1, activo: true },
];

export const categoriasMock: Categoria[] = [
  { id: 1, nombre: "Lectura Familiar", color: "#2563EB", icono: "📚" },
  { id: 2, nombre: "Juegos", color: "#10B981", icono: "🎲" },
  { id: 3, nombre: "Conversación", color: "#8B5CF6", icono: "💬" },
  { id: 4, nombre: "Creatividad", color: "#F59E0B", icono: "🎨" },
  { id: 5, nombre: "Cocina", color: "#EF4444", icono: "🍳" },
  { id: 6, nombre: "Deporte", color: "#06B6D4", icono: "⚽" },
  { id: 7, nombre: "Cultura", color: "#EC4899", icono: "🎭" },
  { id: 8, nombre: "Reflexión", color: "#6366F1", icono: "🧘" },
];

export const cursosMock: Curso[] = [
  { id: 1, nombre: "Preescolar A", gradoId: 1, jornada: "mañana", institucionId: 1, docenteDirectorId: 2, activo: true },
  { id: 2, nombre: "1° A", gradoId: 2, jornada: "mañana", institucionId: 1, docenteDirectorId: 2, activo: true },
  { id: 3, nombre: "2° A", gradoId: 3, jornada: "mañana", institucionId: 1, activo: true },
  { id: 4, nombre: "3° A", gradoId: 4, jornada: "mañana", institucionId: 1, activo: true },
  { id: 5, nombre: "3° B", gradoId: 4, jornada: "tarde", institucionId: 1, activo: true },
  { id: 6, nombre: "4° A", gradoId: 5, jornada: "mañana", institucionId: 1, activo: true },
  { id: 7, nombre: "4° B", gradoId: 5, jornada: "tarde", institucionId: 1, activo: true },
  { id: 8, nombre: "5° A", gradoId: 6, jornada: "mañana", institucionId: 1, docenteDirectorId: 2, activo: true },
  { id: 9, nombre: "5° B", gradoId: 6, jornada: "tarde", institucionId: 1, activo: true },
];

export const tareasMock: Tarea[] = [
  { 
    id: 1, 
    titulo: "Leer cuento en familia", 
    descripcion: "Elijan un cuento corto y léanlo juntos. Después, conversen sobre la historia: ¿Qué les gustó más? ¿Qué aprendieron?",
    categoriaId: 1,
    frecuencia: "semanal",
    fechaInicio: "2025-12-01",
    fechaVencimiento: "2025-12-15", 
    cursoId: 8,
    docenteId: 2,
    periodoId: 4,
    incluyeEnBoletin: true,
    estado: "activa",
    createdAt: "2025-12-01"
  },
  { 
    id: 2, 
    titulo: "Juego de mesa familiar", 
    descripcion: "Organicen una tarde de juegos de mesa en familia. Pueden ser cartas, dominó, parqués o cualquier juego que tengan en casa.",
    categoriaId: 2,
    frecuencia: "quincenal",
    fechaInicio: "2025-12-05",
    fechaVencimiento: "2025-12-20", 
    cursoId: 8,
    docenteId: 2,
    periodoId: 4,
    incluyeEnBoletin: true,
    estado: "activa",
    createdAt: "2025-12-05"
  },
  { 
    id: 3, 
    titulo: "Cocinar receta tradicional", 
    descripcion: "Preparen juntos una receta tradicional de su familia o región. Documenten el proceso con fotos.",
    categoriaId: 5,
    frecuencia: "mensual",
    fechaInicio: "2025-12-01",
    fechaVencimiento: "2025-12-10", 
    cursoId: 8,
    docenteId: 2,
    periodoId: 4,
    incluyeEnBoletin: true,
    estado: "activa",
    createdAt: "2025-12-01"
  },
  { 
    id: 4, 
    titulo: "Conversación sobre el futuro", 
    descripcion: "Hablen en familia sobre los sueños y metas de cada miembro. ¿Qué quieren lograr? ¿Cómo pueden apoyarse?",
    categoriaId: 3,
    frecuencia: "unica",
    fechaInicio: "2025-12-08",
    fechaVencimiento: "2025-12-22", 
    cursoId: 8,
    docenteId: 2,
    periodoId: 4,
    incluyeEnBoletin: true,
    estado: "activa",
    createdAt: "2025-12-08"
  },
  { 
    id: 5, 
    titulo: "Dibujo creativo", 
    descripcion: "Cada miembro de la familia dibuja algo que represente un momento feliz en familia. Luego comparten sus dibujos.",
    categoriaId: 4,
    frecuencia: "semanal",
    fechaInicio: "2025-12-01",
    fechaVencimiento: "2025-12-14", 
    cursoId: 5,
    docenteId: 2,
    periodoId: 4,
    incluyeEnBoletin: true,
    estado: "activa",
    createdAt: "2025-12-01"
  },
];

export const entregasMock: Entrega[] = [
  {
    id: 1,
    tareaId: 3,
    estudianteId: 1,
    acudienteId: 1,
    textoEvidencia: "Preparamos sancocho con la abuela. Fue una tarde muy especial compartiendo recetas de familia.",
    archivos: ["/mock/evidencia1.jpg", "/mock/evidencia2.jpg"],
    imagenes: [
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800",
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
      "https://images.unsplash.com/photo-1543353071-873f17a7a088?w=800"
    ],
    fechaEntrega: "2025-12-08",
    estado: "enviada",
    tipoCalificacion: "numerica"
  },
  {
    id: 2,
    tareaId: 1,
    estudianteId: 1,
    acudienteId: 1,
    textoEvidencia: "Leímos 'El Principito' juntos. A Juan le encantó la parte del zorro.",
    archivos: ["/mock/evidencia3.jpg"],
    imagenes: [
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800",
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800"
    ],
    fechaEntrega: "2025-12-05",
    estado: "calificada",
    calificacion: 4.5,
    tipoCalificacion: "numerica",
    retroalimentacion: "Excelente trabajo familiar. Se nota el compromiso y la dedicación."
  },
  {
    id: 3,
    tareaId: 2,
    estudianteId: 3,
    acudienteId: 8,
    textoEvidencia: "Jugamos parqués toda la tarde. Muy divertido en familia.",
    archivos: [],
    imagenes: [
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800"
    ],
    fechaEntrega: "2025-12-07",
    estado: "enviada",
    tipoCalificacion: "numerica"
  },
];

export const departamentosMock: Departamento[] = [
  { id: 1, nombre: 'Cauca', codigo: '19' },
  { id: 2, nombre: 'Valle del Cauca', codigo: '76' },
  { id: 3, nombre: 'Nariño', codigo: '52' },
  { id: 4, nombre: 'Huila', codigo: '41' },
  { id: 5, nombre: 'Cundinamarca', codigo: '25' }
];

export const municipiosMock: Municipio[] = [
  { id: 1, nombre: 'Popayán', departamento_id: 1, codigo: '19001' },
  { id: 2, nombre: 'Timbío', departamento_id: 1, codigo: '19807' },
  { id: 3, nombre: 'Cali', departamento_id: 2, codigo: '76001' },
  { id: 4, nombre: 'Palmira', departamento_id: 2, codigo: '76520' },
  { id: 5, nombre: 'Pasto', departamento_id: 3, codigo: '52001' },
  { id: 6, nombre: 'Neiva', departamento_id: 4, codigo: '41001' },
  { id: 7, nombre: 'Bogotá D.C.', departamento_id: 5, codigo: '11001' }
];

export const institucionesMock: Institucion[] = [
  { 
    id: 1, 
    nombre: "I.E. Occidente de Popayán",
    telefono: "(602) 824-5678",
    correo: "contacto@occidente.edu.co",
    direccion: "Carrera 15 # 8-45",
    naturaleza: 'publica',
    municipio_id: 1,
    codigo_dane: "119001000123",
    nit: "800123456-7",
    resolucion_aprobacion: "Resolución 001234 de 2010",
    niveles_educativos: ["preescolar", "primaria", "secundaria", "media"],
    modalidad: "presencial",
    jornadas: ["mañana", "tarde"],
    telefono_principal: "(602) 824-5678",
    telefono_secretaria: "(602) 824-5679",
    correo_institucional: "info@occidente.edu.co",
    correo_rectoria: "rector@occidente.edu.co",
    sitio_web: "https://occidente.edu.co",
    direccion_completa: "Carrera 15 # 8-45, Barrio San Francisco",
    barrio: "San Francisco",
    estrato: 3,
    coordenadas_gps: "2.4448, -76.6147",
    capacidad_estudiantes: 1200,
    ano_fundacion: 1985,
    enfoque_pedagogico: "Constructivista",
    confesional: false,
    rector_nombre: "María Elena Rodríguez",
    rector_documento: "41234567",
    rector_telefono: "3001234567",
    rector_correo: "rector@occidente.edu.co",
    activo: true,
    creado_en: "2023-01-15T10:00:00Z",
    actualizado_en: "2025-12-01T15:30:00Z"
  },
  { 
    id: 2, 
    nombre: "I.E. San José",
    telefono: "(602) 823-9876",
    correo: "secretaria@sanjose.edu.co",
    direccion: "Calle 20 # 12-30",
    naturaleza: 'privada',
    municipio_id: 1,
    codigo_dane: "119001000456",
    nit: "900234567-8",
    resolucion_aprobacion: "Resolución 002345 de 2008",
    niveles_educativos: ["preescolar", "primaria", "secundaria"],
    modalidad: "presencial",
    jornadas: ["unica"],
    telefono_principal: "(602) 823-9876",
    correo_institucional: "contacto@sanjose.edu.co",
    correo_rectoria: "rectoria@sanjose.edu.co",
    sitio_web: "https://sanjose.edu.co",
    direccion_completa: "Calle 20 # 12-30, Barrio Centro",
    barrio: "Centro",
    estrato: 4,
    capacidad_estudiantes: 800,
    ano_fundacion: 1960,
    enfoque_pedagogico: "Católico",
    confesional: true,
    religion: "Católica",
    rector_nombre: "Padre Luis Alberto Gómez",
    rector_documento: "12345678",
    rector_telefono: "3009876543",
    rector_correo: "rector@sanjose.edu.co",
    activo: true,
    creado_en: "2023-02-01T08:00:00Z",
    actualizado_en: "2025-11-15T12:00:00Z"
  }
];

export const notificacionesMock: Notificacion[] = [
  {
    id: 1,
    tipo: "tarea_nueva",
    titulo: "Nueva tarea asignada",
    mensaje: "Se ha asignado la tarea 'Leer cuento en familia' al curso 5° A",
    destinatarioId: 1,
    tareaId: 1,
    leida: false,
    fechaEnvio: "2025-12-01T10:00:00"
  },
  {
    id: 2,
    tipo: "entrega_calificada",
    titulo: "Entrega calificada",
    mensaje: "Tu entrega de 'Leer cuento en familia' ha sido calificada con 4.5",
    destinatarioId: 1,
    tareaId: 1,
    leida: true,
    fechaEnvio: "2025-12-06T14:30:00"
  },
];

export const logsAuditoriaMock: LogAuditoria[] = [
  { id: 1, accion: "crear", entidad: "Usuario", entidadId: 7, usuarioId: 6, detalles: "Usuario creado: Ana Martínez", fecha: "2025-02-15T09:00:00" },
  { id: 2, accion: "crear", entidad: "Tarea", entidadId: 1, usuarioId: 2, detalles: "Tarea creada: Leer cuento en familia", fecha: "2025-12-01T08:30:00" },
  { id: 3, accion: "actualizar", entidad: "Entrega", entidadId: 2, usuarioId: 2, detalles: "Entrega calificada con nota 4.5", fecha: "2025-12-06T14:30:00" },
];

// ============================================
// OPCIONES PARA SELECTS
// ============================================

export const tiposDocumento = [
  { value: 'cedula', label: 'Cédula de ciudadanía' },
  { value: 'ti', label: 'Tarjeta de identidad' },
  { value: 'pasaporte', label: 'Pasaporte' },
  { value: 'ce', label: 'Cédula de extranjería' },
];

export const parentescos = [
  { value: 'madre', label: 'Madre' },
  { value: 'padre', label: 'Padre' },
  { value: 'cuidador', label: 'Cuidador(a)' },
  { value: 'abuelo', label: 'Abuelo(a)' },
  { value: 'tio', label: 'Tío(a)' },
  { value: 'hermano', label: 'Hermano(a)' },
  { value: 'otro', label: 'Otro' },
];

export const tiposTrabajo = [
  { value: 'formal', label: 'Formal' },
  { value: 'informal', label: 'Informal' },
  { value: 'no_aplica', label: 'No aplica' },
];

export const nivelesEducativos = [
  { value: 'ninguno', label: 'Ninguno' },
  { value: 'primaria_incompleta', label: 'Primaria incompleta' },
  { value: 'primaria_completa', label: 'Primaria completa' },
  { value: 'bachillerato_incompleto', label: 'Bachillerato incompleto' },
  { value: 'bachillerato_completo', label: 'Bachillerato completo' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'tecnologico', label: 'Tecnológico' },
  { value: 'profesional', label: 'Profesional' },
  { value: 'posgrado', label: 'Posgrado' },
];

export const rolesDocente = [
  { value: 'docente_aula', label: 'Docente de Aula' },
  { value: 'orientador', label: 'Orientador' },
  { value: 'coordinador', label: 'Coordinador' },
  { value: 'rector', label: 'Rector' },
];

export const grados = [
  { value: 'preescolar', label: 'Preescolar' },
  { value: '1', label: '1°' },
  { value: '2', label: '2°' },
  { value: '3', label: '3°' },
  { value: '4', label: '4°' },
  { value: '5', label: '5°' },
  { value: '6', label: '6°' },
  { value: '7', label: '7°' },
  { value: '8', label: '8°' },
  { value: '9', label: '9°' },
  { value: '10', label: '10°' },
  { value: '11', label: '11°' },
];

export const frecuencias = [
  { value: 'semanal', label: 'Semanal' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'mensual', label: 'Mensual' },
  { value: 'unica', label: 'Única' },
];

export const escalasCalificacion = {
  numerica: [0, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5],
  cualitativa: [
    { value: 'superior', label: 'Superior', color: '#10B981' },
    { value: 'alto', label: 'Alto', color: '#3B82F6' },
    { value: 'basico', label: 'Básico', color: '#F59E0B' },
    { value: 'bajo', label: 'Bajo', color: '#EF4444' },
  ]
};
