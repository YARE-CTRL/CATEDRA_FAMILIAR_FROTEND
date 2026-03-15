// ============================================
// API CLIENT - Wrapper para httpService
// ============================================

import httpService from './httpService';

const getSessionInstitucionId = (): number | null => {
  try {
    const sessionRaw = localStorage.getItem('session');
    if (!sessionRaw) return null;
    const session = JSON.parse(sessionRaw);
    const rawInstitucionId = session?.user?.institucionId ?? session?.context?.institucionId;
    const institucionId = Number(rawInstitucionId);
    return institucionId && !Number.isNaN(institucionId) ? institucionId : null;
  } catch {
    return null;
  }
};

// Crear un wrapper que mantenga la compatibilidad con el código existente
class ApiClient {
  // Métodos HTTP básicos
  async get(endpoint: string, params?: any) {
    return await httpService.get(endpoint, params);
  }

  async post(endpoint: string, data?: any) {
    return await httpService.post(endpoint, data);
  }

  async put(endpoint: string, data?: any) {
    return await httpService.put(endpoint, data);
  }

  async delete(endpoint: string) {
    return await httpService.delete(endpoint);
  }

  // Autenticación
  async login(correo: string, password: string, roleHint?: string) {
    return await httpService.post('/login', { correo, password, roleHint });
  }

  async logout() {
    return await httpService.post('/auth/logout');
  }

  // Instituciones
  async getInstituciones() {
    return await httpService.get('/instituciones');
  }

  async getInstitucionById(id: number) {
    return await httpService.get(`/instituciones/${id}`);
  }

  async getInstitucionCompleta() {
    const institucionId = getSessionInstitucionId();
    if (!institucionId) {
      throw new Error('No se encontró institucionId en la sesión');
    }
    return await httpService.get(`/instituciones/${institucionId}`);
  }

  async createInstitucion(data: any) {
    return await httpService.post('/instituciones', data);
  }

  // Usuarios
  async getUsuarios() {
    return await httpService.get('/usuarios');
  }

  async crearRector(data: any) {
    return await httpService.post('/usuarios/rector', data);
  }

  async crearCoordinador(data: any) {
    return await httpService.post('/usuarios/coordinador', data);
  }

  async crearCoordinadorAdmin(data: any) {
    return await httpService.post('/admin/coordinadores', data);
  }

  async crearCoordinadorRector(data: any) {
    return await httpService.post('/rector/coordinadores', data);
  }

  // Tareas
  async getTareas() {
    return await httpService.get('/tareas');
  }

  async createTarea(data: any) {
    return await httpService.post('/tareas', data);
  }

  // Categorías
  async getCategorias() {
    return await httpService.get('/categorias');
  }

  // Estadísticas
  async getEstadisticasRector() {
    return await httpService.get('/rector/estadisticas');
  }

  // Endpoints específicos del rector
  async getCoordinadoresRector() {
    return await httpService.get('/rector/coordinadores');
  }

  async getOrientadoresRector() {
    return await httpService.get('/rector/orientadores');
  }

  async getDocentesRector() {
    return await httpService.get('/rector/docentes');
  }

  async getEstadisticasCoordinador() {
    return await httpService.get('/coordinadores/estadisticas');
  }

  // Directivos
  async getDirectivosInstitucion(institucionId: number) {
    return await httpService.get(`/instituciones/${institucionId}/directivos`);
  }

  // Cambiar contraseña
  async cambiarContrasena(data: any) {
    return await httpService.post('/auth/cambiar-contrasena', data);
  }

  // Carga masiva
  async validarExcel(archivo: File) {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return await httpService.post('/carga/validar-excel', formData);
  }

  async cargaMasivaEstudiantes(archivo: File, cursoId: number) {
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('cursoId', cursoId.toString());
    return await httpService.post('/carga/estudiantes', formData);
  }

  async cargaMasivaDual(archivo: File) {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return await httpService.post('/estudiantes/carga-masiva-completa', formData);
  }

  // Notificaciones
  async registrarTokenFCM(tokenFcm: string) {
    return await httpService.post('/notificaciones/token', { tokenFcm });
  }

  // Coordinadores
  async getCursosCoordinador() {
    return await httpService.get('/coordinadores/cursos');
  }

  // Orientadores
  async crearOrientador(data: any) {
    return await httpService.post('/orientadores', data);
  }

  async getAlertasCoordinador() {
    return await httpService.get('/coordinadores/alertas');
  }

  async getDocentesCoordinador() {
    return await httpService.get('/coordinadores/docentes');
  }

  async getOrientadoresCoordinador() {
    return await httpService.get('/coordinadores/orientadores');
  }

  async getRendimientoCurso(cursoId: number) {
    return await httpService.get(`/coordinadores/cursos/${cursoId}/rendimiento`);
  }

  // Orientadores
  async getOrientadores() {
    return await httpService.get('/orientadores');
  }

  async getOrientador(id: number) {
    return await httpService.get(`/orientadores/${id}`);
  }

  async crearOrientadorCoordinador(data: any) {
    return await httpService.post('/coordinadores/orientadores', data);
  }

  async actualizarOrientadorCoordinador(id: number, data: any) {
    return await httpService.put(`/coordinadores/orientadores/${id}`, data);
  }

  async eliminarOrientadorCoordinador(id: number) {
    return await httpService.delete(`/coordinadores/orientadores/${id}`);
  }

  async getAcudientesCoordinador() {
    return await httpService.get('/coordinadores/acudientes');
  }

  async getAcudientesOrientador() {
    return await httpService.get('/orientadores/acudientes');
  }

  async getAcudientesEstudiante(estudianteId: number) {
    return await httpService.get(`/estudiantes/${estudianteId}/acudientes`);
  }

  // Estudiantes
  async cambiarCursoEstudiante(estudianteId: number, data: any) {
    return await httpService.post(`/estudiantes/${estudianteId}/cambiar-curso`, data);
  }

  async retirarEstudiante(estudianteId: number, data: any) {
    return await httpService.post(`/estudiantes/${estudianteId}/retirar`, data);
  }

  async getHistorialEstudiante(estudianteId: number) {
    return await httpService.get(`/estudiantes/${estudianteId}/historial`);
  }

  // Reportes
  async getReporteEntregasCurso(cursoId: number, periodo?: number) {
    const url = periodo ? `/reportes/cursos/${cursoId}/entregas?periodo=${periodo}` : `/reportes/cursos/${cursoId}/entregas`;
    return await httpService.get(url);
  }

  async getReporteCalificacionesCurso(cursoId: number, periodo?: number) {
    const url = periodo ? `/reportes/cursos/${cursoId}/calificaciones?periodo=${periodo}` : `/reportes/cursos/${cursoId}/calificaciones`;
    return await httpService.get(url);
  }

  async getResumenInstitucional() {
    return await httpService.get('/reportes/institucion/resumen');
  }

  // Docentes
  async getDocentes() {
    return await httpService.get('/docentes');
  }

  async getDocenteById(id: number) {
    return await httpService.get(`/docentes/${id}`);
  }

  async createDocente(data: any) {
    return await httpService.post('/docentes', data);
  }

  async createDocenteOrientador(data: any) {
    return await httpService.post('/orientadores/docentes', data);
  }

  async updateDocente(id: number, data: any) {
    return await httpService.put(`/docentes/${id}`, data);
  }

  async deleteDocente(id: number) {
    return await httpService.delete(`/docentes/${id}`);
  }

  // Cursos
  async getCursos() {
    return await httpService.get('/cursos');
  }

  async getCursoById(id: number) {
    return await httpService.get(`/cursos/${id}`);
  }

  async createCurso(data: any) {
    return await httpService.post('/cursos', data);
  }

  async updateCurso(id: number, data: any) {
    return await httpService.put(`/cursos/${id}`, data);
  }

  async deleteCurso(id: number) {
    return await httpService.delete(`/cursos/${id}`);
  }

  // Grados
  async getGrados() {
    return await httpService.get('/grados');
  }

  async getGradosCoordinador() {
    return await httpService.get('/coordinadores/grados');
  }

  async getGradoById(id: number) {
    return await httpService.get(`/grados/${id}`);
  }

  async createGrado(data: any) {
    return await httpService.post('/grados', data);
  }

  async updateGrado(id: number, data: any) {
    return await httpService.put(`/grados/${id}`, data);
  }

  async deleteGrado(id: number) {
    return await httpService.delete(`/grados/${id}`);
  }

  // Vincular acudiente
  async vincularAcudiente(estudianteId: number, data: any) {
    return await httpService.post(`/estudiantes/${estudianteId}/acudientes`, data);
  }

  async updateVinculoAcudiente(estudianteId: number, acudienteId: number, data: any) {
    return await httpService.put(`/estudiantes/${estudianteId}/acudientes/${acudienteId}`, data);
  }

  async desvincularAcudiente(estudianteId: number, acudienteId: number) {
    return await httpService.delete(`/estudiantes/${estudianteId}/acudientes/${acudienteId}`);
  }

  // Periodos
  async getPeriodos() {
    return await httpService.get('/periodos');
  }

  async createPeriodo(data: any) {
    return await httpService.post('/periodos', data);
  }

  async updatePeriodo(id: number, data: any) {
    return await httpService.put(`/periodos/${id}`, data);
  }

  async deletePeriodo(id: number) {
    return await httpService.delete(`/periodos/${id}`);
  }
}

export default new ApiClient();
