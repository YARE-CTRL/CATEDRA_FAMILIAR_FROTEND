import httpService from './httpService';

// Tipos básicos (puedes ampliar según backend real)
export interface EstudianteBackend {
  id: number;
  nombres: string;
  apellidos: string;
  numeroDocumento?: string;
  tipoDocumento?: string;
  fechaNacimiento?: string;
  sexo?: string;
  grupoSanguineo?: string;
  rh?: string;
  paisNacimiento?: string;
  ciudadNacimiento?: string;
  estrato?: string | number;
  etnia?: string;
  eps?: string;
  cursoId?: number;
}

function getSessionUser() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('session') : null;
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.user || null;
  } catch {
    return null;
  }
}

// Bandeja de entregas para Orientador
export async function listarEntregasOrientador(params?: { cursoId?: number; asignacionId?: number; soloPendientes?: boolean }) {
  const parse = (body: any): { data: EntregaBackend[]; meta?: any } => {
    if (body && typeof body === 'object') {
      if (Array.isArray(body.entregas)) return { data: body.entregas };
      if (Array.isArray(body.items)) return { data: body.items };
      if ('data' in body) {
        const inner = (body as any).data;
        if (inner && typeof inner === 'object' && 'data' in inner) return inner as { data: EntregaBackend[]; meta?: any };
        if (Array.isArray(inner)) return { data: inner as EntregaBackend[] };
        if (inner && typeof inner === 'object' && Array.isArray((inner as any).items)) return { data: (inner as any).items };
      }
    }
    return { data: Array.isArray(body) ? (body as EntregaBackend[]) : [] };
  };

  try {
    // Evitar enviar flags no soportados como soloPendientes
    const qp: any = { ...params };
    if ('soloPendientes' in qp) delete qp.soloPendientes;
    const response = await httpService.get<any>('/orientador/entregas', qp);
    const parsed = parse(response.data);
    const normalized = Array.isArray(parsed.data)
      ? (parsed.data as any[]).map((e: any) => {
          let archivos: any[] = [];
          if (typeof e.archivosUrl === 'string') {
            try {
              const arr = JSON.parse(e.archivosUrl);
              if (Array.isArray(arr)) {
                archivos = arr.map((it: any) => ({
                  url: it.url || it.path || '',
                  originalName: it.fileName || it.originalName || it.nombre || undefined,
                  fileName: it.fileName,
                }));
              }
            } catch {}
          } else if (Array.isArray(e.archivos)) {
            archivos = e.archivos.map((it: any) =>
              typeof it === 'string'
                ? { url: it, originalName: it, fileName: it }
                : it
            );
          }

          const estudianteNombre = e.estudiante?.nombres && e.estudiante?.apellidos
            ? `${e.estudiante.nombres} ${e.estudiante.apellidos}`
            : (e.estudiante?.nombre || e.estudianteNombre);

          // Derivar campos de calificación
          const notaRaw = e.nota ?? e.valor ?? e.puntuacion ?? e.puntaje ?? e.score ?? e.notaNumerica;
          const escala = e.escala ?? e.rango ?? (typeof notaRaw === 'number' && notaRaw <= 5 ? '1-5' : undefined);
          const notaCualitativa = e.notaCualitativa ?? e.concepto ?? e.cualitativa ?? undefined;
          const baseCalif = e.calificacion && typeof e.calificacion === 'object' ? e.calificacion : {};
          const calificacion =
            e.calificacion != null
              ? { ...baseCalif }
              : (e.estado === 'calificada' || notaRaw != null || notaCualitativa != null)
                ? { ...(e.detalleCalificacion || {}), nota: notaRaw, escala, notaCualitativa }
                : null;

          return { ...e, archivos, estudianteNombre, calificacion } as EntregaBackend;
        }) as any as EntregaBackend[]
      : parsed.data;
    return { data: normalized, meta: parsed.meta };
  } catch (err: any) {
    throw err;
  }
}

// =====================
// ORIENTADOR ENDPOINTS
// =====================

// Listar asignaciones del orientador con filtros y paginación
export async function listarAsignacionesOrientador(params?: {
  periodoId?: number;
  periodo?: number;
  cursoId?: number;
  curso?: number;
  estado?: 'activa' | 'vencida' | 'futura';
  q?: string;
  page?: number;
  perPage?: number;
}) {
  const qp: any = { ...params };
  // compat shorthand: permitir periodoId o periodo
  if (qp.periodoId && !qp.periodo) qp.periodo = qp.periodoId;
  if (qp.cursoId && !qp.curso) qp.curso = qp.cursoId;
  const response = await httpService.get<any>('/orientador/asignaciones', qp);
  const body = response.data || {};
  // Aceptar múltiples formas: {asignaciones: [...]}, {data:[...]}, array directo, o {data:{data:[...]}}
  let data: any[] = [];
  let meta: any = body?.meta;
  if (Array.isArray(body?.asignaciones)) {
    data = body.asignaciones;
    meta = body?.meta ?? meta;
  } else if (Array.isArray(body?.data)) {
    data = body.data;
  } else if (body && typeof body === 'object' && body.data && Array.isArray(body.data?.data)) {
    data = body.data.data;
    meta = body.data?.meta ?? meta;
  } else if (Array.isArray(body)) {
    data = body;
  }
  // Fallback: si no hay datos, intentar con /docente/asignaciones (backend permite orientador)
  if (!Array.isArray(data) || data.length === 0) {
    try {
      const resp2 = await httpService.get<any>('/docente/asignaciones', qp);
      const b2 = resp2.data || {};
      if (Array.isArray(b2?.asignaciones)) {
        data = b2.asignaciones;
        meta = b2?.meta ?? meta;
      } else if (Array.isArray(b2?.data)) {
        data = b2.data;
        meta = b2?.meta ?? meta;
      } else if (b2 && typeof b2 === 'object' && b2.data && Array.isArray(b2.data?.data)) {
        data = b2.data.data;
        meta = b2.data?.meta ?? meta;
      } else if (Array.isArray(b2)) {
        data = b2;
      }
    } catch {}
  }
  // Normalizar a una forma similar a AsignacionBackend cuando sea posible
  const mapped = (data as any[]).map((a: any) => ({
    id: a.id,
    bancoTareaId: a.bancoTareaId ?? a.banco_tarea_id,
    titulo: a.titulo || '',
    descripcion: a.descripcion || '',
    periodoId: a.periodoId ?? a.periodo_id ?? qp.periodo ?? undefined,
    fechaInicio: a.fechaInicio ?? a.fecha_inicio,
    fechaVencimiento: a.fechaVencimiento ?? a.fecha_vencimiento,
    cursoIds: Array.isArray(a.cursos) ? a.cursos.map((c: any) => c.id) : undefined,
    cursoNombre: undefined,
    docenteId: a.docente?.id,
    entregas: { realizadas: 0, total: 0 },
    estado: a.estado,
    esIndividual: a.esIndividual ?? a.es_individual ?? false,
  }));
  return { data: mapped, raw: data, meta } as { data: AsignacionBackend[]; raw: any[]; meta?: any };
}

// Resumen de asignación para orientador
export async function getResumenAsignacionOrientador(asignacionId: number) {
  const response = await httpService.get<any>(`/orientador/asignaciones/${asignacionId}/resumen`);
  const body = response.data || {};
  const d = body?.data || body || {};
  // Mapear a una estructura compatible con ResumenAsignacionBackend en lo posible
  const asigna = d.asignacion || {};
  const resumen = d.resumen || {};
  const cursos = Array.isArray(d.cursos) ? d.cursos : [];
  const mapped: ResumenAsignacionBackend = {
    asignacionId: asigna.id ?? asignacionId,
    titulo: asigna.titulo || '',
    periodoId: asigna.periodoId ?? asigna.periodo_id,
    totalCursos: Array.isArray(cursos) ? cursos.length : 0,
    totalEstudiantes: resumen.totalEstudiantes ?? 0,
    entregasRealizadas: resumen.entregados ?? 0,
    entregasPendientes: resumen.noEntregados ?? 0,
    calificaciones: 0,
    porCurso: Array.isArray(cursos)
      ? cursos.map((c: any) => ({
          cursoId: c.id,
          cursoNombre: c.nombre || `Curso #${c.id}`,
          totalEstudiantes: 0,
          entregasRealizadas: 0,
          calificaciones: 0,
        }))
      : undefined,
  };
  return mapped;
}

// Variante: obtener el cuerpo crudo (con listas entregados/noEntregados)
export async function getResumenAsignacionOrientadorRaw(asignacionId: number) {
  const response = await httpService.get<any>(`/orientador/asignaciones/${asignacionId}/resumen`);
  const body = response.data || {};
  return body?.data || body || {};
}

// Crear y asignar como orientador (multi-curso permitido)
export async function crearAsignacionOrientador(payload: {
  bancoTareaId: number;
  periodoId: number;
  cursoId?: number;
  cursoIds?: number[];
  fechaInicio?: string;
  fechaVencimiento?: string;
  frecuencia?: string;
  incluirEnBoletin?: boolean;
  titulo?: string;
  descripcion?: string;
  tema?: string;
  docenteId?: number;
}) {
  const user = getSessionUser();
  const body = (!('docenteId' in payload) || payload.docenteId == null) && user?.rol === 'orientador'
    ? { ...payload, docenteId: Number(user.id) }
    : payload;
  const response = await httpService.post('/asignaciones/orientador', body);
  return response.data;
}

// Calificaciones: crear (aplicar nota sugerida en servidor si no se envía nota)
export async function crearCalificacion(payload: {
  entregaId: number;
  nota?: number;
  escala?: string; // por defecto "1-5" si se omite
  notaCualitativa?: string | null;
  retroalimentacion?: string | null;
}) {
  // No enviar docenteId; solo los campos requeridos por el backend
  const primaryBody: any = {
    entregaId: payload.entregaId,
    ...(payload.nota != null ? { nota: payload.nota } : {}),
    ...(payload.retroalimentacion != null ? { retroalimentacion: payload.retroalimentacion } : {}),
    ...(payload.notaCualitativa != null ? { notaCualitativa: payload.notaCualitativa } : {}),
    ...(payload.escala ? { escala: payload.escala } : {}),
  };
  try {
    const res = await httpService.post('/calificaciones', primaryBody);
    return res.data;
  } catch (e: any) {
    const retryable = [400, 403, 404, 405];
    if (!retryable.includes(e?.status)) throw e;
    // Reintento con snake_case básico (sin docenteId)
    const altSnake: any = {
      entrega_id: payload.entregaId,
      nota: payload.nota,
      retroalimentacion: payload.retroalimentacion,
      nota_cualitativa: payload.notaCualitativa,
      ...(payload.escala ? { escala: payload.escala } : {}),
    };
    try {
      const r2 = await httpService.post('/calificaciones', altSnake);
      return r2.data;
    } catch (e2: any) {
      if (!retryable.includes(e2?.status)) throw e2;
    }
    // Último intento: forma mínima solo con entregaId
    const minimal = { entregaId: payload.entregaId } as any;
    const r3 = await httpService.post('/calificaciones', minimal);
    return r3.data;
  }
}

export interface AcudienteBackend {
  id: number;
  nombres: string;
  apellidos: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  telefono?: string;
  telefonoAlternativo?: string;
  correo?: string;
  direccion?: string;
  parentesco?: string;
  ocupacion?: string;
  tipoTrabajo?: string;
  nivelEducativo?: string;
  aportaEconomia?: boolean;
  horarioTrabajo?: string;
}

export interface BancoTareaBackend {
  id: number;
  titulo: string;
  descripcion: string;
  enlace?: string;
  categoriaId: number;
  tema?: string;
  entregableEsperado?: string;
  gradosObjetivo?: string | number[];
  esMultiGrado?: boolean;
  tipoCalificacion?: string;
  criteriosAutomaticos?: any;
  vecesUtilizada?: number;
}

export interface PeriodoBackend {
  id: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  institucionId?: number;
  estaActivo?: boolean;
}

export interface CursoBackend {
  id: number;
  nombre: string;
  gradoId?: number;
  jornada?: string;
  institucionId?: number;
}

export interface AsignacionBackend {
  id: number;
  bancoTareaId: number;
  titulo: string;
  descripcion?: string;
  periodoId: number;
  cursoId?: number;
  cursoNombre?: string;
  cursoIds?: number[];
  docenteId?: number;
  fechaInicio?: string;
  fechaVencimiento?: string;
  estado?: 'pendiente' | 'entregada' | 'calificada' | 'vencida';
  entregas?: { realizadas: number; total: number };
  esIndividual?: boolean;
}

export interface ResumenAsignacionBackend {
  asignacionId: number;
  titulo: string;
  periodoId: number;
  totalCursos: number;
  totalEstudiantes: number;
  entregasRealizadas: number;
  entregasPendientes: number;
  calificaciones: number;
  porCurso?: Array<{
    cursoId: number;
    cursoNombre: string;
    totalEstudiantes: number;
    entregasRealizadas: number;
    calificaciones: number;
  }>;
}

export interface EntregaBackend {
  id: number;
  asignacionId: number;
  tareaId?: number;
  cursoId: number;
  estudianteId: number;
  estudianteNombre?: string;
  fechaEntrega?: string;
  estado: 'pendiente' | 'enviada' | 'calificada';
  calificacion?: number | string;
}

// Listados: el backend filtra por cursos del docente vía JWT
export async function listarEstudiantesDocente(params?: { page?: number; limit?: number; q?: string }) {
  const response = await httpService.get<EstudianteBackend[]>('/docentes/estudiantes', params);
  return response.data;
}

export async function listarAcudientesDocente(params?: { page?: number; limit?: number; q?: string }) {
  const response = await httpService.get<AcudienteBackend[]>('/docentes/acudientes', params);
  return response.data;
}

export async function getEstudianteDocente(id: number) {
  const response = await httpService.get<EstudianteBackend>(`/docentes/estudiantes/${id}`);
  return response.data;
}

export async function updateEstudianteDocente(id: number, payload: Partial<EstudianteBackend>) {
  const response = await httpService.put<{ message: string; estudiante: EstudianteBackend }>(
    `/docentes/estudiantes/${id}`,
    payload
  );
  return response.data;
}

export async function getAcudienteDocente(id: number) {
  const response = await httpService.get<AcudienteBackend>(`/docentes/acudientes/${id}`);
  return response.data;
}

export async function updateAcudienteDocente(id: number, payload: Partial<AcudienteBackend>) {
  const response = await httpService.put<{ message: string; acudiente: AcudienteBackend }>(
    `/docentes/acudientes/${id}`,
    payload
  );
  return response.data;
}

// Banco de Tareas
export async function listarBancoTareas(params?: { page?: number; limit?: number; q?: string; categoriaId?: number }) {
  const response = await httpService.get<BancoTareaBackend[]>('/tareas', params);
  return response.data;
}

// Editar Banco de Tareas (PUT o PATCH). Admitir reemplazo de archivo con PUT vía FormData desde la llamada de UI.
export async function updateBancoTarea(
  id: number,
  payload: Partial<{
    titulo: string;
    descripcion: string;
    categoriaId: number;
    tema: string;
    entregableEsperado: string;
    gradosObjetivo: any;
    tipoCalificacion: string;
    criteriosAutomaticos: any;
    enlace: string;
  }>,
  method: 'PUT' | 'PATCH' = 'PATCH'
) {
  const ep = `/tareas/${id}`;
  const res = method === 'PUT' ? await httpService.put(ep, payload) : await httpService.patch(ep, payload);
  return res.data;
}

// Eliminar del Banco de Tareas
export async function deleteBancoTarea(id: number) {
  const res = await httpService.delete(`/tareas/${id}`);
  return res.data;
}

// Periodos
export async function listarPeriodos(params?: { page?: number; limit?: number; activo?: boolean }) {
  const response = await httpService.get<PeriodoBackend[]>('/periodos', params);
  return response.data;
}

// Cursos (para selector en asignación)
export async function listarCursos() {
  const parseCursos = (body: any): CursoBackend[] => {
    if (body && typeof body === 'object') {
      if (Array.isArray(body.data?.data)) return body.data.data as CursoBackend[];
      if (Array.isArray(body.data)) return body.data as CursoBackend[];
      if (Array.isArray(body.cursos)) return body.cursos as CursoBackend[];
      if (Array.isArray(body.items)) return body.items as CursoBackend[];
    }
    return Array.isArray(body) ? (body as CursoBackend[]) : [];
  };

  // Usar únicamente /cursos para evitar colisiones con rutas dinámicas del backend
  try {
    const res = await httpService.get<any>('/cursos');
    const list = parseCursos(res.data);
    return list;
  } catch {
    return [];
  }
}

// Asignaciones: listar con filtros y paginación
export async function listarAsignaciones(params?: {
  periodo?: number;
  cursoId?: number;
  estado?: 'pendiente' | 'entregada' | 'calificada' | 'vencida';
  detallePorCurso?: boolean;
  page?: number;
  perPage?: number;
}) {
  const qp: any = { ...params };
  if (params?.perPage && !('limit' in qp)) qp.limit = params.perPage;
  const response = await httpService.get<any>(
    '/docente/asignaciones',
    qp
  );
  const body: any = response.data;
  // Backend shape: { asignaciones: [...], meta: {...} }
  if (body && typeof body === 'object' && Array.isArray(body.asignaciones)) {
    const mapped: AsignacionBackend[] = body.asignaciones.map((a: any) => ({
      id: a.id,
      bancoTareaId: a.bancoTareaId ?? a.banco_tarea_id ?? a.bancoTareaID,
      titulo: a.titulo || '',
      descripcion: a.descripcion || '',
      periodoId: a.periodoId ?? a.periodo_id,
      cursoId: a.cursoId ?? null,
      cursoNombre: a.cursoNombre || a.curso?.nombre,
      cursoIds: Array.isArray(a.cursos) ? a.cursos : undefined,
      docenteId: a.docenteId ?? a.docente_id,
      fechaInicio: a.fechaInicio ?? a.fecha_inicio,
      fechaVencimiento: a.fechaVencimiento ?? a.fecha_vencimiento ?? null,
      estado: a.estado,
      entregas: {
        realizadas: a.entregas ?? a.entregasRealizadas ?? 0,
        total: a.totalEstudiantes ?? a.total_estudiantes ?? 0,
      },
      esIndividual: a.esIndividual ?? a.es_individual ?? false,
    }));
    return { data: mapped, meta: body.meta };
  }
  // Fallbacks: {data:{data,meta}} | {data,meta} | []
  if (body && typeof body === 'object' && 'data' in body) {
    const inner = body.data;
    if (inner && typeof inner === 'object' && 'data' in inner) {
      return inner as { data: AsignacionBackend[]; meta?: any };
    }
    return inner as { data: AsignacionBackend[]; meta?: any };
  }
  return { data: Array.isArray(body) ? (body as AsignacionBackend[]) : [], meta: undefined };
}

// Asignaciones: resumen por asignación (con cursoId opcional)
export async function getResumenAsignacion(asignacionId: number, params?: { cursoId?: number }) {
  const response = await httpService.get<any>(
    `/docente/asignaciones/${asignacionId}/resumen`,
    params
  );
  const body: any = response.data;
  const raw = (body && typeof body === 'object' && 'data' in body) ? (body as any).data : body;
  // Backend actual: { asignacion: { id, titulo, cursos[], totalEstudiantes, entregas, porcentajeEntrega } }
  const fromAsignacion = raw && typeof raw === 'object' && 'asignacion' in raw ? (raw as any).asignacion : null;
  const d: any = fromAsignacion || raw || {};

  const mapNumber = (v: any, fallback = 0) => {
    if (typeof v === 'number') return v;
    const n = Number(v);
    return isNaN(n) ? fallback : n;
  };

  const porCurso = Array.isArray(d.porCurso || d.por_curso || d.detallePorCurso || d.detalle_por_curso)
    ? (d.porCurso || d.por_curso || d.detallePorCurso || d.detalle_por_curso).map((c: any) => ({
        cursoId: c.cursoId ?? c.curso_id ?? c.id ?? 0,
        cursoNombre: c.cursoNombre ?? c.curso_nombre ?? c.curso?.nombre ?? `Curso #${c.cursoId ?? c.curso_id ?? ''}`,
        totalEstudiantes: mapNumber(c.totalEstudiantes ?? c.total_estudiantes ?? (c.total ?? 0)),
        entregasRealizadas: mapNumber(c.entregasRealizadas ?? c.entregas_realizadas ?? c.entregas ?? 0),
        calificaciones: mapNumber(c.calificaciones ?? c.califs ?? 0),
      }))
    : undefined;

  // Derive totals from porCurso if top-level is absent
  const sumFromPorCurso = (key: 'totalEstudiantes' | 'entregasRealizadas' | 'calificaciones') =>
    Array.isArray(porCurso) ? porCurso.reduce((acc: number, c: any) => acc + mapNumber((c as any)[key] ?? 0), 0) : 0;

  const sumTotalEst = sumFromPorCurso('totalEstudiantes');
  const sumRealizadas = sumFromPorCurso('entregasRealizadas');
  const sumCalif = sumFromPorCurso('calificaciones');

  let mapped: ResumenAsignacionBackend = {
    asignacionId: d.asignacionId ?? d.asignacion_id ?? d.id ?? asignacionId,
    titulo: d.titulo || d.nombre || `Asignación #${asignacionId}`,
    periodoId: d.periodoId ?? d.periodo_id ?? undefined,
    totalCursos: (() => {
      const top = mapNumber(d.totalCursos ?? d.total_cursos ?? 0);
      if (top > 0) return top;
      if (Array.isArray(d.cursos)) return d.cursos.length;
      return Array.isArray(porCurso) ? porCurso.length : 0;
    })(),
    totalEstudiantes: (() => {
      const fromTop = mapNumber(d.totalEstudiantes ?? d.total_estudiantes ?? d.estudiantes ?? 0);
      if (fromTop > 0) return fromTop;
      return sumTotalEst;
    })(),
    entregasRealizadas: (() => {
      const fromTop = mapNumber(d.entregasRealizadas ?? d.entregas_realizadas ?? d.entregas ?? 0);
      if (fromTop > 0) return fromTop;
      return sumRealizadas;
    })(),
    entregasPendientes: (() => {
      const v = mapNumber(d.entregasPendientes ?? d.entregas_pendientes ?? undefined as any);
      if (v > 0) return v;
      const tot = mapNumber(d.totalEstudiantes ?? d.total_estudiantes ?? 0);
      const ent = mapNumber(d.entregasRealizadas ?? d.entregas_realizadas ?? d.entregas ?? 0);
      if (tot || ent) return Math.max(0, tot - ent);
      if (sumTotalEst || sumRealizadas) return Math.max(0, sumTotalEst - sumRealizadas);
      return 0;
    })(),
    calificaciones: (() => {
      // No viene en el endpoint actual; mantenemos 0 o derivado si porCurso trae algo
      const v = mapNumber(d.calificaciones ?? d.total_calificaciones ?? 0);
      return v > 0 ? v : sumCalif;
    })(),
    porCurso,
  };

  // Si no hay calificaciones en top-level, obtenerlas desde entregas
  if (!mapped.calificaciones || mapped.calificaciones === 0) {
    try {
      const entregasRes = await listarEntregasDocente({ asignacionId, soloPendientes: false });
      const lista = Array.isArray((entregasRes as any)?.data) ? (entregasRes as any).data : [];
      const califCount = lista.filter((e: any) => !!e.calificacion).length;
      mapped = { ...mapped, calificaciones: califCount };
    } catch {
      // ignore
    }
  }

  return mapped;
}

// Asignaciones: crear
export async function crearAsignacion(payload: {
  bancoTareaId: number;
  cursoId?: number;
  cursoIds?: number[];
  periodoId: number;
  fechaInicio?: string; // ISO YYYY-MM-DD
  fechaVencimiento?: string; // ISO YYYY-MM-DD
  frecuencia?: string; // 'unica' | 'semanal' | etc.
  incluirEnBoletin?: boolean;
  titulo?: string;
  descripcion?: string;
  tema?: string;
  institucionId?: number;
  docenteId?: number;
}) {
  // El backend acepta snake_case o camelCase, mantenemos camelCase
  const user = getSessionUser();
  const body = (!('docenteId' in payload) || payload.docenteId == null) && user?.rol === 'orientador'
    ? { ...payload, docenteId: Number(user.id) }
    : payload;
  const response = await httpService.post('/asignaciones', body);
  return response.data;
}

// Editar asignación (PUT o PATCH)
export async function updateAsignacion(
  id: number,
  payload: Partial<{
    titulo: string;
    descripcion: string;
    frecuencia: string;
    incluirEnBoletin: boolean;
    tema: string;
    fechaInicio: string; // ISO
    fechaVencimiento: string; // ISO
    cursoId: number;
    cursoIds: number[];
    periodoId: number;
  }>,
  method: 'PUT' | 'PATCH' = 'PATCH'
) {
  const ep = `/asignaciones/${id}`;
  const res = method === 'PUT' ? await httpService.put(ep, payload) : await httpService.patch(ep, payload);
  return res.data;
}

// Eliminar asignación
export async function deleteAsignacion(id: number) {
  const res = await httpService.delete(`/asignaciones/${id}`);
  return res.data;
}

// Crear asignación especial (dirigida a estudiantes específicos)
export async function crearAsignacionEspecial(payload: {
  bancoTareaId: number;
  periodoId: number;
  estudianteIds: number[];
  fechaInicio?: string;
  fechaVencimiento?: string;
  frecuencia?: string;
  incluirEnBoletin?: boolean;
  titulo?: string;
  descripcion?: string;
  tema?: string;
}) {
  const body = { ...payload } as any;
  const res = await httpService.post('/asignaciones/especial', body);
  return res.data;
}

export async function crearAsignacionOrientadorEspecial(payload: {
  bancoTareaId: number;
  periodoId: number;
  estudianteIds: number[];
  fechaInicio?: string;
  fechaVencimiento?: string;
  frecuencia?: string;
  incluirEnBoletin?: boolean;
  titulo?: string;
  descripcion?: string;
  tema?: string;
}) {
  const body = { ...payload } as any;
  const res = await httpService.post('/asignaciones/orientador/especial', body);
  return res.data;
}

// Entregas del docente (bandeja), con filtros opcionales
export async function listarEntregasDocente(params?: { cursoId?: number; asignacionId?: number; soloPendientes?: boolean }) {
  const parse = (body: any): { data: EntregaBackend[]; meta?: any } => {
    if (body && typeof body === 'object') {
      if (Array.isArray(body.entregas)) return { data: body.entregas };
      if (Array.isArray(body.items)) return { data: body.items };
      if ('data' in body) {
        const inner = (body as any).data;
        if (inner && typeof inner === 'object' && 'data' in inner) return inner as { data: EntregaBackend[]; meta?: any };
        if (Array.isArray(inner)) return { data: inner as EntregaBackend[] };
        if (inner && typeof inner === 'object' && Array.isArray((inner as any).items)) return { data: (inner as any).items };
      }
    }
    return { data: Array.isArray(body) ? (body as EntregaBackend[]) : [] };
  };

  try {
    const response = await httpService.get<any>('/docente/entregas', params);
    const parsed = parse(response.data);
    // Normalizar evidencias y nombres cuando vengan con shape del backend real
    const normalized = Array.isArray(parsed.data)
      ? (parsed.data as any[]).map((e: any) => {
          // archivos: si hay archivosUrl como string JSON, parsearlo
          let archivos: any[] = [];
          if (typeof e.archivosUrl === 'string') {
            try {
              const arr = JSON.parse(e.archivosUrl);
              if (Array.isArray(arr)) {
                archivos = arr.map((it: any) => ({
                  url: it.url || it.path || '',
                  originalName: it.fileName || it.originalName || it.nombre || undefined,
                  fileName: it.fileName,
                }));
              }
            } catch {}
          } else if (Array.isArray(e.archivos)) {
            archivos = e.archivos;
          }

          // estudianteNombre a partir de relaciones
          const estudianteNombre = e.estudiante?.nombres && e.estudiante?.apellidos
            ? `${e.estudiante.nombres} ${e.estudiante.apellidos}`
            : undefined;

          // calificacion normalizada
          const califRaw = e.calificacion;
          const calificacion = califRaw ? {
            nota: califRaw.nota,
            escala: califRaw.escala,
            esAutomatica: !!califRaw.esAutomatica,
            retroalimentacion: califRaw.retroalimentacion,
            notaCualitativa: califRaw.notaCualitativa,
            calificadoPor: califRaw.calificadoPor,
            fechaCalificacion: califRaw.calificadoEn || califRaw.fechaCalificacion,
          } : undefined;

          // cálculo de entrega a tiempo / tarde y nota sugerida
          let entregadoATiempo: boolean | undefined = undefined;
          let diasTarde: number | undefined = undefined;
          let calificacionSugerida: number | undefined = undefined;
          const fechaEntrega = e.fechaEntrega ? new Date(e.fechaEntrega) : undefined;
          const fechaVenc = e.asignacion?.fechaVencimiento || e.asignacion?.fecha_vencimiento || e.fechaVencimiento || e.fecha_vencimiento;
          const fechaVencDate = fechaVenc ? new Date(fechaVenc) : undefined;
          if (fechaEntrega && fechaVencDate) {
            const diffMs = fechaEntrega.getTime() - fechaVencDate.getTime();
            const oneDay = 24 * 60 * 60 * 1000;
            const lateDays = Math.ceil(diffMs / oneDay);
            if (lateDays <= 0) {
              entregadoATiempo = true;
              diasTarde = 0;
              calificacionSugerida = 5.0;
            } else {
              entregadoATiempo = false;
              diasTarde = lateDays;
              const deduccion = lateDays * 0.1;
              calificacionSugerida = Math.max(1, parseFloat((5 - deduccion).toFixed(1)));
            }
          }

          return {
            ...e,
            archivos,
            estudianteNombre,
            calificacion,
            entregadoATiempo,
            diasTarde,
            calificacionSugerida,
          };
        }) as any as EntregaBackend[]
      : parsed.data;
    return { data: normalized, meta: parsed.meta };
  } catch (err: any) {
    if (err?.status === 404) {
      const response = await httpService.get<any>('/docentes/entregas', params);
      const parsed = parse(response.data);
      return parsed;
    }
    throw err;
  }
}

// ===================== REPORTES =====================
export interface ReporteEntregasCurso {
  curso: any;
  periodo?: any;
  resumen: { totalTareas: number; promedioEntregas: number; promedioCurso: number };
  estudiantes: Array<{ id: number; nombre: string; tareasAsignadas: number; tareasEntregadas: number; promedio: number; porcentajeCumplimiento: number }>;
}

export interface ReporteCalificacionesCurso {
  curso: any;
  distribucion: { superior: number; alto: number; basico: number; bajo: number };
  estudiantes: Array<{ id: number; nombre: string; promedio: number; calificaciones: Array<{ asignacionId: number; tarea: string; nota: number; escala?: string }> }>;
}

export async function getReporteEntregasCurso(cursoId: number, opts: { periodoId?: number } = {}): Promise<ReporteEntregasCurso> {
  const params: any = {};
  if (opts?.periodoId) params.periodo = opts.periodoId;
  const res = await httpService.get(`/reportes/cursos/${cursoId}/entregas`, params);
  const body: any = res.data;
  const data = (body && typeof body === 'object' && 'data' in body) ? (body as any).data : body;
  return data as ReporteEntregasCurso;
}

export async function getReporteCalificacionesCurso(cursoId: number, opts: { periodoId?: number } = {}): Promise<ReporteCalificacionesCurso> {
  const params: any = {};
  if (opts?.periodoId) params.periodo = opts.periodoId;
  const res = await httpService.get(`/reportes/cursos/${cursoId}/calificaciones`, params);
  const body: any = res.data;
  const data = (body && typeof body === 'object' && 'data' in body) ? (body as any).data : body;
  return data as ReporteCalificacionesCurso;
}
