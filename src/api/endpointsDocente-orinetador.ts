// ============================================
// API ENDPOINTS - Docente y Orientador
// Archivo para APIs de docente y orientador
// ============================================

import httpService from './httpService';
import type { RolUsuario, Usuario } from '../mocks/data';

type LoginUnicoResult = {
  success: boolean;
  user?: Usuario;
  token?: string;
  message?: string;
  context?: Record<string, any>;
  error?: string;
};

const ROLES_MAP: Record<number, RolUsuario> = {
  1: 'admin_sistema',
  2: 'rector',
  3: 'coordinador',
  4: 'orientador',
  5: 'docente_aula',
  6: 'acudiente',
  7: 'admin'
};

function normalizeRol(input?: unknown): RolUsuario | undefined {
  if (!input) return undefined;
  if (typeof input !== 'string') return undefined;

  const raw = input.toLowerCase().trim();

  if (raw.includes('admin')) return raw.includes('sistema') ? 'admin_sistema' : 'admin';
  if (raw.includes('administrador')) return raw.includes('sistema') ? 'admin_sistema' : 'admin';
  if (raw.includes('rector')) return 'rector';
  if (raw.includes('coordin') || raw.includes('coodin')) return 'coordinador';
  if (raw.includes('orient')) return 'orientador';
  if (raw.includes('docente')) return 'docente_aula';
  if (raw.includes('acud')) return 'acudiente';

  return undefined;
}

// Public: GET /grados -> { success, data: [ { id, nombre, orden, cursos: [...] } ] }
export async function getGradosPublic(): Promise<{ success: boolean; data: any[]; message?: string; status?: number }> {
  try {
    const response = await httpService.get<any>('/grados');
    const raw = response.data as any;
    if (raw?.success === false) {
      return { success: false, data: [], message: raw?.message || 'Error al obtener grados' };
    }
    const data = raw?.data ?? raw?.grados ?? raw;
    return { success: true, data: Array.isArray(data) ? data : [], message: raw?.message };
  } catch (error: any) {
    return { success: false, data: [], message: error?.message || 'Error de conexión', status: error?.status };
  }
}

function extractRolFromMessage(message?: unknown): RolUsuario | undefined {
  if (!message || typeof message !== 'string') return undefined;
  const match = message.match(/rol\s*:\s*([^\n\r]+)/i);
  return normalizeRol(match?.[1]);
}

export async function loginUnicoMultiRol(correo: string, contrasena: string, captchaToken?: string | null): Promise<LoginUnicoResult> {
  try {
    try {
      console.log('[LOGIN][DEBUG] Intentando login', {
        correo,
        tieneCaptcha: Boolean(captchaToken),
        captchaLen: captchaToken ? String(captchaToken).length : 0
      });
    } catch {}
    // Detectar si el input es un número de documento (acudiente)
    const isDocumento = typeof correo === 'string' && /^[0-9]{5,}$/.test(correo.trim());
    const payload = isDocumento
      // Acudiente: enviar usuario (doc), numeroDocumento y contrasena + captcha
      ? {
          usuario: correo.trim(),
          numeroDocumento: correo.trim(),
          contrasena,
          password: contrasena,
          recaptcha: captchaToken,
          reCaptcha: captchaToken,
          recaptchaToken: captchaToken,
          token_captcha: captchaToken,
          captchaToken: captchaToken
        }
      // Payload general para otros roles/backends
      : {
          correo,
          email: correo,
          usuario: correo,
          contrasena,
          password: contrasena,
          // Enviar token de reCAPTCHA usando claves comunes para maximizar compatibilidad
          recaptcha: captchaToken,
          reCaptcha: captchaToken,
          recaptchaToken: captchaToken,
          token_captcha: captchaToken,
          captchaToken: captchaToken
        };

    try {
      console.log('[LOGIN][DEBUG] Payload seleccionado', {
        esAcudientePorDocumento: isDocumento,
        keys: Object.keys(payload)
      });
    } catch {}

    const endpointPath = isDocumento ? '/acudientes/login' : '/login';
    const response = await httpService.post<any>(endpointPath, payload);

    const raw = response.data as any;

    try {
      console.log('[LOGIN][DEBUG] Respuesta cruda de /login', {
        status: response.status,
        tieneToken: Boolean((raw?.token ?? raw?.data?.token ?? raw?.jwt ?? raw?.access_token)),
        keys: Object.keys(raw || {})
      });
    } catch {}

    // Intentar extraer el token desde múltiples ubicaciones comunes y, si no está, desde el header Authorization
    let token: string | undefined =
      raw?.token ??
      raw?.data?.token ??
      raw?.jwt ??
      raw?.access_token ??
      raw?.accessToken ??
      raw?.bearerToken ??
      raw?.bearer ??
      raw?.data?.bearerToken ??
      raw?.token_acceso ??
      raw?.tokenAcceso ??
      raw?.data?.token_acceso ??
      raw?.tokenBearer ??
      raw?.api_token ??
      raw?.sessionToken ??
      raw?.data?.accessToken;

    try {
      if (!token && response.headers && typeof response.headers.get === 'function') {
        const authHeader = response.headers.get('Authorization') || response.headers.get('authorization');
        if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
          token = authHeader.slice(7).trim();
        }
      }
    } catch {}

    const message: string | undefined = raw?.message ?? raw?.mensaje ?? raw?.data?.message;

    const usuarioRaw: any = raw?.usuario ?? raw?.user ?? raw?.data?.usuario ?? raw?.data?.user;
    const funcionarioRaw: any = raw?.funcionario ?? raw?.data?.funcionario;
    const docenteRaw: any = raw?.docente ?? raw?.data?.docente;
    const acudienteRaw: any = raw?.acudiente ?? raw?.data?.acudiente;

    const rolIdRaw: unknown =
      raw?.rolId ??
      raw?.rol_id ??
      usuarioRaw?.rolId ??
      usuarioRaw?.rol_id ??
      funcionarioRaw?.rolId ??
      funcionarioRaw?.rol_id ??
      docenteRaw?.rolId ??
      docenteRaw?.rol_id;

    const rolId: number | undefined =
      typeof rolIdRaw === 'number'
        ? rolIdRaw
        : typeof rolIdRaw === 'string' && rolIdRaw.trim() !== '' && !Number.isNaN(Number(rolIdRaw))
          ? Number(rolIdRaw)
          : undefined;

    const rolNombre: RolUsuario | undefined =
      // 1) PRIORIDAD: nombre de rol (es estable aunque cambien los IDs entre ambientes)
      normalizeRol(
        // estructura más común en tus respuestas
        usuarioRaw?.rolNombre ??
          usuarioRaw?.rol_nombre ??
          usuarioRaw?.rol ??
          // otros posibles
          raw?.rolNombre ??
          raw?.rol_nombre ??
          raw?.rol ??
          funcionarioRaw?.rolNombre ??
          funcionarioRaw?.rol_nombre ??
          funcionarioRaw?.rol
      ) ??
      // 2) mensaje ("Iniciaste con rol: ...")
      extractRolFromMessage(message) ??
      // 3) FALLBACK: rolId (solo si no viene nombre)
      (typeof rolId === 'number' ? ROLES_MAP[rolId] : undefined);

    if (!token) {
      try { console.warn('[LOGIN][DEBUG] Falla: no se recibió token', { message }); } catch {}
      return { success: false, error: message || 'Login inválido: no se recibió token.' };
    }

    if (!rolNombre) {
      try { console.warn('[LOGIN][DEBUG] Falla: no se pudo determinar rol', { rolId, message }); } catch {}
      return { success: false, error: message || 'Login inválido: no se pudo determinar el rol.' };
    }

    const user: Usuario = {
      id: Number(usuarioRaw?.id ?? raw?.id ?? 0),
      nombre: usuarioRaw?.nombre || raw?.nombre || 'Usuario',
      apellidos: usuarioRaw?.apellido || usuarioRaw?.apellidos || raw?.apellido || raw?.apellidos || '',
      correo: usuarioRaw?.correo || usuarioRaw?.email || raw?.correo || raw?.email || correo,
      telefono: usuarioRaw?.telefono || raw?.telefono || '',
      rol: rolNombre,
      activo: Boolean(usuarioRaw?.estaActivo ?? usuarioRaw?.activo ?? raw?.estaActivo ?? raw?.activo ?? true),
      debe_cambiar_contrasena: Boolean(usuarioRaw?.debeCambiarContrasena ?? usuarioRaw?.debe_cambiar_contrasena ?? raw?.debeCambiarContrasena ?? raw?.debe_cambiar_contrasena ?? false),
      institucionId: usuarioRaw?.institucionId ?? raw?.institucionId ?? funcionarioRaw?.institucionId ?? funcionarioRaw?.institucion?.id ?? docenteRaw?.institucionId
    };

    const context = {
      cursos: docenteRaw?.cursos ?? raw?.cursos ?? raw?.data?.cursos ?? usuarioRaw?.cursos,
      estudiantes: acudienteRaw?.estudiantes ?? raw?.estudiantes ?? raw?.data?.estudiantes ?? usuarioRaw?.estudiantes,
      institucion: funcionarioRaw?.institucion ?? raw?.institucion ?? raw?.data?.institucion ?? usuarioRaw?.institucion,
      institucionId: funcionarioRaw?.institucionId ?? funcionarioRaw?.institucion?.id ?? raw?.institucionId ?? raw?.data?.institucionId ?? usuarioRaw?.institucionId ?? docenteRaw?.institucionId
    };

    localStorage.removeItem('previewRole');
    localStorage.setItem('session', JSON.stringify({
      token,
      user,
      context,
      isPreview: false
    }));
    // Configurar Authorization inmediatamente para siguientes requests
    try {
      httpService.setAuthToken(token);
      try {
        const len = token ? String(token).length : 0;
        console.log('[LOGIN][DEBUG] Token aplicado a Authorization', { len });
      } catch {}
    } catch {}
    // Imprimir el token en consola tras login exitoso (pedido del admin)
    try {
      console.log('[LOGIN][DEBUG] JWT:', token);
    } catch {}

    return { success: true, user, token, message, context };
  } catch (error: any) {
    try {
      const body = error?.body;
      const serverMsg: string | undefined =
        body?.message ?? body?.mensaje ?? body?.error ?? body?.detail ?? body?.detalle;
      const reason: string | undefined = body?.reason ?? body?.motivo;
      const code: string | number | undefined = error?.code ?? body?.code ?? body?.error_code;
      // Campos que podrían indicar por qué "no existe"
      const field: string | undefined = body?.field ?? body?.campo;
      const fields = Array.isArray(body?.fields || body?.errores)
        ? (body?.fields || body?.errores).map((e: any) => e?.field || e?.campo || e?.name).filter(Boolean)
        : undefined;

      const composed = [serverMsg, reason]
        .filter(Boolean)
        .join(' - ');

      console.error('[LOGIN][DEBUG] Error en login', {
        mensaje: error?.message,
        status: error?.status,
        code,
        serverMsg,
        reason,
        field,
        fields
      });

      const friendly = composed || error?.message || 'Error de conexión';
      const withField = field ? `${friendly} (campo: ${field})` : friendly;
      const withFields = !field && fields?.length ? `${friendly} (campos: ${fields.join(', ')})` : withField;

      return {
        success: false,
        error: withFields
      };
    } catch {
      return {
        success: false,
        error: error?.message || 'Error de conexión'
      };
    }
  }
}

export async function getTareaById(tareaId: number): Promise<{ success: boolean; data?: any; message?: string; status?: number }> {
  try {
    const response = await httpService.get<any>(`/tareas/${tareaId}`);
    const raw = response.data as any;

    if (raw?.success === false) {
      return { success: false, message: raw?.message || 'Error al obtener tarea', status: response.status };
    }

    return { success: true, data: raw?.data ?? raw, message: raw?.message, status: response.status };
  } catch (error: any) {
    return { success: false, message: error?.message || 'Error de conexión', status: error?.status };
  }
}

export async function updateEstudianteOrientador(estudianteId: number, data: Record<string, any>): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    const response = await httpService.put<any>(`/estudiantes/${estudianteId}`, data);
    const raw = response.data as any;

    if (raw?.success === false) {
      return { success: false, message: raw?.message || 'Error al actualizar estudiante' };
    }

    return { success: true, data: raw?.data, message: raw?.message };
  } catch (error: any) {
    return { success: false, message: error?.message || 'Error de conexión' };
  }
}
 
export async function patchEstudiante(estudianteId: number, data: Record<string, any>): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    const response = await httpService.patch<any>(`/estudiantes/${estudianteId}`, data);
    const raw = response.data as any;

    if (raw?.success === false) {
      return { success: false, message: raw?.message || 'Error al actualizar estudiante' };
    }

    return { success: true, data: raw?.data ?? raw, message: raw?.message };
  } catch (error: any) {
    return { success: false, message: error?.message || 'Error de conexión' };
  }
}

export async function getEstudianteById(estudianteId: number): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    const response = await httpService.get<any>(`/estudiantes/${estudianteId}`);
    const raw = response.data as any;

    if (raw?.success === false) {
      return { success: false, message: raw?.message || 'Error al obtener estudiante' };
    }

    const data = raw?.data ?? raw?.estudiante ?? raw;
    return { success: true, data, message: raw?.message };
  } catch (error: any) {
    return { success: false, message: error?.message || 'Error de conexión' };
  }
}

export async function getCursosPorInstitucion(institucionId: number): Promise<{ success: boolean; data: any[]; message?: string }> {
  try {
    const response = await httpService.get<any>(`/cursos/institucion/${institucionId}`);
    const raw = response.data as any;

    if (raw?.success === false) {
      return { success: false, data: [], message: raw?.message || 'Error al obtener cursos' };
    }

    const data = raw?.cursos ?? raw?.data ?? [];
    return { success: true, data: Array.isArray(data) ? data : [], message: raw?.message };
  } catch (error: any) {
    return { success: false, data: [], message: error?.message || 'Error de conexión' };
  }
}
///////////////////////////////////////////

export async function getEstudiantesInstitucionOrientador(): Promise<any[]> {
  try {
    const response = await httpService.get<any>('/orientadores/estudiantes');
    const raw = response.data as any;

    if (raw?.success === false) {
      throw new Error(raw?.message || 'Error al obtener estudiantes');
    }

    const data = raw?.data ?? raw?.estudiantes ?? [];
    if (Array.isArray(data) && data.length > 0) {
      // Normalizar ID desde múltiples posibles campos y asegurar unicidad
      const normalized = data
        .map((e: any) => {
          const idRaw =
            e?.id ??
            e?.estudianteId ??
            e?.estudiante_id ??
            e?.idEstudiante ??
            e?.id_estudiante ??
            e?.usuarioId ??
            e?.userId ??
            e?.estudiante?.id ??
            0;
          const idNum = Number(idRaw) || 0;
          return idNum > 0 ? { ...e, id: idNum } : e;
        })
        .filter((e: any) => Number.isFinite(Number(e?.id)) && Number(e.id) > 0)
        .filter((e: any, idx: number, arr: any[]) => arr.findIndex(x => Number(x.id) === Number(e.id)) === idx);
      return normalized;
    }

    // Fallback: si no hay estudiantes por el endpoint de orientador,
    // intentar obtener el listado general de estudiantes.
    try {
      const resp2 = await httpService.get<any>('/estudiantes');
      const raw2 = resp2.data as any;
      const data2 = raw2?.data ?? raw2?.estudiantes ?? [];
      if (!Array.isArray(data2)) return [];
      const normalized2 = data2
        .map((e: any) => {
          const idRaw =
            e?.id ??
            e?.estudianteId ??
            e?.estudiante_id ??
            e?.idEstudiante ??
            e?.id_estudiante ??
            e?.usuarioId ??
            e?.userId ??
            e?.estudiante?.id ??
            0;
          const idNum = Number(idRaw) || 0;
          return idNum > 0 ? { ...e, id: idNum } : e;
        })
        .filter((e: any) => Number.isFinite(Number(e?.id)) && Number(e.id) > 0)
        .filter((e: any, idx: number, arr: any[]) => arr.findIndex(x => Number(x.id) === Number(e.id)) === idx);
      return normalized2;
    } catch {
      return [];
    }
  } catch (error: any) {
    throw new Error(error?.message || 'Error de conexión');
  }
}

export async function getCategorias(): Promise<{ success: boolean; data: any[]; message?: string; status?: number }> {
  try {
    const response = await httpService.get<any>('/categorias');
    const raw = response.data as any;

    if (raw?.success === false) {
      return { success: false, data: [], message: raw?.message || 'Error al obtener categorías' };
    }

    const data = raw?.data ?? raw?.categorias ?? raw;
    return { success: true, data: Array.isArray(data) ? data : [], message: raw?.message };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      status: error?.status,
      message: error?.message || 'Error de conexión'
    };
  }
}

export async function getTareas(): Promise<{ success: boolean; data: any[]; message?: string; status?: number }> {
  try {
    const response = await httpService.get<any>('/tareas');
    const raw = response.data as any;

    if (raw?.success === false) {
      return { success: false, data: [], message: raw?.message || 'Error al obtener tareas' };
    }

    const data = raw?.data ?? raw?.tareas ?? raw;
    return { success: true, data: Array.isArray(data) ? data : [], message: raw?.message };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      status: error?.status,
      message: error?.message || 'Error de conexión'
    };
  }
}

export async function createTarea(data: Record<string, any> | FormData): Promise<{ success: boolean; data?: any; message?: string; status?: number }> {
  try {
    const response = await httpService.post<any>('/tareas', data);
    const raw = response.data as any;

    if (raw?.success === false) {
      return { success: false, message: raw?.message || 'Error al crear tarea', status: response.status };
    }

    return { success: true, data: raw?.data ?? raw, message: raw?.message, status: response.status };
  } catch (error: any) {
    return { success: false, message: error?.message || 'Error de conexión', status: error?.status };
  }
}

export async function createCategoria(data: {
  nombre: string;
  descripcion?: string | null;
  color?: string | null;
  icono?: string | null;
}): Promise<{ success: boolean; data?: any; message?: string; status?: number }> {
  try {
    const response = await httpService.post<any>('/categorias', data);
    const raw = response.data as any;

    if (raw?.success === false) {
      return { success: false, message: raw?.message || 'Error al crear categoría', status: response.status };
    }

    return { success: true, data: raw?.data ?? raw, message: raw?.message, status: response.status };
  } catch (error: any) {
    return { success: false, message: error?.message || 'Error de conexión', status: error?.status };
  }
}
