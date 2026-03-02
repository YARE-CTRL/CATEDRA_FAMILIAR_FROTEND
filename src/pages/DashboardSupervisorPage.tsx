import { useState, useEffect } from 'react';
import { getSession, getCursos, getEstadisticasInstitucion, getTareas, getEntregas } from '../api/endpoints';
import { getEstudiantesInstitucionOrientador, getCategorias } from '../api/endpointsDocente-orinetador';
import apiClient from '../api/apiClient';
import httpService from '../api/httpService';
import { type Curso, type Tarea, type Entrega } from '../mocks/data';
import DashboardLayout from '../components/DashboardLayout';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  IconTarget,
  IconBarChart,
  IconBuilding,
  IconFamily,
  IconClipboard,
  IconCheckCircle,
  IconTrendingUp,
  IconBell,
  IconTeacher,
  IconAward,
  IconCalendar,
  IconInbox,
  IconBook,
  IconHeart,
  IconDownload,
  IconAlertCircle,
  IconUsers,
  IconStar,
  IconClock,
  IconEye,
  IconHome
} from '../components/ui/Icons';

type SupervisorRole = 'orientador' | 'coordinador' | 'rector';

export default function DashboardSupervisorPage() {
  const session = getSession();
  const user = session?.user;
  const currentRole = (session?.isPreview && (session as any).previewRole 
    ? (session as any).previewRole 
    : user?.rol) as SupervisorRole;
  
  const [loading, setLoading] = useState(true);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [cursoSeleccionado, setCursoSeleccionado] = useState<number | null>(null);
  
  // Nuevos estados para datos reales del orientador
  const [estudiantes, setEstudiantes] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [familiasAlerta, setFamiliasAlerta] = useState<any[]>([]);
  const [intervencionesRecientes, setIntervencionesRecientes] = useState<any[]>([]);
  const [institucionInfo, setInstitucionInfo] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Función para obtener el nombre de la institución
  const getInstitucionNombre = async (institucionId: number) => {
    try {
      console.log(`[DEBUG][Institucion] Buscando nombre para institución ID: ${institucionId}`);
      
      // Intentar obtener desde el endpoint de instituciones
      const response = await apiClient.getInstituciones();
      console.log('[DEBUG][Institucion] Respuesta de getInstituciones:', response);
      
      if (response.success && Array.isArray(response.data)) {
        const institucion = response.data.find((inst: any) => 
          inst.id === institucionId || inst.institucionId === institucionId
        );
        
        if (institucion && institucion.nombre) {
          console.log('[DEBUG][Institucion] Nombre encontrado:', institucion.nombre);
          return institucion.nombre;
        }
      }
      
      // Si no se encuentra en la lista, intentar con el endpoint específico
      try {
        const responseDirect = await httpService.get(`/instituciones/${institucionId}`);
        console.log('[DEBUG][Institucion] Respuesta directa:', responseDirect.data);
        
        if (responseDirect.data && responseDirect.data.nombre) {
          console.log('[DEBUG][Institucion] Nombre encontrado en endpoint directo:', responseDirect.data.nombre);
          return responseDirect.data.nombre;
        }
      } catch (error) {
        console.log('[DEBUG][Institucion] Error en endpoint directo:', error);
      }
      
      // Si no se encuentra el nombre, usar un nombre por defecto
      console.log('[DEBUG][Institucion] No se encontró nombre, usando por defecto');
      return `Institución ${institucionId}`;
    } catch (error) {
      console.error('[DEBUG][Institucion] Error obteniendo nombre:', error);
      return `Institución ${institucionId}`;
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const userInstitucionId = user?.institucionId || (session as any)?.context?.institucionId;
      
      console.log('[DEBUG][Dashboard] Usuario:', {
        rol: user?.rol,
        id: user?.id,
        institucionId: userInstitucionId
      });

      const [cursosData, tareasData, entregasData, statsData] = await Promise.all([
        getCursos(),
        getTareas(),
        getEntregas(),
        getEstadisticasInstitucion(userInstitucionId || 1),
      ]);

      // Filtrar cursos por institución del usuario
      const cursosFiltrados = Array.isArray(cursosData) 
        ? cursosData.filter((curso: any) => {
            const cursoInstitucionId = curso?.institucionId || curso?.institucion_id || curso?.institucion?.id;
            return !cursoInstitucionId || cursoInstitucionId === userInstitucionId;
          })
        : [];

      console.log('[DEBUG][Dashboard] Cursos:', {
        total: cursosData?.length || 0,
        filtrados: cursosFiltrados.length,
        institucionId: userInstitucionId
      });

      console.log('[DEBUG][Dashboard] Tareas:', {
        total: tareasData?.length || 0,
        primeras: tareasData?.slice(0, 3)
      });
      
      console.log('[DEBUG][Dashboard] Entregas:', {
        total: entregasData?.length || 0,
        calificadas: entregasData?.filter((e: any) => e.estado === 'calificada').length,
        primeras: entregasData?.slice(0, 3)
      });

      setCursos(cursosFiltrados);
      setTareas(Array.isArray(tareasData) ? tareasData : []);
      setEntregas(Array.isArray(entregasData) ? entregasData : []);
      setEstadisticas(statsData || null);

      // Establecer información de la institución
      if (userInstitucionId) {
        const institucionNombre = await getInstitucionNombre(userInstitucionId);
        setInstitucionInfo({
          id: userInstitucionId,
          nombre: institucionNombre
        });
      }

      // Cargar datos específicos del orientador
      if (currentRole === 'orientador') {
        try {
          console.log('[DEBUG][Dashboard] Cargando datos específicos del orientador...');
          
          const [estudiantesData, categoriasData] = await Promise.all([
            getEstudiantesInstitucionOrientador(),
            getCategorias()
          ]);
          
          console.log('[DEBUG][Dashboard] Respuesta estudiantes:', {
            cantidad: estudiantesData?.length || 0,
            datos: estudiantesData,
            tipo: typeof estudiantesData
          });
          
          // Filtrar estudiantes por institución si es necesario
          const estudiantesFiltrados = Array.isArray(estudiantesData) 
            ? estudiantesData.filter((estudiante: any) => {
                const estudianteInstitucionId = estudiante?.institucionId || estudiante?.institucion_id || estudiante?.institucion?.id;
                console.log('[DEBUG][Dashboard] Filtrando estudiante:', {
                  id: estudiante.id,
                  nombre: estudiante.nombres,
                  institucionId: estudianteInstitucionId,
                  userInstitucionId: userInstitucionId,
                  pasa: !estudianteInstitucionId || estudianteInstitucionId === userInstitucionId
                });
                return !estudianteInstitucionId || estudianteInstitucionId === userInstitucionId;
              })
            : [];

          console.log('[DEBUG][Dashboard] Estudiantes:', {
            total: estudiantesData?.length || 0,
            filtrados: estudiantesFiltrados.length,
            institucionId: userInstitucionId
          });
          
          setEstudiantes(estudiantesFiltrados);
          setCategorias(Array.isArray(categoriasData?.data) ? categoriasData.data : []);
          
          // Procesar familias que requieren atención (datos reales)
          const familiasConAlerta = procesarFamiliasAlerta(estudiantesFiltrados, entregasData);
          setFamiliasAlerta(familiasConAlerta);
          
          // Simular intervenciones recientes (podría venir de un endpoint real)
          setIntervencionesRecientes(generarIntervencionesRecientes(estudiantesFiltrados));
          
        } catch (error) {
          console.error('Error cargando datos específicos del orientador:', error);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función para calcular el porcentaje de participación
  const calcularParticipacion = () => {
    if (estudiantes.length === 0) return 0;
    
    // Contar entregas únicas por estudiante
    const estudiantesConEntregas = new Set();
    entregas.forEach(entrega => {
      if (entrega.estado === 'calificada' || entrega.estado === 'enviada') {
        estudiantesConEntregas.add(entrega.estudianteId);
      }
    });
    
    const participacion = Math.round((estudiantesConEntregas.size / estudiantes.length) * 100);
    console.log('[DEBUG][Dashboard] Participación:', {
      estudiantes: estudiantes.length,
      conEntregas: estudiantesConEntregas.size,
      porcentaje: participacion
    });
    
    return participacion;
  };

  // Función para procesar familias que requieren atención basada en datos reales
  const procesarFamiliasAlerta = (estudiantes: any[], entregas: any[]) => {
    const familiasMap = new Map();
    
    // Agrupar estudiantes por familia/acudiente
    estudiantes.forEach(estudiante => {
      const familiaId = estudiante.acudienteId || estudiante.id;
      if (!familiasMap.has(familiaId)) {
        familiasMap.set(familiaId, {
          id: familiaId,
          acudiente: estudiante.acudiente || `${estudiante.nombres || ''} ${estudiante.apellidos || ''}`.trim(),
          estudiantes: [],
          tareasPendientes: 0,
          ultimaParticipacion: null,
          tieneActividadReal: false
        });
      }
      familiasMap.get(familiaId).estudiantes.push(estudiante);
    });

    // Analizar entregas para detectar alertas
    entregas.forEach(entrega => {
      const estudiante = estudiantes.find(e => e.id === entrega.estudianteId);
      if (estudiante) {
        const familiaId = estudiante.acudienteId || estudiante.id;
        const familia = familiasMap.get(familiaId);
        if (familia) {
          // Marcar que tiene actividad real
          familia.tieneActividadReal = true;
          
          if (entrega.estado === 'pendiente' || entrega.estado === 'vencida') {
            familia.tareasPendientes++;
          }
          
          // Actualizar última participación con fecha real
          if (entrega.fechaEntrega) {
            const fechaEntrega = new Date(entrega.fechaEntrega);
            if (!familia.ultimaParticipacion || fechaEntrega > new Date(familia.ultimaParticipacion)) {
              familia.ultimaParticipacion = entrega.fechaEntrega.toISOString();
            }
          }
        }
      }
    });

    // Filtrar familias con alertas REALES
    const familiasConAlerta = Array.from(familiasMap.values())
      .filter(familia => {
        // Solo mostrar familias que tengan actividad real y realmente necesiten atención
        if (!familia.tieneActividadReal) return false;
        
        // Alerta por tareas pendientes (3+ tareas)
        if (familia.tareasPendientes >= 3) return true;
        
        // Alerta por inactividad (más de 30 días sin actividad)
        if (familia.ultimaParticipacion) {
          const diasSinActividad = diasSinActividad(familia.ultimaParticipacion);
          return diasSinActividad > 30; // 30 días en lugar de 7
        }
        
        return false;
      })
      .slice(0, 5); // Limitar a 5 familias

    console.log('[DEBUG][Dashboard] Familias procesadas:', {
      totalFamilias: familiasMap.size,
      conActividadReal: Array.from(familiasMap.values()).filter(f => f.tieneActividadReal).length,
      conAlerta: familiasConAlerta.length,
      muestra: familiasConAlerta.slice(0, 2)
    });

    return familiasConAlerta;
  };

  // Función para calcular días sin actividad
  const diasSinActividad = (ultimaFecha: string | null) => {
    if (!ultimaFecha) return 999;
    const hoy = new Date();
    const ultima = new Date(ultimaFecha);
    return Math.floor((hoy.getTime() - ultima.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Función para generar intervenciones recientes (simuladas)
  const generarIntervencionesRecientes = (estudiantes: any[]) => {
    const tiposIntervencion = ['Llamada telefónica', 'Reunión presencial', 'Mensaje', 'Visita domiciliaria'];
    const intervenciones = [];
    
    // Generar algunas intervenciones de ejemplo con estudiantes reales
    for (let i = 0; i < Math.min(5, estudiantes.length); i++) {
      const estudiante = estudiantes[i];
      if (estudiante) {
        intervenciones.push({
          id: i + 1,
          estudiante: `${estudiante.nombres} ${estudiante.apellidos}`,
          tipo: tiposIntervencion[Math.floor(Math.random() * tiposIntervencion.length)],
          fecha: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          motivo: 'Seguimiento académico',
          estado: Math.random() > 0.3 ? 'completada' : 'pendiente'
        });
      }
    }
    
    return intervenciones.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  };

  const getRoleTitle = () => {
    switch (currentRole) {
      case 'orientador':
        return { 
          title: 'Panel de Orientación', 
          Icon: IconTarget, 
          color: 'teal', 
          description: institucionInfo 
            ? `Seguimiento del bienestar familiar y estudiantil - ${institucionInfo.nombre}`
            : 'Seguimiento del bienestar familiar y estudiantil'
        };
      case 'coordinador':
        return { title: 'Panel de Coordinación', Icon: IconBarChart, color: 'indigo', description: 'Gestión académica y seguimiento docente' };
      case 'rector':
        return { title: 'Panel de Rectoría', Icon: IconBuilding, color: 'slate', description: 'Visión institucional y toma de decisiones' };
      default:
        return { title: 'Panel de Supervisión', Icon: IconTarget, color: 'teal', description: 'Monitoreo general' };
    }
  };

  const roleInfo = getRoleTitle();

  // Calcular estadísticas derivadas
  const entregasPorEstado = {
    pendientes: entregas.filter(e => e.estado === 'enviada').length,
    calificadas: entregas.filter(e => e.estado === 'calificada').length,
    total: entregas.length,
  };

  const participacion = estadisticas?.porcentajeParticipacion || 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" text="Cargando datos..." />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header con diseño distintivo por rol */}
        <div className={`relative overflow-hidden rounded-2xl p-6 border ${
          currentRole === 'orientador' ? 'bg-gradient-to-br from-teal-50 via-cyan-50/40 to-emerald-50/30 border-teal-100/50' :
          currentRole === 'coordinador' ? 'bg-gradient-to-br from-indigo-50 via-violet-50/40 to-purple-50/30 border-indigo-100/50' :
          'bg-gradient-to-br from-slate-50 via-zinc-50/40 to-stone-50/30 border-slate-200/50'
        }`}>
          <div className={`absolute top-0 right-0 w-72 h-72 rounded-full -translate-y-1/2 translate-x-1/2 ${
            currentRole === 'orientador' ? 'bg-gradient-to-bl from-teal-200/20 to-transparent' :
            currentRole === 'coordinador' ? 'bg-gradient-to-bl from-indigo-200/20 to-transparent' :
            'bg-gradient-to-bl from-slate-200/30 to-transparent'
          }`} />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                currentRole === 'orientador' ? 'bg-gradient-to-br from-teal-400 to-teal-600 shadow-teal-200/50' :
                currentRole === 'coordinador' ? 'bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-indigo-200/50' :
                'bg-gradient-to-br from-slate-500 to-slate-700 shadow-slate-300/50'
              }`}>
                <roleInfo.Icon className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-800">
                  {roleInfo.title}
                </h1>
                <p className="text-slate-600 mt-0.5">
                  {roleInfo.description}
                </p>
              </div>
            </div>
            
            <button className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2 font-medium shadow-sm">
              <IconDownload size={18} />
              Exportar Reporte
            </button>
          </div>
        </div>

        {/* Estadísticas principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 p-5 border border-slate-100 hover:border-teal-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-200/50 group-hover:scale-105 transition-transform">
                <IconFamily className="text-white" size={22} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{estadisticas?.estudiantesActivos || 0}</div>
                <div className="text-sm text-slate-500 font-medium">Familias</div>
              </div>
            </div>
          </div>
          
          <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 p-5 border border-slate-100 hover:border-blue-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-200/50 group-hover:scale-105 transition-transform">
                <IconClipboard className="text-white" size={22} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{tareas.length}</div>
                <div className="text-sm text-slate-500 font-medium">Tareas Activas</div>
              </div>
            </div>
          </div>
          
          <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 p-5 border border-slate-100 hover:border-emerald-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-200/50 group-hover:scale-105 transition-transform">
                <IconCheckCircle className="text-white" size={22} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{entregasPorEstado.calificadas}</div>
                <div className="text-sm text-slate-500 font-medium">Entregas</div>
              </div>
            </div>
          </div>
          
          <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 p-5 border border-slate-100 hover:border-violet-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200/50 group-hover:scale-105 transition-transform">
                <IconTrendingUp className="text-white" size={22} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{participacion}%</div>
                <div className="text-sm text-slate-500 font-medium">Participación</div>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico de participación por curso */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/50">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3">
              <IconBarChart className="text-indigo-500" size={22} />
              Participación por Curso
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {cursos.map(curso => {
              const tareasDelCurso = tareas.filter(t => t.cursoId === curso.id).length;
              const porcentaje = Math.floor(50 + Math.random() * 40); // Mock
              
              return (
                <div 
                  key={curso.id}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    cursoSeleccionado === curso.id 
                      ? 'border-teal-400 bg-teal-50/50 shadow-md' 
                      : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
                  }`}
                  onClick={() => setCursoSeleccionado(cursoSeleccionado === curso.id ? null : curso.id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{curso.nombre}</span>
                      <span className="text-sm text-slate-400">•</span>
                      <span className="text-sm text-slate-500">{tareasDelCurso} tareas</span>
                    </div>
                    <span className={`font-bold text-lg ${porcentaje >= 70 ? 'text-emerald-600' : porcentaje >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                      {porcentaje}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        porcentaje >= 70 ? 'bg-gradient-to-r from-emerald-400 to-green-500' : 
                        porcentaje >= 50 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 
                        'bg-gradient-to-r from-red-400 to-rose-500'
                      }`}
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel del Orientador - Nuevo diseño con datos reales */}
        {currentRole === 'orientador' && (
          <>
            {/* Información de la Institución */}
            {institucionInfo && (
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50/50 rounded-2xl shadow-sm border border-teal-100/50 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-200/50">
                    <IconBuilding className="text-white" size={28} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-slate-800">{institucionInfo.nombre}</h2>
                    <p className="text-slate-600 mt-1">Panel de Orientación Escolar</p>
                  </div>
                </div>
              </div>
            )}

            {/* Estadísticas principales del orientador */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 p-5 border border-slate-100 hover:border-teal-200">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-200/50 group-hover:scale-105 transition-transform">
                    <IconUsers className="text-white" size={22} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800">{estudiantes.length}</div>
                    <div className="text-sm text-slate-500 font-medium">Estudiantes</div>
                  </div>
                </div>
              </div>
              
              <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 p-5 border border-slate-100 hover:border-blue-200">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-200/50 group-hover:scale-105 transition-transform">
                    <IconBook className="text-white" size={22} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800">{tareas.length}</div>
                    <div className="text-sm text-slate-500 font-medium">Tareas Activas</div>
                  </div>
                </div>
              </div>
              
              <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 p-5 border border-slate-100 hover:border-emerald-200">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-200/50 group-hover:scale-105 transition-transform">
                    <IconCheckCircle className="text-white" size={22} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800">{entregas.filter(e => e.estado === 'calificada').length}</div>
                    <div className="text-sm text-slate-500 font-medium">Entregas</div>
                  </div>
                </div>
              </div>
              
              <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 p-5 border border-slate-100 hover:border-violet-200">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200/50 group-hover:scale-105 transition-transform">
                    <IconTrendingUp className="text-white" size={22} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800">{calcularParticipacion()}%</div>
                    <div className="text-sm text-slate-500 font-medium">Participación</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Familias que Requieren Atención - Datos Reales */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-amber-50/50">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                  <IconAlertCircle className="text-orange-500" size={22} />
                  Familias que Requieren Atención
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                    {familiasAlerta.length} familias
                  </span>
                </h2>
              </div>
              <div className="p-6">
                {familiasAlerta.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <IconHeart className="mx-auto text-green-500 mb-3" size={48} />
                    <p className="font-medium">¡Excelente! No hay familias en alerta</p>
                    <p className="text-sm mt-1">Todas las familias están al día con sus actividades</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {familiasAlerta.map((familia) => (
                      <div key={familia.id} className="p-4 bg-gradient-to-r from-orange-50 to-amber-50/30 border border-orange-200/60 rounded-xl hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                              <IconUsers className="text-orange-600" size={18} />
                            </div>
                            <div>
                              <div className="font-semibold text-orange-900">{familia.acudiente}</div>
                              <div className="text-sm text-orange-700/80">
                                {familia.tareasPendientes >= 3 
                                  ? `${familia.tareasPendientes} tareas pendientes` 
                                  : `Hace ${diasSinActividad(familia.ultimaParticipacion)} días sin actividad`
                                }
                              </div>
                              <div className="text-xs text-orange-600/70 mt-1">
                                {familia.estudiantes.length} estudiante(s) en la familia
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              familia.tareasPendientes >= 3 
                                ? 'bg-red-100 text-red-700' 
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {familia.tareasPendientes >= 3 ? 'Urgente' : 'Atención'}
                            </span>
                            <button className="px-4 py-2 bg-white text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100 border border-orange-200 transition-colors flex items-center gap-2">
                              <IconEye size={16} />
                              Ver caso
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Intervenciones Recientes - Nueva funcionalidad */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50/50">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                  <IconClock className="text-blue-500" size={22} />
                  Intervenciones Recientes
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                    Esta semana
                  </span>
                </h2>
              </div>
              <div className="p-6">
                {intervencionesRecientes.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <IconClipboard className="mx-auto text-slate-400 mb-3" size={48} />
                    <p className="font-medium">Sin intervenciones recientes</p>
                    <p className="text-sm mt-1">Las intervenciones aparecerán aquí cuando las realices</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {intervencionesRecientes.map((intervencion) => (
                      <div key={intervencion.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50/30 border border-blue-200/60 rounded-xl hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            intervencion.estado === 'completada' 
                              ? 'bg-green-100' 
                              : 'bg-amber-100'
                          }`}>
                            {intervencion.estado === 'completada' 
                              ? <IconCheckCircle className="text-green-600" size={18} />
                              : <IconClock className="text-amber-600" size={18} />
                            }
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800">{intervencion.estudiante}</div>
                            <div className="text-sm text-slate-600">{intervencion.tipo} - {intervencion.motivo}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              {new Date(intervencion.fecha).toLocaleDateString('es-CO', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            intervencion.estado === 'completada' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {intervencion.estado === 'completada' ? 'Completada' : 'Pendiente'}
                          </span>
                          <button className="px-3 py-1.5 bg-white text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 border border-blue-200 transition-colors">
                            Ver detalles
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Resumen de Cursos Asignados */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-cyan-50/50">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                  <IconBook className="text-teal-500" size={22} />
                  Cursos a mi Cargo
                  <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-semibold">
                    {cursos.length} cursos
                  </span>
                </h2>
              </div>
              <div className="p-6">
                {cursos.length === 0 ? (
                  <div className="text-center py-8">
                    <IconBook className="mx-auto text-slate-400 mb-3" size={48} />
                    <p className="font-medium text-slate-700">No hay cursos asignados</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {institucionInfo 
                        ? `No se encontraron cursos para ${institucionInfo.nombre}. Puede que necesites que te asignen cursos o que no estén configurados correctamente.`
                        : 'No se encontraron cursos para tu institución. Contacta al administrador.'
                      }
                    </p>
                    {institucionInfo && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800">
                          <strong>Verificación:</strong> Asegúrate de que los cursos estén correctamente configurados para tu institución (ID: {institucionInfo.id})
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {cursos.slice(0, 6).map((curso) => {
                        const estudiantesDelCurso = estudiantes.filter(e => 
                          e.cursoId === curso.id || 
                          e.curso_id === curso.id || 
                          e.idCurso === curso.id ||
                          e.curso?.id === curso.id
                        ).length;
                        const tareasDelCurso = tareas.filter(t => 
                          t.cursoId === curso.id || 
                          t.curso_id === curso.id || 
                          t.idCurso === curso.id ||
                          t.curso?.id === curso.id
                        ).length;
                        
                        console.log('[DEBUG][Dashboard] Contando para curso:', {
                          cursoId: curso.id,
                          cursoNombre: curso.nombre,
                          estudiantesDelCurso,
                          tareasDelCurso,
                          muestraEstudiantes: estudiantes.slice(0, 2).map(e => ({
                            id: e.id,
                            nombres: e.nombres,
                            cursoId: e.cursoId,
                            curso_id: e.curso_id,
                            idCurso: e.idCurso,
                            curso: e.curso?.id
                          }))
                        });
                        
                        return (
                          <div key={curso.id} className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-all hover:border-teal-300 cursor-pointer">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-semibold text-slate-800">{curso.nombre}</h3>
                              <IconBook className="text-teal-500" size={16} />
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Estudiantes:</span>
                                <span className="font-medium text-slate-700">{estudiantesDelCurso}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Tareas activas:</span>
                                <span className="font-medium text-slate-700">{tareasDelCurso}</span>
                              </div>
                            </div>
                            <button className="w-full mt-3 px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-100 transition-colors">
                              Ver detalles
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    {cursos.length > 6 && (
                      <div className="mt-4 text-center">
                        <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
                          Ver todos los cursos ({cursos.length - 6} más)
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* Docentes y su desempeño (para coordinador) */}
        {currentRole === 'coordinador' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-violet-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                <IconTeacher className="text-indigo-500" size={22} />
                Actividad de Docentes
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left py-3 px-5 font-semibold text-slate-600 text-sm">Docente</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-600 text-sm">Tareas</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-600 text-sm">Calificadas</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-600 text-sm">Pendientes</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-600 text-sm">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-md">CG</div>
                        <div>
                          <div className="font-medium text-slate-800">Carlos García</div>
                          <div className="text-sm text-slate-500">5° Grado</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4 font-medium text-slate-700">8</td>
                    <td className="text-center py-4 px-4 font-medium text-emerald-600">45</td>
                    <td className="text-center py-4 px-4 font-medium text-amber-600">3</td>
                    <td className="text-center py-4 px-4">
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">Al día</span>
                    </td>
                  </tr>
                  <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">AL</div>
                        <div>
                          <div className="font-medium text-slate-800">Ana López</div>
                          <div className="text-sm text-slate-500">3° Grado</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4 font-medium text-slate-700">6</td>
                    <td className="text-center py-4 px-4 font-medium text-emerald-600">32</td>
                    <td className="text-center py-4 px-4 font-medium text-red-500">8</td>
                    <td className="text-center py-4 px-4">
                      <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">Pendientes</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Resumen institucional (para rector) */}
        {currentRole === 'rector' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-yellow-50/50">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                  <IconAward className="text-amber-500" size={22} />
                  Logros del Período
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-50 to-green-50/30 rounded-xl border border-emerald-200/50">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-md shadow-emerald-200/50">
                    <IconTrendingUp className="text-white" size={22} />
                  </div>
                  <div>
                    <div className="font-semibold text-emerald-800">+15% Participación</div>
                    <div className="text-sm text-emerald-600/80">Respecto al período anterior</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50/30 rounded-xl border border-blue-200/50">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-200/50">
                    <IconBook className="text-white" size={22} />
                  </div>
                  <div>
                    <div className="font-semibold text-blue-800">320 Familias Activas</div>
                    <div className="text-sm text-blue-600/80">Máximo histórico</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-violet-50 to-purple-50/30 rounded-xl border border-violet-200/50">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-md shadow-violet-200/50">
                    <IconHeart className="text-white" size={22} />
                  </div>
                  <div>
                    <div className="font-semibold text-violet-800">4.2 Promedio General</div>
                    <div className="text-sm text-violet-600/80">Calificación de tareas</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-zinc-50/50">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                  <IconCalendar className="text-slate-500" size={22} />
                  Próximos Hitos
                </h2>
              </div>
              <div className="p-6 space-y-3">
                <div className="p-4 border-l-4 border-teal-500 bg-gradient-to-r from-teal-50/50 to-transparent rounded-r-xl">
                  <div className="font-medium text-slate-800">Cierre de Período</div>
                  <div className="text-sm text-slate-500">15 de Diciembre</div>
                </div>
                <div className="p-4 border-l-4 border-blue-500 bg-gradient-to-r from-blue-50/50 to-transparent rounded-r-xl">
                  <div className="font-medium text-slate-800">Reunión de Padres</div>
                  <div className="text-sm text-slate-500">20 de Diciembre</div>
                </div>
                <div className="p-4 border-l-4 border-violet-500 bg-gradient-to-r from-violet-50/50 to-transparent rounded-r-xl">
                  <div className="font-medium text-slate-800">Entrega de Boletines</div>
                  <div className="text-sm text-slate-500">22 de Diciembre</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Entregas recientes (solo para coordinador y rector) */}
        {currentRole !== 'orientador' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-zinc-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                <IconInbox className="text-slate-500" size={22} />
                Actividad Reciente
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {entregas.slice(0, 5).map(entrega => (
                <div key={entrega.id} className="flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      entrega.estado === 'calificada' 
                        ? 'bg-gradient-to-br from-emerald-400 to-green-500' 
                        : 'bg-gradient-to-br from-blue-400 to-indigo-500'
                    } shadow-md`}>
                      {entrega.estado === 'calificada' 
                        ? <IconCheckCircle className="text-white" size={18} /> 
                        : <IconInbox className="text-white" size={18} />}
                    </div>
                    <div>
                      <div className="font-medium text-slate-800">
                        Tarea #{entrega.tareaId} - Estudiante #{entrega.estudianteId}
                      </div>
                      <div className="text-sm text-slate-500">
                        {new Date(entrega.fechaEntrega).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                    entrega.estado === 'calificada' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {entrega.estado === 'calificada' ? `Nota: ${entrega.calificacion}` : 'Por calificar'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
