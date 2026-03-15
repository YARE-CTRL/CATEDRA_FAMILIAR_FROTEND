import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSession } from '../../api/endpoints';
import apiClient from '../../api/apiClient';
import DashboardLayout from '../DashboardLayout';
import { PageLoading, StatsCardSkeleton, ButtonLoading } from '../ui/LoadingStates';
import { ErrorState, EmptyState } from '../ui/ErrorStates';
import {
  IconUsers,
  IconTrendingUp,
  IconInstitution,
  IconShield,
  IconBook,
  IconGraduationCap,
  IconArrowRight,
  IconAlertTriangle,
  IconCheck,
  IconInfo,
  IconTarget,
  IconClipboard
} from '../ui/Icons';

interface QuickStats {
  totalCoordinadores: number;
  coordinadoresActivos: number;
  totalOrientadores: number;
  orientadoresActivos: number;
  totalDocentes: number;
  docentesActivos: number;
  totalCursos: number;
  totalEstudiantes: number;
  tasaActivacion: number;
}

interface TaskItem {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed' | 'overdue';
  dueDate?: string;
  action?: string;
  actionLink?: string;
}

interface InstitutionInfo {
  nombre: string;
  municipio?: string;
  departamento?: string;
  codigoDane?: string;
}

export default function RectorDashboardEnhanced() {
  const session = getSession();
  let user = session?.user;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | {message: string; type: string; user: any} | null>(null);
  const [stats, setStats] = useState<QuickStats>({
    totalCoordinadores: 0,
    coordinadoresActivos: 0,
    totalOrientadores: 0,
    orientadoresActivos: 0,
    totalDocentes: 0,
    docentesActivos: 0,
    totalCursos: 0,
    totalEstudiantes: 0,
    tasaActivacion: 0
  });
  const [miInstitucion, setMiInstitucion] = useState<InstitutionInfo | null>(null);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [pendingTasks, setPendingTasks] = useState<TaskItem[]>([]);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Validar sesión
      if (!session || !user) {
        throw new Error('Sesión no válida o expirada');
      }

      console.log('[DEBUG][RectorDashboard] Datos completos del usuario:', user);
      console.log('[DEBUG][RectorDashboard] Campos de institución:', {
        institucionId: user.institucionId,
        institucion_id: user.institucion_id,
        institucion: user.institucion,
        'institucion.id': user.institucion?.id,
        'institucion_id': user.institucion_id,
        todosLosCampos: Object.keys(user)
      });

      // Cargar la institución del rector primero
      let institucionRector: InstitutionInfo | null = null;
      let institucionId = user?.institucionId || 
                         user?.institucion_id || 
                         user?.institucion?.id ||
                         user?.institucionId ||
                         user?.id_institucion;
      
      console.log('[DEBUG][RectorDashboard] institucionId encontrado en sesión:', institucionId);
      
      // Si no hay institucionId en la sesión, intentar obtener datos actualizados del usuario
      if (!institucionId) {
        console.log('[DEBUG][RectorDashboard] No hay institucionId en sesión, obteniendo datos actualizados...');
        try {
          // Usar el endpoint específico para obtener datos actualizados
          const userResponse = await fetch('http://localhost:3333/debug/usuario-datos-actualizados', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              correo: user.correo
            })
          });
          
          const userData = await userResponse.json();
          console.log('[DEBUG][RectorDashboard] Datos actualizados del usuario:', userData);
          
          if (userData.success && userData.data) {
            const updatedUser = userData.data;
            
            // Actualizar la sesión con los datos nuevos
            const updatedSession = {
              ...session,
              user: updatedUser
            };
            localStorage.setItem('session', JSON.stringify(updatedSession));
            
            // Actualizar el user local
            user = updatedUser;
            
            // Buscar institucionId en los datos actualizados (tiene múltiples campos)
            institucionId = updatedUser?.institucionId || 
                           updatedUser?.institucion_id || 
                           updatedUser?.institucion?.id ||
                           updatedUser?.institucionId ||
                           updatedUser?.id_institucion ||
                           updatedUser?.['institucion.id'];
            
            console.log('[DEBUG][RectorDashboard] institucionId encontrado en datos actualizados:', institucionId);
          }
        } catch (error) {
          console.warn('[DEBUG][RectorDashboard] Error obteniendo datos actualizados:', error);
        }
      }
      
      if (institucionId) {
        // El rector tiene institución asignada, cargarla
        try {
          // Usar el endpoint correcto para rector
          console.log('[DEBUG][RectorDashboard] Intentando getMiInstitucionRector...');
          const instRes = await apiClient.getMiInstitucionRector();
          console.log('[DEBUG][RectorDashboard] Respuesta getMiInstitucionRector:', instRes);
          
          if (instRes.success && instRes.data) {
            institucionRector = {
              nombre: instRes.data.nombre || 'Institución',
              municipio: instRes.data.municipio?.nombre || instRes.data.municipio,
              departamento: instRes.data.departamento?.nombre || instRes.data.departamento,
              codigoDane: instRes.data.codigoDane
            };
            console.log('[DEBUG][RectorDashboard] Institución cargada con getMiInstitucionRector:', institucionRector);
          } else {
            console.warn('[DEBUG][RectorDashboard] getMiInstitucionRector falló, intentando fallback...');
            // Intentar con el endpoint alternativo
            const instRes = await apiClient.getInstitucionById(institucionId);
            console.log('[DEBUG][RectorDashboard] Respuesta getInstitucionById:', instRes);
            
            if (instRes.success && instRes.data) {
              institucionRector = {
                nombre: instRes.data.nombre || 'Institución',
                municipio: instRes.data.municipio?.nombre || instRes.data.municipio,
                departamento: instRes.data.departamento?.nombre || instRes.data.departamento,
                codigoDane: instRes.data.codigoDane
              };
              console.log('[DEBUG][RectorDashboard] Institución cargada con getInstitucionById:', institucionRector);
            }
          }
        } catch (instError) {
          console.warn('[DEBUG][RectorDashboard] Error cargando institución, intentando fallback:', instError);
          // Intentar con el endpoint alternativo
            try {
              const instRes = await apiClient.getInstitucionById(institucionId);
              console.log('[DEBUG][RectorDashboard] Respuesta getInstitucionById (fallback):', instRes);
              console.log('[DEBUG][RectorDashboard] Estructura de la respuesta:', {
                success: instRes.success,
                data: instRes.data,
                status: instRes.status,
                'typeof success': typeof instRes.success,
                'typeof data': typeof instRes.data,
                'data keys': instRes.data ? Object.keys(instRes.data) : 'null'
              });
              
              if (instRes.data) {
                institucionRector = {
                  nombre: instRes.data.nombre || 'Institución',
                  municipio: instRes.data.municipio?.nombre || instRes.data.municipio,
                  departamento: instRes.data.departamento?.nombre || instRes.data.departamento,
                  codigoDane: instRes.data.codigoDane
                };
                console.log('[DEBUG][RectorDashboard] Institución cargada con fallback:', institucionRector);
              } else {
                console.warn('[DEBUG][RectorDashboard] El fallback no cumplió las condiciones success && data');
              }
            } catch (fallbackError) {
              console.warn('[DEBUG][RectorDashboard] Error en fallback:', fallbackError);
            }
        }
        
        // Validar que la institución se cargó correctamente
        if (!institucionRector) {
          throw new Error('No se pudo cargar la información de la institución');
        }
        
        setMiInstitucion(institucionRector);
      } else {
        // El rector no tiene institución asignada - mostrar mensaje amigable
        throw new Error('El rector no está asignado a ninguna institución. Por favor, contacte al administrador del sistema para asignarle una institución.');
      }

      // Usar endpoints específicos del rector
      const [estadisticasData, coordinadoresRes, orientadoresRes, docentesRes] = await Promise.all([
        apiClient.getEstadisticasRector(),
        apiClient.getCoordinadoresRector(),
        apiClient.getOrientadoresRector(),
        apiClient.getDocentesRector()
      ]);

      // Validar y procesar estadísticas
      if (!estadisticasData) {
        throw new Error('No se pudieron cargar las estadísticas');
      }
      setStats(estadisticasData);
      
      // Procesar usuarios con validación
      const todosUsuarios: Usuario[] = [];
      
      if (coordinadoresRes?.success && Array.isArray(coordinadoresRes.data)) {
        coordinadoresRes.data.forEach((c: any) => {
          if (c && typeof c === 'object') {
            todosUsuarios.push({
              id: c.usuarioId || c.id || Math.random().toString(),
              nombre: c.nombre || '',
              apellidos: c.apellido || '',
              correo: c.correo || '',
              telefono: c.telefono || '',
              rol: 'coordinador',
              activo: c.estaActivo ?? false,
              institucionId: c.institucionId
            } as Usuario);
          }
        });
      }
      
      if (orientadoresRes?.success && Array.isArray(orientadoresRes.data)) {
        orientadoresRes.data.forEach((o: any) => {
          if (o && typeof o === 'object') {
            todosUsuarios.push({
              id: o.usuarioId || o.id || Math.random().toString(),
              nombre: o.nombre || '',
              apellidos: o.apellido || '',
              correo: o.correo || '',
              telefono: o.telefono || '',
              rol: 'orientador',
              activo: o.estaActivo ?? false,
              institucionId: o.institucionId
            } as Usuario);
          }
        });
      }
      
      if (docentesRes?.success && Array.isArray(docentesRes.data)) {
        docentesRes.data.forEach((d: any) => {
          if (d && typeof d === 'object') {
            todosUsuarios.push({
              id: d.usuarioId || d.id || Math.random().toString(),
              nombre: d.nombres || d.nombre || '',
              apellidos: d.apellidos || d.apellido || '',
              correo: d.correo || '',
              telefono: d.telefono || '',
              rol: 'docente_aula',
              activo: d.estaActivo ?? false,
              institucionId: d.institucionId
            } as Usuario);
          }
        });
      }
      
      setUsuarios(todosUsuarios);

      // Generar tareas pendientes basadas en los datos
      const tasks: TaskItem[] = [];
      
      if (stats.totalCoordinadores === 0) {
        tasks.push({
          id: '1',
          title: 'Crear Coordinador Académico',
          description: 'Tu institución no tiene coordinadores asignados. Es fundamental tener al menos un coordinador para gestionar el área académica.',
          priority: 'high',
          status: 'pending',
          action: 'Crear Coordinador',
          actionLink: '/directivos'
        });
      }

      if (stats.totalOrientadores === 0) {
        tasks.push({
          id: '2',
          title: 'Asignar Orientador Escolar',
          description: 'El orientador es crucial para el acompañamiento vocacional y emocional de los estudiantes.',
          priority: 'high',
          status: 'pending',
          action: 'Asignar Orientador',
          actionLink: '/directivos'
        });
      }

      if (stats.totalCursos === 0) {
        tasks.push({
          id: '3',
          title: 'Configurar Cursos Académicos',
          description: 'Es necesario configurar los cursos para que los docentes puedan asignar tareas y gestionar sus clases.',
          priority: 'high',
          status: 'pending',
          action: 'Configurar Cursos',
          actionLink: '/cursos'
        });
      }

      if (stats.tasaActivacion < 80 && (stats.totalCoordinadores > 0 || stats.totalOrientadores > 0)) {
        tasks.push({
          id: '4',
          title: 'Activar Personal Inactivo',
          description: `${Math.round(100 - stats.tasaActivacion)}% de tu personal está inactivo. Actívalos para asegurar el funcionamiento correcto.`,
          priority: 'medium',
          status: 'pending',
          action: 'Ver Personal',
          actionLink: '/directivos?filter=inactive'
        });
      }

      tasks.push({
        id: '5',
        title: 'Generar Primer Reporte',
        description: 'Revisa las estadísticas iniciales de tu institución para tener una línea base y monitorear el progreso.',
        priority: 'low',
        status: 'pending',
        action: 'Ver Reportes',
        actionLink: '/reportes/rector'
      });

      setPendingTasks(tasks);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al cargar datos del dashboard';
      
      // Si el error es específicamente sobre no tener institución asignada, mostrar un mensaje más amigable
      if (errorMessage.includes('no está asignado a ninguna institución')) {
        setError({
          message: errorMessage,
          type: 'no_institution',
          user: user
        });
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const retryLoad = () => {
    loadDashboardData();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <IconCheck className="w-4 h-4 text-green-500" />;
      case 'overdue': return <IconAlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <IconInfo className="w-4 h-4 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <PageLoading message="Cargando panel de rectoría..." />
      </DashboardLayout>
    );
  }

  if (error) {
    // Si es un error específico de rector sin institución, mostrar mensaje personalizado
    if (typeof error === 'object' && error.type === 'no_institution') {
      return (
        <DashboardLayout>
          <div className="max-w-2xl mx-auto mt-20">
            <div className="bg-white rounded-2xl shadow-xl border border-amber-200 p-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <IconAlertTriangle className="w-10 h-10 text-amber-600" />
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  Rector sin Institución Asignada
                </h1>
                
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Hola, <span className="font-semibold">{error.user?.nombre || 'Rector'}</span>.<br />
                  Actualmente no tienes ninguna institución asignada en el sistema.
                </p>
                
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <p className="text-amber-800 text-sm">
                    <strong>Para solucionar esto:</strong><br />
                    Contacta al administrador del sistema para que te asigne a una institución.
                    Una vez tengas una institución asignada, podrás acceder a todas las funciones de tu panel de rectoría.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Reintentar
                  </button>
                  <button
                    onClick={() => {
                      // Cerrar sesión
                      localStorage.removeItem('session');
                      window.location.href = '/login';
                    }}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </div>
          </div>
        </DashboardLayout>
      );
    }
    
    // Para otros errores, mostrar el componente ErrorState normal
    return (
      <DashboardLayout>
        <ErrorState message={typeof error === 'string' ? error : error.message} onRetry={retryLoad} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Principal */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-800 to-indigo-900 rounded-2xl p-8 text-white shadow-xl">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-purple-500/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-indigo-500/15 to-transparent rounded-full translate-y-1/2 -translate-x-1/3" />
          
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/40 ring-4 ring-white/10">
                <IconShield className="text-white" size={32} />
              </div>
              <div>
                <p className="text-purple-300 text-sm font-semibold uppercase tracking-wider mb-1">
                  Panel de Rectoría
                </p>
                <h1 className="text-2xl md:text-3xl font-bold">
                  Bienvenido, {user?.nombre || 'Rector'}
                </h1>
                <p className="text-indigo-200 mt-1">
                  {miInstitucion ? (
                    <>
                      <span className="font-semibold">{miInstitucion.nombre}</span>
                      {miInstitucion.municipio && <span className="text-indigo-300"> • {miInstitucion.municipio}</span>}
                    </>
                  ) : (
                    'Gestión estratégica de directivos e instituciones'
                  )}
                </p>
              </div>
            </div>
            
            {/* Botón de Guía */}
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg font-medium transition-all border border-white/20"
            >
              <IconInfo size={16} />
              {showGuide ? 'Ocultar Guía' : 'Mostrar Guía'}
            </button>
          </div>
        </div>

      {/* Guía Rápida */}
        {showGuide && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <IconTarget className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">🎯 Guía Rápida para Rectores</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <h4 className="font-medium text-blue-800 mb-1">1. Configurar Directivos</h4>
                    <p className="text-sm text-gray-600">Asigna coordinadores y orientadores para gestionar áreas académicas.</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <h4 className="font-medium text-blue-800 mb-1">2. Organizar Cursos</h4>
                    <p className="text-sm text-gray-600">Crea la estructura de cursos y asigna docentes.</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <h4 className="font-medium text-blue-800 mb-1">3. Monitorear Actividad</h4>
                    <p className="text-sm text-gray-600">Revisa estadísticas y rendimiento del personal.</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <h4 className="font-medium text-blue-800 mb-1">4. Generar Reportes</h4>
                    <p className="text-sm text-gray-600">Exporta informes de gestión y rendimiento.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Métricas Principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <IconUsers className="text-purple-600" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{stats.totalCoordinadores || 0}</div>
                <div className="text-sm text-slate-500">Coordinadores</div>
                <div className="text-xs text-green-600 font-medium">
                  {stats.coordinadoresActivos || 0} activos
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <IconGraduationCap className="text-indigo-600" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{stats.totalOrientadores || 0}</div>
                <div className="text-sm text-slate-500">Orientadores</div>
                <div className="text-xs text-green-600 font-medium">
                  {stats.orientadoresActivos || 0} activos
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <IconBook className="text-blue-600" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{stats.totalDocentes || 0}</div>
                <div className="text-sm text-slate-500">Docentes</div>
                <div className="text-xs text-green-600 font-medium">
                  {stats.docentesActivos || 0} activos
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <IconTrendingUp className="text-emerald-600" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{stats.tasaActivacion || 0}%</div>
                <div className="text-sm text-slate-500">Tasa Activación</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tareas Pendientes */}
        {pendingTasks.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">📋 Tareas Pendientes</h3>
              <span className="text-sm text-slate-500">{pendingTasks.length} acciones requeridas</span>
            </div>
            
            <div className="space-y-3">
              {pendingTasks.map((task) => (
                <div key={task.id} className={`border rounded-lg p-4 ${getPriorityColor(task.priority)}`}>
                  <div className="flex items-start gap-3">
                    {getStatusIcon(task.status)}
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                      {task.actionLink && (
                        <Link
                          to={task.actionLink}
                          className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 bg-white rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                          {task.action}
                          <IconArrowRight size={14} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Acciones Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/directivos"
            className="group bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-6 text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <IconUsers size={32} />
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <IconArrowRight size={20} />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">Gestión de Directivos</h3>
            <p className="text-purple-100 text-sm">Administra coordinadores, orientadores y docentes</p>
          </Link>

          <Link
            to="/cursos"
            className="group bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white hover:shadow-lg hover:shadow-blue-500/25 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <IconBook size={32} />
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <IconArrowRight size={20} />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">Configuración Académica</h3>
            <p className="text-blue-100 text-sm">Gestiona cursos y estructura educativa</p>
          </Link>

          <Link
            to="/reportes/rector"
            className="group bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <IconClipboard size={32} />
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <IconArrowRight size={20} />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">Reportes y Estadísticas</h3>
            <p className="text-emerald-100 text-sm">Informes de rendimiento y gestión</p>
          </Link>
        </div>

        {/* Métricas Adicionales */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">📊 Métricas Académicas</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-800">{stats.totalCursos || 0}</div>
              <div className="text-sm text-slate-500">Cursos Activos</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-800">{stats.totalEstudiantes || 0}</div>
              <div className="text-sm text-slate-500">Estudiantes Totales</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-800">{(stats.totalCoordinadores || 0) + (stats.totalOrientadores || 0)}</div>
              <div className="text-sm text-slate-500">Directivos Totales</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-800">{(stats.coordinadoresActivos || 0) + (stats.orientadoresActivos || 0)}</div>
              <div className="text-sm text-slate-500">Directivos Activos</div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
