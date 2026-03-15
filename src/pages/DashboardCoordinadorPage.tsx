import { useState, useEffect } from 'react';

import { 

  getSession, 

  getCursos,

  getGrados,

  getTareas,

  getMiInstitucion,

  getInstitucionCompleta,

  getEstadisticasCoordinador,

  getCursosCoordinador,

  getAlertasCoordinador,

  getDocentesCoordinador,

  getOrientadoresCoordinador,

  getAcudientesCoordinador,

  getGradosCoordinador,

  getOrientadoresCRUD,

  crearOrientador,

  actualizarOrientador,

  desactivarOrientador

} from '../api/endpoints';

import apiClient from '../api/apiClient';

import { type Estudiante, type Usuario, type Curso, type Grado, type Tarea } from '../mocks/data';



// Interfaces actualizadas para el coordinador

interface CursoCoordinador {

  id: number;

  nombre: string;

  grado: {

    id: number;

    nombre: string;

  };

  jornada: string;

  totalEstudiantes: number;

  promedioGeneral: number;

  tareasCreadas: number;

  tieneAlertas: boolean;

}



interface GradoCoordinador {

  id: number;

  nombre: string;

  orden: number;

  cursos: CursoCoordinador[];

  totalCursos: number;

}



// Nueva interfaz para /instituciones/completa

interface InstitucionCompletaResponse {

  success: boolean;

  message: string;

  data: {

    institucion: {

      id: number;

      nombre: string;

      naturaleza: string;

      municipioId: number;

    };

    rector: {

      id: number;

      nombre: string;

      apellido: string;

      correo: string;

      institucionId: number;

    };

    credencialesRector: {

      correo: string;

      contrasena: string;

      mensaje: string;

      correoModificado: boolean;

      correoOriginal: string;

    };

    estructura: {

      totalGrados: number;

      grados: {

        id: number;

        nombre: string;

        orden: number;

        cursos: {

          id: number;

          nombre: string;

          jornada: string;

        }[];

      }[];

    };

  };

}

import DashboardLayout from '../components/DashboardLayout';

import LoadingSpinner from '../components/ui/LoadingSpinner';

import Modal from '../components/ui/Modal';

import Button from '../components/ui/Button';

import FormFieldInput from '../components/ui/FormFieldInput';

import BulkUploadDual from '../components/BulkUploadDual';

import CoordinadorDashboardEnhanced from '../components/coordinador/CoordinadorDashboardEnhanced';

import {

  IconUsers,

  IconPlus,

  IconEdit,

  IconTrash,

  IconSearch,

  IconFileUpload,

  IconLink,

  IconBook,

  IconUserPlus,

  IconDownload,

  IconFilter,

  IconClipboard,

  IconCheckCircle,

  IconClock,

  IconAlertCircle,

  IconAlertTriangle,

  IconTrendingUp,

  IconBarChart,

  IconEye

} from '../components/ui/Icons';



export default function DashboardCoordinadorPage() {

  // Proteger la sesión del coordinador al inicio

  const initialSession = getSession();

  const [protectedSession] = useState(() => {

    // Congelar la sesión al montar el componente

    if (initialSession) {

      localStorage.setItem('coordinador_session_backup', JSON.stringify(initialSession));

    }

    return initialSession;

  });

  

  const session = getSession();

  const user = session?.user;

  const userRole = user?.rol;



  // Toggle para usar versión mejorada

  const [useEnhanced, setUseEnhanced] = useState(false); // Forzar dashboard clásico para ver cambios



  // Validar que la sesión no haya cambiado inesperadamente

  useEffect(() => {

    const currentSession = getSession();

    if (currentSession && protectedSession && currentSession.user.rol !== protectedSession.user.rol) {

      console.error('⚠️ [DashboardCoordinador] Sesión corrompida detectada. Restaurando sesión original...');

      localStorage.setItem('session', localStorage.getItem('coordinador_session_backup') || '');

      window.location.reload();

    }

  }, [session, protectedSession]);



  // Si el usuario es orientador, redirigir a su propio dashboard o mostrar solo su panel

  if (userRole === 'orientador') {

    // Aquí podrías redirigir o renderizar un componente exclusivo del orientador

    // return <Navigate to="/dashboard/orientador" />;

    return (

      <div className="min-h-screen flex items-center justify-center bg-gray-50">

        <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-md">

          <h2 className="text-2xl font-bold mb-2 text-teal-700">Panel exclusivo para Orientador</h2>

          <p className="text-slate-600 mb-4">No tienes acceso a la gestión de docentes ni orientadores. Solo puedes ver tus cursos, tareas y estudiantes asignados.</p>

          <a href="/dashboard/orientador" className="inline-block px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition">Ir a mi panel</a>

        </div>

      </div>

    );

  }



  // Si useEnhanced es true, mostrar el dashboard mejorado SOLO para coordinador

  if (useEnhanced) {

    return <CoordinadorDashboardEnhanced />;

  }

  

  // Solo Coordinador y Admin pueden crear/editar

  const canManage = userRole === 'coordinador' || userRole === 'admin' || userRole === 'admin_sistema';

  

  const [loading, setLoading] = useState(true);

  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);

  const [docentes, setDocentes] = useState<Usuario[]>([]);

  const [tareas, setTareas] = useState<Tarea[]>([]);

  const [cursos, setCursos] = useState<CursoCoordinador[]>([]); // Usar nueva interfaz

  const [grados, setGrados] = useState<GradoCoordinador[]>([]); // Usar nueva interfaz

  const [institucion, setInstitucion] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<'resumen' | 'grados' | 'cursos' | 'orientacion' | 'estudiantes' | 'carga-masiva'>('resumen');

  const [subTab, setSubTab] = useState<'docentes' | 'orientadores'>('docentes');

  

  // Filtros y búsqueda

  const [busqueda, setBusqueda] = useState('');

  const [filtroCurso, setFiltroCurso] = useState<number | ''>('');

  const [filtroGrado, setFiltroGrado] = useState<number | ''>('');

  

  // Modales

  const [modalEstudiante, setModalEstudiante] = useState(false);

  const [modalCargaMasiva, setModalCargaMasiva] = useState(false);

  const [modalOrientador, setModalOrientador] = useState(false);

  const [modalVinculacion, setModalVinculacion] = useState(false);

  const [modalEditarGrado, setModalEditarGrado] = useState(false);

  const [gradoEditando, setGradoEditando] = useState<any>(null);

  const [formGrado, setFormGrado] = useState({ nombre: '', descripcion: '' });

  

  // Estados de edición

  const [editingEstudiante, setEditingEstudiante] = useState<Estudiante | null>(null);

  const [estudianteVincular, setEstudianteVincular] = useState<Estudiante | null>(null);

  const [editingOrientador, setEditingOrientador] = useState<any>(null);

  const [acudientesEstudiante, setAcudientesEstudiante] = useState<any[]>([]);

  

  // Formularios

  const [formEstudiante, setFormEstudiante] = useState<{

    nombre: string;

    apellidos: string;

    documento: string;

    tipoDocumento: 'ti' | 'cc' | 'ce';

    fechaNacimiento: string;

    cursoId: number;

    institucionId: number;

  }>({

    nombre: '',

    apellidos: '',

    documento: '',

    tipoDocumento: 'ti',

    fechaNacimiento: '',

    cursoId: 1,

    institucionId: user?.institucionId || 1

  });

  

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);

  

  // Estados para datos del coordinador

  const [estadisticasCoord, setEstadisticasCoord] = useState<any>(null);

  const [cursosCoord, setCursosCoord] = useState<any[]>([]);

  const [alertasCoord, setAlertasCoord] = useState<any>(null);

  const [docentesCoord, setDocentesCoord] = useState<any[]>([]);

  const [orientadoresCoord, setOrientadoresCoord] = useState<any[]>([]);



  useEffect(() => {

    loadData();

  }, []);



  const loadData = async () => {

    setLoading(true);

    

    // Guardar sesión antes de cargar para detectar cambios

    const sessionBeforeLoad = localStorage.getItem('session');

    

    try {

      const institucionId = user?.institucionId;

      console.log('🔄 [DashboardCoordinador] Cargando datos para institución:', institucionId);

      

      // Cargar datos de la institución con manejo de errores

      // Usar el endpoint /instituciones/completa que ya incluye toda la estructura

      const results = await Promise.allSettled([

        getInstitucionCompleta(), // Cargar institución + estructura completa

        getEstadisticasCoordinador(),

        getAlertasCoordinador(),

        getDocentesCoordinador(),

        getOrientadoresCoordinador(),

        getAcudientesCoordinador(),

        getTareas(),

        getCursosCoordinador() // Para cursos con detalles adicionales

      ]);



      // Extraer datos con valores por defecto si fallan

      const institucionCompletaData = results[0].status === 'fulfilled' ? results[0].value : null;

      const estadisticasData = results[1].status === 'fulfilled' ? results[1].value : null;

      const alertasData = results[2].status === 'fulfilled' ? results[2].value : null;

      const docentesCoordData = results[3].status === 'fulfilled' ? results[3].value : [];

      const orientadoresData = results[4].status === 'fulfilled' ? results[4].value : [];

      const acudientesData = results[5].status === 'fulfilled' ? results[5].value : [];

      const tareasResult = results[6];
      const tareasData = tareasResult.status === 'fulfilled' ? (tareasResult as PromiseFulfilledResult<any>).value : [];

      console.log('📦 [DashboardCoordinador] Cantidad de resultados:', Array.isArray(results) ? results.length : 'N/A');
      console.log('🧪 [DashboardCoordinador] Estado getTareas (index 6):', tareasResult.status);
      if (tareasResult.status === 'rejected') {
        console.warn('⚠️ [DashboardCoordinador] getTareas rechazado. Es posible que el rol no tenga permisos (solo docente/orientador) o haya un error de backend.');
      }
      const cursosResponse = (Array.isArray(results) && results[7] && (results[7] as any).status === 'fulfilled')
        ? (results[7] as any).value
        : []; // Cursos con detalles
      // No hay índice 8 en results: Promise.allSettled tiene 0..7. Los grados se derivan de institucionCompletaData
      let gradosDesdeEstructura: any[] = [];

      

      console.log('🏫 [DashboardCoordinador] Datos de institución completa:', institucionCompletaData);

      console.log('✅ [DashboardCoordinador] Institución completa cargada:', (institucionCompletaData as any)?.data?.success ? 'Sí' : 'No');

      

      if ((institucionCompletaData as any)?.data?.success && (institucionCompletaData as any)?.data?.data) {

        const data = (institucionCompletaData as any).data.data;

        console.log('📋 [DashboardCoordinador] Nombre institución:', data.institucion?.nombre);

        console.log('👨‍🎓 [DashboardCoordinador] Rector:', data.rector?.nombre + ' ' + data.rector?.apellido);

        console.log('📊 [DashboardCoordinador] Total grados en estructura:', data.estructura?.totalGrados);

        console.log('📚 [DashboardCoordinador] Grados en estructura:', data.estructura?.grados?.length);

        

        // Extraer grados y cursos de la estructura

        gradosDesdeEstructura = data.estructura?.grados || [];

        const cursosDesdeEstructura = gradosDesdeEstructura.flatMap((grado: any) => 

          grado.cursos.map((curso: any) => ({

            ...curso,

            grado: { id: grado.id, nombre: grado.nombre },

            totalEstudiantes: 0, // Estos datos vienen del endpoint de cursos

            promedioGeneral: 0,

            tareasCreadas: 0,

            tieneAlertas: false

          }))

        );

        

        console.log('🎯 [DashboardCoordinador] Grados desde estructura:', gradosDesdeEstructura.length);

        console.log('🎯 [DashboardCoordinador] Cursos desde estructura:', cursosDesdeEstructura.length);

      }

      

      // FILTRAR POR INSTITUCIÓN - Solo mostrar datos de tu institución

      const miInstitucionId = user?.institucionId;

      console.log('🏫 [DashboardCoordinador] Mi institución ID:', miInstitucionId);

      

      // DEBUG: Ver estructura de los datos recibidos

      console.log('🔍 [DEBUG] Estructura de cursosResponse:', cursosResponse);
      console.log('🔍 [DEBUG] Grados derivados de institución (estructura):', Array.isArray(gradosDesdeEstructura) ? gradosDesdeEstructura.length : 0);

      

      // Los cursos ya vienen filtrados por institución desde el backend.
      // Normalizar forma: puede venir como array directo o como { data: [...] }
      const cursosDeMiInstitucion: CursoCoordinador[] = Array.isArray((cursosResponse as any)?.data)
        ? ((cursosResponse as any).data as CursoCoordinador[])
        : (Array.isArray(cursosResponse) ? (cursosResponse as CursoCoordinador[]) : []);

      

      console.log('📚 [DEBUG] Cursos recibidos (ya filtrados por backend):', cursosDeMiInstitucion.length);

      cursosDeMiInstitucion.forEach((curso: CursoCoordinador, index: number) => {

        console.log(`🔍 [DEBUG] Curso ${index}:`, {

          nombre: curso.nombre,

          grado: curso.grado?.nombre,

          jornada: curso.jornada,

          totalEstudiantes: curso.totalEstudiantes,

          promedioGeneral: curso.promedioGeneral,

          tareasCreadas: curso.tareasCreadas,

          tieneAlertas: curso.tieneAlertas

        });

      });

      

      // Los grados también vienen filtrados por institución desde el backend

      // Usar la estructura correcta con cursos incluidos

      const gradosDeMiInstitucion: GradoCoordinador[] = Array.isArray(gradosDesdeEstructura)
        ? (gradosDesdeEstructura as unknown as GradoCoordinador[])
        : [];

      

      console.log('📋 [DEBUG] Grados recibidos (ya filtrados por backend):', gradosDeMiInstitucion.length);

      gradosDeMiInstitucion.forEach((grado: GradoCoordinador, index: number) => {

        console.log(`🔍 [DEBUG] Grado ${index}:`, {

          nombre: grado.nombre,

          orden: grado.orden,

          totalCursos: grado.totalCursos,

          cursosCount: grado.cursos?.length || 0

        });

      });

      

      console.log('📚 [DashboardCoordinador] Cursos de mi institución:', cursosDeMiInstitucion.length);

      console.log('📋 [DashboardCoordinador] Grados de mi institución:', gradosDeMiInstitucion.length);

      

      if (cursosDeMiInstitucion.length > 0) {

        console.log('🎯 [DashboardCoordinador] Ejemplo de curso:', cursosDeMiInstitucion[0]);

      }

      if (gradosDeMiInstitucion.length > 0) {

        console.log('🎯 [DashboardCoordinador] Ejemplo de grado filtrado:', gradosDeMiInstitucion[0]);

      }

      

      // Log de errores si los hay

      results.forEach((result, index) => {

        if (result.status === 'rejected') {

          const endpoints = ['institución', 'estadisticas', 'cursos coord', 'alertas', 'docentes', 'orientadores', 'estudiantes', 'tareas', 'cursos', 'grados'];

          console.warn(`⚠️ Error cargando ${endpoints[index]}:`, result.reason);

        }

      });



      console.log('📥 [DashboardCoordinador] Respuesta de acudientes:', acudientesData);

      console.log('📊 [DashboardCoordinador] Datos de acudientes:', acudientesData?.data);

      console.log('🔢 [DashboardCoordinador] Total acudientes:', Array.isArray(acudientesData?.data) ? acudientesData.data.length : 0);

      

      // Logging específico para cursos y grados

      console.log('📚 [DashboardCoordinador] Respuesta de cursos (index 7):', results[7]);
      console.log('📋 [DashboardCoordinador] Grados desde estructura (sin índice 8):', gradosDesdeEstructura?.length);

      console.log('📚 [DashboardCoordinador] cursosResponse:', cursosResponse);
      console.log('📚 [DashboardCoordinador] cursosResponse.data:', (cursosResponse as any)?.data);
      console.log('📚 [DashboardCoordinador] ¿Es array cursos?.data:', Array.isArray((cursosResponse as any)?.data));
      console.log('📚 [DashboardCoordinador] ¿Es array cursos (directo)?:', Array.isArray(cursosResponse));
      if (cursosDeMiInstitucion.length === 0) {
        console.warn('⚠️ [DashboardCoordinador] Sin cursos recibidos del backend para tu institución. Verifica /coordinadores/cursos.');
      }



      setEstadisticasCoord(estadisticasData || null);

      setCursosCoord(Array.isArray(cursosDeMiInstitucion) ? cursosDeMiInstitucion : []);

      setAlertasCoord(alertasData || null);

      setDocentesCoord(Array.isArray(docentesCoordData) ? docentesCoordData : []);

      setOrientadoresCoord(Array.isArray(orientadoresData) ? orientadoresData : []);

      setEstudiantes(Array.isArray(acudientesData?.data) ? acudientesData.data : []);

      

      // Asignar datos de la institución

      setInstitucion((institucionCompletaData as any)?.data?.success ? (institucionCompletaData as any).data.data : null);

      

      console.log('✅ [DashboardCoordinador] Estado de estudiantes actualizado:', Array.isArray(acudientesData?.data) ? acudientesData.data.length : 0, 'estudiantes');

      console.log('🔍 [DashboardCoordinador] Primer estudiante (estructura):', Array.isArray(acudientesData?.data) ? acudientesData.data?.[0] : null);

      // Usar docentesCoordData como fuente de docentes (ya viene de getDocentesCoordinador)

      setDocentes(Array.isArray(docentesCoordData) ? docentesCoordData : []);

      const tareasLista = Array.isArray((tareasData as any)?.data)
        ? (tareasData as any).data
        : (Array.isArray(tareasData) ? tareasData : []);
      console.log('📋 [DashboardCoordinador] Tareas cargadas (normalizadas):', Array.isArray(tareasLista) ? tareasLista.length : 0);
      setTareas(Array.isArray(tareasLista) ? tareasLista : []);

      

      // USAR DATOS FILTRADOS POR INSTITUCIÓN

      setCursos(cursosDeMiInstitucion); // Solo cursos de tu institución

      setGrados(gradosDeMiInstitucion); // Solo grados de tu institución

      

      console.log('📚 [DashboardCoordinador] Cursos cargados (filtrados):', cursosDeMiInstitucion.length);

      console.log('📋 [DashboardCoordinador] Lista de cursos (filtrados):', cursosDeMiInstitucion);

      console.log('📚 [DashboardCoordinador] Estado final de cursos:', cursosDeMiInstitucion);

      console.log('📋 [DashboardCoordinador] Estado final de grados:', gradosDeMiInstitucion);

      console.log('📚 [DashboardCoordinador] ¿Hay cursos de mi institución?:', cursosDeMiInstitucion.length > 0);

      console.log('📋 [DashboardCoordinador] ¿Hay grados de mi institución?:', gradosDeMiInstitucion.length > 0);

      

      // Verificar si hubo errores críticos (backend caído)

      const failedRequests = results.filter(r => r.status === 'rejected').length;

      if (failedRequests >= 3) {

        console.error('❌ [DashboardCoordinador] Backend no responde. Múltiples peticiones fallaron.');

        setError('⚠️ El backend parece estar caído. Algunos datos pueden no estar disponibles. Verifica tu conexión o contacta al administrador.');

      }

    } catch (err) {

      console.error('Error loading data:', err);

      setError('Error al cargar los datos');

    } finally {

      setLoading(false);

      

      // Restaurar la sesión si fue modificada durante la carga

      const sessionAfterLoad = localStorage.getItem('session');

      if (sessionBeforeLoad && sessionAfterLoad !== sessionBeforeLoad) {

        const beforeParsed = JSON.parse(sessionBeforeLoad);

        const afterParsed = JSON.parse(sessionAfterLoad);

        

        if (beforeParsed.user.rol !== afterParsed.user.rol) {

          console.warn('⚠️ [DashboardCoordinador] Sesión modificada durante loadData. Restaurando...');

          localStorage.setItem('session', sessionBeforeLoad);

        }

      }

    }

  };



  // Funciones para gestión de grados

  const handleEditarGrado = (grado: any) => {

    setGradoEditando(grado);

    setFormGrado({

      nombre: grado.nombre,

      descripcion: grado.descripcion || ''

    });

    setModalEditarGrado(true);

  };



  const handleGuardarGrado = async () => {

    if (!gradoEditando || !formGrado.nombre.trim()) {

      setError('El nombre del grado es obligatorio');

      return;

    }



    try {

      const response = await apiClient.updateGrado(gradoEditando.id, {

        nombre: formGrado.nombre.trim(),

        descripcion: formGrado.descripcion.trim()

      });



      if (response.success) {

        setSuccess('Grado actualizado correctamente');

        setModalEditarGrado(false);

        setGradoEditando(null);

        setFormGrado({ nombre: '', descripcion: '' });

        loadData();

      } else {

        setError(response.message || 'Error al actualizar el grado');

      }

    } catch (err: any) {

      setError(err.message || 'Error al actualizar el grado');

    }

  };



  const handleEliminarGrado = async (grado: any) => {

    if (!confirm(`¿Estás seguro de eliminar el grado "${grado.nombre}"?\n\nEsto eliminará también todos los cursos asociados y puede afectar a los estudiantes.`)) {

      return;

    }



    try {

      const response = await apiClient.deleteGrado(grado.id);



      if (response.success) {

        setSuccess('Grado eliminado correctamente');

        loadData();

      } else {

        setError(response.message || 'Error al eliminar el grado');

      }

    } catch (err: any) {

      setError(err.message || 'Error al eliminar el grado');

    }

  };



  // ============================================

  // ESTADÍSTICAS ACADÉMICAS (Coordinador)

  // ============================================

  

  const calcularEstadisticas = () => {

    // Si hay datos del backend, usar esos

    if (estadisticasCoord) {

      const docentesConTareasCount = Array.isArray(docentesCoord) && docentesCoord.length > 0

        ? docentesCoord.filter((d: any) => d?.tareasCreadas > 0).length

        : [...new Set(tareas.map(t => t.docenteId))].length;

      

      return {

        totalEstudiantes: estadisticasCoord.totalEstudiantes || estudiantes.length,

        totalDocentes: estadisticasCoord.totalDocentes || docentes.length,

        docentesActivos: docentes.filter(d => d.activo).length,

        docentesConTareas: docentesConTareasCount,

        totalCursos: estadisticasCoord.totalCursos || cursos.length,

        totalGrados: grados.length,

        tareasActivas: estadisticasCoord.tareasCreadas || tareas.filter(t => t.estado !== 'archivada').length,

        tareasCompletadas: estadisticasCoord.tareasCalificadas || tareas.filter(t => t.estado === 'completada').length,

        tareasPendientes: estadisticasCoord.tareasPendientes || tareas.filter(t => t.estado === 'pendiente' || t.estado === 'en_progreso').length,

        tareasVencidas: tareas.filter(t => {

          if (!t.fechaLimite) return false;

          return new Date(t.fechaLimite) < new Date() && t.estado !== 'completada';

        }).length,

        tasaCumplimiento: estadisticasCoord.tareasCreadas > 0

          ? Math.round((estadisticasCoord.tareasCalificadas / estadisticasCoord.tareasCreadas) * 100)

          : 0

      };

    }

    

    // Fallback: calcular localmente

    const tareasActivas = tareas.filter(t => t.estado !== 'archivada');

    const tareasCompletadas = tareas.filter(t => t.estado === 'completada');

    const tareasPendientes = tareas.filter(t => t.estado === 'pendiente' || t.estado === 'en_progreso');

    const tareasVencidas = tareas.filter(t => {

      if (!t.fechaLimite) return false;

      return new Date(t.fechaLimite) < new Date() && t.estado !== 'completada';

    });

    

    const docentesActivos = docentes.filter(d => d.activo);

    const docentesConTareas = [...new Set(tareas.map(t => t.docenteId))].length;

    

    return {

      totalEstudiantes: estudiantes.length,

      totalDocentes: docentes.length,

      docentesActivos: docentesActivos.length,

      docentesConTareas,

      totalCursos: cursos.length,

      totalGrados: grados.length,

      tareasActivas: tareasActivas.length,

      tareasCompletadas: tareasCompletadas.length,

      tareasPendientes: tareasPendientes.length,

      tareasVencidas: tareasVencidas.length,

      tasaCumplimiento: tareasActivas.length > 0 

        ? Math.round((tareasCompletadas.length / tareasActivas.length) * 100) 

        : 0

    };

  };

  

  const stats = calcularEstadisticas();



  // ============================================

  // HANDLERS ESTUDIANTES

  // ============================================

  

  const handleSaveEstudiante = async () => {

    setSaving(true);

    setError(null);

    try {

      let res;

      if (editingEstudiante) {

        res = await apiClient.updateEstudiante(editingEstudiante.id, formEstudiante);

      } else {

        res = await apiClient.createEstudiante(formEstudiante);

      }



      if (res.success) {

        setSuccess(editingEstudiante ? 'Estudiante actualizado exitosamente' : 'Estudiante creado exitosamente');

        setModalEstudiante(false);

        setEditingEstudiante(null);

        resetFormEstudiante();

        await loadData();

        setTimeout(() => setSuccess(null), 3000);

      } else {

        setError(res.message || 'Error al guardar estudiante');

      }

    } catch (error) {

      setError('Error al guardar estudiante');

    } finally {

      setSaving(false);

    }

  };



  const handleDeleteEstudiante = async (id: number, nombre: string) => {

    if (!confirm(`¿Está seguro de retirar al estudiante ${nombre}?`)) return;

    

    const result = await apiClient.deleteEstudiante(id);

    if (result.success) {

      setSuccess('Estudiante retirado correctamente');

      await loadData();

      setTimeout(() => setSuccess(null), 3000);

    } else {

      setError(result.message || 'Error al retirar estudiante');

    }

  };



  const openEditEstudiante = (est: Estudiante) => {

    setEditingEstudiante(est);

    setFormEstudiante({

      nombre: est.nombre,

      apellidos: est.apellidos || '',

      documento: est.documento,

      tipoDocumento: (est.tipoDocumento || 'ti') as 'ti' | 'cc' | 'ce',

      fechaNacimiento: est.fechaNacimiento || '',

      cursoId: est.cursoId,

      institucionId: est.institucionId

    });

    setModalEstudiante(true);

  };



  const resetFormEstudiante = () => {

    setFormEstudiante({

      nombre: '',

      apellidos: '',

      documento: '',

      tipoDocumento: 'ti',

      fechaNacimiento: '',

      cursoId: cursos[0]?.id || 1,

      institucionId: user?.institucionId || 1

    });

  };



  // ============================================

  // HANDLERS ORIENTADORES

  // ============================================

  

  // Generar contraseña sugerida

  const generarContrasenaOrientador = (apellido?: string) => {

    const año = new Date().getFullYear();

    if (apellido && apellido.trim()) {

      // Capitalizar primera letra del apellido

      const apellidoCapitalizado = apellido.trim().charAt(0).toUpperCase() + apellido.trim().slice(1).toLowerCase();

      return `${apellidoCapitalizado}${año}!`;

    }

    return `Orient${año}!`;

  };



  const [formOrientador, setFormOrientador] = useState({

    firstName: '',

    lastName: '',

    email: '',

    phone: '',

    address: '',

    contrasena: generarContrasenaOrientador()

  });



  const resetFormOrientador = () => {

    setFormOrientador({

      firstName: '',

      lastName: '',

      email: '',

      phone: '',

      address: '',

      contrasena: generarContrasenaOrientador()

    });

  };



  // Actualizar contraseña sugerida cuando cambia el apellido

  const handleOrientadorLastNameChange = (value: string) => {

    setFormOrientador(prev => ({

      ...prev,

      lastName: value,

      // Solo actualizar si la contraseña no ha sido modificada manualmente

      contrasena: prev.contrasena === generarContrasenaOrientador(prev.lastName) || prev.contrasena === generarContrasenaOrientador()

        ? generarContrasenaOrientador(value)

        : prev.contrasena

    }));

  };



  const handleCreateOrientador = async () => {

    setError(null);

    if (!formOrientador.firstName || !formOrientador.lastName || !formOrientador.email) {

      setError('Nombre, apellido y correo son requeridos');

      return;

    }

    

    const result = await crearOrientador(formOrientador);

    if (result.success) {

      const msg = result.passwordTemporal 

        ? `✅ Orientador creado. Contraseña temporal: ${result.passwordTemporal}`

        : '✅ Orientador creado correctamente';

      setSuccess(msg);

      await loadData();

      setModalOrientador(false);

      setEditingOrientador(null);

      resetFormOrientador();

      setTimeout(() => setSuccess(null), 8000); // Más tiempo para ver la contraseña

    } else {

      setError(result.error || 'Error al crear orientador');

    }

  };



  const handleUpdateOrientador = async () => {

    if (!editingOrientador) return;

    setError(null);

    

    const result = await actualizarOrientador(editingOrientador.id, {

      firstName: formOrientador.firstName,

      lastName: formOrientador.lastName,

      phone: formOrientador.phone,

      address: formOrientador.address

    });

    

    if (result.success) {

      setSuccess('✅ Orientador actualizado correctamente');

      await loadData();

      setModalOrientador(false);

      setEditingOrientador(null);

      resetFormOrientador();

      setTimeout(() => setSuccess(null), 3000);

    } else {

      setError(result.error || 'Error al actualizar orientador');

    }

  };



  const handleDeleteOrientador = async (id: number, nombre: string) => {

    if (!confirm(`¿Está seguro de desactivar al orientador ${nombre}?`)) return;

    

    const result = await desactivarOrientador(id);

    if (result.success) {

      setSuccess('✅ Orientador desactivado correctamente');

      await loadData();

      setTimeout(() => setSuccess(null), 3000);

    } else {

      setError(result.error || 'Error al desactivar orientador');

    }

  };



  const openEditOrientador = (orientador: any) => {

    setEditingOrientador(orientador);

    setFormOrientador({

      firstName: orientador.firstName || orientador.nombre || '',

      lastName: orientador.lastName || orientador.apellido || '',

      email: orientador.email || orientador.correo || '',

      phone: orientador.phone || orientador.telefono || '',

      address: orientador.address || orientador.direccion || '',

      contrasena: '' // No se muestra contraseña en edición

    });

    setModalOrientador(true);

  };



  // ============================================

  // HANDLERS VINCULACIÓN

  // ============================================

  

  const openVinculacion = async (est: Estudiante) => {

    setEstudianteVincular(est);

    // Cargar acudientes actuales del estudiante

    const result = await apiClient.getAcudientesEstudiante(est.id);

    setAcudientesEstudiante(result.data || []);

    setModalVinculacion(true);

  };



  // ============================================

  // FILTROS

  // ============================================

  

  const estudiantesFiltrados = estudiantes.filter(est => {

    const nombre = est.nombres || est.nombre || '';

    const apellidos = est.apellidos || '';

    const documento = est.numeroDocumento || est.numero_documento || est.documento || '';

    

    const matchBusqueda = busqueda === '' || 

      nombre.toLowerCase().includes(busqueda.toLowerCase()) ||

      apellidos.toLowerCase().includes(busqueda.toLowerCase()) ||

      documento.includes(busqueda);

    

    const cursoId = est.cursoId || est.curso_id;

    const matchCurso = filtroCurso === '' || cursoId === filtroCurso;

    

    const curso = cursos.find(c => c.id === cursoId);

    const matchGrado = filtroGrado === '' || curso?.gradoId === filtroGrado;

    

    return matchBusqueda && matchCurso && matchGrado;

  });



  if (loading) {

    return (

      <DashboardLayout>

        <div className="flex items-center justify-center h-64">

          <LoadingSpinner size="lg" text="Cargando panel de coordinación..." />

        </div>

      </DashboardLayout>

    );

  }



  return (

    <DashboardLayout>

      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header - Enfocado en Coordinación Académica */}

        <div className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-700 rounded-2xl p-6 text-white">

          <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-emerald-400/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />

          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-teal-400/10 to-transparent rounded-full translate-y-1/2 -translate-x-1/4" />

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div className="flex items-center gap-4">

              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/30">

                <IconClipboard className="text-white" size={28} />

              </div>

              <div>

                <p className="text-teal-200 text-sm font-semibold uppercase tracking-wider mb-0.5">

                  Coordinación Académica

                </p>

                <h1 className="text-2xl md:text-3xl font-display font-bold">

                  Bienvenido, {user?.nombre}

                </h1>

                <p className="text-teal-100 mt-0.5">

                  {institucion?.nombre || 'Gestión del día a día académico'}

                </p>

              </div>

            </div>

            {/* Indicador de cumplimiento */}

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">

              <div className="text-center">

                <div className="text-3xl font-bold">{stats.tasaCumplimiento}%</div>

                <div className="text-sm text-teal-100">Cumplimiento de tareas</div>

              </div>

            </div>

          </div>

        </div>



        {/* Stats - Enfoque Académico Operativo */}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">

          {/* Docentes */}

          <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">

            <div className="flex items-center gap-3">

              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200/50">

                <IconUsers className="text-white" size={20} />

              </div>

              <div>

                <div className="text-xl font-bold text-slate-800">{stats.totalDocentes}</div>

                <div className="text-xs text-slate-500 font-medium">Docentes</div>

              </div>

            </div>

          </div>

          

          {/* Estudiantes */}

          <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">

            <div className="flex items-center gap-3">

              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-200/50">

                <IconBook className="text-white" size={20} />

              </div>

              <div>

                <div className="text-xl font-bold text-slate-800">{stats.totalEstudiantes}</div>

                <div className="text-xs text-slate-500 font-medium">Estudiantes</div>

              </div>

            </div>

          </div>

          

          {/* Cursos */}

          <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">

            <div className="flex items-center gap-3">

              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200/50">

                <IconFilter className="text-white" size={20} />

              </div>

              <div>

                <div className="text-xl font-bold text-slate-800">{stats.totalCursos}</div>

                <div className="text-xs text-slate-500 font-medium">Cursos</div>

              </div>

            </div>

          </div>

          

          {/* Tareas Activas */}

          <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">

            <div className="flex items-center gap-3">

              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-200/50">

                <IconClipboard className="text-white" size={20} />

              </div>

              <div>

                <div className="text-xl font-bold text-slate-800">{stats.tareasActivas}</div>

                <div className="text-xs text-slate-500 font-medium">Tareas activas</div>

              </div>

            </div>

          </div>

          

          {/* Completadas */}

          <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">

            <div className="flex items-center gap-3">

              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-200/50">

                <IconCheckCircle className="text-white" size={20} />

              </div>

              <div>

                <div className="text-xl font-bold text-slate-800">{stats.tareasCompletadas}</div>

                <div className="text-xs text-slate-500 font-medium">Completadas</div>

              </div>

            </div>

          </div>

          

          {/* Vencidas (Alertas) */}

          <div className={`rounded-2xl shadow-sm p-5 border ${stats.tareasVencidas > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'}`}>

            <div className="flex items-center gap-3">

              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg ${stats.tareasVencidas > 0 ? 'bg-gradient-to-br from-red-400 to-red-600 shadow-red-200/50' : 'bg-gradient-to-br from-slate-300 to-slate-400 shadow-slate-200/50'}`}>

                <IconAlertTriangle className="text-white" size={20} />

              </div>

              <div>

                <div className={`text-xl font-bold ${stats.tareasVencidas > 0 ? 'text-red-700' : 'text-slate-800'}`}>{stats.tareasVencidas}</div>

                <div className={`text-xs font-medium ${stats.tareasVencidas > 0 ? 'text-red-600' : 'text-slate-500'}`}>Vencidas</div>

              </div>

            </div>

          </div>

        </div>



        {/* Mensajes */}

        {error && (

          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">

            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">

              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />

            </svg>

            <div className="flex-1">

              <p className="text-sm font-medium text-red-800">{error}</p>

            </div>

            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">

              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">

                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />

              </svg>

            </button>

          </div>

        )}



        {success && (

          <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">

            <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">

              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />

            </svg>

            <p className="text-sm font-medium text-green-800 flex-1">{success}</p>

          </div>

        )}



        {/* Tabs - Funciones del Coordinador Académico */}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

          <div className="border-b border-slate-100 bg-slate-50/50">

            <nav className="flex gap-1 p-1.5 overflow-x-auto">

              {[

                { id: 'resumen', label: 'Resumen', Icon: IconBarChart },

                { id: 'grados', label: 'Grados', Icon: IconBook },

                { id: 'cursos', label: 'Cursos', Icon: IconFilter },

                { id: 'orientacion', label: 'Gestión de Orientación', Icon: IconUsers },

                { id: 'estudiantes', label: 'Estudiantes', Icon: IconBook },

                { id: 'carga-masiva', label: 'Carga Masiva', Icon: IconFileUpload },

              ].map(tab => (

                <button

                  key={tab.id}

                  onClick={() => setActiveTab(tab.id as typeof activeTab)}

                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-200 ${

                    activeTab === tab.id

                      ? 'bg-white text-indigo-700 shadow-sm'

                      : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'

                  }`}

                >

                  <tab.Icon size={18} />

                  {tab.label}

                </button>

              ))}

            </nav>

          </div>



          <div className="p-6">

            {/* Tab: Resumen Académico */}

            {activeTab === 'resumen' && (

              <div className="space-y-6">

                <div className="flex items-center justify-between">

                  <h2 className="text-xl font-bold text-slate-800">Resumen del Día</h2>

                  <span className="text-sm text-slate-500">{new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>

                </div>

                

                {/* Alertas Académicas */}

                {stats.tareasVencidas > 0 && (

                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">

                    <div className="flex items-center gap-3">

                      <IconAlertTriangle className="text-red-600" size={24} />

                      <div>

                        <h3 className="font-semibold text-red-800">Atención Requerida</h3>

                        <p className="text-sm text-red-700">

                          Hay {stats.tareasVencidas} tarea(s) vencida(s) que requieren seguimiento.

                        </p>

                      </div>

                    </div>

                  </div>

                )}

                

                {/* Grid de información */}

                <div className="grid md:grid-cols-2 gap-6">

                  {/* Estado de Docentes */}

                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">

                    <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">

                      <IconUsers size={20} className="text-indigo-600" />

                      Estado de Docentes

                    </h3>

                    <div className="space-y-3">

                      <div className="flex justify-between items-center">

                        <span className="text-slate-600">Total docentes</span>

                        <span className="font-bold text-slate-800">{stats.totalDocentes}</span>

                      </div>

                      <div className="flex justify-between items-center">

                        <span className="text-slate-600">Docentes activos</span>

                        <span className="font-bold text-emerald-600">{stats.docentesActivos}</span>

                      </div>

                      <div className="flex justify-between items-center">

                        <span className="text-slate-600">Con tareas asignadas</span>

                        <span className="font-bold text-indigo-600">{stats.docentesConTareas}</span>

                      </div>

                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden mt-2">

                        <div 

                          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full"

                          style={{ width: `${stats.totalDocentes > 0 ? (stats.docentesConTareas / stats.totalDocentes) * 100 : 0}%` }}

                        />

                      </div>

                      <p className="text-xs text-slate-500 text-center">

                        {stats.totalDocentes > 0 ? Math.round((stats.docentesConTareas / stats.totalDocentes) * 100) : 0}% con tareas en progreso

                      </p>

                    </div>

                  </div>

                  

                  {/* Estado de Tareas */}

                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">

                    <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">

                      <IconClipboard size={20} className="text-teal-600" />

                      Estado de Tareas

                    </h3>

                    <div className="space-y-3">

                      <div className="flex justify-between items-center">

                        <span className="text-slate-600">Tareas activas</span>

                        <span className="font-bold text-slate-800">{stats.tareasActivas}</span>

                      </div>

                      <div className="flex justify-between items-center">

                        <span className="text-slate-600">Completadas</span>

                        <span className="font-bold text-emerald-600">{stats.tareasCompletadas}</span>

                      </div>

                      <div className="flex justify-between items-center">

                        <span className="text-slate-600">Pendientes</span>

                        <span className="font-bold text-amber-600">{stats.tareasPendientes}</span>

                      </div>

                      <div className="flex justify-between items-center">

                        <span className="text-slate-600">Vencidas</span>

                        <span className={`font-bold ${stats.tareasVencidas > 0 ? 'text-red-600' : 'text-slate-400'}`}>{stats.tareasVencidas}</span>

                      </div>

                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden mt-2">

                        <div 

                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"

                          style={{ width: `${stats.tasaCumplimiento}%` }}

                        />

                      </div>

                      <p className="text-xs text-slate-500 text-center">

                        {stats.tasaCumplimiento}% de cumplimiento

                      </p>

                    </div>

                  </div>

                </div>

                

                {/* Distribución por Grado */}

                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">

                  <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">

                    <IconBarChart size={20} className="text-purple-600" />

                    Estudiantes por Grado

                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">

                    {grados.map(grado => {

                      const estudiantesGrado = estudiantes.filter(e => {

                        const cursoId = e.cursoId || e.curso_id;

                        const curso = cursos.find(c => c.id === cursoId);

                        return curso?.gradoId === grado.id;

                      }).length;

                      return (

                        <div key={grado.id} className="bg-white rounded-lg p-3 text-center border border-slate-100">

                          <div className="text-lg font-bold text-slate-800">{estudiantesGrado}</div>

                          <div className="text-xs text-slate-500">{grado.nombre}</div>

                        </div>

                      );

                    })}

                  </div>

                </div>

                

                {/* Acciones Rápidas */}

                <div className="grid md:grid-cols-2 gap-4">

                  <button 

                    onClick={() => setActiveTab('docentes')}

                    className="p-4 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 text-left transition-colors"

                  >

                    <IconUsers className="text-indigo-600 mb-2" size={24} />

                    <h4 className="font-semibold text-indigo-800">Ver Docentes</h4>

                    <p className="text-sm text-indigo-600">Seguimiento y gestión</p>

                  </button>

                  <button 

                    onClick={() => setActiveTab('estudiantes')}

                    className="p-4 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 text-left transition-colors"

                  >

                    <IconBook className="text-blue-600 mb-2" size={24} />

                    <h4 className="font-semibold text-blue-800">Ver Estudiantes</h4>

                    <p className="text-sm text-blue-600">Rendimiento académico</p>

                  </button>

                </div>

              </div>

            )}



            {/* Tab: Grados - Vista de Grados y Cursos */}

            {activeTab === 'grados' && (

              <div className="space-y-5">

                <div className="flex items-center justify-between">

                  <h2 className="text-xl font-bold text-slate-800">Grados de la Institución</h2>

                  <span className="text-sm text-slate-500">{grados.length} grado(s)</span>

                </div>



                {/* Mensaje informativo para usuarios no admin */}

                {user?.rol !== 'admin' && (

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">

                    <div className="flex items-start gap-3">

                      <IconAlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />

                      <div className="text-sm text-blue-800">

                        <p className="font-medium mb-1">Vista de solo lectura</p>

                        <p>Los grados son datos maestros del sistema. Solo el Administrador del Sistema puede crear, editar o eliminar grados. Puedes ver los grados disponibles y crear cursos dentro de ellos.</p>

                      </div>

                    </div>

                  </div>

                )}



                {grados.length === 0 ? (

                  <div className="py-12 text-center text-slate-500">

                    <IconBook className="mx-auto mb-3 text-slate-400" size={48} />

                    <p className="font-medium">No hay grados registrados</p>

                    <p className="text-sm text-slate-400 mt-1">Los grados aparecerán aquí cuando se creen</p>

                  </div>

                ) : (

                  <div className="space-y-4">

                    {grados.map((grado: any) => (

                      <div key={grado.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">

                        {/* Header del Grado */}

                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 border-b border-slate-200">

                          <div className="flex items-center justify-between">

                            <div className="flex items-center gap-3 flex-1">

                              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">

                                <span className="text-white font-bold text-lg">{grado.orden}</span>

                              </div>

                              <div className="flex-1">

                                <h3 className="font-bold text-slate-800 text-lg">{grado.nombre}</h3>

                                <p className="text-sm text-slate-600">

                                  {grado.totalCursos || 0} curso(s) • {grado.totalEstudiantes || 0} estudiante(s)

                                </p>

                              </div>

                            </div>

                            <div className="flex items-center gap-3">

                              <div className="text-right">

                                <div className="text-2xl font-bold text-indigo-600">{grado.totalEstudiantes || 0}</div>

                                <div className="text-xs text-slate-500">Estudiantes</div>

                              </div>

                              {/* Solo Admin Sistema puede editar/eliminar grados */}

                              {user?.rol === 'admin' && (

                                <div className="flex gap-2">

                                  <button

                                    onClick={() => handleEditarGrado(grado)}

                                    className="p-2 hover:bg-indigo-100 rounded-lg transition-colors"

                                    title="Editar grado"

                                  >

                                    <IconEdit className="text-indigo-600" size={20} />

                                  </button>

                                  <button

                                    onClick={() => handleEliminarGrado(grado)}

                                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"

                                    title="Eliminar grado"

                                  >

                                    <IconTrash className="text-red-600" size={20} />

                                  </button>

                                </div>

                              )}

                            </div>

                          </div>

                        </div>



                        {/* Cursos del Grado */}

                        <div className="p-4">

                          {!grado.cursos || grado.cursos.length === 0 ? (

                            <div className="text-center py-6 text-slate-400">

                              <IconFilter className="mx-auto mb-2" size={32} />

                              <p className="text-sm">Sin cursos creados para este grado</p>

                            </div>

                          ) : (

                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">

                              {grado.cursos.map((curso: any) => (

                                <div key={curso.id} className="border border-slate-200 rounded-lg p-3 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all">

                                  <div className="flex items-start justify-between mb-2">

                                    <div>

                                      <h4 className="font-semibold text-slate-800">{curso.nombre}</h4>

                                      <p className="text-xs text-slate-500">{curso.jornada}</p>

                                    </div>

                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">

                                      ID: {curso.id}

                                    </span>

                                  </div>

                                  

                                  {curso.docente ? (

                                    <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">

                                      <IconUsers size={14} />

                                      <span>{curso.docente.nombre} {curso.docente.apellidos}</span>

                                    </div>

                                  ) : (

                                    <div className="flex items-center gap-2 text-xs text-amber-600 mb-2">

                                      <IconAlertTriangle size={14} />

                                      <span>Sin docente asignado</span>

                                    </div>

                                  )}

                                  

                                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">

                                    <div className="flex items-center gap-1 text-xs text-slate-600">

                                      <IconBook size={14} />

                                      <span>{curso.totalEstudiantes || 0} estudiantes</span>

                                    </div>

                                    {curso.totalEstudiantes === 0 && (

                                      <span className="text-xs text-amber-600">Vacío</span>

                                    )}

                                  </div>

                                </div>

                              ))}

                            </div>

                          )}

                        </div>

                      </div>

                    ))}

                  </div>

                )}

              </div>

            )}



            {/* Tab: Cursos - Vista Académica */}

            {activeTab === 'cursos' && (() => {

              console.log('🔍 [TAB CURSOS] Renderizando...');

              console.log('  - cursosCoord:', cursosCoord);

              console.log('  - cursos (fallback):', cursos);

              console.log('  - cursosCoord?.length:', cursosCoord?.length);

              console.log('  - Array.isArray(cursosCoord):', Array.isArray(cursosCoord));

              return (

              <div className="space-y-5">

                <div className="flex items-center justify-between">

                  <h2 className="text-xl font-bold text-slate-800">Cursos de la Institución</h2>

                  <span className="text-sm text-slate-500">{(cursosCoord?.length || 0) || cursos.length} curso(s)</span>

                </div>

                

                {/* Grid de cursos */}

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

                  {((cursosCoord?.length || 0) > 0 ? cursosCoord : cursos).length === 0 ? (

                    <div className="col-span-full py-12 text-center text-slate-500">

                      <IconFilter className="mx-auto mb-3 text-slate-400" size={48} />

                      <p className="font-medium">No hay cursos registrados</p>

                      <p className="text-sm text-slate-400 mt-1">Los cursos aparecerán aquí cuando se creen</p>

                    </div>

                  ) : (

                    ((cursosCoord?.length || 0) > 0 ? cursosCoord : cursos).map((curso: any) => {

                      // Datos del curso (del backend o calculados localmente) - con protección contra null

                      const totalEst = curso?.totalEstudiantes ?? estudiantes.filter(e => (e.cursoId || e.curso_id) === curso?.id).length;

                      const promedio = Number(curso?.promedioGeneral) || 0;

                      const distribucion = curso?.distribucionRendimiento || { superior: 0, alto: 0, basico: 0, bajo: 0 };

                      const tieneAlertas = curso?.tieneAlertas ?? false;

                      const tareasCreadas = curso?.tareasCreadas ?? 0;

                      const entregasPendientes = curso?.entregasPendientes ?? 0;

                      const gradoNombre = curso?.grado?.nombre || grados.find(g => g.id === curso?.gradoId)?.nombre || '';

                      const docenteNombre = curso?.docenteTitular ? `${curso.docenteTitular.nombre || ''} ${curso.docenteTitular.apellido || ''}` : '-';

                      

                      return (

                        <div 

                          key={curso?.id || Math.random()} 

                          className={`bg-white rounded-xl border p-5 hover:shadow-md transition-all ${

                            tieneAlertas ? 'border-red-200 bg-red-50/30' : 'border-slate-200'

                          }`}

                        >

                          {/* Header del curso */}

                          <div className="flex items-start justify-between mb-4">

                            <div>

                              <h3 className="font-bold text-lg text-slate-800">{curso?.nombre || 'Sin nombre'}</h3>

                              <p className="text-sm text-slate-500">{gradoNombre} • {curso?.jornada || 'Mañana'}</p>

                            </div>

                            {tieneAlertas && (

                              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full flex items-center gap-1">

                                <IconAlertTriangle size={12} />

                                Alerta

                              </span>

                            )}

                          </div>

                          

                          {/* Métricas principales */}

                          <div className="grid grid-cols-3 gap-2 mb-4">

                            <div className="text-center p-2 bg-slate-50 rounded-lg">

                              <div className="text-lg font-bold text-slate-800">{totalEst}</div>

                              <div className="text-xs text-slate-500">Estudiantes</div>

                            </div>

                            <div className="text-center p-2 bg-slate-50 rounded-lg">

                              <div className={`text-lg font-bold ${promedio >= 4 ? 'text-emerald-600' : promedio >= 3 ? 'text-amber-600' : 'text-red-600'}`}>

                                {promedio.toFixed(1)}

                              </div>

                              <div className="text-xs text-slate-500">Promedio</div>

                            </div>

                            <div className="text-center p-2 bg-slate-50 rounded-lg">

                              <div className="text-lg font-bold text-indigo-600">{tareasCreadas}</div>

                              <div className="text-xs text-slate-500">Tareas</div>

                            </div>

                          </div>

                          

                          {/* Distribución de rendimiento */}

                          {totalEst > 0 && (distribucion.superior > 0 || distribucion.alto > 0 || distribucion.basico > 0 || distribucion.bajo > 0) && (

                            <div className="mb-4">

                              <p className="text-xs text-slate-500 mb-2">Distribución de rendimiento:</p>

                              <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-slate-100">

                                {distribucion.superior > 0 && (

                                  <div 

                                    className="bg-emerald-500" 

                                    style={{ width: `${(distribucion.superior / totalEst) * 100}%` }}

                                    title={`Superior: ${distribucion.superior}`}

                                  />

                                )}

                                {distribucion.alto > 0 && (

                                  <div 

                                    className="bg-blue-500" 

                                    style={{ width: `${(distribucion.alto / totalEst) * 100}%` }}

                                    title={`Alto: ${distribucion.alto}`}

                                  />

                                )}

                                {distribucion.basico > 0 && (

                                  <div 

                                    className="bg-amber-500" 

                                    style={{ width: `${(distribucion.basico / totalEst) * 100}%` }}

                                    title={`Básico: ${distribucion.basico}`}

                                  />

                                )}

                                {distribucion.bajo > 0 && (

                                  <div 

                                    className="bg-red-500" 

                                    style={{ width: `${(distribucion.bajo / totalEst) * 100}%` }}

                                    title={`Bajo: ${distribucion.bajo}`}

                                  />

                                )}

                              </div>

                              <div className="flex justify-between text-xs text-slate-400 mt-1">

                                <span>Sup: {distribucion.superior}</span>

                                <span>Alto: {distribucion.alto}</span>

                                <span>Bás: {distribucion.basico}</span>

                                <span>Bajo: {distribucion.bajo}</span>

                              </div>

                            </div>

                          )}

                          

                          {/* Docente titular */}

                          <div className="pt-3 border-t border-slate-100">

                            <div className="flex items-center gap-2 text-sm">

                              <IconUsers size={14} className="text-slate-400" />

                              <span className="text-slate-600">Docente: <span className="font-medium text-slate-800">{docenteNombre}</span></span>

                            </div>

                            {entregasPendientes > 0 && (

                              <div className="flex items-center gap-2 text-sm mt-1">

                                <IconClock size={14} className="text-amber-500" />

                                <span className="text-amber-600">{entregasPendientes} entregas pendientes</span>

                              </div>

                            )}

                          </div>

                        </div>

                      );

                    })

                  )}

                </div>

                

                {/* Leyenda */}

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">

                  <span className="font-medium">Rendimiento:</span>

                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Superior (4.6-5.0)</span>

                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Alto (4.0-4.5)</span>

                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500"></span> Básico (3.0-3.9)</span>

                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> Bajo (1.0-2.9)</span>

                </div>

              </div>

            );

            })()}

            

            {/* Tab: Gestión de Orientación - Docentes y Orientadores */}

            {activeTab === 'orientacion' && (

              <div className="space-y-5">

                <div className="flex items-center justify-between">

                  <h2 className="text-xl font-bold text-slate-800">Gestión de Orientación</h2>

                  {canManage && (

                    <Button

                      onClick={() => {

                        setEditingOrientador(null);

                        resetFormOrientador();

                        setModalOrientador(true);

                      }}

                      className="flex items-center gap-2"

                    >

                      <IconPlus size={16} />

                      Nuevo Orientador

                    </Button>

                  )}

                </div>

                

                {/* Sub-tabs para Docentes y Orientadores */}

                <div className="flex gap-2 border-b border-slate-200">

                  <button

                    onClick={() => setSubTab('docentes')}

                    className={`px-4 py-2 font-medium transition-colors ${

                      subTab === 'docentes'

                        ? 'text-indigo-600 border-b-2 border-indigo-600'

                        : 'text-slate-600 hover:text-slate-800'

                    }`}

                  >

                    Docentes ({(docentesCoord?.length || 0) || docentes.length})

                  </button>

                  <button

                    onClick={() => setSubTab('orientadores')}

                    className={`px-4 py-2 font-medium transition-colors ${

                      subTab === 'orientadores'

                        ? 'text-indigo-600 border-b-2 border-indigo-600'

                        : 'text-slate-600 hover:text-slate-800'

                    }`}

                  >

                    Orientadores ({orientadoresCoord?.length || 0})

                  </button>

                </div>



                {/* Contenido de Docentes */}

                {subTab === 'docentes' && (

                  <div className="space-y-5">

                

                {/* Tabla de docentes */}

                <div className="overflow-x-auto rounded-xl border border-slate-200">

                  <table className="w-full">

                    <thead>

                      <tr className="border-b border-slate-100 bg-slate-50/80">

                        <th className="text-left py-3.5 px-5 font-semibold text-slate-600 text-sm">Docente</th>

                        <th className="text-center py-3.5 px-4 font-semibold text-slate-600 text-sm">Estado</th>

                        <th className="text-center py-3.5 px-4 font-semibold text-slate-600 text-sm">Tareas Asignadas</th>

                        <th className="text-center py-3.5 px-4 font-semibold text-slate-600 text-sm">Completadas</th>

                        <th className="text-center py-3.5 px-4 font-semibold text-slate-600 text-sm">Cumplimiento</th>

                      </tr>

                    </thead>

                    <tbody>

                      {(() => {

                        const listaDocentes = (docentesCoord?.length > 0 ? docentesCoord : docentes) || [];

                        if (listaDocentes.length === 0) {

                          return (

                            <tr>

                              <td colSpan={5} className="py-12 text-center text-slate-500">

                                <IconUsers className="mx-auto mb-3 text-slate-400" size={48} />

                                <p className="font-medium">No hay docentes registrados</p>

                              </td>

                            </tr>

                          );

                        }

                        return listaDocentes.map((docente: any) => {

                          if (!docente) return null;

                          // Si viene del endpoint del coordinador, ya tiene las métricas

                          const tareasDocente = docente.tareasCreadas ?? tareas.filter(t => t.docenteId === docente.id).length;

                          const tareasCompletadas = docente.tareasCalificadas ?? tareas.filter(t => t.docenteId === docente.id && t.estado === 'completada').length;

                          const cumplimiento = tareasDocente > 0 

                            ? Math.round((tareasCompletadas / tareasDocente) * 100) 

                            : 0;

                          const estadoAcademico = docente.estadoAcademico || (cumplimiento >= 80 ? 'bien' : cumplimiento >= 50 ? 'alerta' : 'critico');

                          const activo = docente.activo ?? true;

                          

                          return (

                            <tr key={docente.id || Math.random()} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">

                              <td className="py-4 px-5">

                                <div className="flex items-center gap-3">

                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">

                                    {docente.nombre?.[0] || '?'}{docente.apellido?.[0] || docente.apellidos?.[0] || ''}

                                  </div>

                                  <div>

                                    <div className="font-medium text-slate-800">{docente.nombre} {docente.apellido || docente.apellidos}</div>

                                    <div className="text-sm text-slate-500">{docente.correo}</div>

                                  </div>

                                </div>

                              </td>

                              <td className="text-center py-4 px-4">

                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${

                                  activo 

                                    ? 'bg-emerald-100 text-emerald-700' 

                                    : 'bg-slate-100 text-slate-600'

                                }`}>

                                  {activo ? 'Activo' : 'Inactivo'}

                                </span>

                              </td>

                              <td className="text-center py-4 px-4 text-slate-600 font-medium">

                                {tareasDocente}

                              </td>

                              <td className="text-center py-4 px-4 text-emerald-600 font-medium">

                                {tareasCompletadas}

                              </td>

                              <td className="text-center py-4 px-4">

                                <div className="flex items-center justify-center gap-2">

                                  <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">

                                    <div 

                                      className={`h-full rounded-full ${

                                        estadoAcademico === 'bien' ? 'bg-emerald-500' :

                                        estadoAcademico === 'alerta' ? 'bg-amber-500' : 'bg-red-500'

                                      }`}

                                      style={{ width: `${cumplimiento}%` }}

                                    />

                                  </div>

                                  <span className={`text-sm font-medium ${

                                    estadoAcademico === 'bien' ? 'text-emerald-600' :

                                    estadoAcademico === 'alerta' ? 'text-amber-600' : 'text-red-600'

                                  }`}>

                                    {cumplimiento}%

                                  </span>

                                </div>

                              </td>

                            </tr>

                          );

                        });

                      })()}

                    </tbody>

                  </table>

                </div>

                  </div>

                )}



                {/* Contenido de Orientadores */}

                {subTab === 'orientadores' && (

                  <div className="space-y-5">

                

                {/* Tabla de orientadores */}

                <div className="overflow-x-auto rounded-xl border border-slate-200">

                  <table className="w-full">

                    <thead>

                      <tr className="border-b border-slate-100 bg-slate-50/80">

                        <th className="text-left py-3.5 px-5 font-semibold text-slate-600 text-sm">Orientador</th>

                        <th className="text-center py-3.5 px-4 font-semibold text-slate-600 text-sm">Correo</th>

                        <th className="text-center py-3.5 px-4 font-semibold text-slate-600 text-sm">Teléfono</th>

                        <th className="text-center py-3.5 px-4 font-semibold text-slate-600 text-sm">Estado</th>

                        <th className="text-center py-3.5 px-4 font-semibold text-slate-600 text-sm">Grados Asignados</th>

                        <th className="text-center py-3.5 px-4 font-semibold text-slate-600 text-sm">Acciones</th>

                      </tr>

                    </thead>

                    <tbody>

                      {(() => {

                        const listaOrientadores = orientadoresCoord || [];

                        if (listaOrientadores.length === 0) {

                          return (

                            <tr>

                              <td colSpan={6} className="py-12 text-center text-slate-500">

                                <IconUserPlus className="mx-auto mb-3 text-slate-400" size={48} />

                                <p className="font-medium">No hay orientadores registrados</p>

                                <p className="text-sm text-slate-400 mt-1">Haz clic en "Nuevo Orientador" para agregar uno</p>

                              </td>

                            </tr>

                          );

                        }

                        return listaOrientadores.map((orientador: any) => {

                          if (!orientador) return null;

                          const nombre = orientador.firstName || orientador.nombre || '';

                          const apellido = orientador.lastName || orientador.apellido || '';

                          const email = orientador.email || orientador.correo || orientador.correo_institucional || '';

                          const telefono = orientador.phone || orientador.telefono || '-';

                          const activo = orientador.activo ?? true;

                          const gradosAsignados = orientador.gradosAsignados || [];

                          

                          return (

                            <tr key={orientador.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">

                              <td className="py-4 px-5">

                                <div className="flex items-center gap-3">

                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md">

                                    {nombre[0] || '?'}{apellido[0] || ''}

                                  </div>

                                  <div>

                                    <div className="font-medium text-slate-800">{nombre} {apellido}</div>

                                    {orientador.cursosAcompanados > 0 && (

                                      <div className="text-sm text-slate-500">{orientador.cursosAcompanados} curso(s) acompañados</div>

                                    )}

                                  </div>

                                </div>

                              </td>

                              <td className="text-center py-4 px-4 text-slate-600 text-sm">

                                {email}

                              </td>

                              <td className="text-center py-4 px-4 text-slate-600">

                                {telefono}

                              </td>

                              <td className="text-center py-4 px-4">

                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${

                                  activo 

                                    ? 'bg-emerald-100 text-emerald-700' 

                                    : 'bg-slate-100 text-slate-600'

                                }`}>

                                  {activo ? 'Activo' : 'Inactivo'}

                                </span>

                              </td>

                              <td className="text-center py-4 px-4">

                                {gradosAsignados.length > 0 ? (

                                  <div className="flex flex-wrap justify-center gap-1">

                                    {gradosAsignados.slice(0, 3).map((g: any) => (

                                      <span key={g.id} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">

                                        {g.nombre}

                                      </span>

                                    ))}

                                    {gradosAsignados.length > 3 && (

                                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">

                                        +{gradosAsignados.length - 3}

                                      </span>

                                    )}

                                  </div>

                                ) : (

                                  <span className="text-slate-400 text-sm">Sin asignar</span>

                                )}

                              </td>

                              <td className="text-center py-4 px-4">

                                {canManage ? (

                                  <div className="flex justify-center gap-1">

                                    <button

                                      onClick={() => openEditOrientador(orientador)}

                                      className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"

                                      title="Editar"

                                    >

                                      <IconEdit size={18} />

                                    </button>

                                    <button

                                      onClick={() => handleDeleteOrientador(orientador.id, `${nombre} ${apellido}`)}

                                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"

                                      title="Desactivar"

                                    >

                                      <IconTrash size={18} />

                                    </button>

                                  </div>

                                ) : (

                                  <span className="text-slate-400 text-sm">-</span>

                                )}

                              </td>

                            </tr>

                          );

                        });

                      })()}

                    </tbody>

                  </table>

                </div>

                

                {/* Resumen */}

                <div className="text-sm text-slate-600">

                  Total: <span className="font-semibold text-teal-600">{orientadoresCoord?.length || 0}</span> orientador(es)

                </div>

                  </div>

                )}

              </div>

            )}



            {/* Tab: Estudiantes */}

            {activeTab === 'estudiantes' && (

              <div className="space-y-5">

                {/* Toolbar */}

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                  <div className="flex flex-col md:flex-row gap-3 flex-1">

                    <div className="relative flex-1 max-w-md">

                      <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />

                      <input

                        type="text"

                        placeholder="Buscar por nombre o documento..."

                        value={busqueda}

                        onChange={(e) => setBusqueda(e.target.value)}

                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"

                      />

                    </div>

                    

                    <select

                      value={filtroGrado}

                      onChange={(e) => setFiltroGrado(e.target.value ? parseInt(e.target.value) : '')}

                      className="px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"

                    >

                      <option value="">Todos los grados</option>

                      {grados.map(g => (

                        <option key={g.id} value={g.id}>{g.nombre}</option>

                      ))}

                    </select>

                    

                    <select

                      value={filtroCurso}

                      onChange={(e) => setFiltroCurso(e.target.value ? parseInt(e.target.value) : '')}

                      className="px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"

                    >

                      <option value="">Todos los cursos</option>

                      {cursos.map(c => (

                        <option key={c.id} value={c.id}>{c.nombre}</option>

                      ))}

                    </select>

                  </div>

                  

                  <Button

                    onClick={() => {

                      setEditingEstudiante(null);

                      resetFormEstudiante();

                      setModalEstudiante(true);

                    }}

                    className="flex items-center gap-2"

                  >

                    <IconPlus size={16} />

                    Nuevo Estudiante

                  </Button>

                </div>



                {/* Tabla */}

                <div className="overflow-x-auto rounded-xl border border-slate-200">

                  <table className="w-full">

                    <thead>

                      <tr className="border-b border-slate-100 bg-slate-50/80">

                        <th className="text-left py-3.5 px-5 font-semibold text-slate-600 text-sm">Estudiante</th>

                        <th className="text-center py-3.5 px-4 font-semibold text-slate-600 text-sm">Documento</th>

                        <th className="text-center py-3.5 px-4 font-semibold text-slate-600 text-sm">Curso</th>

                        <th className="text-center py-3.5 px-4 font-semibold text-slate-600 text-sm">Edad</th>

                        <th className="text-center py-3.5 px-4 font-semibold text-slate-600 text-sm">Acciones</th>

                      </tr>

                    </thead>

                    <tbody>

                      {estudiantesFiltrados.length === 0 ? (

                        <tr>

                          <td colSpan={5} className="py-12 text-center text-slate-500">

                            <IconUsers className="mx-auto mb-3 text-slate-400" size={48} />

                            <p className="font-medium">No se encontraron estudiantes</p>

                            <p className="text-sm">Intenta ajustar los filtros o crear uno nuevo</p>

                          </td>

                        </tr>

                      ) : (

                        estudiantesFiltrados.map(est => {

                          const cursoId = est.cursoId || est.curso_id;

                          const curso = cursos.find(c => c.id === cursoId);

                          const fechaNac = est.fechaNacimiento || est.fecha_nacimiento;

                          const edad = fechaNac 

                            ? new Date().getFullYear() - new Date(fechaNac).getFullYear()

                            : '-';

                          

                          return (

                            <tr key={est.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">

                              <td className="py-4 px-5">

                                <div className="flex items-center gap-3">

                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">

                                    {(est.nombres || est.nombre)?.[0] || '?'}{est.apellidos?.[0] || ''}

                                  </div>

                                  <div>

                                    <div className="font-medium text-slate-800">{est.nombres || est.nombre || 'Sin nombre'} {est.apellidos || ''}</div>

                                    <div className="text-sm text-slate-500">{(est.tipoDocumento || est.tipo_documento)?.toUpperCase() || 'TI'}: {est.numeroDocumento || est.numero_documento || est.documento}</div>

                                  </div>

                                </div>

                              </td>

                              <td className="text-center py-4 px-4 text-slate-600 font-medium">

                                {est.numeroDocumento || est.numero_documento || est.documento}

                              </td>

                              <td className="text-center py-4 px-4">

                                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">

                                  {curso?.nombre || 'Sin curso'}

                                </span>

                              </td>

                              <td className="text-center py-4 px-4 text-slate-600 font-medium">

                                {edad} años

                              </td>

                              <td className="text-center py-4 px-4">

                                <div className="flex justify-center gap-1">

                                  <button

                                    onClick={() => openVinculacion(est)}

                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"

                                    title="Vincular acudiente"

                                  >

                                    <IconLink size={18} />

                                  </button>

                                  <button

                                    onClick={() => openEditEstudiante(est)}

                                    className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"

                                  >

                                    <IconEdit size={18} />

                                  </button>

                                  <button

                                    onClick={() => handleDeleteEstudiante(est.id, `${est.nombre} ${est.apellidos}`)}

                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"

                                  >

                                    <IconTrash size={18} />

                                  </button>

                                </div>

                              </td>

                            </tr>

                          );

                        })

                      )}

                    </tbody>

                  </table>

                </div>



                {/* Resumen */}

                <div className="text-sm text-slate-600">

                  Mostrando <span className="font-semibold text-indigo-600">{estudiantesFiltrados.length}</span> de <span className="font-semibold">{estudiantes.length}</span> estudiantes

                </div>

              </div>

            )}







            {/* Tab: Carga Masiva */}

            {activeTab === 'carga-masiva' && (

              <div className="max-w-3xl mx-auto">

                <BulkUploadDual 

                  institucionId={user?.institucionId || 1}

                  onClose={() => {

                    setActiveTab('estudiantes');

                  }}

                  onSuccess={() => {

                    loadData(); // Recargar datos después de la carga masiva

                  }}

                />

              </div>

            )}

          </div>

        </div>

      </div>



      {/* Modal Nuevo/Editar Estudiante */}

      <Modal

        isOpen={modalEstudiante}

        onClose={() => {

          setModalEstudiante(false);

          setEditingEstudiante(null);

          resetFormEstudiante();

          setError(null);

        }}

        title={editingEstudiante ? 'Editar Estudiante' : 'Nuevo Estudiante'}

        size="lg"

      >

        <div className="space-y-4">

          <div className="grid grid-cols-2 gap-4">

            <FormFieldInput

              name="nombre"

              label="Nombres"

              placeholder="Nombres del estudiante"

              value={formEstudiante.nombre}

              onChange={(e) => setFormEstudiante({ ...formEstudiante, nombre: e.target.value })}

              required

            />

            <FormFieldInput

              name="apellidos"

              label="Apellidos"

              placeholder="Apellidos del estudiante"

              value={formEstudiante.apellidos}

              onChange={(e) => setFormEstudiante({ ...formEstudiante, apellidos: e.target.value })}

              required

            />

          </div>



          <div className="grid grid-cols-3 gap-4">

            <div>

              <label className="block text-sm font-medium text-slate-700 mb-2">Tipo Doc.</label>

              <select

                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"

                value={formEstudiante.tipoDocumento}

                onChange={(e) => setFormEstudiante({ ...formEstudiante, tipoDocumento: e.target.value as any })}

              >

                <option value="ti">TI</option>

                <option value="cc">CC</option>

                <option value="ce">CE</option>

              </select>

            </div>

            <FormFieldInput

              name="documento"

              label="Número de Documento"

              placeholder="1234567890"

              value={formEstudiante.documento}

              onChange={(e) => setFormEstudiante({ ...formEstudiante, documento: e.target.value })}

              required

              className="col-span-2"

            />

          </div>



          <FormFieldInput

            name="fechaNacimiento"

            label="Fecha de Nacimiento"

            type="date"

            value={formEstudiante.fechaNacimiento}

            onChange={(e) => setFormEstudiante({ ...formEstudiante, fechaNacimiento: e.target.value })}

            required

          />



          <div>

            <label className="block text-sm font-medium text-slate-700 mb-2">Curso</label>

            {cursos.length === 0 ? (

              <div className="w-full px-4 py-2.5 border border-amber-200 rounded-xl bg-amber-50 text-amber-700 text-sm">

                ⚠️ No hay cursos disponibles. Crea un curso primero.

              </div>

            ) : (

              <select

                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"

                value={formEstudiante.cursoId}

                onChange={(e) => setFormEstudiante({ ...formEstudiante, cursoId: parseInt(e.target.value) })}

              >

                {cursos.map(c => (

                  <option key={c.id} value={c.id}>{c.nombre}</option>

                ))}

              </select>

            )}

          </div>



          <div className="flex justify-end gap-3 pt-4">

            <Button

              variant="ghost"

              onClick={() => {

                setModalEstudiante(false);

                setEditingEstudiante(null);

                resetFormEstudiante();

                setError(null);

              }}

            >

              Cancelar

            </Button>

            <Button onClick={handleSaveEstudiante}>

              {editingEstudiante ? 'Actualizar' : 'Crear'} Estudiante

            </Button>

          </div>

        </div>

      </Modal>



      {/* Modal Nuevo/Editar Orientador */}

      <Modal

        isOpen={modalOrientador}

        onClose={() => {

          setModalOrientador(false);

          setEditingOrientador(null);

          resetFormOrientador();

          setError(null);

        }}

        title={editingOrientador ? 'Editar Orientador' : 'Nuevo Orientador'}

        size="lg"

      >

        <div className="space-y-4">

          <div className="grid grid-cols-2 gap-4">

            <FormFieldInput

              name="firstName"

              label="Nombres"

              placeholder="Nombres del orientador"

              value={formOrientador.firstName}

              onChange={(e) => setFormOrientador({ ...formOrientador, firstName: e.target.value })}

              required

            />

            <FormFieldInput

              name="lastName"

              label="Apellidos"

              placeholder="Apellidos del orientador"

              value={formOrientador.lastName}

              onChange={(e) => handleOrientadorLastNameChange(e.target.value)}

              required

            />

          </div>



          <FormFieldInput

            name="email"

            label="Correo Electrónico"

            type="email"

            placeholder="orientador@institucion.edu.co"

            value={formOrientador.email}

            onChange={(e) => setFormOrientador({ ...formOrientador, email: e.target.value })}

            required

            disabled={!!editingOrientador} // No editable si ya existe

          />



          {!editingOrientador && (

            <div>

              <FormFieldInput

                name="contrasena"

                label="Contraseña Temporal"

                type="text"

                placeholder="Contraseña inicial"

                value={formOrientador.contrasena}

                onChange={(e) => setFormOrientador({ ...formOrientador, contrasena: e.target.value })}

              />

              <p className="text-xs text-slate-500 mt-1">

                💡 Sugerencia auto-generada. El orientador deberá cambiarla en su primer inicio de sesión.

              </p>

            </div>

          )}



          <div className="grid grid-cols-2 gap-4">

            <FormFieldInput

              name="phone"

              label="Teléfono"

              placeholder="3001234567"

              value={formOrientador.phone}

              onChange={(e) => setFormOrientador({ ...formOrientador, phone: e.target.value })}

            />

            <FormFieldInput

              name="address"

              label="Dirección"

              placeholder="Dirección del orientador"

              value={formOrientador.address}

              onChange={(e) => setFormOrientador({ ...formOrientador, address: e.target.value })}

            />

          </div>



          <div className="flex justify-end gap-3 pt-4">

            <Button

              variant="ghost"

              onClick={() => {

                setModalOrientador(false);

                setEditingOrientador(null);

                resetFormOrientador();

                setError(null);

              }}

            >

              Cancelar

            </Button>

            <Button onClick={editingOrientador ? handleUpdateOrientador : handleCreateOrientador}>

              {editingOrientador ? 'Actualizar' : 'Crear'} Orientador

            </Button>

          </div>

        </div>

      </Modal>



      {/* Modal Vinculación Acudiente */}

      <Modal

        isOpen={modalVinculacion}

        onClose={() => {

          setModalVinculacion(false);

          setEstudianteVincular(null);

          setAcudientesEstudiante([]);

        }}

        title={`Acudientes de ${estudianteVincular?.nombre || ''} ${estudianteVincular?.apellidos || ''}`}

        size="lg"

      >

        <div className="space-y-4">

          {/* Lista de acudientes actuales */}

          {acudientesEstudiante.length > 0 ? (

            <div className="space-y-3">

              <h4 className="font-medium text-slate-700">Acudientes vinculados:</h4>

              {acudientesEstudiante.map((acud: any) => (

                <div key={acud.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">

                  <div>

                    <p className="font-medium text-slate-800">

                      {acud.nombres || acud.nombre} {acud.apellidos || acud.apellido}

                    </p>

                    <p className="text-sm text-slate-500">

                      {acud.parentesco || 'Parentesco no especificado'} • {acud.telefono || 'Sin teléfono'}

                    </p>

                  </div>

                  <div className="flex items-center gap-2">

                    {acud.pivot?.es_principal && (

                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">

                        Principal

                      </span>

                    )}

                  </div>

                </div>

              ))}

            </div>

          ) : (

            <div className="text-center py-8 text-slate-500">

              <IconUsers className="mx-auto mb-2 text-slate-400" size={40} />

              <p>Este estudiante no tiene acudientes vinculados</p>

              <p className="text-sm text-slate-400">Use el sistema para vincular acudientes</p>

            </div>

          )}



          <div className="flex justify-end pt-4">

            <Button

              variant="ghost"

              onClick={() => {

                setModalVinculacion(false);

                setEstudianteVincular(null);

                setAcudientesEstudiante([]);

              }}

            >

              Cerrar

            </Button>

          </div>

        </div>

      </Modal>



      {/* Modal Editar Grado */}

      <Modal

        isOpen={modalEditarGrado}

        onClose={() => {

          setModalEditarGrado(false);

          setGradoEditando(null);

          setFormGrado({ nombre: '', descripcion: '' });

        }}

        title="Editar Grado"

        size="md"

      >

        <div className="space-y-4">

          <FormFieldInput

            name="nombreGrado"

            label="Nombre del Grado"

            type="text"

            value={formGrado.nombre}

            onChange={(e) => setFormGrado({ ...formGrado, nombre: e.target.value })}

            placeholder="Ej: Primero, Segundo, Tercero..."

            required

          />



          <FormFieldInput

            name="descripcionGrado"

            label="Descripción (opcional)"

            type="text"

            value={formGrado.descripcion}

            onChange={(e) => setFormGrado({ ...formGrado, descripcion: e.target.value })}

            placeholder="Descripción del grado..."

          />



          <div className="flex gap-3 pt-4">

            <Button

              variant="secondary"

              onClick={() => {

                setModalEditarGrado(false);

                setGradoEditando(null);

                setFormGrado({ nombre: '', descripcion: '' });

              }}

              className="flex-1"

            >

              Cancelar

            </Button>

            <Button

              onClick={handleGuardarGrado}

              disabled={!formGrado.nombre.trim()}

              className="flex-1"

            >

              Guardar Cambios

            </Button>

          </div>

        </div>

      </Modal>

    </DashboardLayout>

  );

}

