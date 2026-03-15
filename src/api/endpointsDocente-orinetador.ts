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

const parseJwtPayload = (token: string): Record<string, any> | null => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const decoded = typeof window !== 'undefined' ? window.atob(padded) : atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

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

    const correoTrim = (correo || '').trim();
    const passTrim = (contrasena || '').trim();
    const normalizedDocumento = typeof correoTrim === 'string' ? correoTrim.replace(/\D/g, '') : '';
    const isEmail = typeof correoTrim === 'string' && correoTrim.includes('@');
    // Detectar si el input es un número de documento (acudiente)
    const isDocumento = !isEmail && normalizedDocumento.length >= 5;

    // Generar variantes de payload para máxima compatibilidad
    const commonCaptcha = {
      recaptcha: captchaToken,
      reCaptcha: captchaToken,
      recaptchaToken: captchaToken,
      token_captcha: captchaToken,
      captchaToken: captchaToken
    };

    const variants: Array<{ path: string; body: any; label: string }> = [];

    if (isDocumento) {
      // Acudiente por documento
      variants.push(
        // Específico de acudientes con contrato confirmado
        { path: '/acudientes/login', body: { numeroDocumento: normalizedDocumento, contrasena: passTrim }, label: 'acudiente:numeroDocumento+contrasena' },
        // Específico de acudientes
        { path: '/acudientes/login', body: { usuario: normalizedDocumento, numeroDocumento: normalizedDocumento, contrasena: passTrim, ...commonCaptcha }, label: 'acudiente:usuario+numeroDocumento+contrasena' },
        { path: '/acudientes/login', body: { usuario: normalizedDocumento, numeroDocumento: normalizedDocumento, password: passTrim, ...commonCaptcha }, label: 'acudiente:usuario+numeroDocumento+password' }
      );
    } else {
      // General por correo/email - SOLO formatos soportados confirmados
      variants.push(
        // Específico de acudientes con contrato confirmado
        { path: '/acudientes/login', body: { correo: correoTrim, contrasena: passTrim }, label: 'acudiente:correo+contrasena' },
        // Prioridad: /auth/login con correo+contrasena (confirmado por backend)
        { path: '/auth/login', body: { correo: correoTrim, contrasena: passTrim, ...commonCaptcha }, label: 'auth/login:correo+contrasena' },
        // Compatibilidad adicional: /auth/login con correo+password
        { path: '/auth/login', body: { correo: correoTrim, password: passTrim, ...commonCaptcha }, label: 'auth/login:correo+password' }
      );
    }

    let lastError: any = null;
    for (const attempt of variants) {
      try {
        console.log('[LOGIN][DEBUG] Intento', attempt.label, '→', attempt.path, 'payloadKeys:', Object.keys(attempt.body), {
          tieneCorreo: Boolean(attempt.body?.correo || attempt.body?.email || attempt.body?.usuario),
          tieneContrasena: Boolean(attempt.body?.contrasena || attempt.body?.password),
          lenContrasena: String(attempt.body?.contrasena || attempt.body?.password || '').length
        });
        const response = await httpService.post<any>(attempt.path, attempt.body);
        const raw = response.data as any;

        try {
          console.log('[LOGIN][DEBUG] Respuesta cruda', attempt.label, {
            status: response.status,
            keys: Object.keys(raw || {})
          });
        } catch {}

        // Extraer token de múltiples ubicaciones
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
        if (!token) {
          // Si no hay token, continuar con siguiente variante
          try { console.warn('[LOGIN][DEBUG] Sin token en intento', attempt.label, '->', message); } catch {}
          lastError = { message: message || 'Sin token' };
          continue;
        }

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
          (attempt.path === '/acudientes/login' ? 'acudiente' : undefined) ??
          normalizeRol(
            usuarioRaw?.rolNombre ??
              usuarioRaw?.rol_nombre ??
              usuarioRaw?.rol ??
              raw?.rolNombre ??
              raw?.rol_nombre ??
              raw?.rol ??
              funcionarioRaw?.rolNombre ??
              funcionarioRaw?.rol_nombre ??
              funcionarioRaw?.rol
          ) ??
          (acudienteRaw ? 'acudiente' : undefined) ??
          (docenteRaw ? 'docente_aula' : undefined) ??
          extractRolFromMessage(message) ??
          (typeof rolId === 'number' ? ROLES_MAP[rolId] : undefined);

        const jwtPayload = parseJwtPayload(token);

        const institucionId =
          usuarioRaw?.institucionId ??
          usuarioRaw?.institucion_id ??
          usuarioRaw?.institucion?.id ??
          usuarioRaw?.docente?.institucionId ??
          usuarioRaw?.docente?.institucion_id ??
          usuarioRaw?.docente?.institucion?.id ??
          raw?.institucionId ??
          raw?.institucion_id ??
          raw?.data?.institucionId ??
          raw?.data?.institucion_id ??
          raw?.institucion?.id ??
          raw?.data?.institucion?.id ??
          raw?.data?.usuario?.institucionId ??
          raw?.data?.usuario?.institucion_id ??
          raw?.data?.usuario?.institucion?.id ??
          raw?.data?.usuario?.docente?.institucionId ??
          raw?.data?.usuario?.docente?.institucion_id ??
          raw?.data?.usuario?.docente?.institucion?.id ??
          funcionarioRaw?.institucionId ??
          funcionarioRaw?.institucion_id ??
          funcionarioRaw?.institucion?.id ??
          docenteRaw?.institucionId ??
          docenteRaw?.institucion_id ??
          docenteRaw?.institucion?.id ??
          jwtPayload?.institucionId ??
          jwtPayload?.institucion_id ??
          jwtPayload?.user?.institucionId ??
          jwtPayload?.user?.institucion_id ??
          jwtPayload?.usuario?.institucionId ??
          jwtPayload?.usuario?.institucion_id;

        const institucion =
          funcionarioRaw?.institucion ??
          docenteRaw?.institucion ??
          raw?.institucion ??
          raw?.data?.institucion ??
          usuarioRaw?.institucion;

        if (!rolNombre) {
          try { console.warn('[LOGIN][DEBUG] Token sin rol en intento', attempt.label); } catch {}
          lastError = { message: 'Token recibido sin rol' };
          continue;
        }

        const user: Usuario = {
          id: Number(usuarioRaw?.id ?? raw?.id ?? 0),
          nombre: usuarioRaw?.nombre || raw?.nombre || 'Usuario',
          apellidos: usuarioRaw?.apellido || usuarioRaw?.apellidos || raw?.apellido || raw?.apellidos || '',
          correo: usuarioRaw?.correo || usuarioRaw?.email || raw?.correo || raw?.email || correoTrim,
          telefono: usuarioRaw?.telefono || raw?.telefono || '',
          rol: rolNombre,
          activo: Boolean(usuarioRaw?.estaActivo ?? usuarioRaw?.activo ?? raw?.estaActivo ?? raw?.activo ?? true),
          debe_cambiar_contrasena: Boolean(usuarioRaw?.debeCambiarContrasena ?? usuarioRaw?.debe_cambiar_contrasena ?? raw?.debeCambiarContrasena ?? raw?.debe_cambiar_contrasena ?? false),
          institucionId: institucionId
        };

        const context = {
          cursos: docenteRaw?.cursos ?? raw?.cursos ?? raw?.data?.cursos ?? usuarioRaw?.cursos,
          estudiantes: acudienteRaw?.estudiantes ?? raw?.estudiantes ?? raw?.data?.estudiantes ?? usuarioRaw?.estudiantes,
          institucion: institucion,
          institucionId: institucionId
        };

        localStorage.removeItem('previewRole');
        localStorage.setItem('session', JSON.stringify({
          token,
          user,
          context,
          isPreview: false
        }));
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_context', JSON.stringify(context));
        try {
          httpService.setAuthToken(token);
        } catch {}
        try { console.log('[LOGIN][DEBUG] JWT obtenido en intento', attempt.label); } catch {}
        return { success: true, user, token, message, context };
      } catch (err: any) {
        lastError = err;
        try {
          console.warn('[LOGIN][DEBUG] Falló intento', attempt.label, {
            status: err?.status,
            message: err?.message
          });
        } catch {}
      }
    }

    // Si llegamos aquí, todos los intentos fallaron
    const friendly = lastError?.message || 'Credenciales incorrectas o endpoint no compatible';
    return { success: false, error: friendly };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Error de conexión'
    };
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
