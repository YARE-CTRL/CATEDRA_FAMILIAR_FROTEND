import { httpService } from './httpService';

export interface TareaAsignadaMovil {
  id: number; // asignacionId
  titulo: string;
  descripcion?: string;
  fechaInicio?: string;
  fechaVencimiento?: string;
  estado: 'pendiente' | 'entregada' | 'calificada' | 'vencida' | 'entregada_tardia';
  cursoId?: number;
  cursoNombre?: string;
  esIndividual?: boolean;
}

// Obtiene estudiantes vinculados al acudiente autenticado (y opcionalmente asignaciones)
export async function getMisEstudiantesAcudiente(): Promise<Array<{ id: number; nombres?: string; apellidos?: string; cursoId?: number }>> {
  // Ruta principal móvil
  try {
    const res = await httpService.get('/api/movil/acudientes/mis-estudiantes');
    const body: any = res.data;
    const data = (body && typeof body === 'object' && 'data' in body) ? (body as any).data : body;
    return Array.isArray(data?.estudiantes) ? data.estudiantes : (Array.isArray(data) ? data : []);
  } catch (e: any) {
    // Alias de compatibilidad
    const res2 = await httpService.get('/api/acudientes/mis-estudiantes');
    const body2: any = res2.data;
    const data2 = (body2 && typeof body2 === 'object' && 'data' in body2) ? (body2 as any).data : body2;
    return Array.isArray(data2?.estudiantes) ? data2.estudiantes : (Array.isArray(data2) ? data2 : []);
  }
}

// Opcional: helper para páginas que quieran usar el paquete combinado
export async function getMisTareasAcudiente(): Promise<{ estudiantes: Array<{ id: number; nombres?: string; apellidos?: string; cursoId?: number }>; asignaciones?: any[] }> {
  const res = await httpService.get('/acudientes/mis-tareas');
  const body: any = res.data;
  const data = (body && typeof body === 'object' && 'data' in body) ? (body as any).data : body;
  const estudiantes = Array.isArray(data?.estudiantes) ? data.estudiantes : (Array.isArray(data) ? data : []);
  const asignaciones = Array.isArray(data?.asignaciones) ? data.asignaciones : undefined;
  return { estudiantes, asignaciones } as any;
}

export interface DetalleAsignacionMovil {
  id: number; // asignacionId
  titulo: string;
  descripcion?: string;
  fechaVencimiento?: string;
  curso?: { id: number; nombre: string };
  entrega?: {
    id: number;
    descripcion?: string;
    fechaEntrega: string;
    estado: string;
    archivos?: Array<{ url: string; nombre?: string; originalName?: string; fileName?: string; size?: number; mimeType?: string; extname?: string }>;
    nombreEnvio?: string;
    calificacion?: any;
  } | null;
  calificacion?: {
    nota: number;
    escala: 'Superior' | 'Alto' | 'Básico' | 'Bajo';
    esAutomatica?: boolean;
    retroalimentacion?: string;
    notaCualitativa?: string;
    calificadoPor?: string;
    fechaCalificacion?: string;
  } | null;
}

export async function listarTareasEstudiante(estudianteId: number, opts: { periodo?: number | string } = {}): Promise<TareaAsignadaMovil[]> {
  const params: any = {};
  if (opts.periodo) params.periodo = opts.periodo;
  // Contrato móvil con base /api/movil
  try {
    const sessionRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('session') : null;
    const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
    let parsedSession: any = null;
    try {
      parsedSession = sessionRaw ? JSON.parse(sessionRaw) : null;
    } catch {}
    console.log('[ACUDIENTE][API][LISTAR_TAREAS_ESTUDIANTE][REQUEST]', {
      endpoint: `/estudiantes/${estudianteId}/tareas`,
      estudianteId,
      params,
      sessionRole: parsedSession?.user?.rol,
      sessionUserId: parsedSession?.user?.id,
      hasSessionToken: Boolean(parsedSession?.token),
      hasDirectAuthToken: Boolean(authToken)
    });
  } catch {}
  const res = await httpService.get(`/estudiantes/${estudianteId}/tareas`, params);
  const body: any = res.data;
  const data = (body && typeof body === 'object' && 'data' in body) ? (body as any).data : body;
  if (Array.isArray(data) && data.length > 0) {
    // Normalizar campos posibles del backend
    return data.map((a: any) => {
      const estadoRaw = a.estado || a.status || 'pendiente';
      const estadoNorm: TareaAsignadaMovil['estado'] = (
        ['pendiente','entregada','calificada','vencida','entregada_tardia'] as const
      ).includes(estadoRaw) ? estadoRaw : 'pendiente';
      return {
        id: Number(a.id),
        titulo: a.titulo || a.nombre || 'Tarea',
        descripcion: a.descripcion || a.detalle || '',
        fechaInicio: a.fechaInicio || a.fecha_inicio,
        fechaVencimiento: a.fechaVencimiento || a.fecha_vencimiento,
        estado: estadoNorm,
        cursoId: a.cursoId || a.curso_id,
        cursoNombre: a.cursoNombre || a.curso?.nombre,
      } as TareaAsignadaMovil;
    });
  }
  // Fallback: usar historial para mostrar tareas ya entregadas/calificadas
  try {
    const hist = await listarHistorialEstudiante(estudianteId, opts);
    if (!Array.isArray(hist) || hist.length === 0) return [];
    const mapped: TareaAsignadaMovil[] = hist.map((h: any) => {
      const asign = h.asignacion || h.tarea || h;
      const fechaV = asign.fechaVencimiento || asign.fecha_vencimiento || h.fechaVencimiento || h.fecha_vencimiento;
      const fechaE = h.fechaEntrega || h.fecha_entrega || h.entrega?.fechaEntrega;
      const tardia = (fechaV && fechaE) ? (new Date(fechaE).getTime() > new Date(fechaV).getTime()) : false;
      const tieneCalif = !!(h.calificacion || asign.calificacion);
      const estado: TareaAsignadaMovil['estado'] = tieneCalif ? 'calificada' : (tardia ? 'entregada_tardia' : 'entregada');
      return {
        id: Number(asign.id || h.asignacionId || h.tareaId || h.id),
        titulo: asign.titulo || asign.nombre || 'Tarea',
        descripcion: asign.descripcion || asign.detalle || '',
        fechaInicio: asign.fechaInicio || asign.fecha_inicio,
        fechaVencimiento: fechaV || undefined,
        estado,
        cursoId: asign.cursoId || asign.curso_id,
        cursoNombre: asign.cursoNombre || asign.curso?.nombre,
      } as TareaAsignadaMovil;
    });
    // Evitar duplicados por id
    const unique = new Map<number, TareaAsignadaMovil>();
    for (const m of mapped) { if (typeof m.id === 'number') unique.set(m.id, m); }
    return Array.from(unique.values());
  } catch {
    return [];
  }
}

export async function getDetalleAsignacionMovil(asignacionId: number, opts?: { estudianteId?: number }): Promise<DetalleAsignacionMovil> {
  try {
    const res = await httpService.get(`/api/movil/asignaciones/${asignacionId}/detalle`, opts?.estudianteId ? { estudianteId: opts.estudianteId } : undefined);
    const body: any = res.data;
    const data = (body && typeof body === 'object' && 'data' in body) ? (body as any).data : body;
    return data as DetalleAsignacionMovil;
  } catch (err: any) {
    // Fallback a ruta de compatibilidad si la móvil no existe
    if (err && (err.status === 404 || err.status === 405)) {
      try {
        const res = await httpService.get(`/api/asignaciones/${asignacionId}/detalle`, opts?.estudianteId ? { estudianteId: opts.estudianteId } : undefined);
        const body: any = res.data;
        const data = (body && typeof body === 'object' && 'data' in body) ? (body as any).data : body;
        return data as DetalleAsignacionMovil;
      } catch (err2: any) {
        if (err2 && (err2.status === 404 || err2.status === 405)) {
          // Intentar sin sufijo '/detalle'
          try {
            const res3 = await httpService.get(`/api/movil/asignaciones/${asignacionId}`, opts?.estudianteId ? { estudianteId: opts.estudianteId } : undefined);
            const body3: any = res3.data;
            const data3 = (body3 && typeof body3 === 'object' && 'data' in body3) ? (body3 as any).data : body3;
            return data3 as DetalleAsignacionMovil;
          } catch (err3: any) {
            if (err3 && (err3.status === 404 || err3.status === 405)) {
              const res4 = await httpService.get(`/api/asignaciones/${asignacionId}`, opts?.estudianteId ? { estudianteId: opts.estudianteId } : undefined);
              const body4: any = res4.data;
              const data4 = (body4 && typeof body4 === 'object' && 'data' in body4) ? (body4 as any).data : body4;
              return data4 as DetalleAsignacionMovil;
            }
            throw err3;
          }
        }
        throw err2;
      }
    }
    throw err;
  }
}

export async function enviarEntregaMovil(asignacionId: number, payload: {
  estudianteId: number;
  descripcion?: string;
  archivos?: File[];
  archivosUrl?: string[];
  nombreEnvio?: string;
}): Promise<any> {
  const hasFiles = (payload.archivos && payload.archivos.length > 0);
  if (hasFiles) {
    const form = new FormData();
    form.append('estudianteId', String(payload.estudianteId));
    if (payload.descripcion) form.append('descripcion', payload.descripcion);
    if (payload.nombreEnvio) form.append('nombreEnvio', payload.nombreEnvio);
    (payload.archivos || []).forEach((f) => form.append('archivos', f));
    (payload.archivosUrl || []).forEach((u) => form.append('archivosUrl', u));

    try {
      const response = await httpService.post(`/api/movil/asignaciones/${asignacionId}/entregas`, form);
      if (response.status !== 200 && response.status !== 201) throw new Error(response.data);
      return response.data;
    } catch (e: any) {
      if (e && (e.status === 404 || e.status === 405)) {
        const response = await httpService.post(`/api/asignaciones/${asignacionId}/entregas`, form);
        if (response.status !== 200 && response.status !== 201) throw new Error(response.data);
        return response.data;
      }
      throw e;
    }
  } else {
    const body = {
      estudianteId: payload.estudianteId,
      descripcion: payload.descripcion,
      archivosUrl: payload.archivosUrl,
      nombreEnvio: payload.nombreEnvio,
    } as const;
    try {
      const response = await httpService.post(`/api/movil/asignaciones/${asignacionId}/entregas`, body);
      if (response.status !== 200 && response.status !== 201) throw new Error(response.data);
      return response.data;
    } catch (e: any) {
      if (e && (e.status === 404 || e.status === 405)) {
        const response = await httpService.post(`/api/asignaciones/${asignacionId}/entregas`, body);
        if (response.status !== 200 && response.status !== 201) throw new Error(response.data);
        return response.data;
      }
      throw e;
    }
  }
}

export async function editarEntregaMovil(entregaId: number, payload: {
  descripcion?: string;
  archivosNuevos?: Array<{ url: string; nombre?: string }>;
  archivosEliminar?: number[];
}) {
  const res = await httpService.put(`/api/entregas/${entregaId}`, payload);
  return res.data;
}

// Historial de entregas del estudiante (acudiente)
export async function listarHistorialEstudiante(estudianteId: number, opts: { periodo?: number | string } = {}): Promise<any[]> {
  const params: any = {};
  if (opts.periodo) params.periodo = opts.periodo;
  const res = await httpService.get(`/estudiantes/${estudianteId}/historial`, params);
  const body: any = res.data;
  const data = (body && typeof body === 'object' && 'data' in body) ? (body as any).data : body;
  return Array.isArray(data) ? data : [];
}

// Lista solo tareas especiales (esIndividual=true) para un estudiante (o 'me')
export async function listarTareasEspeciales(estudianteId: number | 'me', opts: { periodo?: number | string } = {}): Promise<TareaAsignadaMovil[]> {
  const params: any = {};
  if (opts.periodo) params.periodo = opts.periodo;
  // Preferir ruta no-móvil cuando el id es numérico, según solicitud del frontend web
  const primaryPath = typeof estudianteId === 'number'
    ? `/api/estudiantes/${estudianteId}/tareas-especiales`
    : `/api/movil/estudiantes/${estudianteId}/tareas-especiales`;
  const fallbackPath = typeof estudianteId === 'number'
    ? `/api/movil/estudiantes/${estudianteId}/tareas-especiales`
    : `/api/estudiantes/${estudianteId}/tareas-especiales`;
  try {
    const res = await httpService.get(primaryPath, params);
    const body: any = res.data;
    const data = (body && typeof body === 'object' && 'data' in body) ? (body as any).data : body;
    if (!Array.isArray(data)) return [];
    return data.map((a: any) => {
      const estadoRaw = a.estado || a.status || 'pendiente';
      const estadoNorm: TareaAsignadaMovil['estado'] = (
        ['pendiente','entregada','calificada','vencida','entregada_tardia'] as const
      ).includes(estadoRaw) ? estadoRaw : 'pendiente';
      return {
        id: Number(a.asignacionId || a.id),
        titulo: a.titulo || 'Tarea especial',
        descripcion: a.descripcionCorta || a.descripcion || '',
        fechaInicio: a.fechaPublicacion || a.fecha_publicacion,
        fechaVencimiento: a.fechaVencimiento || a.fecha_vencimiento,
        estado: estadoNorm,
        cursoId: undefined,
        cursoNombre: undefined,
        esIndividual: a.esIndividual === true || a.es_individual === true,
      } as TareaAsignadaMovil;
    });
  } catch (e: any) {
    if (e && (e.status === 404 || e.status === 405)) {
      const res2 = await httpService.get(fallbackPath, params);
      const body2: any = res2.data;
      const data2 = (body2 && typeof body2 === 'object' && 'data' in body2) ? (body2 as any).data : body2;
      if (!Array.isArray(data2)) return [];
      return data2.map((a: any) => {
        const estadoRaw = a.estado || a.status || 'pendiente';
        const estadoNorm: TareaAsignadaMovil['estado'] = (
          ['pendiente','entregada','calificada','vencida','entregada_tardia'] as const
        ).includes(estadoRaw) ? estadoRaw : 'pendiente';
        return {
          id: Number(a.asignacionId || a.id),
          titulo: a.titulo || 'Tarea especial',
          descripcion: a.descripcionCorta || a.descripcion || '',
          fechaInicio: a.fechaPublicacion || a.fecha_publicacion,
          fechaVencimiento: a.fechaVencimiento || a.fecha_vencimiento,
          estado: estadoNorm,
          cursoId: undefined,
          cursoNombre: undefined,
          esIndividual: a.esIndividual === true || a.es_individual === true,
        } as TareaAsignadaMovil;
      });
    }
    throw e;
  }
}
