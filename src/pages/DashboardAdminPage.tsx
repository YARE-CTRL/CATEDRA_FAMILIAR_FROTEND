import { useState, useEffect } from 'react';

import Swal from 'sweetalert2';

import { useLocation } from 'react-router-dom';

import { getSession } from '../api/endpoints';

import { 

  getInstituciones, 

  getCursos, 

  getTareas,

  createInstitucion,

  createInstitucionCompleta,

  updateInstitucion,

  deleteInstitucion,

  getUsuarios,

  createUsuario,

  updateUsuario,

  deleteUsuario,

  crearRector,

  crearCoordinador,

  getPeriodos,

  createPeriodo,

  updatePeriodo,

  deletePeriodo,

  getGrados,

  createGrado,

  updateGrado,

  deleteGrado,

  createCurso,

  updateCurso,

  deleteCurso,

  getDepartamentos,

  getMunicipios,

  crearDocente

} from '../api/endpoints';

import { type Institucion, type Curso, type Tarea, type Usuario, type Periodo, type Grado, type Departamento, type Municipio } from '../mocks/data';

import { departamentosMock, municipiosMock } from '../mocks/data';

import DashboardLayout from '../components/DashboardLayout';

import LoadingSpinner from '../components/ui/LoadingSpinner';

import Modal from '../components/ui/Modal';

import Button from '../components/ui/Button';

import FormFieldInput from '../components/ui/FormFieldInput';

import { exportToExcel, exportToPDF, exportEstadisticasToPDF } from '../utils/exportUtils';

import {

  IconGear,

  IconInstitution,

  IconBook,

  IconUsers,

  IconClipboard,

  IconEdit,

  IconTrash,

  IconCalendar,

  IconPlus,

  IconDownload

} from '../components/ui/Icons';

import { isBypassValidationsEnabled } from '../utils/dev';



export default function DashboardAdminPage() {

  getSession(); // Verificar sesión activa

    // Función para verificar si la institución tiene rector

    // Verifica si existe un usuario con rol 'rector' en la institución

    const tieneRector = (institucionId: number) => {

      return usuarios.some(u => u.rol === 'rector' && u.institucionId === institucionId);

    };

  

  const [loading, setLoading] = useState(true);

  const [instituciones, setInstituciones] = useState<Institucion[]>([]);

  const [cursos, setCursos] = useState<Curso[]>([]);

  const [tareas, setTareas] = useState<Tarea[]>([]);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  const [periodos, setPeriodos] = useState<Periodo[]>([]);

  const [grados, setGrados] = useState<Grado[]>([]);

  const [activeTab, setActiveTab] = useState<'instituciones' | 'usuarios' | 'reportes' | 'configuracion'>('instituciones');

  

  // Estado para institución expandida (ver usuarios)

  const [expandedInstitucion, setExpandedInstitucion] = useState<number | null>(null);

  

  // Estados de filtros por departamento

  const [filtroDepartamentoInst, setFiltroDepartamentoInst] = useState<number | 'todos'>('todos');

  const [filtroDepartamentoUsers, setFiltroDepartamentoUsers] = useState<number | 'todos'>('todos');

  const [filtroRolUsers, setFiltroRolUsers] = useState<string>('todos');

  

  // Estados para reportes globales

  const [tipoReporte, setTipoReporte] = useState<'general' | 'instituciones' | 'usuarios' | 'actividad'>('general');

  const [loadingReport, setLoadingReport] = useState(false);

  

  // Estados de modales

  const [modalInstitucion, setModalInstitucion] = useState(false);

  const [modalInstitucionCompleta, setModalInstitucionCompleta] = useState(false);

  const [modalUsuario, setModalUsuario] = useState(false);

  const [modalPeriodo, setModalPeriodo] = useState(false);

  const [modalGrado, setModalGrado] = useState(false);

  const [modalCurso, setModalCurso] = useState(false);

  

  // Estados para catálogos de instituciones

  const [catalogos, setCatalogos] = useState({

    municipios: [], // Se cargarán desde /api/municipios

    nivelesEducativos: {

      predeterminados: [],

      personalizados: []

    },

    modalidades: [],

    jornadas: [],

    naturaleza: []

  });

  const [nivelesEducativosCombinados, setNivelesEducativosCombinados] = useState([]);

  const [loadingCatalogos, setLoadingCatalogos] = useState(false);

  const [pasoActualFormulario, setPasoActualFormulario] = useState(1);

  

  // Estado para configuración académica

  const [estructuraAcademica, setEstructuraAcademica] = useState({

    nivelesSeleccionados: [],

    gradosGenerados: [],

    cursosPorGrado: {},

    loadingGrados: false,

    loadingCursos: false,

    cursosExistentes: null as any

  });

  

  // Estado para formulario de niveles personalizados

  const [modalNivelEducativo, setModalNivelEducativo] = useState(false);

  const [formNivelEducativo, setFormNivelEducativo] = useState({

    nombre: '',

    descripcion: '',

    abreviatura: '',

    orden: 1,

    institucionId: 1

  });

  

  // Estados de formularios

  const [formInstitucion, setFormInstitucion] = useState({ 

    nombre: '', 

    naturaleza: 'publica' as 'publica' | 'privada',

    municipioId: 1,

    telefono: '',

    correo: '',

    direccion: '',

    codigoDane: '',

    nit: '',

    telefonoPrincipal: '',

    telefonoSecretaria: '',

    correoInstitucional: '',

    correoRectoria: '',

    sitioWeb: '',

    direccionCompleta: '',

    barrio: '',

    estrato: 3,

    coordenadasGps: '',

    capacidadEstudiantes: 0,

    anoFundacion: new Date().getFullYear(),

    enfoquePedagogico: '',

    confesional: false,

    religion: '',

    rectorNombre: '',

    rectorDocumento: '',

    rectorTelefono: '',

    rectorCorreo: '',

    // Nuevos campos del catálogo

    nivelesEducativos: [] as string[],

    modalidad: 'academica' as string,

    jornadas: [] as string[], // ✅ Array en lugar de string

    resolucionAprobacion: '',

    // Campos adicionales del modelo

    nivelesEducativosBackend: [] as unknown[], // Para el campo niveles_educativos del backend

    modalidadBackend: null as string | null, // Para el campo modalidad del backend

    jornadasBackend: [] as string[] // ✅ Array para el backend

  });

  const [formUsuario, setFormUsuario] = useState<{ nombre: string; apellidos: string; correo: string; telefono: string; documento: string; tipoDocumento: string; contrasena: string; rol: 'admin' | 'rector' | 'coordinador' | 'orientador' | 'docente_aula' | 'acudiente'; institucionId: number; telefonoEmergencia?: string; personaEmergencia?: string; direccion?: string; esDirectorGrado?: boolean; gradoAsignado?: string; areaQueOrienta?: string; centroInteres?: string }>({ nombre: '', apellidos: '', correo: '', telefono: '', documento: '', tipoDocumento: 'cc', contrasena: '', rol: 'docente_aula', institucionId: 1, telefonoEmergencia: '', personaEmergencia: '', direccion: '', esDirectorGrado: false, gradoAsignado: '', areaQueOrienta: '', centroInteres: '' });

  const [formPeriodo, setFormPeriodo] = useState<{ nombre: string; fechaInicio: string; fechaFin: string; institucionId: number; anio: number; estado: 'planificado' | 'activo' | 'cerrado' }>({ nombre: '', fechaInicio: '', fechaFin: '', institucionId: 1, anio: new Date().getFullYear(), estado: 'planificado' });

  const [formGrado, setFormGrado] = useState({ nombre: '', orden: 0, institucionId: 1 });

  const [formCurso, setFormCurso] = useState<{ nombre: string; gradoId: number; jornada: 'mañana' | 'tarde' | 'completa'; institucionId: number; docenteDirectorId: number | undefined }>({ nombre: '', gradoId: 1, jornada: 'mañana', institucionId: 1, docenteDirectorId: undefined });

  

  // Estados de edición

  const [editingInstitucion, setEditingInstitucion] = useState<Institucion | null>(null);

  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);

  const [editingPeriodo, setEditingPeriodo] = useState<Periodo | null>(null);

  const [editingGrado, setEditingGrado] = useState<Grado | null>(null);

  const [editingCurso, setEditingCurso] = useState<Curso | null>(null);

  

  // Estados de error y éxito

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);

  const bypassValidations = isBypassValidationsEnabled();

  const location = useLocation();



  // Leer query param ?tab= para seleccionar pestaña desde la URL

  useEffect(() => {

    try {

      const params = new URLSearchParams(location.search);

      const tab = params.get('tab');

      if (tab === 'instituciones' || tab === 'usuarios' || tab === 'reportes' || tab === 'configuracion') {

        setActiveTab(tab as any);

      }

    } catch (e) {

      // ignore

    }

  }, [location.search]);



  useEffect(() => {

    loadData();

  }, []);



  const loadData = async () => {

    setLoading(true);

    try {

      // Solo cargar instituciones que es lo que el backend soporta actualmente

      // Los demás endpoints retornan arrays vacíos porque aún no existen en el backend

      const [institucionesData, cursosData, tareasData, usuariosData, periodosData, gradosData] = await Promise.all([

        getInstituciones(),

        getCursos(),

        getTareas(),

        getUsuarios(),

        getPeriodos(),

        getGrados()

      ]);



      console.log('📊 [DashboardAdminPage] Datos cargados:', {

        instituciones: institucionesData.length,

        cursos: cursosData.length,

        tareas: tareasData.length,

        usuarios: usuariosData.length,

        periodos: periodosData.length,

        grados: gradosData.length

      });

      

      console.log('🏫 [DashboardAdminPage] Instituciones:', institucionesData);



      setInstituciones(Array.isArray(institucionesData) ? institucionesData : []);

      setCursos(Array.isArray(cursosData) ? cursosData : []);

      setTareas(Array.isArray(tareasData) ? tareasData : []);

      setUsuarios(Array.isArray(usuariosData) ? usuariosData : []);

      setPeriodos(Array.isArray(periodosData) ? periodosData : []);

      setGrados(Array.isArray(gradosData) ? gradosData : []);

      

      // Si no hay instituciones, mostrar mensaje

      if (!Array.isArray(institucionesData) || institucionesData.length === 0) {

        console.log('No hay instituciones registradas en el sistema');

      }

    } catch (error) {

      console.error('Error loading data:', error);

      setError('Error al cargar los datos');

    } finally {

      setLoading(false);

    }

  };



  const generateGlobalReport = async () => {

    setLoadingReport(true);

    try {

      if (tipoReporte === 'general') {

        // Generar reporte PDF general

        const estadisticas = {

          'Resumen del Sistema': {

            'Total Instituciones': instituciones.length,

            'Instituciones Activas': instituciones.filter(i => i.activo).length,

            'Total Usuarios': usuarios.length,

            'Usuarios Activos': usuarios.filter(u => u.activo).length,

            'Total Cursos': cursos.length,

            'Total Tareas': tareas.length,

            'Tareas Completadas': tareas.filter(t => t.estado === 'completada').length

          }

        };

        

        exportEstadisticasToPDF(

          estadisticas,

          'Reporte_General_Sistema',

          'Reporte General del Sistema - Cátedra de Familia'

        );

      } else {

        // Generar reportes Excel específicos

        let data: any[] = [];

        let filename = '';

        let sheetName = '';

        

        if (tipoReporte === 'instituciones') {

          data = instituciones.map(inst => ({

            'Código DANE': inst.codigo_dane || '-',

            'Institución': inst.nombre,

            'NIT': inst.nit || '-',

            'Naturaleza': inst.naturaleza,

            'Estado': inst.activo ? 'Activa' : 'Inactiva'

          }));

          filename = 'Reporte_Instituciones_Sistema';

          sheetName = 'Instituciones';

        } else if (tipoReporte === 'usuarios') {

          data = usuarios.map(user => ({

            'Nombre': user.nombre,

            'Apellidos': user.apellidos,

            'Teléfono': user.telefono,

            'Rol': user.rol,

            'Estado': user.activo ? 'Activo' : 'Inactivo'

          }));

          filename = 'Reporte_Usuarios_Sistema';

          sheetName = 'Usuarios';

        }

        

        exportToExcel(data, filename, sheetName);

      }

    } catch (error) {

      console.error('Error generando reporte:', error);

    } finally {

      setLoadingReport(false);

    }

  };



  // ============================================

  // HANDLERS INSTITUCIONES

  // ============================================

  

  const [creatingInstitucion, setCreatingInstitucion] = useState(false);

  

  // Estados para formulario completo

  const [formInstitucionCompleta, setFormInstitucionCompleta] = useState({

    institucion: {

      nombre: '',

      naturaleza: 'privada',

      municipioId: 1,

      codigoDane: '',

      nit: '',

      telefono: '',

      correo: '',

      direccion: '',

      telefonoPrincipal: '',

      telefonoSecretaria: '',

      correoInstitucional: '',

      correoRectoria: '',

      sitioWeb: '',

      direccionCompleta: '',

      barrio: '',

      estrato: 4,

      coordenadasGps: '',

      capacidadEstudiantes: 300,

      anoFundacion: new Date().getFullYear(),

      enfoquePedagogico: '',

      confesional: false,

      religion: '',

      rectorNombre: '',

      rectorDocumento: '',

      rectorTelefono: '',

      rectorCorreo: '',

      rectorContrasena: '',

      jornadas: [] as string[],

      modalidad: 'academica',

      nivelesEducativos: [] as string[]

    },

    grados: [] as Array<{

      nombre: string;

      orden: number;

      cursos: Array<{

        nombre: string;

        jornada: string;

      }>;

    }>

  });

  

  // Función para crear institución completa

  const handleCreateInstitucionCompleta = async () => {

    setCreatingInstitucion(true);

    

    try {

      console.log('🔍 [DEBUG] Enviando formulario completo:', JSON.stringify(formInstitucionCompleta, null, 2));

      

      const result = await createInstitucionCompleta(formInstitucionCompleta);

      

      if (result.success) {

        await Swal.fire({

          icon: 'success',

          title: '¡Institución Creada!',

          text: 'La institución, sus grados y cursos han sido creados exitosamente.',

          confirmButtonText: '¡Perfecto!'

        });

        try {
          const rectorCorreo = (result as any)?.data?.data?.rector?.correo || (result as any)?.data?.rector?.correo;
          const contrasenaUsada = formInstitucionCompleta.institucion.rectorContrasena?.trim() || 'Temp123456';
          if (rectorCorreo) {
            await Swal.fire({
              icon: 'info',
              title: 'Credenciales del Rector',
              html: `<div style="text-align:left">
                <p><b>Correo:</b> ${rectorCorreo}</p>
                <p><b>Contraseña:</b> ${contrasenaUsada}</p>
                <p style="font-size:12px;color:#64748b">Guárdalas y compártelas con el rector. Podrá cambiarla en su primer inicio.</p>
              </div>`,
              confirmButtonText: 'Entendido'
            });
          } else {
            console.warn('⚠️ [DEBUG] No llegó correo de rector en la respuesta. Body:', (result as any)?.data);
          }
        } catch (e) {
          console.warn('⚠️ [DEBUG] No se pudo mostrar alerta de credenciales del rector:', e);
        }

        

        // Resetear formulario

        setFormInstitucionCompleta({

          institucion: {

            nombre: '',

            naturaleza: 'privada',

            municipioId: 1,

            codigoDane: '',

            nit: '',

            telefono: '',

            correo: '',

            direccion: '',

            telefonoPrincipal: '',

            telefonoSecretaria: '',

            correoInstitucional: '',

            correoRectoria: '',

            sitioWeb: '',

            direccionCompleta: '',

            barrio: '',

            estrato: 4,

            coordenadasGps: '',

            capacidadEstudiantes: 300,

            anoFundacion: new Date().getFullYear(),

            enfoquePedagogico: '',

            confesional: false,

            religion: '',

            rectorNombre: '',

            rectorDocumento: '',

            rectorTelefono: '',

            rectorCorreo: '',

            rectorContrasena: '',

            jornadas: [],

            modalidad: 'academica',

            nivelesEducativos: []

          },

          grados: []

        });

        

        // Cargar datos actualizados

        await loadData();

        

      } else {

        await Swal.fire({

          icon: 'error',

          title: 'Error',

          text: result.error || 'No se pudo crear la institución completa',

          confirmButtonText: 'Entendido'

        });

      }

    } catch (error: any) {

      console.error('❌ [ERROR] Error creando institución completa:', error);

      await Swal.fire({

        icon: 'error',

        title: 'Error de Conexión',

        text: 'No se pudo conectar con el servidor',

        confirmButtonText: 'Entendido'

      });

    } finally {

      setCreatingInstitucion(false);

    }

  };

  

  // Funciones para manejar grados y cursos del formulario completo

  const agregarGradoCompleto = () => {

    const nuevoGrado = {

      nombre: '',

      orden: formInstitucionCompleta.grados.length + 1,

      cursos: []

    };

    setFormInstitucionCompleta(prev => ({

      ...prev,

      grados: [...prev.grados, nuevoGrado]

    }));

  };

  

  const eliminarGradoCompleto = (index: number) => {

    setFormInstitucionCompleta(prev => ({

      ...prev,

      grados: prev.grados.filter((_, i) => i !== index)

    }));

  };

  

  const actualizarGradoCompleto = (index: number, campo: string, valor: any) => {

    setFormInstitucionCompleta(prev => ({

      ...prev,

      grados: prev.grados.map((grado, i) => 

        i === index ? { ...grado, [campo]: valor } : grado

      )

    }));

  };

  

  const agregarCursoCompleto = (gradoIndex: number) => {

    const nuevoCurso = {

      nombre: '',

      jornada: 'manana'

    };

    setFormInstitucionCompleta(prev => ({

      ...prev,

      grados: prev.grados.map((grado, i) => 

        i === gradoIndex 

          ? { ...grado, cursos: [...grado.cursos, nuevoCurso] }

          : grado

      )

    }));

  };

  

  const eliminarCursoCompleto = (gradoIndex: number, cursoIndex: number) => {

    setFormInstitucionCompleta(prev => ({

      ...prev,

      grados: prev.grados.map((grado, i) => 

        i === gradoIndex 

          ? { ...grado, cursos: grado.cursos.filter((_, j) => j !== cursoIndex) }

          : grado

      )

    }));

  };

  

  const actualizarCursoCompleto = (gradoIndex: number, cursoIndex: number, campo: string, valor: any) => {

    setFormInstitucionCompleta(prev => ({

      ...prev,

      grados: prev.grados.map((grado, i) => 

        i === gradoIndex 

          ? { 

              ...grado, 

              cursos: grado.cursos.map((curso, j) => 

                j === cursoIndex ? { ...curso, [campo]: valor } : curso

              )

            }

          : grado

      )

    }));

  };

  

  // Función para actualizar datos de la institución

  const actualizarInstitucion = (campo: string, valor: any) => {

    setFormInstitucionCompleta(prev => ({

      ...prev,

      institucion: {

        ...prev.institucion,

        [campo]: valor

      }

    }));

  };

  

  // Función para manejar jornadas

  const toggleJornada = (jornada: string) => {

    setFormInstitucionCompleta(prev => ({

      ...prev,

      institucion: {

        ...prev.institucion,

        jornadas: prev.institucion.jornadas.includes(jornada)

          ? prev.institucion.jornadas.filter(j => j !== jornada)

          : [...prev.institucion.jornadas, jornada]

      }

    }));

  };

  

  // Función para manejar niveles educativos

  const toggleNivelEducativo = (nivel: string) => {

    setFormInstitucionCompleta(prev => ({

      ...prev,

      institucion: {

        ...prev.institucion,

        nivelesEducativos: prev.institucion.nivelesEducativos.includes(nivel)

          ? prev.institucion.nivelesEducativos.filter(n => n !== nivel)

          : [...prev.institucion.nivelesEducativos, nivel]

      }

    }));

  };

  

  // Función para cargar catálogos de instituciones

  const loadCatalogos = async () => {

    setLoadingCatalogos(true);

    try {

      const session = getSession();

      

      // Cargar municipios desde el backend real

      try {

        const municipiosResponse = await fetch(`/api/municipios`, {

          headers: {

            'Authorization': `Bearer ${session?.token}`,

            'Content-Type': 'application/json'

          }

        });

        

        if (municipiosResponse.ok) {

          const result = await municipiosResponse.json();

          console.log('[DEBUG][Catalogos] Municipios response:', result);

          

          // Manejar diferentes estructuras de respuesta

          let municipiosData = [];

          if (result.data) {

            if (Array.isArray(result.data)) {

              municipiosData = result.data;

            } else if (result.data.data && Array.isArray(result.data.data)) {

              municipiosData = result.data.data;

            } else if (result.data.municipios && Array.isArray(result.data.municipios)) {

              municipiosData = result.data.municipios;

            } else {

              console.warn('[DEBUG][Catalogos] Estructura de municipios no reconocida:', result.data);

            }

          }

          

          if (municipiosData.length > 0) {

            console.log('[DEBUG][Catalogos] Municipios cargados desde backend:', municipiosData);

            setCatalogos(prev => ({

              ...prev,

              municipios: municipiosData

            }));

          } else {

            console.warn('[DEBUG][Catalogos] No se encontraron municipios en la respuesta');

            // Usar fallback

            setCatalogos(prev => ({

              ...prev,

              municipios: [

                { id: 1, nombre: "Bogotá D.C." },

                { id: 2, nombre: "Medellín" },

                { id: 3, nombre: "Cali" },

                { id: 4, nombre: "Barranquilla" },

                { id: 5, nombre: "Bucaramanga" }

              ]

            }));

          }

        } else {

          console.warn('[DEBUG][Catalogos] Endpoint /api/municipios no disponible (', municipiosResponse.status, ')');

          // Usar fallback

          setCatalogos(prev => ({

            ...prev,

            municipios: [

              { id: 1, nombre: "Bogotá D.C." },

              { id: 2, nombre: "Medellín" },

              { id: 3, nombre: "Cali" },

              { id: 4, nombre: "Barranquilla" },

              { id: 5, nombre: "Bucaramanga" }

            ]

          }));

        }

      } catch (error) {

        console.error('[DEBUG][Catalogos] Error cargando municipios:', error);

        // Usar fallback

        setCatalogos(prev => ({

          ...prev,

          municipios: [

            { id: 1, nombre: "Bogotá D.C." },

            { id: 2, nombre: "Medellín" },

            { id: 3, nombre: "Cali" },

            { id: 4, nombre: "Barranquilla" },

            { id: 5, nombre: "Bucaramanga" }

          ]

        }));

      }

      

      // Cargar catálogos generales (si existen)

      let catalogosData = null;

      let nivelesData = null;

      

      // Intentar cargar catálogos de instituciones

      try {

        const catalogosResponse = await fetch(`/api/instituciones/catalogos`, {

          headers: {

            'Authorization': `Bearer ${session?.token}`,

            'Content-Type': 'application/json'

          }

        });

        

        if (catalogosResponse.ok) {

          const result = await catalogosResponse.json();

          if (result.success) {

            catalogosData = result.data;

            console.log('[DEBUG][Catalogos] Catálogos cargados:', result.data);

          }

        } else {

          console.warn('[DEBUG][Catalogos] Endpoint /api/instituciones/catalogos no disponible (', catalogosResponse.status, ')');

        }

      } catch (error) {

        console.warn('[DEBUG][Catalogos] Error cargando catálogos:', error);

      }

      

      // Intentar cargar niveles educativos

      try {

        const nivelesResponse = await fetch(`/api/niveles-educativos?institucionId=1`, {

          headers: {

            'Authorization': `Bearer ${session?.token}`,

            'Content-Type': 'application/json'

          }

        });

        

        if (nivelesResponse.ok) {

          const result = await nivelesResponse.json();

          if (result.success) {

            nivelesData = result.data;

            console.log('[DEBUG][Catalogos] Niveles cargados:', result.data);

          }

        } else {

          console.warn('[DEBUG][Catalogos] Endpoint /api/niveles-educativos no disponible (', nivelesResponse.status, ')');

        }

      } catch (error) {

        console.warn('[DEBUG][Catalogos] Error cargando niveles:', error);

      }

      

      // Si tenemos datos del backend, usarlos; si no, usar fallback

      if (catalogosData || nivelesData) {

        setCatalogos({

          municipios: catalogosData?.municipios || municipiosMock.map(m => ({

            id: m.id,

            nombre: m.nombre,

            departamento: {

              id: m.departamento_id,

              nombre: departamentosMock.find(d => d.id === m.departamento_id)?.nombre || ''

            }

          })),

          nivelesEducativos: {

            predeterminados: nivelesData?.predeterminados || [

              { id: 0, nombre: "Preescolar", descripcion: "Transición y jardín", abreviatura: "PRE", orden: 1, esPredeterminado: true },

              { id: 0, nombre: "Primaria", descripcion: "Básica Primaria (1°-5°)", abreviatura: "PRI", orden: 2, esPredeterminado: true },

              { id: 0, nombre: "Secundaria", descripcion: "Básica Secundaria (6°-9°)", abreviatura: "SEC", orden: 3, esPredeterminado: true },

              { id: 0, nombre: "Media Técnica", descripcion: "Educación Media (10°-11°)", abreviatura: "MED", orden: 4, esPredeterminado: true }

            ],

            personalizados: nivelesData?.personalizados || []

          },

          modalidades: catalogosData?.modalidades || [

            { id: "academica", nombre: "Académica" },

            { id: "tecnica", nombre: "Técnica" },

            { id: "artistica", nombre: "Artística" },

            { id: "deportiva", nombre: "Deportiva" },

            { id: "rural", nombre: "Rural" },

            { id: "bilingue", nombre: "Bilingüe" },

            { id: "integral", nombre: "Integral" }

          ],

          jornadas: catalogosData?.jornadas || [

            { id: "manana", nombre: "Mañana" },

            { id: "tarde", nombre: "Tarde" },

            { id: "noche", nombre: "Noche" },

            { id: "unica", nombre: "Única" },

            { id: "completa", nombre: "Completa" },

            { id: "fin_semana", nombre: "Fin de Semana" }

          ],

          naturaleza: catalogosData?.naturaleza || [

            { id: "publica", nombre: "Pública" },

            { id: "privada", nombre: "Privada" }

          ]

        });

        

        // Combinar niveles para mostrar en el formulario

        const predeterminados = nivelesData?.predeterminados || [

          { id: 0, nombre: "Preescolar", descripcion: "Transición y jardín", abreviatura: "PRE", orden: 1, esPredeterminado: true },

          { id: 0, nombre: "Primaria", descripcion: "Básica Primaria (1°-5°)", abreviatura: "PRI", orden: 2, esPredeterminado: true },

          { id: 0, nombre: "Secundaria", descripcion: "Básica Secundaria (6°-9°)", abreviatura: "SEC", orden: 3, esPredeterminado: true },

          { id: 0, nombre: "Media Técnica", descripcion: "Educación Media (10°-11°)", abreviatura: "MED", orden: 4, esPredeterminado: true }

        ];

        const personalizados = nivelesData?.personalizados || [];

        

        const combinados = [

          ...predeterminados.map(n => ({ ...n, tipo: 'predeterminado' })),

          ...personalizados.map(n => ({ ...n, tipo: 'personalizado' }))

        ].sort((a, b) => a.orden - b.orden);

        

        setNivelesEducativosCombinados(combinados);

        

        console.log('[DEBUG][Catalogos] Usando datos combinados:', {

          backend: { catalogos: !!catalogosData, niveles: !!nivelesData },

          combinados: combinados.length

        });

      } else {

        // Fallback completo a datos mock si ningún endpoint funciona

        console.log('[DEBUG][Catalogos] Usando fallback completo - endpoints no disponibles');

        

        const mockNiveles = {

          predeterminados: [

            { id: 0, nombre: "Preescolar", descripcion: "Transición y jardín", abreviatura: "PRE", orden: 1, esPredeterminado: true },

            { id: 0, nombre: "Primaria", descripcion: "Básica Primaria (1°-5°)", abreviatura: "PRI", orden: 2, esPredeterminado: true },

            { id: 0, nombre: "Secundaria", descripcion: "Básica Secundaria (6°-9°)", abreviatura: "SEC", orden: 3, esPredeterminado: true },

            { id: 0, nombre: "Media Técnica", descripcion: "Educación Media (10°-11°)", abreviatura: "MED", orden: 4, esPredeterminado: true }

          ],

          personalizados: []

        };

        

        setCatalogos({

          municipios: municipiosMock.map(m => ({

            id: m.id,

            nombre: m.nombre,

            departamento: {

              id: m.departamento_id,

              nombre: departamentosMock.find(d => d.id === m.departamento_id)?.nombre || ''

            }

          })),

          nivelesEducativos: mockNiveles,

          modalidades: [

            { id: "academica", nombre: "Académica" },

            { id: "tecnica", nombre: "Técnica" },

            { id: "artistica", nombre: "Artística" },

            { id: "deportiva", nombre: "Deportiva" },

            { id: "rural", nombre: "Rural" },

            { id: "bilingue", nombre: "Bilingüe" },

            { id: "integral", nombre: "Integral" }

          ],

          jornadas: [

            { id: "manana", nombre: "Mañana" },

            { id: "tarde", nombre: "Tarde" },

            { id: "noche", nombre: "Noche" },

            { id: "unica", nombre: "Única" },

            { id: "completa", nombre: "Completa" },

            { id: "fin_semana", nombre: "Fin de Semana" }

          ],

          naturaleza: [

            { id: "publica", nombre: "Pública" },

            { id: "privada", nombre: "Privada" }

          ]

        });

        

        const combinados = mockNiveles.predeterminados.map(n => ({ ...n, tipo: 'predeterminado' }));

        setNivelesEducativosCombinados(combinados);

      }

    } catch (error) {

      console.error('[DEBUG][Catalogos] Error general en loadCatalogos:', error);

      

      // Fallback de emergencia

      const mockNiveles = {

        predeterminados: [

          { id: 0, nombre: "Preescolar", descripcion: "Transición y jardín", abreviatura: "PRE", orden: 1, esPredeterminado: true },

          { id: 0, nombre: "Primaria", descripcion: "Básica Primaria (1°-5°)", abreviatura: "PRI", orden: 2, esPredeterminado: true },

          { id: 0, nombre: "Secundaria", descripcion: "Básica Secundaria (6°-9°)", abreviatura: "SEC", orden: 3, esPredeterminado: true },

          { id: 0, nombre: "Media Técnica", descripcion: "Educación Media (10°-11°)", abreviatura: "MED", orden: 4, esPredeterminado: true }

        ],

        personalizados: []

      };

      

      setCatalogos({

        municipios: municipiosMock.map(m => ({

          id: m.id,

          nombre: m.nombre,

          departamento: {

            id: m.departamento_id,

            nombre: departamentosMock.find(d => d.id === m.departamento_id)?.nombre || ''

          }

        })),

        nivelesEducativos: mockNiveles,

        modalidades: [

          { id: "academica", nombre: "Académica" },

          { id: "tecnica", nombre: "Técnica" },

          { id: "artistica", nombre: "Artística" },

          { id: "deportiva", nombre: "Deportiva" },

          { id: "rural", nombre: "Rural" },

          { id: "bilingue", nombre: "Bilingüe" },

          { id: "integral", nombre: "Integral" }

        ],

        jornadas: [

          { id: "manana", nombre: "Mañana" },

          { id: "tarde", nombre: "Tarde" },

          { id: "noche", nombre: "Noche" },

          { id: "unica", nombre: "Única" },

          { id: "completa", nombre: "Completa" },

          { id: "fin_semana", nombre: "Fin de Semana" }

        ],

        naturaleza: [

          { id: "publica", nombre: "Pública" },

          { id: "privada", nombre: "Privada" }

        ]

      });

      

      const combinados = mockNiveles.predeterminados.map(n => ({ ...n, tipo: 'predeterminado' }));

      setNivelesEducativosCombinados(combinados);

    } finally {

      setLoadingCatalogos(false);

    }

  };



  // ============================================

  // HANDLERS NIVELES EDUCATIVOS

  // ============================================

  

  const handleCreateNivelEducativo = async () => {

    try {

      const session = getSession();

      const response = await fetch(`/api/grados`, {

        method: 'POST',

        headers: {

          'Authorization': `Bearer ${session?.token}`,

          'Content-Type': 'application/json'

        },

        body: JSON.stringify({

          institucionId: 1,

          ...formNivelEducativo

        })

      });

      

      const result = await response.json();

      

      if (result.success) {

        // Recargar niveles

        await loadCatalogos();

        setModalNivelEducativo(false);

        setFormNivelEducativo({

          nombre: '',

          descripcion: '',

          abreviatura: '',

          orden: 1,

          institucionId: 1

        });

        console.log('[DEBUG][NivelEducativo] Creado exitosamente:', result.data);

      } else {

        console.error('[DEBUG][NivelEducativo] Error al crear:', result.error);

      }

    } catch (error) {

      console.error('[DEBUG][NivelEducativo] Error:', error);

    }

  };



  const handleOpenCreateNivel = () => {

    setFormNivelEducativo({

      nombre: '',

      descripcion: '',

      abreviatura: '',

      orden: (nivelesEducativosCombinados.length || 0) + 1,

      institucionId: 1

    });

    setModalNivelEducativo(true);

  };



  // ============================================

  // HANDLERS ESTRUCTURA ACADÉMICA

  // ============================================

  

  const generarGradosParaNiveles = async () => {

    setEstructuraAcademica(prev => ({ ...prev, loadingGrados: true }));

    

    try {

      const session = getSession();

      const nivelesIds = formInstitucion.nivelesEducativos || [];

      

      const gradosPromises = nivelesIds.map(async (nivelId) => {

        const response = await fetch(`/api/estructura-academica/generar-grados`, {

          method: 'POST',

          headers: {

            'Authorization': `Bearer ${session?.token}`,

            'Content-Type': 'application/json'

          },

          body: JSON.stringify({

            

            nivelEducativoId: nivelId,

            institucionId: 1 // TODO: Usar ID real cuando se cree la institución

            

          })

          

        });

        console.log("Enviando:", {

  nivelEducativoId: nivelId,

  institucionId: 1

});

        

        const result = await response.json();

        return {

          nivelId,

          nivel: nivelesEducativosCombinados.find(n => (n.id || n.nombre) === nivelId)?.nombre || nivelId,

          grados: result.success ? result.data.gradosCreados : []

        };

      });

      

      const resultados = await Promise.all(gradosPromises);

      

      setEstructuraAcademica(prev => ({

        ...prev,

        gradosGenerados: resultados,

        loadingGrados: false

      }));

      

      console.log('[DEBUG][Estructura] Grados generados:', resultados);

    } catch (error) {

      console.error('[DEBUG][Estructura] Error generando grados:', error);

      setEstructuraAcademica(prev => ({ ...prev, loadingGrados: false }));

    }

  };



  const obtenerSugerenciasCursos = async (gradoId: number) => {

    try {

      const session = getSession();

      const response = await fetch(`/api/estructura-academica/sugerir-cursos/${gradoId}`, {

        headers: {

          'Authorization': `Bearer ${session?.token}`,

          'Content-Type': 'application/json'

        }

      });

      

      const result = await response.json();

      

      if (result.success) {

        setEstructuraAcademica(prev => ({

          ...prev,

          cursosPorGrado: {

            ...prev.cursosPorGrado,

            [gradoId]: {

              sugerencias: result.data.sugerencias,

              seleccionados: result.data.sugerencias.slice(0, 2) // Seleccionar primeros 2 por defecto

            }

          }

        }));

      }

    } catch (error) {

      console.error('[DEBUG][Estructura] Error obteniendo sugerencias:', error);

    }

  };



  // Funciones adicionales para configuración manual

  const generarGradosParaNivel = async (nivelId: string | number) => {

    try {

      const session = getSession();

      const institucionIdReal = session?.user?.institucionId || 1;

      

      // Mapeo de niveles a sus grados correspondientes

      const nivelGradosMap: Record<string, string[]> = {

        'PRE': ['Transición', 'Jardín'], // Preescolar

        'PRI': ['1°', '2°', '3°', '4°', '5°'], // Primaria

        'SEC': ['6°', '7°', '8°', '9°'], // Secundaria  

        'MED': ['10°', '11°'], // Media Técnica

        // También soportar nombres completos

        'Preescolar': ['Transición', 'Jardín'],

        'Primaria': ['1°', '2°', '3°', '4°', '5°'],

        'Secundaria': ['6°', '7°', '8°', '9°'],

        'Media Técnica': ['10°', '11°']

      };

      

      const nivel = nivelesEducativosCombinados.find(n => (n.id || n.nombre) === nivelId);

      const nivelKey = nivel?.abreviatura || nivel?.nombre || String(nivelId);

      const gradosParaGenerar = nivelGradosMap[nivelKey] || [];

      

      console.log('[DEBUG][Estructura] Generando grados para nivel:', {

        nivelId,

        nivelKey,

        nivelNombre: nivel?.nombre,

        abreviatura: nivel?.abreviatura,

        gradosParaGenerar

      });

      

      // Si no hay grados definidos para este nivel, mostrar error

      if (gradosParaGenerar.length === 0) {

        console.error('[ERROR] No hay grados definidos para el nivel:', nivelKey);

        return;

      }

      

      // ✅ GUARDAR GRADOS EN LA BASE DE DATOS

      console.log('[DEBUG][Estructura] Guardando grados en la base de datos...');

      

      const gradosCreadosBD = [];

      

      // Crear cada grado individualmente

      for (const [index, nombreGrado] of gradosParaGenerar.entries()) {

        try {

          const payload = {

            nombre: nombreGrado,

            orden: index + 1,

            institucionId: institucionIdReal

          };

          

          console.log('🔍 [DEBUG] Enviando grado:', payload);

          console.log('🔍 [DEBUG] URL:', `/api/grados`);

          console.log('🔍 [DEBUG] Headers:', {

            'Authorization': `Bearer ${session?.token}`,

            'Content-Type': 'application/json'

          });

          

          const response = await fetch(`/api/grados`, {

            method: 'POST',

            headers: {

              'Authorization': `Bearer ${session?.token}`,

              'Content-Type': 'application/json'

            },

            body: JSON.stringify(payload)

          });

          

          console.log('🔍 [DEBUG] Response status:', response.status);

          console.log('🔍 [DEBUG] Response ok:', response.ok);

          

          const result = await response.json();

          console.log('🔍 [DEBUG] Response body:', result);

          

          if (result.success && result.data) {

            gradosCreadosBD.push({

              id: result.data.id,

              nombre: result.data.nombre,

              orden: result.data.orden

            });

            console.log('[SUCCESS] Grado creado en BD:', result.data);

          } else {

            console.error('[ERROR] Error creando grado:', nombreGrado, result);

            console.error('[ERROR] Mensaje completo:', JSON.stringify(result, null, 2));

          }

        } catch (error) {

          console.error('[ERROR] Error de conexión creando grado:', nombreGrado, error);

          console.error('[ERROR] Error completo:', JSON.stringify(error, null, 2));

          

          // Intentar leer el response si es un error HTTP

          if (error instanceof Error && 'response' in error) {

            try {

              const errorData = await (error as any).response.json();

              console.error('[ERROR] Error response data:', errorData);

            } catch (parseError) {

              console.error('[ERROR] No se pudo parsear el error response');

            }

          }

        }

      }

      

      console.log('[DEBUG][Estructura] Grados creados en BD:', gradosCreadosBD);

      

      // Generar grados localmente con IDs de la BD

      const gradosCreados = gradosCreadosBD.length > 0 ? gradosCreadosBD : gradosParaGenerar.map((nombreGrado, index) => ({

        id: index + 1, // ID temporal si no se crearon en BD

        nombre: nombreGrado,

        orden: index + 1

      }));

      

      const nuevoGrado = {

        nivelId,

        nivel: nivel?.nombre || nivelId,

        grados: gradosCreados

      };

      

      // Actualizar grados generados sin duplicar

      setEstructuraAcademica(prev => ({

        ...prev,

        gradosGenerados: [...prev.gradosGenerados.filter(g => g.nivelId !== nivelId), nuevoGrado]

      }));

      

      console.log('[SUCCESS] Grados generados para nivel:', nivelId, nuevoGrado);

      console.log('[INFO] Grados creados:', gradosCreados.map(g => g.nombre).join(', '));

      

      // Mostrar alerta de éxito

      if (gradosCreadosBD.length > 0) {

        await Swal.fire({

          icon: 'success',

          title: 'Grados Creados',

          text: `Se han creado ${gradosCreadosBD.length} grados en la base de datos`,

          confirmButtonText: '¡Perfecto!'

        });

      }

      

    } catch (error) {

      console.error('[ERROR] Error generando grados para nivel:', nivelId, error);

      await Swal.fire({

        icon: 'error',

        title: 'Error',

        text: 'No se pudieron crear los grados. Revisa la consola para más detalles.',

        confirmButtonText: 'Entendido'

      });

    }

  };



  const agregarCursoSugerido = (gradoId: number) => {

    const current = estructuraAcademica.cursosPorGrado[gradoId];

    if (current) {

      const nuevoCurso = {

        nombre: `${current.seleccionados.length + 1}A`,

        jornada: 'mañana'

      };

      

      setEstructuraAcademica(prev => ({

        ...prev,

        cursosPorGrado: {

          ...prev.cursosPorGrado,

          [gradoId]: {

            ...current,

            seleccionados: [...current.seleccionados, nuevoCurso]

          }

        }

      }));

    }

  };



  const agregarCursoDesdeSugerencia = (gradoId: number, sugerencia: any) => {

    const current = estructuraAcademica.cursosPorGrado[gradoId];

    if (current && !current.seleccionados.some(c => c.nombre === sugerencia.nombre)) {

      setEstructuraAcademica(prev => ({

        ...prev,

        cursosPorGrado: {

          ...prev.cursosPorGrado,

          [gradoId]: {

            ...current,

            seleccionados: [...current.seleccionados, sugerencia]

          }

        }

      }));

    }

  };



  const actualizarNombreCurso = (gradoId: number, cursoIndex: number, nuevoNombre: string) => {

    const current = estructuraAcademica.cursosPorGrado[gradoId];

    if (current) {

      const actualizados = [...current.seleccionados];

      actualizados[cursoIndex] = { ...actualizados[cursoIndex], nombre: nuevoNombre };

      

      setEstructuraAcademica(prev => ({

        ...prev,

        cursosPorGrado: {

          ...prev.cursosPorGrado,

          [gradoId]: {

            ...current,

            seleccionados: actualizados

          }

        }

      }));

    }

  };



  const actualizarJornadaCurso = (gradoId: number, cursoIndex: number, nuevaJornada: string) => {

    const current = estructuraAcademica.cursosPorGrado[gradoId];

    if (current) {

      const actualizados = [...current.seleccionados];

      actualizados[cursoIndex] = { ...actualizados[cursoIndex], jornada: nuevaJornada };

      

      setEstructuraAcademica(prev => ({

        ...prev,

        cursosPorGrado: {

          ...prev.cursosPorGrado,

          [gradoId]: {

            ...current,

            seleccionados: actualizados

          }

        }

      }));

    }

  };



  const eliminarCurso = (gradoId: number, cursoIndex: number) => {

    const current = estructuraAcademica.cursosPorGrado[gradoId];

    if (current) {

      const actualizados = current.seleccionados.filter((_, index) => index !== cursoIndex);

      

      setEstructuraAcademica(prev => ({

        ...prev,

        cursosPorGrado: {

          ...prev.cursosPorGrado,

          [gradoId]: {

            ...current,

            seleccionados: actualizados

          }

        }

      }));

    }

  };



  const cargarCursosExistentes = async () => {

    try {

      const session = getSession();

      const institucionIdReal = session?.user?.institucionId || 1;

      

      console.log('[DEBUG][Estructura] Cargando cursos existentes para institución:', institucionIdReal);

      

      const datos = await cargarCursosPorGrado(institucionIdReal);

      

      if (datos) {

        setEstructuraAcademica(prev => ({

          ...prev,

          cursosExistentes: datos

        }));

        

        console.log('[SUCCESS] Cursos existentes cargados:', datos);

        

        // Mostrar resumen en consola

        console.log('[INFO] Resumen de cursos:', {

          totalGrados: datos.resumen.totalGrados,

          totalCursos: datos.resumen.totalCursos,

          gradosSinCursos: datos.resumen.gradosSinCursos,

          gradosConCursos: datos.resumen.gradosConCursos

        });

      }

    } catch (error) {

      console.error('[ERROR] Error cargando cursos existentes:', error);

    }

  };



  const cargarCursosPorGrado = async (institucionId: number) => {

    try {

      const session = getSession();

      console.log('[DEBUG][Estructura] Cargando cursos por grado para institución:', institucionId);

      

      const response = await fetch(`/api/estructura-academica/cursos-por-grado/${institucionId}`, {

        headers: {

          'Authorization': `Bearer ${session?.token}`,

          'Content-Type': 'application/json'

        }

      });

      

      const result = await response.json();

      

      console.log('[DEBUG][Estructura] Respuesta cursos por grado:', {

        status: response.status,

        success: result.success,

        data: result.data

      });

      

      if (result.success) {

        return result.data;

      } else {

        console.error('[ERROR] Error cargando cursos por grado:', result.message);

        return null;

      }

    } catch (error) {

      console.error('[ERROR] Error de conexión cargando cursos por grado:', error);

      return null;

    }

  };



  const crearCursoParaGrado = async (gradoId: number, nombreCurso: string, jornada: string) => {

    try {

      const session = getSession();

      const institucionIdReal = session?.user?.institucionId || 1;

      

      console.log('[DEBUG][Estructura] Creando curso:', {

        gradoId,

        nombreCurso,

        jornada,

        institucionId: institucionIdReal

      });

      

      const response = await fetch(`/api/estructura-academica/generar-cursos`, {

        method: 'POST',

        headers: {

          'Authorization': `Bearer ${session?.token}`,

          'Content-Type': 'application/json'

        },

        body: JSON.stringify({

          gradoId,

          institucionId: institucionIdReal,

          cursos: [

            { nombre: nombreCurso, jornada }

          ]

        })

      });

      

      const result = await response.json();

      

      console.log('[DEBUG][Estructura] Respuesta creación curso:', {

        status: response.status,

        success: result.success,

        message: result.message,

        data: result.data

      });

      

      if (result.success) {

        console.log('[SUCCESS] Curso creado exitosamente:', nombreCurso);

        // Recargar cursos existentes para actualizar la vista

        await cargarCursosExistentes();

        return true;

      } else {

        console.error('[ERROR] Error creando curso:', result.message);

        return false;

      }

    } catch (error) {

      console.error('[ERROR] Error de conexión creando curso:', error);

      return false;

    }

  };



  const crearCursosParaGrados = async () => {

    setEstructuraAcademica(prev => ({ ...prev, loadingCursos: true }));

    

    try {

      const session = getSession();

      const institucionIdReal = session?.user?.institucionId || 1;

      

      console.log('[DEBUG][Estructura] Creando cursos para todos los grados configurados');

      

      const cursosPromises = Object.entries(estructuraAcademica.cursosPorGrado).map(async ([gradoId, config]) => {

        if (config.seleccionados && config.seleccionados.length > 0) {

          console.log('[DEBUG][Estructura] Creando cursos para grado:', gradoId, config.seleccionados);

          

          const response = await fetch(`/api/estructura-academica/generar-cursos`, {

            method: 'POST',

            headers: {

              'Authorization': `Bearer ${session?.token}`,

              'Content-Type': 'application/json'

            },

            body: JSON.stringify({

              gradoId: parseInt(gradoId),

              institucionId: institucionIdReal,

              cursos: config.seleccionados

            })

          });

          

          const result = await response.json();

          

          console.log('[DEBUG][Estructura] Respuesta creación cursos grado', gradoId, ':', {

            status: response.status,

            success: result.success,

            message: result.message,

            data: result.data,

            errors: result.errors

          });

          

          return result;

        }

        return null;

      });

      

      const resultados = await Promise.all(cursosPromises);

      

      const exitosos = resultados.filter(r => r && r.success).length;

      const fallidos = resultados.filter(r => r && !r.success).length;

      

      console.log('[DEBUG][Estructura] Resultados creación cursos:', {

        total: resultados.length,

        exitosos,

        fallidos,

        resultados

      });

      

      if (exitosos > 0) {

        console.log('[SUCCESS] Cursos creados exitosamente:', exitosos, 'grados');

      }

      

      if (fallidos > 0) {

        console.error('[ERROR] Falló la creación de cursos en', fallidos, 'grados');

      }

      

    } catch (error) {

      console.error('[DEBUG][Estructura] Error creando cursos:', error);

    } finally {

      setEstructuraAcademica(prev => ({ ...prev, loadingCursos: false }));

    }

  };



  const handleCreateInstitucion = async () => {

    console.log('[DEBUG][HandleCreate] Iniciando creación de institución...');

    console.log('[DEBUG][HandleCreate] Formulario actual:', formInstitucion);

    

    setCreatingInstitucion(true);

    setError(null);

    

    // Debug: Verificar el formato exacto antes de enviar

    console.log('[DEBUG][CreateInstitucion] Formulario completo:', formInstitucion);

    console.log('[DEBUG][CreateInstitucion] jornadas en formulario:', formInstitucion.jornadas);

    console.log('[DEBUG][CreateInstitucion] tipo de jornadas:', typeof formInstitucion.jornadas);

    console.log('[DEBUG][CreateInstitucion] es array jornadas:', Array.isArray(formInstitucion.jornadas));

    

    // Debug: Verificar el JSON que se enviará

    const datosParaEnviar = JSON.stringify(formInstitucion, null, 2);

    console.log('[DEBUG][CreateInstitucion] JSON a enviar:', datosParaEnviar);

    

    console.log('[DEBUG][HandleCreate] Llamando a createInstitucion...');

    const result = await createInstitucion(formInstitucion);

    console.log('[DEBUG][HandleCreate] Resultado de createInstitucion:', result);

    

    if (result.success) {

      console.log('[DEBUG][HandleCreate] Institución creada exitosamente, creando cursos...');

      

      // Crear los cursos configurados en el paso 5

      if (estructuraAcademica.cursosPorGrado && Object.keys(estructuraAcademica.cursosPorGrado).length > 0) {

        console.log('[DEBUG][HandleCreate] Hay cursos configurados, creando...');

        await crearCursosParaGrados();

      } else {

        console.log('[DEBUG][HandleCreate] No hay cursos configurados para crear');

      }

      

      await loadData();

      setModalInstitucion(false);

      setFormInstitucion({ 

        nombre: '', 

        naturaleza: 'publica',

        municipioId: 1,

        telefono: '',

        correo: '',

        direccion: '',

        codigoDane: '',

        nit: '',

        telefonoPrincipal: '',

        telefonoSecretaria: '',

        correoInstitucional: '',

        correoRectoria: '',

        sitioWeb: '',

        direccionCompleta: '',

        barrio: '',

        estrato: 3,

        coordenadasGps: '',

        capacidadEstudiantes: 0,

        anoFundacion: new Date().getFullYear(),

        enfoquePedagogico: '',

        confesional: false,

        religion: '',

        rectorNombre: '',

        rectorDocumento: '',

        rectorTelefono: '',

        rectorCorreo: '',

        // Nuevos campos del catálogo

        nivelesEducativos: [] as string[],

        modalidad: 'academica' as string,

        jornadas: [] as string[],

        resolucionAprobacion: '',

        // Campos adicionales del modelo

        nivelesEducativosBackend: [] as unknown[],

        modalidadBackend: null as string | null,

        jornadasBackend: [] as string[]

      });

      setSuccess('Institución creada exitosamente');

    } else {

      setError(result.error || 'Error al crear institución');

    }

    

    setCreatingInstitucion(false);

  };

    



  const handleUpdateInstitucion = async () => {

    if (!editingInstitucion) return;

    setError(null);

    

    const result = await updateInstitucion(editingInstitucion.id, formInstitucion);

    

    if (result.success) {

      await loadData();

      setModalInstitucion(false);

      setEditingInstitucion(null);

      setFormInstitucion({ 

        nombre: '', 

        codigo_dane: '',

        nit: '',

        naturaleza: 'publica',

        municipio_id: 1,

        telefono_principal: '',

        correo_institucional: '',

        direccion_completa: '',

        rector_nombre: '',

        rector_documento: '',

        rector_telefono: ''

      });

    } else {

      setError(result.error || 'Error al actualizar institución');

    }

  };



  const handleDeleteInstitucion = async (id: number) => {

    if (!confirm('¿Está seguro de eliminar esta institución?')) return;

    

    const result = await deleteInstitucion(id);

    if (result.success) {

      await loadData();

    } else {

      setError(result.error || 'Error al eliminar institución');

    }

  };



  // Funciones para manejar el formulario paso a paso

  const siguientePaso = () => {

    if (pasoActualFormulario < 5) {

      const nuevoPaso = pasoActualFormulario + 1;

      setPasoActualFormulario(nuevoPaso);

      

      // Si llegamos al paso 5, cargar cursos existentes

      if (nuevoPaso === 5) {

        console.log('[DEBUG] Llegando al paso 5, cargando cursos existentes...');

        cargarCursosExistentes();

      }

    }

  };



  const pasoAnterior = () => {

    if (pasoActualFormulario > 1) {

      setPasoActualFormulario(pasoActualFormulario - 1);

    }

  };



  const irAPaso = (paso: number) => {

    if (paso >= 1 && paso <= 5) {

      setPasoActualFormulario(paso);

      

      // Si vamos al paso 5, cargar cursos existentes

      if (paso === 5) {

        console.log('[DEBUG] Navegando al paso 5, cargando cursos existentes...');

        cargarCursosExistentes();

      }

    }

  };



  const openEditInstitucion = (inst: Institucion) => {

    setEditingInstitucion(inst);

    setFormInstitucion({

      nombre: inst.nombre,

      codigo_dane: inst.codigo_dane || '',

      nit: inst.nit || '',

      naturaleza: inst.naturaleza,

      municipio_id: inst.municipio_id,

      telefono_principal: inst.telefono_principal,

      correo_institucional: inst.correo_institucional,

      direccion_completa: inst.direccion_completa || '',

      rector_nombre: inst.rector_nombre || '',

      rector_documento: inst.rector_documento || '',

      rector_telefono: inst.rector_telefono || ''

    });

    setModalInstitucion(true);

  };



  // ============================================

  // HANDLERS USUARIOS

  // ============================================

  

  const handleCreateUsuario = async () => {

    setError(null);

    

    // Validar jerarquía institucional antes de crear roles dependientes

    if (["coordinador", "orientador", "docente_aula", "acudiente"].includes(formUsuario.rol)) {

      if (!tieneRector(formUsuario.institucionId)) {

        setError("Debe crear primero un rector para la institución antes de asignar coordinadores, orientadores, docentes o acudientes.");

        return;

      }

    }

    // Si es rector o coordinador, usar los endpoints específicos del backend

    if (formUsuario.rol === 'rector') {

      // Validar campos requeridos para rector

      if (!formUsuario.nombre || !formUsuario.apellidos || !formUsuario.correo || !formUsuario.telefono || !formUsuario.contrasena || !formUsuario.institucionId) {

        setError('Todos los campos son requeridos para crear un rector');

        return;

      }

      

      // Validar teléfono (10 dígitos)

      const telefonoLimpio = formUsuario.telefono.replace(/\D/g, '');

      if (telefonoLimpio.length !== 10) {

        setError('El teléfono debe tener exactamente 10 dígitos');

        return;

      }

      

      // Validar email

        // Debug: mostrar usuario en sesión y rol

        const session = getSession();

        console.log('[DEBUG][handleCreateUsuario] Usuario en sesión:', session);

        if (session && session.user) {

          console.log('[DEBUG][handleCreateUsuario] RolId:', session.user.rolId, 'Rol:', session.user.rol);

        }

      if (!formUsuario.correo.includes('@') || !formUsuario.correo.includes('.')) {

        setError('El correo electrónico no es válido');

        return;

      }

      

      // Validar contraseña

      if (formUsuario.contrasena.length < 8) {

        setError('La contraseña debe tener al menos 8 caracteres');

        return;

      }

      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(formUsuario.contrasena)) {

        setError('La contraseña debe tener al menos: 1 minúscula, 1 mayúscula, 1 número y 1 carácter especial (!@#$%^&*)');

        return;

      }

      

      console.log('Creando rector con datos:', {

        correo: formUsuario.correo,

        nombre: formUsuario.nombre,

        apellido: formUsuario.apellidos,

        telefono: telefonoLimpio,

        institucionId: formUsuario.institucionId

      });

      

      const result = await crearRector({

        correo: formUsuario.correo,

        contrasena: formUsuario.contrasena,

        nombre: formUsuario.nombre,

        apellido: formUsuario.apellidos,

        telefono: telefonoLimpio,

        institucionId: formUsuario.institucionId

      });

      

      console.log('Resultado crear rector:', result);

      

      if (result.success) {

        await loadData();

        setModalUsuario(false);

        setFormUsuario({ nombre: '', apellidos: '', correo: '', telefono: '', documento: '', tipoDocumento: 'cc', contrasena: '', rol: 'docente_aula', institucionId: 1, telefonoEmergencia: '', personaEmergencia: '', direccion: '', esDirectorGrado: false, gradoAsignado: '', areaQueOrienta: '', centroInteres: '' });

        alert(`Rector creado exitosamente. Contraseña asignada: ${formUsuario.contrasena} (debe cambiarla en el primer inicio de sesión)`);

      } else {

        setError(result.error || 'Error al crear rector');

      }

      return;

    }

    

    if (formUsuario.rol === 'coordinador') {

      // Validar campos requeridos para coordinador

      if (!formUsuario.nombre || !formUsuario.apellidos || !formUsuario.correo || !formUsuario.telefono || !formUsuario.contrasena || !formUsuario.institucionId) {

        setError('Todos los campos son requeridos para crear un coordinador');

        return;

      }

      

      // Validar teléfono (10 dígitos)

      const telefonoLimpio = formUsuario.telefono.replace(/\D/g, '');

      if (telefonoLimpio.length !== 10) {

        setError('El teléfono debe tener exactamente 10 dígitos');

        return;

      }

      

      // Validar email

      if (!formUsuario.correo.includes('@') || !formUsuario.correo.includes('.')) {

        setError('El correo electrónico no es válido');

        return;

      }

      

      // Validar contraseña

      if (formUsuario.contrasena.length < 8) {

        setError('La contraseña debe tener al menos 8 caracteres');

        return;

      }

      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(formUsuario.contrasena)) {

        setError('La contraseña debe tener al menos: 1 minúscula, 1 mayúscula, 1 número y 1 carácter especial (!@#$%^&*)');

        return;

      }

      

      console.log('Creando coordinador con datos:', {

        correo: formUsuario.correo,

        nombre: formUsuario.nombre,

        apellido: formUsuario.apellidos,

        telefono: telefonoLimpio,

        institucionId: formUsuario.institucionId

      });

      

      const result = await crearCoordinador({

        correo: formUsuario.correo,

        contrasena: formUsuario.contrasena,

        nombre: formUsuario.nombre,

        apellido: formUsuario.apellidos,

        telefono: telefonoLimpio,

        institucionId: formUsuario.institucionId

      });

      

      console.log('[DEBUG][handleCreateUsuario] Resultado crear coordinador:', result);

      if (result && typeof result === 'object') {

        console.log('[DEBUG][handleCreateUsuario] Detalle resultado:', JSON.stringify(result, null, 2));

      }

      

      if (result.success) {

        await loadData();

        setModalUsuario(false);

        setFormUsuario({ nombre: '', apellidos: '', correo: '', telefono: '', documento: '', tipoDocumento: 'cc', contrasena: '', rol: 'docente_aula', institucionId: 1 });

        alert(`Coordinador creado exitosamente. Contraseña asignada: ${formUsuario.contrasena} (debe cambiarla en el primer inicio de sesión)`);

      } else {

        setError(result.error || 'Error al crear coordinador');

      }

      return;

    }

    

    // Crear Docente de Aula con contrato extendido del backend

    if (formUsuario.rol === 'docente_aula') {

      if (!formUsuario.nombre || !formUsuario.apellidos || !formUsuario.correo || !formUsuario.documento || !formUsuario.institucionId) {

        setError('Nombre, apellidos, correo, documento e institución son obligatorios para crear un docente');

        return;

      }

      const payload: any = {

        correo: formUsuario.correo,

        telefono: formUsuario.telefono || undefined,

        numeroDocumento: formUsuario.documento,

        contrasena: formUsuario.contrasena || undefined,

        nombres: formUsuario.nombre,

        apellidos: formUsuario.apellidos,

        tipoDocumento: (formUsuario.tipoDocumento || 'cc').toUpperCase(),

        telefonoEmergencia: formUsuario.telefonoEmergencia || undefined,

        personaEmergencia: formUsuario.personaEmergencia || undefined,

        direccion: formUsuario.direccion || undefined,

        esDirectorGrado: formUsuario.esDirectorGrado || undefined,

        gradoAsignado: formUsuario.gradoAsignado || undefined,

        areaQueOrienta: formUsuario.areaQueOrienta || undefined,

        centroInteres: formUsuario.centroInteres || undefined,

        institucionId: Number(formUsuario.institucionId),

      };

      const result = await crearDocente(payload);

      if (result.success) {

        await loadData();

        setModalUsuario(false);

        setFormUsuario({ nombre: '', apellidos: '', correo: '', telefono: '', documento: '', tipoDocumento: 'cc', contrasena: '', rol: 'docente_aula', institucionId: 1, telefonoEmergencia: '', personaEmergencia: '', direccion: '', esDirectorGrado: false, gradoAsignado: '', areaQueOrienta: '', centroInteres: '' });

        setSuccess('Docente creado correctamente');

      } else {

        setError(result.error || 'Error al crear docente');

      }

      return;

    }



    // Para otros roles, usar createUsuario genérico (solo funcionará con mock por ahora)

    const result = await createUsuario(formUsuario);

    

    if (result.success) {

      await loadData();

      setModalUsuario(false);

      setFormUsuario({ nombre: '', apellidos: '', correo: '', telefono: '', documento: '', tipoDocumento: 'cc', contrasena: '', rol: 'docente_aula', institucionId: 1 });

    } else {

      setError(result.error || 'Error al crear usuario');

    }

  };



  const handleUpdateUsuario = async () => {

    if (!editingUsuario) return;

    setError(null);

    

    // Solo enviar campos que tienen valor (actualización parcial)

    const dataToUpdate: Record<string, any> = {};

    if (formUsuario.nombre) dataToUpdate.nombre = formUsuario.nombre;

    if (formUsuario.apellidos) dataToUpdate.apellido = formUsuario.apellidos; // Backend usa 'apellido'

    if (formUsuario.telefono) dataToUpdate.telefono = formUsuario.telefono;

    if (formUsuario.correo) dataToUpdate.correo = formUsuario.correo;

    // Permitir cambiar institución y rol

    if (typeof formUsuario.institucionId === 'number' && formUsuario.institucionId > 0) {

      dataToUpdate.institucionId = formUsuario.institucionId;

    }

    if (formUsuario.rol) {

      dataToUpdate.rol = formUsuario.rol;

    }

    

    const result = await updateUsuario(editingUsuario.id, dataToUpdate);

    

    if (result.success) {

      await Swal.fire({

        icon: 'success',

        title: 'Usuario actualizado',

        text: 'Los cambios se guardaron correctamente.',

        confirmButtonText: 'OK',

        confirmButtonColor: '#14b8a6'

      });

      await loadData();

      setModalUsuario(false);

      setEditingUsuario(null);

      setFormUsuario({ nombre: '', apellidos: '', correo: '', telefono: '', documento: '', tipoDocumento: 'cc', contrasena: '', rol: 'docente_aula', institucionId: 1 });

    } else {

      const msg = result.error || 'Error al actualizar usuario';

      setError(msg);

      await Swal.fire({

        icon: 'error',

        title: 'No se pudo actualizar',

        text: msg,

        confirmButtonText: 'Entendido',

        confirmButtonColor: '#ef4444'

      });

    }

  };



  const handleDeleteUsuario = async (id: number) => {

    if (!confirm('¿Está seguro de eliminar este usuario permanentemente?')) {

      return;

    }

    

    const result = await deleteUsuario(id);

    

    if (result.success) {

      await loadData();

      alert('Usuario eliminado correctamente');

    } else {

      // Mostrar error claro al usuario

      const errorMsg = result.error || 'Error al eliminar usuario';

      alert(errorMsg);

      setError(errorMsg);

    }

  };



  const openEditUsuario = (user: Usuario) => {

    setEditingUsuario(user);

    setFormUsuario({

      nombre: user.nombre,

      apellidos: user.apellidos || '',

      correo: user.correo || '',

      telefono: user.telefono || '',

      documento: user.documento || '',

      tipoDocumento: user.tipoDocumento || 'cc',

      // @ts-ignore

      rol: user.rol,

      institucionId: user.institucionId || 1

    });

    setModalUsuario(true);

  };



  // ============================================

  // HANDLERS PERIODOS

  // ============================================

  

  const handleCreatePeriodo = async () => {

    setError(null);

    const result = await createPeriodo(formPeriodo);

    

    if (result.success) {

      await loadData();

      setModalPeriodo(false);

      setFormPeriodo({ nombre: '', fechaInicio: '', fechaFin: '', institucionId: 1, anio: new Date().getFullYear(), estado: 'planificado' });

    } else {

      setError(result.error || 'Error al crear período');

    }

  };



  const handleUpdatePeriodo = async () => {

    if (!editingPeriodo) return;

    setError(null);

    

    const result = await updatePeriodo(editingPeriodo.id, formPeriodo);

    

    if (result.success) {

      await loadData();

      setModalPeriodo(false);

      setEditingPeriodo(null);

      setFormPeriodo({ nombre: '', fechaInicio: '', fechaFin: '', institucionId: 1, anio: new Date().getFullYear(), estado: 'planificado' });

    } else {

      setError(result.error || 'Error al actualizar período');

    }

  };



  const handleDeletePeriodo = async (id: number) => {

    if (!confirm('¿Está seguro de eliminar este período?')) return;

    

    const result = await deletePeriodo(id);

    if (result.success) {

      await loadData();

    } else {

      setError(result.error || 'Error al eliminar período');

    }

  };



  const openEditPeriodo = (periodo: Periodo) => {

    setEditingPeriodo(periodo);

    setFormPeriodo({

      nombre: periodo.nombre,

      fechaInicio: periodo.fechaInicio,

      fechaFin: periodo.fechaFin,

      institucionId: periodo.institucionId,

      anio: periodo.anio,

      estado: periodo.estado

    });

    setModalPeriodo(true);

  };



  // ============================================

  // HANDLERS GRADOS

  // ============================================

  

  const handleCreateGrado = async () => {

    setError(null);

    setSuccess(null);

    

    const result = await createGrado(formGrado);

    

    if (result.success) {

      setSuccess('Grado creado exitosamente');

      setModalGrado(false);

      setFormGrado({ nombre: '', orden: 0, institucionId: 1 });

      // Recargar datos inmediatamente

      await loadData();

      // Limpiar mensaje de éxito después de 3 segundos

      setTimeout(() => setSuccess(null), 3000);

    } else {

      setError(result.error || 'Error al crear grado');

    }

  };



  const handleUpdateGrado = async () => {

    if (!editingGrado) return;

    setError(null);

    setSuccess(null);

    

    const result = await updateGrado(editingGrado.id, formGrado);

    

    if (result.success) {

      setSuccess('Grado actualizado exitosamente');

      setModalGrado(false);

      setEditingGrado(null);

      setFormGrado({ nombre: '', orden: 0, institucionId: 1 });

      // Recargar datos inmediatamente

      await loadData();

      // Limpiar mensaje de éxito después de 3 segundos

      setTimeout(() => setSuccess(null), 3000);

    } else {

      setError(result.error || 'Error al actualizar grado');

    }

  };



  const handleDeleteGrado = async (id: number) => {

    if (!confirm('¿Está seguro de eliminar este grado?')) return;

    

    setError(null);

    setSuccess(null);

    

    const result = await deleteGrado(id);

    if (result.success) {

      setSuccess('Grado eliminado exitosamente');

      // Recargar datos inmediatamente

      await loadData();

      // Limpiar mensaje de éxito después de 3 segundos

      setTimeout(() => setSuccess(null), 3000);

    } else {

      setError(result.error || 'Error al eliminar grado');

    }

  };



  const openEditGrado = (grado: Grado) => {

    setEditingGrado(grado);

    setFormGrado({

      nombre: grado.nombre,

      orden: grado.orden,

      institucionId: grado.institucionId

    });

    setModalGrado(true);

  };



  // ============================================

  // HANDLERS CURSOS

  // ============================================

  

  const handleCreateCurso = async () => {

    setError(null);

    const result = await createCurso(formCurso);

    

    if (result.success) {

      await loadData();

      setModalCurso(false);

      setFormCurso({ nombre: '', gradoId: 1, jornada: 'mañana', institucionId: 1, docenteDirectorId: undefined });

    } else {

      setError(result.error || 'Error al crear curso');

    }

  };



  const handleUpdateCurso = async () => {

    if (!editingCurso) return;

    setError(null);

    

    const result = await updateCurso(editingCurso.id, formCurso);

    

    if (result.success) {

      await loadData();

      setModalCurso(false);

      setEditingCurso(null);

      setFormCurso({ nombre: '', gradoId: 1, jornada: 'mañana', institucionId: 1, docenteDirectorId: undefined });

    } else {

      setError(result.error || 'Error al actualizar curso');

    }

  };



  const handleDeleteCurso = async (id: number) => {

    if (!confirm('¿Está seguro de eliminar este curso?')) return;

    

    const result = await deleteCurso(id);

    if (result.success) {

      await loadData();

    } else {

      setError(result.error || 'Error al eliminar curso');

    }

  };



  const openEditCurso = (curso: Curso) => {

    setEditingCurso(curso);

    setFormCurso({

      nombre: curso.nombre,

      gradoId: curso.gradoId,

      jornada: curso.jornada,

      institucionId: curso.institucionId,

      docenteDirectorId: curso.docenteDirectorId

    });

    setModalCurso(true);

  };



  // Helper para obtener usuarios de una institución

  const getUsuariosInstitucion = (institucionId: number) => {

    return usuarios.filter(u => u.institucionId === institucionId);

  };



  // Helper para obtener el rector de una institución

  const getRectorInstitucion = (institucionId: number) => {

    return usuarios.find(u => u.institucionId === institucionId && u.rol === 'rector');

  };



  // Helper para obtener coordinadores de una institución

  const getCoordinadoresInstitucion = (institucionId: number) => {

    return usuarios.filter(u => u.institucionId === institucionId && u.rol === 'coordinador');

  };



  // Helper para obtener orientadores de una institución

  const getOrientadoresInstitucion = (institucionId: number) => {

    return usuarios.filter(u => u.institucionId === institucionId && u.rol === 'orientador');

  };



  // Helper para obtener docentes de una institución

  const getDocentesInstitucion = (institucionId: number) => {

    return usuarios.filter(u => u.institucionId === institucionId && u.rol === 'docente_aula');

  };



  // Helper para obtener departamento de una institución

  const getDepartamentoInstitucion = (inst: Institucion) => {

    const municipio = municipiosMock.find(m => m.id === inst.municipio_id);

    return municipio ? departamentosMock.find(d => d.id === municipio.departamento_id) : null;

  };



  // Filtrar instituciones por departamento

  const institucionesFiltradas = filtroDepartamentoInst === 'todos' 

    ? instituciones 

    : instituciones.filter(inst => {

        const depto = getDepartamentoInstitucion(inst);

        return depto?.id === filtroDepartamentoInst;

      });



  // Filtrar usuarios por departamento y rol

  const usuariosFiltrados = usuarios.filter(user => {

    // Filtro por rol

    if (filtroRolUsers !== 'todos' && user.rol !== filtroRolUsers) return false;

    

    // Filtro por departamento

    if (filtroDepartamentoUsers !== 'todos') {

      const inst = instituciones.find(i => i.id === user.institucionId);

      if (!inst) return false;

      const depto = getDepartamentoInstitucion(inst);

      if (!depto || depto.id !== filtroDepartamentoUsers) return false;

    }

    

    return true;

  });



  // Obtener departamentos únicos que tienen instituciones

  const departamentosConInstituciones = [...new Set(

    instituciones

      .map(inst => getDepartamentoInstitucion(inst))

      .filter(Boolean)

      .map(d => d!.id)

  )].map(id => departamentosMock.find(d => d.id === id)!).filter(Boolean);



  if (loading) {

    return (

      <DashboardLayout>

        <div className="flex flex-col items-center justify-center h-64 gap-4">

          <LoadingSpinner size="lg" />

          <p className="text-slate-500 animate-pulse">Cargando panel administrativo...</p>

        </div>

      </DashboardLayout>

    );

  }



  // Calcular estadísticas reales

  const totalUsuarios = usuarios.length;

  const usuariosActivos = usuarios.filter(u => u.activo).length;

  const totalDocentes = usuarios.filter(u => u.rol === 'docente_aula').length;

  const totalRectores = usuarios.filter(u => u.rol === 'rector').length;



  return (

    <DashboardLayout>

      {error && (

        <div style={{background:'#ffe0e0',color:'#b00',padding:'8px',borderRadius:'4px',margin:'8px 0',fontWeight:'bold'}}>

          {error}

        </div>

      )}

      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header con diseño distintivo */}

        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 text-white shadow-xl">

          {/* Decorative elements */}

          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-teal-500/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/3" />

          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-violet-500/15 to-transparent rounded-full translate-y-1/2 -translate-x-1/3" />

          <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-gradient-to-tr from-emerald-500/10 to-transparent rounded-full -translate-x-1/2 -translate-y-1/2" />

          

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">

            <div className="flex items-center gap-5">

              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/40 ring-4 ring-white/10">

                <IconGear className="text-white" size={32} />

              </div>

              <div>

                <p className="text-teal-400 text-sm font-semibold uppercase tracking-wider mb-1">

                  Sistema Cátedra de Familia

                </p>

                <h1 className="text-2xl md:text-3xl font-display font-bold">

                  Panel de Administración

                </h1>

                <p className="text-slate-400 mt-1">

                  Gestión integral de instituciones, usuarios y configuración

                </p>

              </div>

            </div>

          </div>

        </div>

            

        {/* Stats globales mejorados */}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          <div className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border border-slate-100 hover:border-teal-300 cursor-pointer" onClick={() => setActiveTab('instituciones')}>

            <div className="flex items-start justify-between mb-4">

              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-200/50 group-hover:scale-110 transition-transform">

                <IconInstitution className="text-white" size={22} />

              </div>

              <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-2 py-1 rounded-full">

                {instituciones.filter(i => i.activo).length} activas

              </span>

            </div>

            <div className="text-3xl font-bold text-slate-800 mb-1">{instituciones.length}</div>

            <div className="text-sm text-slate-500 font-medium">Instituciones Educativas</div>

          </div>

          

          <div className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border border-slate-100 hover:border-blue-300 cursor-pointer" onClick={() => setActiveTab('usuarios')}>

            <div className="flex items-start justify-between mb-4">

              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200/50 group-hover:scale-110 transition-transform">

                <IconUsers className="text-white" size={22} />

              </div>

              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">

                {usuariosActivos} activos

              </span>

            </div>

            <div className="text-3xl font-bold text-slate-800 mb-1">{totalUsuarios}</div>

            <div className="text-sm text-slate-500 font-medium">Usuarios Registrados</div>

          </div>

          

          <div className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border border-slate-100 hover:border-emerald-300">

            <div className="flex items-start justify-between mb-4">

              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-200/50 group-hover:scale-110 transition-transform">

                <IconBook className="text-white" size={22} />

              </div>

              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">

                {totalDocentes} docentes

              </span>

            </div>

            <div className="text-3xl font-bold text-slate-800 mb-1">{cursos.length}</div>

            <div className="text-sm text-slate-500 font-medium">Cursos Activos</div>

          </div>

          

          <div className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border border-slate-100 hover:border-violet-300">

            <div className="flex items-start justify-between mb-4">

              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200/50 group-hover:scale-110 transition-transform">

                <IconClipboard className="text-white" size={22} />

              </div>

              <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-1 rounded-full">

                {totalRectores} rectores

              </span>

            </div>

            <div className="text-3xl font-bold text-slate-800 mb-1">{tareas.length}</div>

            <div className="text-sm text-slate-500 font-medium">Tareas del Sistema</div>

          </div>

        </div>



        {/* Tabs */}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

          <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">

            <nav className="flex gap-1 p-2 overflow-x-auto">

              {[

                { id: 'instituciones', label: 'Instituciones', Icon: IconInstitution, count: instituciones.length },

                { id: 'usuarios', label: 'Usuarios', Icon: IconUsers, count: usuarios.length },

                { id: 'reportes', label: 'Reportes', Icon: IconDownload },

                { id: 'configuracion', label: 'Configuración', Icon: IconGear },

              ].map(tab => (

                <button

                  key={tab.id}

                  onClick={() => setActiveTab(tab.id as typeof activeTab)}

                  className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-medium transition-all duration-200 whitespace-nowrap ${

                    activeTab === tab.id

                      ? 'bg-teal-600 text-white shadow-md shadow-teal-200'

                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'

                  }`}

                >

                  <tab.Icon size={18} />

                  {tab.label}

                  {tab.count !== undefined && (

                    <span className={`text-xs px-2 py-0.5 rounded-full ${

                      activeTab === tab.id 

                        ? 'bg-white/20 text-white' 

                        : 'bg-slate-200 text-slate-600'

                    }`}>

                      {tab.count}

                    </span>

                  )}

                </button>

              ))}

            </nav>

          </div>



          <div className="p-6">

            {/* Mensaje de error global */}

            {error && (

              <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-shake">

                <div className="flex-shrink-0 mt-0.5">

                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">

                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />

                  </svg>

                </div>

                <div className="flex-1">

                  <p className="text-sm font-medium text-red-800">{error}</p>

                </div>

                <button onClick={() => setError(null)} className="flex-shrink-0 text-red-400 hover:text-red-600">

                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">

                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />

                  </svg>

                </button>

              </div>

            )}



            {/* Mensaje de éxito global */}

            {success && (

              <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">

                <div className="flex-shrink-0 mt-0.5">

                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">

                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />

                  </svg>

                </div>

                <div className="flex-1">

                  <p className="text-sm font-medium text-green-800">{success}</p>

                </div>

                <button onClick={() => setSuccess(null)} className="flex-shrink-0 text-green-400 hover:text-green-600">

                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">

                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />

                  </svg>

                </button>

              </div>

            )}



            {/* Tab: Instituciones */}

            {activeTab === 'instituciones' && (

              <div className="space-y-5">

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                  <div>

                    <h3 className="text-xl font-bold text-slate-800">Instituciones Registradas</h3>

                    <p className="text-sm text-slate-500 mt-1">Gestiona las instituciones educativas del sistema</p>

                  </div>

                  <div className="flex gap-3 flex-wrap">

                    <select 

                      value={filtroDepartamentoInst === 'todos' ? 'todos' : filtroDepartamentoInst}

                      onChange={(e) => setFiltroDepartamentoInst(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}

                      className="px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all shadow-sm min-w-[180px]"

                    >

                      <option value="todos">Todos los departamentos</option>

                      {departamentosMock.map(depto => (

                        <option key={depto.id} value={depto.id}>{depto.nombre}</option>

                      ))}

                    </select>

                                        <Button 

                      onClick={async () => {

                        if (catalogos.municipios.length === 0) {

                          await loadCatalogos();

                        }

                        setModalInstitucionCompleta(true);

                      }}

                      variant="outline"

                      className="flex items-center gap-2 shadow-md border-teal-600 text-teal-600 hover:bg-teal-50"

                    >

                      <IconPlus size={16} />

                      Institución Completa

                    </Button>

                  </div>

                </div>

                

                {/* Indicador de filtro activo */}

                {filtroDepartamentoInst !== 'todos' && (

                  <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 border border-teal-200 rounded-xl">

                    <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />

                    </svg>

                    <span className="text-sm text-teal-700 font-medium">

                      Mostrando {institucionesFiltradas.length} {institucionesFiltradas.length === 1 ? 'institución' : 'instituciones'} de {departamentosMock.find(d => d.id === filtroDepartamentoInst)?.nombre}

                    </span>

                    <button 

                      onClick={() => setFiltroDepartamentoInst('todos')}

                      className="ml-auto text-teal-600 hover:text-teal-800 text-sm font-medium flex items-center gap-1"

                    >

                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />

                      </svg>

                      Quitar filtro

                    </button>

                  </div>

                )}

                

                {institucionesFiltradas.length === 0 ? (

                  <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">

                    <IconInstitution className="mx-auto text-slate-300 mb-4" size={48} />

                    <h4 className="font-semibold text-slate-600 mb-2">

                      {filtroDepartamentoInst !== 'todos' 

                        ? `No hay instituciones en ${departamentosMock.find(d => d.id === filtroDepartamentoInst)?.nombre}`

                        : 'No hay instituciones registradas'

                      }

                    </h4>

                    <p className="text-sm text-slate-500 mb-4">

                      {filtroDepartamentoInst !== 'todos'

                        ? 'Prueba con otro departamento o quita el filtro'

                        : 'Comienza agregando la primera institución educativa'

                      }

                    </p>

                    {filtroDepartamentoInst === 'todos' && (

                      <Button onClick={async () => {

                setPasoActualFormulario(1);

                if (catalogos.municipios.length === 0) {

                  await loadCatalogos();

                }

                setModalInstitucion(true);

              }} className="flex items-center gap-2 mx-auto">

                        <IconPlus size={16} />

                        Agregar Institución

                      </Button>

                    )}

                  </div>

                ) : (

                <div className="space-y-4">

                  {institucionesFiltradas.map((inst) => {

                    const rector = getRectorInstitucion(inst.id);

                    const coordinadores = getCoordinadoresInstitucion(inst.id);

                    const orientadores = getOrientadoresInstitucion(inst.id);

                    const docentes = getDocentesInstitucion(inst.id);

                    const totalUsuariosInst = getUsuariosInstitucion(inst.id).length;

                    const isExpanded = expandedInstitucion === inst.id;

                    

                    return (

                      <div 

                        key={inst.id} 

                        className={`rounded-xl border-2 overflow-hidden transition-all duration-300 ${

                          isExpanded 

                            ? 'border-teal-300 shadow-lg shadow-teal-100' 

                            : 'border-slate-200 hover:border-slate-300'

                        }`}

                      >

                        {/* Card Header - Institución */}

                        <div 

                          className={`p-5 cursor-pointer transition-colors ${

                            isExpanded 

                              ? 'bg-gradient-to-r from-teal-50 to-emerald-50' 

                              : 'bg-white hover:bg-slate-50'

                          }`}

                          onClick={() => setExpandedInstitucion(isExpanded ? null : inst.id)}

                        >

                          <div className="flex items-center justify-between">

                            <div className="flex items-center gap-4">

                              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg flex-shrink-0">

                                <IconInstitution className="text-white" size={26} />

                              </div>

                              <div className="min-w-0">

                                <div className="font-bold text-lg text-slate-800">{inst.nombre}</div>

                                <div className="text-sm text-slate-500">{inst.direccion_completa || inst.direccion || 'Sin dirección'}</div>

                                <div className="flex items-center gap-3 mt-1.5">

                                  {inst.codigo_dane && (

                                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">DANE: {inst.codigo_dane}</span>

                                  )}

                                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${

                                    inst.naturaleza === 'publica' ? 'bg-emerald-100 text-emerald-700' :

                                    inst.naturaleza === 'privada' ? 'bg-violet-100 text-violet-700' :

                                    'bg-amber-100 text-amber-700'

                                  }`}>

                                    {inst.naturaleza === 'publica' ? 'Pública' : inst.naturaleza === 'privada' ? 'Privada' : 'Mixta'}

                                  </span>

                                  <span className={`px-2 py-0.5 rounded text-xs font-semibold inline-flex items-center gap-1 ${

                                    inst.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'

                                  }`}>

                                    <span className={`w-1.5 h-1.5 rounded-full ${inst.activo ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>

                                    {inst.activo ? 'Activa' : 'Inactiva'}

                                  </span>

                                </div>

                              </div>

                            </div>

                            

                            <div className="flex items-center gap-4">

                              {/* Badges de conteo */}

                              <div className="hidden sm:flex items-center gap-2">

                                <div className="text-center px-3 py-1.5 bg-blue-50 rounded-lg">

                                  <div className="text-lg font-bold text-blue-700">{cursos.filter(c => c.institucionId === inst.id).length}</div>

                                  <div className="text-xs text-blue-600">Cursos</div>

                                </div>

                                <div className="text-center px-3 py-1.5 bg-violet-50 rounded-lg">

                                  <div className="text-lg font-bold text-violet-700">{totalUsuariosInst}</div>

                                  <div className="text-xs text-violet-600">Usuarios</div>

                                </div>

                              </div>

                              

                              {/* Acciones */}

                              <div className="flex items-center gap-1">

                                <button 

                                  onClick={(e) => { e.stopPropagation(); openEditInstitucion(inst); }}

                                  className="p-2.5 text-slate-400 hover:text-teal-600 hover:bg-teal-100 rounded-lg transition-all"

                                  title="Editar institución"

                                >

                                  <IconEdit size={18} />

                                </button>

                                <button 

                                  onClick={(e) => { e.stopPropagation(); handleDeleteInstitucion(inst.id); }}

                                  className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-all"

                                  title="Eliminar institución"

                                >

                                  <IconTrash size={18} />

                                </button>

                                <button 

                                  className={`p-2.5 rounded-lg transition-all ${

                                    isExpanded 

                                      ? 'text-teal-600 bg-teal-100' 

                                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'

                                  }`}

                                  title={isExpanded ? 'Cerrar' : 'Ver usuarios'}

                                >

                                  <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">

                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />

                                  </svg>

                                </button>

                              </div>

                            </div>

                          </div>

                        </div>

                        

                        {/* Expanded Panel - Usuarios de la institución */}

                        {isExpanded && (

                          <div className="border-t border-teal-200 bg-gradient-to-b from-slate-50 to-white p-5 animate-in slide-in-from-top-2 duration-300">

                            <h4 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">

                              <IconUsers size={18} className="text-slate-500" />

                              Personal de la Institución

                            </h4>

                            

                            {totalUsuariosInst === 0 ? (

                              <div className="text-center py-8 bg-white rounded-xl border-2 border-dashed border-slate-200">

                                <IconUsers className="mx-auto text-slate-300 mb-2" size={36} />

                                <p className="text-slate-500 text-sm">No hay usuarios registrados en esta institución</p>

                                <Button 

                                  size="sm" 

                                  className="mt-3"

                                  onClick={() => {

                                    setFormUsuario({ ...formUsuario, institucionId: inst.id });

                                    setModalUsuario(true);

                                  }}

                                >

                                  <IconPlus size={14} />

                                  Agregar Usuario

                                </Button>

                              </div>

                            ) : (

                              <div className="grid gap-4">

                                {/* Rector */}

                                <div className="bg-white rounded-xl border border-rose-200 p-4">

                                  <div className="flex items-center gap-2 mb-3">

                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-400 to-red-600 flex items-center justify-center">

                                      <span className="text-white text-xs font-bold">R</span>

                                    </div>

                                    <h5 className="font-semibold text-slate-700">Rector</h5>

                                    <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full ml-auto">

                                      {rector ? '1 asignado' : 'Sin asignar'}

                                    </span>

                                  </div>

                                  {rector ? (

                                    <div className="flex items-center gap-3 p-3 bg-rose-50 rounded-lg">

                                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-red-600 flex items-center justify-center text-white font-bold">

                                        {rector.nombre[0]}{rector.apellidos?.[0] || ''}

                                      </div>

                                      <div className="flex-1 min-w-0">

                                        <div className="font-medium text-slate-800">{rector.nombre} {rector.apellidos}</div>

                                        <div className="text-sm text-slate-500 truncate">{rector.correo || rector.email}</div>

                                      </div>

                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${

                                        rector.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'

                                      }`}>

                                        {rector.activo ? 'Activo' : 'Inactivo'}

                                      </span>

                                    </div>

                                  ) : (

                                    <div className="text-center py-4 text-slate-400 text-sm">

                                      No hay rector asignado

                                    </div>

                                  )}

                                </div>

                                

                                {/* Coordinadores */}

                                <div className="bg-white rounded-xl border border-amber-200 p-4">

                                  <div className="flex items-center gap-2 mb-3">

                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">

                                      <span className="text-white text-xs font-bold">C</span>

                                    </div>

                                    <h5 className="font-semibold text-slate-700">Coordinadores</h5>

                                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full ml-auto">

                                      {coordinadores.length} {coordinadores.length === 1 ? 'registrado' : 'registrados'}

                                    </span>

                                  </div>

                                  {coordinadores.length > 0 ? (

                                    <div className="space-y-2">

                                      {coordinadores.map(coord => (

                                        <div key={coord.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">

                                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm">

                                            {coord.nombre[0]}{coord.apellidos?.[0] || ''}

                                          </div>

                                          <div className="flex-1 min-w-0">

                                            <div className="font-medium text-slate-800">{coord.nombre} {coord.apellidos}</div>

                                            <div className="text-sm text-slate-500 truncate">{coord.correo || coord.email}</div>

                                          </div>

                                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${

                                            coord.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'

                                          }`}>

                                            {coord.activo ? 'Activo' : 'Inactivo'}

                                          </span>

                                        </div>

                                      ))}

                                    </div>

                                  ) : (

                                    <div className="text-center py-4 text-slate-400 text-sm">

                                      No hay coordinadores registrados

                                    </div>

                                  )}

                                </div>

                                

                                {/* Orientadores */}

                                <div className="bg-white rounded-xl border border-violet-200 p-4">

                                  <div className="flex items-center gap-2 mb-3">

                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center">

                                      <span className="text-white text-xs font-bold">O</span>

                                    </div>

                                    <h5 className="font-semibold text-slate-700">Orientadores</h5>

                                    <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full ml-auto">

                                      {orientadores.length} {orientadores.length === 1 ? 'registrado' : 'registrados'}

                                    </span>

                                  </div>

                                  {orientadores.length > 0 ? (

                                    <div className="space-y-2">

                                      {orientadores.map(orient => (

                                        <div key={orient.id} className="flex items-center gap-3 p-3 bg-violet-50 rounded-lg">

                                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm">

                                            {orient.nombre[0]}{orient.apellidos?.[0] || ''}

                                          </div>

                                          <div className="flex-1 min-w-0">

                                            <div className="font-medium text-slate-800">{orient.nombre} {orient.apellidos}</div>

                                            <div className="text-sm text-slate-500 truncate">{orient.correo || orient.email}</div>

                                          </div>

                                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${

                                            orient.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'

                                          }`}>

                                            {orient.activo ? 'Activo' : 'Inactivo'}

                                          </span>

                                        </div>

                                      ))}

                                    </div>

                                  ) : (

                                    <div className="text-center py-4 text-slate-400 text-sm">

                                      No hay orientadores registrados

                                    </div>

                                  )}

                                </div>

                                

                                {/* Docentes */}

                                <div className="bg-white rounded-xl border border-blue-200 p-4">

                                  <div className="flex items-center gap-2 mb-3">

                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center">

                                      <span className="text-white text-xs font-bold">D</span>

                                    </div>

                                    <h5 className="font-semibold text-slate-700">Docentes</h5>

                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ml-auto">

                                      {docentes.length} {docentes.length === 1 ? 'registrado' : 'registrados'}

                                    </span>

                                  </div>

                                  {docentes.length > 0 ? (

                                    <div className="grid sm:grid-cols-2 gap-2">

                                      {docentes.slice(0, 6).map(doc => (

                                        <div key={doc.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">

                                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">

                                            {doc.nombre[0]}{doc.apellidos?.[0] || ''}

                                          </div>

                                          <div className="flex-1 min-w-0">

                                            <div className="font-medium text-slate-800 text-sm">{doc.nombre} {doc.apellidos}</div>

                                            <div className="text-xs text-slate-500 truncate">{doc.correo || doc.email}</div>

                                          </div>

                                        </div>

                                      ))}

                                    </div>

                                  ) : (

                                    <div className="text-center py-4 text-slate-400 text-sm">

                                      No hay docentes registrados

                                    </div>

                                  )}

                                  {docentes.length > 6 && (

                                    <div className="mt-3 text-center">

                                      <span className="text-sm text-blue-600 font-medium">

                                        +{docentes.length - 6} docentes más

                                      </span>

                                    </div>

                                  )}

                                </div>

                              </div>

                            )}

                          </div>

                        )}

                      </div>

                    );

                  })}

                </div>

                )}

              </div>

            )}



            {/* Tab: Usuarios */}

            {activeTab === 'usuarios' && (

              <div className="space-y-5">

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                  <div>

                    <h3 className="text-xl font-bold text-slate-800">Gestión de Usuarios</h3>

                    <p className="text-sm text-slate-500 mt-1">Administra los usuarios del sistema</p>

                  </div>

                  <div className="flex gap-3 flex-wrap">

                    <select 

                      value={filtroDepartamentoUsers === 'todos' ? 'todos' : filtroDepartamentoUsers}

                      onChange={(e) => setFiltroDepartamentoUsers(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}

                      className="px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all shadow-sm min-w-[180px]"

                    >

                      <option value="todos">Todos los departamentos</option>

                      {departamentosMock.map(depto => (

                        <option key={depto.id} value={depto.id}>{depto.nombre}</option>

                      ))}

                    </select>

                    <select 

                      value={filtroRolUsers}

                      onChange={(e) => setFiltroRolUsers(e.target.value)}

                      className="px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all shadow-sm"

                    >

                      <option value="todos">Todos los roles</option>

                      <option value="rector">Rectores</option>

                      <option value="coordinador">Coordinadores</option>

                      <option value="orientador">Orientadores</option>

                      <option value="docente_aula">Docentes</option>

                      <option value="acudiente">Acudientes</option>

                    </select>

                    <Button onClick={() => {

                      setEditingUsuario(null);

                      // Inicializar con la primera institución disponible

                      const primeraInstitucion = instituciones.length > 0 ? instituciones[0].id : 1;

                      setFormUsuario({ nombre: '', apellidos: '', correo: '', telefono: '', documento: '', tipoDocumento: 'cc', contrasena: '', rol: 'docente_aula', institucionId: primeraInstitucion });

                      setModalUsuario(true);

                    }} className="flex items-center gap-2 shadow-md">

                      <IconPlus size={16} />

                      Nuevo Usuario

                    </Button>

                  </div>

                </div>

                

                {/* Indicador de filtros activos */}

                {(filtroDepartamentoUsers !== 'todos' || filtroRolUsers !== 'todos') && (

                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl flex-wrap">

                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />

                    </svg>

                    <span className="text-sm text-blue-700 font-medium">

                      Mostrando {usuariosFiltrados.length} {usuariosFiltrados.length === 1 ? 'usuario' : 'usuarios'}

                      {filtroDepartamentoUsers !== 'todos' && ` de ${departamentosMock.find(d => d.id === filtroDepartamentoUsers)?.nombre}`}

                      {filtroRolUsers !== 'todos' && ` - ${filtroRolUsers === 'docente_aula' ? 'Docentes' : filtroRolUsers.charAt(0).toUpperCase() + filtroRolUsers.slice(1)}${filtroRolUsers !== 'acudiente' ? 'es' : 's'}`}

                    </span>

                    <button 

                      onClick={() => { setFiltroDepartamentoUsers('todos'); setFiltroRolUsers('todos'); }}

                      className="ml-auto text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"

                    >

                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />

                      </svg>

                      Quitar filtros

                    </button>

                  </div>

                )}

                

                {usuariosFiltrados.length === 0 ? (

                  <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">

                    <IconUsers className="mx-auto text-slate-300 mb-4" size={48} />

                    <h4 className="font-semibold text-slate-600 mb-2">

                      {(filtroDepartamentoUsers !== 'todos' || filtroRolUsers !== 'todos')

                        ? 'No se encontraron usuarios con los filtros seleccionados'

                        : 'No hay usuarios registrados'

                      }

                    </h4>

                    <p className="text-sm text-slate-500 mb-4">

                      {(filtroDepartamentoUsers !== 'todos' || filtroRolUsers !== 'todos')

                        ? 'Prueba con otros filtros o quítalos para ver todos'

                        : 'Comienza agregando el primer usuario'

                      }

                    </p>

                    {filtroDepartamentoUsers === 'todos' && filtroRolUsers === 'todos' && (

                      <Button onClick={() => {

                        const primeraInstitucion = instituciones.length > 0 ? instituciones[0].id : 1;

                        setFormUsuario({ nombre: '', apellidos: '', correo: '', telefono: '', documento: '', tipoDocumento: 'cc', contrasena: '', rol: 'docente_aula', institucionId: primeraInstitucion });

                        setModalUsuario(true);

                      }} className="flex items-center gap-2 mx-auto">

                        <IconPlus size={16} />

                        Agregar Usuario

                      </Button>

                    )}

                  </div>

                ) : (

                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">

                  <table className="w-full">

                    <thead>

                      <tr className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100/50">

                        <th className="text-left py-4 px-5 font-semibold text-slate-700 text-sm uppercase tracking-wider">Usuario</th>

                        <th className="text-center py-4 px-4 font-semibold text-slate-700 text-sm uppercase tracking-wider">Rol</th>

                        <th className="text-center py-4 px-4 font-semibold text-slate-700 text-sm uppercase tracking-wider">Institución</th>

                        <th className="text-center py-4 px-4 font-semibold text-slate-700 text-sm uppercase tracking-wider">Departamento</th>

                        <th className="text-center py-4 px-4 font-semibold text-slate-700 text-sm uppercase tracking-wider">Estado</th>

                        <th className="text-center py-4 px-4 font-semibold text-slate-700 text-sm uppercase tracking-wider">Acciones</th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-slate-100">

                      {usuariosFiltrados.map((usuario, index) => {

                        const instUsuario = instituciones.find(i => i.id === usuario.institucionId);

                        const deptoUsuario = instUsuario ? getDepartamentoInstitucion(instUsuario) : null;

                        

                        return (

                        <tr key={usuario.id} className={`hover:bg-blue-50/30 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>

                          <td className="py-4 px-5">

                            <div className="flex items-center gap-4">

                              <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white ${

                                usuario.rol === 'docente_aula' ? 'bg-gradient-to-br from-blue-400 to-indigo-600' :

                                usuario.rol === 'orientador' ? 'bg-gradient-to-br from-violet-400 to-purple-600' :

                                usuario.rol === 'coordinador' ? 'bg-gradient-to-br from-amber-400 to-orange-600' :

                                usuario.rol === 'rector' ? 'bg-gradient-to-br from-rose-400 to-red-600' :

                                'bg-gradient-to-br from-teal-400 to-teal-600'

                              }`}>

                                {usuario.nombre[0]}{usuario.apellidos?.[0] || ''}

                              </div>

                              <div className="min-w-0">

                                <div className="font-semibold text-slate-800">{usuario.nombre} {usuario.apellidos}</div>

                                <div className="text-sm text-slate-500 truncate">{usuario.correo || usuario.email}</div>

                              </div>

                            </div>

                          </td>

                          <td className="text-center py-4 px-4">

                            <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${

                              usuario.rol === 'docente_aula' ? 'bg-blue-100 text-blue-700' :

                              usuario.rol === 'orientador' ? 'bg-violet-100 text-violet-700' :

                              usuario.rol === 'coordinador' ? 'bg-amber-100 text-amber-700' :

                              usuario.rol === 'rector' ? 'bg-rose-100 text-rose-700' :

                              usuario.rol === 'acudiente' ? 'bg-cyan-100 text-cyan-700' :

                              'bg-slate-100 text-slate-700'

                            }`}>

                              {usuario.rol === 'docente_aula' ? 'Docente' : 

                               usuario.rol === 'orientador' ? 'Orientador' :

                               usuario.rol === 'coordinador' ? 'Coordinador' :

                               usuario.rol === 'rector' ? 'Rector' : 

                               usuario.rol === 'acudiente' ? 'Acudiente' : usuario.rol}

                            </span>

                          </td>

                          <td className="text-center py-4 px-4 text-slate-600">

                            <span className="text-sm font-medium">

                              {instUsuario?.nombre?.slice(0, 20) || 'Sin asignar'}

                              {(instUsuario?.nombre?.length || 0) > 20 ? '...' : ''}

                            </span>

                          </td>

                          <td className="text-center py-4 px-4">

                            {deptoUsuario ? (

                              <span className="text-sm font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">

                                {deptoUsuario.nombre}

                              </span>

                            ) : (

                              <span className="text-xs text-slate-400">-</span>

                            )}

                          </td>

                          <td className="text-center py-4 px-4">

                            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${

                              usuario.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'

                            }`}>

                              <span className={`w-2 h-2 rounded-full ${usuario.activo ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>

                              {usuario.activo ? 'Activo' : 'Inactivo'}

                            </span>

                          </td>

                          <td className="text-center py-4 px-4">

                            <div className="flex justify-center gap-1">

                              <button 

                                onClick={() => openEditUsuario(usuario)}

                                className="p-2.5 text-slate-400 hover:text-teal-600 hover:bg-teal-100 rounded-lg transition-all hover:scale-105"

                                title="Editar usuario"

                              >

                                <IconEdit size={18} />

                              </button>

                              <button 

                                onClick={() => handleDeleteUsuario(usuario.id)}

                                className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-all hover:scale-105"

                                title="Eliminar usuario"

                              >

                                <IconTrash size={18} />

                              </button>

                            </div>

                          </td>

                        </tr>

                        );

                      })}

                    </tbody>

                  </table>

                </div>

                )}

              </div>

            )}



            {/* Tab: Reportes */}

            {activeTab === 'reportes' && (

              <div className="space-y-6">

                <div>

                  <h3 className="text-xl font-bold text-slate-800">Exportar Reportes</h3>

                  <p className="text-sm text-slate-500 mt-1">Descarga reportes en formato Excel o PDF</p>

                </div>

                

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

                  {/* Reporte de Instituciones */}

                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-6 border border-blue-200">

                    <div className="flex items-center gap-3 mb-4">

                      <div className="p-2 bg-blue-500 rounded-lg">

                        <IconInstitution className="text-white" size={20} />

                      </div>

                      <h4 className="font-bold text-gray-800">Instituciones</h4>

                    </div>

                    <p className="text-sm text-gray-600 mb-4">Listado completo de instituciones registradas</p>

                    <div className="flex gap-2">

                      <Button

                        size="sm"

                        onClick={() => {

                          const data = instituciones.map(inst => {

                            const municipio = municipiosMock.find(m => m.id === inst.municipio_id);

                            const departamento = departamentosMock.find(d => d.id === municipio?.departamento_id);

                            return {

                              ID: inst.id,

                              Nombre: inst.nombre,

                              'Código DANE': inst.codigo_dane || '-',

                              NIT: inst.nit || '-',

                              Municipio: municipio?.nombre || '-',

                              Departamento: departamento?.nombre || '-',

                              Naturaleza: inst.naturaleza,

                              'Teléfono Principal': inst.telefono_principal,

                              'Correo Institucional': inst.correo_institucional,

                              Estado: inst.activo ? 'Activa' : 'Inactiva'

                            };

                          });

                          exportToExcel(data, 'Instituciones', 'Instituciones');

                        }}

                      >

                        <IconDownload size={14} />

                        Excel

                      </Button>

                      <Button

                        size="sm"

                        variant="outline"

                        onClick={() => {

                          const data = instituciones.map(inst => {

                            const municipio = municipiosMock.find(m => m.id === inst.municipio_id);

                            const departamento = departamentosMock.find(d => d.id === municipio?.departamento_id);

                            return {

                              id: inst.id,

                              nombre: inst.nombre,

                              municipio: municipio?.nombre || '-',

                              departamento: departamento?.nombre || '-',

                              naturaleza: inst.naturaleza,

                              telefono: inst.telefono_principal,

                              estado: inst.activo ? 'Activa' : 'Inactiva'

                            };

                          });

                          exportToPDF(

                            data,

                            'Instituciones',

                            'Reporte de Instituciones',

                            [

                              { header: 'ID', dataKey: 'id' },

                              { header: 'Nombre', dataKey: 'nombre' },

                              { header: 'Municipio', dataKey: 'municipio' },

                              { header: 'Departamento', dataKey: 'departamento' },

                              { header: 'Naturaleza', dataKey: 'naturaleza' },

                              { header: 'Teléfono', dataKey: 'telefono' },

                              { header: 'Estado', dataKey: 'estado' }

                            ]

                          );

                        }}

                      >

                        <IconDownload size={14} />

                        PDF

                      </Button>

                    </div>

                  </div>



                  {/* Reporte de Usuarios */}

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-6 border border-purple-200">

                    <div className="flex items-center gap-3 mb-4">

                      <div className="p-2 bg-purple-500 rounded-lg">

                        <IconUsers className="text-white" size={20} />

                      </div>

                      <h4 className="font-bold text-gray-800">Usuarios</h4>

                    </div>

                    <p className="text-sm text-gray-600 mb-4">Listado de usuarios por rol y estado</p>

                    <div className="flex gap-2">

                      <Button

                        size="sm"

                        onClick={() => {

                          const data = usuarios.map(user => ({

                            ID: user.id,

                            Nombre: user.nombre,

                            Email: user.email,

                            Rol: user.rol,

                            Institución: instituciones.find(i => i.id === user.institucionId)?.nombre || '-',

                            Estado: user.activo ? 'Activo' : 'Inactivo'

                          }));

                          exportToExcel(data, 'Usuarios', 'Usuarios');

                        }}

                      >

                        <IconDownload size={14} />

                        Excel

                      </Button>

                      <Button

                        size="sm"

                        variant="outline"

                        onClick={() => {

                          const data = usuarios.map(user => ({

                            id: user.id,

                            nombre: user.nombre,

                            email: user.email,

                            rol: user.rol,

                            estado: user.activo ? 'Activo' : 'Inactivo'

                          }));

                          exportToPDF(

                            data,

                            'Usuarios',

                            'Reporte de Usuarios',

                            [

                              { header: 'ID', dataKey: 'id' },

                              { header: 'Nombre', dataKey: 'nombre' },

                              { header: 'Email', dataKey: 'email' },

                              { header: 'Rol', dataKey: 'rol' },

                              { header: 'Estado', dataKey: 'estado' }

                            ]

                          );

                        }}

                      >

                        <IconDownload size={14} />

                        PDF

                      </Button>

                    </div>

                  </div>



                  {/* Reporte de Tareas */}

                  <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-xl p-6 border border-teal-200">

                    <div className="flex items-center gap-3 mb-4">

                      <div className="p-2 bg-teal-500 rounded-lg">

                        <IconClipboard className="text-white" size={20} />

                      </div>

                      <h4 className="font-bold text-gray-800">Tareas</h4>

                    </div>

                    <p className="text-sm text-gray-600 mb-4">Listado de tareas creadas y su estado</p>

                    <div className="flex gap-2">

                      <Button

                        size="sm"

                        onClick={() => {

                          const data = tareas.map(tarea => ({

                            ID: tarea.id,

                            Título: tarea.titulo,

                            Categoría: tarea.categoria?.nombre || '-',

                            'Fecha Límite': tarea.fechaLimite,

                            Estado: tarea.estado

                          }));

                          exportToExcel(data, 'Tareas', 'Tareas');

                        }}

                      >

                        <IconDownload size={14} />

                        Excel

                      </Button>

                      <Button

                        size="sm"

                        variant="outline"

                        onClick={() => {

                          const data = tareas.map(tarea => ({

                            id: tarea.id,

                            titulo: tarea.titulo,

                            categoria: tarea.categoria?.nombre || '-',

                            fechaLimite: tarea.fechaLimite,

                            estado: tarea.estado

                          }));

                          exportToPDF(

                            data,

                            'Tareas',

                            'Reporte de Tareas',

                            [

                              { header: 'ID', dataKey: 'id' },

                              { header: 'Título', dataKey: 'titulo' },

                              { header: 'Categoría', dataKey: 'categoria' },

                              { header: 'Fecha Límite', dataKey: 'fechaLimite' },

                              { header: 'Estado', dataKey: 'estado' }

                            ]

                          );

                        }}

                      >

                        <IconDownload size={14} />

                        PDF

                      </Button>

                    </div>

                  </div>



                  {/* Reporte de Cursos */}

                  <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-6 border border-amber-200">

                    <div className="flex items-center gap-3 mb-4">

                      <div className="p-2 bg-amber-500 rounded-lg">

                        <IconBook className="text-white" size={20} />

                      </div>

                      <h4 className="font-bold text-gray-800">Cursos</h4>

                    </div>

                    <p className="text-sm text-gray-600 mb-4">Listado de cursos por institución</p>

                    <div className="flex gap-2">

                      <Button

                        size="sm"

                        onClick={() => {

                          const data = cursos.map(curso => ({

                            ID: curso.id,

                            Nombre: curso.nombre,

                            Jornada: curso.jornada,

                            Institución: instituciones.find(i => i.id === curso.institucionId)?.nombre || '-',

                            Estado: curso.activo ? 'Activo' : 'Inactivo'

                          }));

                          exportToExcel(data, 'Cursos', 'Cursos');

                        }}

                      >

                        <IconDownload size={14} />

                        Excel

                      </Button>

                      <Button

                        size="sm"

                        variant="outline"

                        onClick={() => {

                          const data = cursos.map(curso => ({

                            id: curso.id,

                            nombre: curso.nombre,

                            jornada: curso.jornada,

                            estado: curso.activo ? 'Activo' : 'Inactivo'

                          }));

                          exportToPDF(

                            data,

                            'Cursos',

                            'Reporte de Cursos',

                            [

                              { header: 'ID', dataKey: 'id' },

                              { header: 'Nombre', dataKey: 'nombre' },

                              { header: 'Jornada', dataKey: 'jornada' },

                              { header: 'Estado', dataKey: 'estado' }

                            ]

                          );

                        }}

                      >

                        <IconDownload size={14} />

                        PDF

                      </Button>

                    </div>

                  </div>

                </div>

              </div>

            )}



            {/* Tab: Configuración */}

            {activeTab === 'configuracion' && (

              <div className="space-y-6">

                <div className="flex items-center justify-between">

                  <h3 className="text-lg font-bold text-slate-800">Configuración del Sistema</h3>

                </div>

                

                {/* Período académico y Grados en la primera fila */}

                <div className="grid md:grid-cols-2 gap-6">

                  {/* Período académico */}

                  <div className="border border-slate-200 rounded-xl overflow-hidden">

                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">

                      <h4 className="font-semibold text-slate-800 flex items-center gap-2">

                        <IconCalendar className="text-slate-500" size={18} />

                        Períodos Académicos

                      </h4>

                      <Button 

                        onClick={() => {

                          setEditingPeriodo(null);

                          setFormPeriodo({ nombre: '', fechaInicio: '', fechaFin: '', institucionId: 1, anio: new Date().getFullYear(), estado: 'planificado' });

                          setModalPeriodo(true);

                        }}

                        size="sm" 

                        variant="ghost"

                        className="flex items-center gap-1.5"

                      >

                        <IconPlus size={14} />

                        Nuevo

                      </Button>

                    </div>

                    <div className="p-4 space-y-3 max-h-80 overflow-y-auto">

                      {periodos.length === 0 ? (

                        <div className="text-center py-8 text-slate-500">

                          <IconCalendar className="mx-auto mb-2 text-slate-400" size={32} />

                          <p className="text-sm">No hay períodos registrados</p>

                        </div>

                      ) : (

                        periodos.slice(0, 5).map(periodo => (

                          <div key={periodo.id} className={`flex items-center justify-between p-4 rounded-xl border ${

                            periodo.estado === 'activo' 

                              ? 'bg-gradient-to-r from-teal-50 to-emerald-50/30 border-teal-200/60'

                              : 'bg-slate-50 border-slate-100'

                          }`}>

                            <div className="flex-1">

                              <div className={`font-semibold ${periodo.estado === 'activo' ? 'text-teal-800' : 'text-slate-700'}`}>

                                {periodo.nombre}

                              </div>

                              <div className={`text-sm ${periodo.estado === 'activo' ? 'text-teal-600/80' : 'text-slate-500'}`}>

                                {periodo.fechaInicio} - {periodo.fechaFin}

                              </div>

                            </div>

                            <div className="flex items-center gap-2">

                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${

                                periodo.estado === 'activo' ? 'bg-teal-100 text-teal-700' :

                                periodo.estado === 'cerrado' ? 'bg-slate-100 text-slate-500' :

                                'bg-blue-100 text-blue-700'

                              }`}>

                                {periodo.estado === 'activo' ? 'Activo' : periodo.estado === 'cerrado' ? 'Cerrado' : 'Planificado'}

                              </span>

                              <button 

                                onClick={() => openEditPeriodo(periodo)}

                                className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"

                              >

                                <IconEdit size={16} />

                              </button>

                              <button 

                                onClick={() => handleDeletePeriodo(periodo.id)}

                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"

                              >

                                <IconTrash size={16} />

                              </button>

                            </div>

                          </div>

                        ))

                      )}

                    </div>

                  </div>

                </div>



                {/* Grados y Cursos */}

                <div className="grid md:grid-cols-2 gap-6 mt-6">

                  {/* Grados */}

                  <div className="border border-slate-200 rounded-xl overflow-hidden">

                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">

                      <h4 className="font-semibold text-slate-800 flex items-center gap-2">

                        <IconBook className="text-slate-500" size={18} />

                        Grados

                      </h4>

                      <Button 

                        onClick={() => {

                          setEditingGrado(null);

                          setFormGrado({ nombre: '', orden: grados.length, institucionId: 1 });

                          setModalGrado(true);

                        }}

                        size="sm" 

                        variant="ghost"

                        className="flex items-center gap-1.5"

                      >

                        <IconPlus size={14} />

                        Nuevo

                      </Button>

                    </div>

                    <div className="p-4 space-y-2 max-h-80 overflow-y-auto">

                      {grados.length === 0 ? (

                        <div className="text-center py-8 text-slate-500">

                          <IconBook className="mx-auto mb-2 text-slate-400" size={32} />

                          <p className="text-sm">No hay grados registrados</p>

                        </div>

                      ) : (

                        grados.map(grado => (

                          <div key={grado.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">

                            <div className="flex items-center gap-3">

                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">

                                {grado.orden}

                              </div>

                              <span className="font-medium text-slate-700">{grado.nombre}</span>

                            </div>

                            <div className="flex items-center gap-1">

                              <button 

                                onClick={() => openEditGrado(grado)}

                                className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"

                              >

                                <IconEdit size={16} />

                              </button>

                              <button 

                                onClick={() => handleDeleteGrado(grado.id)}

                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"

                              >

                                <IconTrash size={16} />

                              </button>

                            </div>

                          </div>

                        ))

                      )}

                    </div>

                  </div>



                  {/* Cursos */}

                  <div className="border border-slate-200 rounded-xl overflow-hidden">

                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">

                      <h4 className="font-semibold text-slate-800 flex items-center gap-2">

                        <IconUsers className="text-slate-500" size={18} />

                        Cursos

                      </h4>

                      <Button 

                        onClick={() => {

                          setEditingCurso(null);

                          setFormCurso({ nombre: '', gradoId: grados[0]?.id || 1, jornada: 'mañana', institucionId: 1, docenteDirectorId: undefined });

                          setModalCurso(true);

                        }}

                        size="sm" 

                        variant="ghost"

                        className="flex items-center gap-1.5"

                      >

                        <IconPlus size={14} />

                        Nuevo

                      </Button>

                    </div>

                    <div className="p-4 space-y-2 max-h-80 overflow-y-auto">

                      {cursos.length === 0 ? (

                        <div className="text-center py-8 text-slate-500">

                          <IconUsers className="mx-auto mb-2 text-slate-400" size={32} />

                          <p className="text-sm">No hay cursos registrados</p>

                        </div>

                      ) : (

                        cursos.slice(0, 10).map(curso => {

                          const grado = grados.find(g => g.id === curso.gradoId);

                          return (

                            <div key={curso.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">

                              <div>

                                <div className="font-medium text-slate-700">{curso.nombre}</div>

                                <div className="text-xs text-slate-500">{grado?.nombre} - {curso.jornada}</div>

                              </div>

                              <div className="flex items-center gap-1">

                                <button 

                                  onClick={() => openEditCurso(curso)}

                                  className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"

                                >

                                  <IconEdit size={16} />

                                </button>

                                <button 

                                  onClick={() => handleDeleteCurso(curso.id)}

                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"

                                >

                                  <IconTrash size={16} />

                                </button>

                              </div>

                            </div>

                          );

                        })

                      )}

                    </div>

                  </div>

                </div>

              </div>

            )}

          </div>

        </div>

      </div>



      {/* Modal Nueva Institución */}

      <Modal

        isOpen={modalInstitucion}

        onClose={() => {

          setModalInstitucion(false);

          setEditingInstitucion(null);

          setPasoActualFormulario(1);

          setFormInstitucion({ 

            nombre: '', 

            naturaleza: 'publica',

            municipioId: 1,

            telefono: '',

            correo: '',

            direccion: '',

            codigoDane: '',

            nit: '',

            telefonoPrincipal: '',

            telefonoSecretaria: '',

            correoInstitucional: '',

            correoRectoria: '',

            sitioWeb: '',

            direccionCompleta: '',

            barrio: '',

            estrato: 3,

            coordenadasGps: '',

            capacidadEstudiantes: 0,

            anoFundacion: new Date().getFullYear(),

            enfoquePedagogico: '',

            confesional: false,

            religion: '',

            rectorNombre: '',

            rectorDocumento: '',

            rectorTelefono: '',

            rectorCorreo: '',

            nivelesEducativos: [],

            modalidad: 'academica',

            jornadas: [],

            resolucionAprobacion: ''

          });

          setError(null);

        }}

        title={editingInstitucion ? 'Editar Institución' : 'Nueva Institución'}

        size="xl"

      >

        {/* Indicadores de paso */}

        <div className="flex items-center justify-between mb-6">

          <div className="flex items-center space-x-2">

            {[1, 2, 3, 4, 5].map((paso) => (

              <button

                key={paso}

                onClick={() => irAPaso(paso)}

                className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${

                  paso === pasoActualFormulario

                    ? 'bg-teal-600 text-white'

                    : paso < pasoActualFormulario

                    ? 'bg-teal-100 text-teal-600 hover:bg-teal-200'

                    : 'bg-gray-200 text-gray-500 hover:bg-gray-300'

                }`}

              >

                {paso}

              </button>

            ))}

          </div>

          <div className="text-sm text-gray-600">

            Paso {pasoActualFormulario} de 5

          </div>

        </div>



        {/* Contenido del paso actual */}

        <div className="min-h-[400px]">

          {pasoActualFormulario === 1 && (

            <div className="space-y-4">

              <h3 className="text-lg font-semibold text-gray-800 mb-4">Información Básica</h3>

              

              <div className="grid md:grid-cols-2 gap-4">

                <FormFieldInput

                  name="nombre"

                  label="Nombre de la institución *"

                  placeholder="I.E. Nombre de la institución"

                  value={formInstitucion.nombre}

                  onChange={(e) => setFormInstitucion({ ...formInstitucion, nombre: e.target.value })}

                  required

                />

                

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">Naturaleza *</label>

                  <select

                    value={formInstitucion.naturaleza}

                    onChange={(e) => setFormInstitucion({ ...formInstitucion, naturaleza: e.target.value as 'publica' | 'privada' })}

                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"

                    required

                  >

                    {catalogos.naturaleza.length > 0 ? (

                      catalogos.naturaleza.map((nat) => (

                        <option key={nat.id} value={nat.id}>{nat.nombre}</option>

                      ))

                    ) : (

                      <>

                        <option value="publica">Pública</option>

                        <option value="privada">Privada</option>

                      </>

                    )}

                  </select>

                </div>

              </div>



              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">Municipio *</label>

                <select

                  value={formInstitucion.municipioId}

                  onChange={(e) => setFormInstitucion({ ...formInstitucion, municipioId: parseInt(e.target.value) })}

                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"

                  required

                >

                  {catalogos.municipios.length > 0 ? (

                    catalogos.municipios.map((municipio) => (

                      <option key={municipio.id} value={municipio.id}>

                        {municipio.nombre}{municipio.departamento ? ` - ${municipio.departamento.nombre}` : ''}

                      </option>

                    ))

                  ) : (

                    <option value={1}>Cargando municipios...</option>

                  )}

                </select>

              </div>



              <div className="grid md:grid-cols-2 gap-4">

                <FormFieldInput

                  name="codigoDane"

                  label="Código DANE"

                  placeholder="Ej: 119001000123"

                  value={formInstitucion.codigoDane}

                  onChange={(e) => setFormInstitucion({ ...formInstitucion, codigoDane: e.target.value })}

                />

                

                <FormFieldInput

                  name="nit"

                  label="NIT"

                  placeholder="Ej: 800123456-7"

                  value={formInstitucion.nit}

                  onChange={(e) => setFormInstitucion({ ...formInstitucion, nit: e.target.value })}

                />

              </div>



              <FormFieldInput

                name="resolucionAprobacion"

                label="Resolución de Aprobación"

                placeholder="Resolución 001-2023"

                value={formInstitucion.resolucionAprobacion}

                onChange={(e) => setFormInstitucion({ ...formInstitucion, resolucionAprobacion: e.target.value })}

              />

            </div>

          )}



          {pasoActualFormulario === 2 && (

            <div className="space-y-4">

              <h3 className="text-lg font-semibold text-gray-800 mb-4">Información Educativa</h3>

              

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">

                  Niveles Educativos que ofrece la institución

                  <span className="text-xs text-gray-500 ml-2">(Seleccione los niveles que realmente ofrece)</span>

                </label>

                

                <div className="grid md:grid-cols-2 gap-3">

                  {(nivelesEducativosCombinados || []).map((nivel) => (

                    <label key={nivel.id || nivel.nombre} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">

                      <input

                        type="checkbox"

                        checked={(formInstitucion.nivelesEducativos || []).includes(nivel.id || nivel.nombre)}

                        onChange={(e) => {

                          const nivelesActuales = formInstitucion.nivelesEducativos || [];

                          const nivelId = nivel.id || nivel.nombre;

                          if (e.target.checked) {

                            setFormInstitucion({

                              ...formInstitucion,

                              nivelesEducativos: [...nivelesActuales, nivelId]

                            });

                          } else {

                            setFormInstitucion({

                              ...formInstitucion,

                              nivelesEducativos: nivelesActuales.filter(id => id !== nivelId)

                            });

                          }

                        }}

                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 mt-1"

                      />

                      <div className="flex-1">

                        <div className="flex items-center gap-2">

                          <div className="font-medium text-gray-800">{nivel.nombre}</div>

                          {nivel.abreviatura && (

                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">

                              {nivel.abreviatura}

                            </span>

                          )}

                          {nivel.tipo === 'personalizado' && (

                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">

                              Personalizado

                            </span>

                          )}

                        </div>

                        {nivel.descripcion && (

                          <div className="text-xs text-gray-500 mt-1">{nivel.descripcion}</div>

                        )}

                      </div>

                    </label>

                  ))}

                </div>

                

                <div className="flex items-center justify-between mt-4">

                  <div className="text-xs text-gray-500">

                    💡 Cada institución puede configurar los niveles según su capacidad real

                  </div>

                  <Button

                    variant="ghost"

                    size="sm"

                    onClick={handleOpenCreateNivel}

                    className="text-teal-600 hover:text-teal-700"

                  >

                    + Crear nivel personalizado

                  </Button>

                </div>

              </div>



              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">Modalidad</label>

                <select

                  value={formInstitucion.modalidad}

                  onChange={(e) => setFormInstitucion({ ...formInstitucion, modalidad: e.target.value })}

                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"

                >

                  {catalogos.modalidades.length > 0 ? (

                    catalogos.modalidades.map((modalidad) => (

                      <option key={modalidad.id} value={modalidad.id}>{modalidad.nombre}</option>

                    ))

                  ) : (

                    <option value="academica">Académica</option>

                  )}

                </select>

              </div>



              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">Jornadas</label>

                <div className="grid md:grid-cols-3 gap-2">

                  {(catalogos.jornadas || []).map((jornada) => (

                    <label key={jornada.id} className="flex items-center gap-2 text-sm">

                      <input

                        type="checkbox"

                        checked={(formInstitucion.jornadas || []).includes(jornada.id)}

                        onChange={(e) => {

                          const jornadasActuales = formInstitucion.jornadas || [];

                          if (e.target.checked) {

                            const nuevasJornadas = [...jornadasActuales, jornada.id];

                            console.log('[DEBUG][Jornadas] Checkbox marcado:', {

                              jornadaId: jornada.id,

                              jornadasAntes: jornadasActuales,

                              jornadasDespues: nuevasJornadas,

                              tipoJornadasDespues: typeof nuevasJornadas,

                              isArrayJornadasDespues: Array.isArray(nuevasJornadas)

                            });

                            setFormInstitucion({

                              ...formInstitucion,

                              jornadas: nuevasJornadas

                            });

                          } else {

                            const nuevasJornadas = jornadasActuales.filter(id => id !== jornada.id);

                            console.log('[DEBUG][Jornadas] Checkbox desmarcado:', {

                              jornadaId: jornada.id,

                              jornadasAntes: jornadasActuales,

                              jornadasDespues: nuevasJornadas,

                              tipoJornadasDespues: typeof nuevasJornadas,

                              isArrayJornadasDespues: Array.isArray(nuevasJornadas)

                            });

                            setFormInstitucion({

                              ...formInstitucion,

                              jornadas: nuevasJornadas

                            });

                          }

                        }}

                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"

                      />

                      {jornada.nombre}

                    </label>

                  ))}

                </div>

              </div>



              <div className="grid md:grid-cols-2 gap-4">

                <FormFieldInput

                  name="capacidadEstudiantes"

                  label="Capacidad de Estudiantes"

                  placeholder="500"

                  type="number"

                  value={formInstitucion.capacidadEstudiantes}

                  onChange={(e) => setFormInstitucion({ ...formInstitucion, capacidadEstudiantes: parseInt(e.target.value) || 0 })}

                />

                

                <FormFieldInput

                  name="anoFundacion"

                  label="Año de Fundación"

                  placeholder="1995"

                  type="number"

                  value={formInstitucion.anoFundacion}

                  onChange={(e) => setFormInstitucion({ ...formInstitucion, anoFundacion: parseInt(e.target.value) || new Date().getFullYear() })}

                />

              </div>



              <FormFieldInput

                name="enfoquePedagogico"

                label="Enfoque Pedagógico"

                placeholder="Constructivista"

                value={formInstitucion.enfoquePedagogico}

                onChange={(e) => setFormInstitucion({ ...formInstitucion, enfoquePedagogico: e.target.value })}

              />



              <FormFieldInput

                name="sitioWeb"

                label="Sitio Web"

                placeholder="https://www.colegio.edu.co"

                value={formInstitucion.sitioWeb}

                onChange={(e) => setFormInstitucion({ ...formInstitucion, sitioWeb: e.target.value })}

              />



              <FormFieldInput

                name="direccionCompleta"

                label="Dirección Completa"

                placeholder="Calle 123 #45-67"

                value={formInstitucion.direccionCompleta}

                onChange={(e) => setFormInstitucion({ ...formInstitucion, direccionCompleta: e.target.value })}

              />



              <FormFieldInput

                name="barrio"

                label="Barrio"

                placeholder="Centro"

                value={formInstitucion.barrio}

                onChange={(e) => setFormInstitucion({ ...formInstitucion, barrio: e.target.value })}

              />



              <div className="grid md:grid-cols-2 gap-4">

                <FormFieldInput

                  name="estrato"

                  label="Estrato"

                  placeholder="3"

                  type="number"

                  value={formInstitucion.estrato}

                  onChange={(e) => setFormInstitucion({ ...formInstitucion, estrato: parseInt(e.target.value) || 3 })}

                />

                

                <FormFieldInput

                  name="coordenadasGps"

                  label="Coordenadas GPS"

                  placeholder="4.6097,-74.0817"

                  value={formInstitucion.coordenadasGps}

                  onChange={(e) => setFormInstitucion({ ...formInstitucion, coordenadasGps: e.target.value })}

                />

              </div>



              <div className="grid md:grid-cols-2 gap-4">

                <FormFieldInput

                  name="resolucionAprobacion"

                  label="Resolución de Aprobación"

                  placeholder="Resolución 1234 de 2020"

                  value={formInstitucion.resolucionAprobacion}

                  onChange={(e) => setFormInstitucion({ ...formInstitucion, resolucionAprobacion: e.target.value })}

                />

              </div>

            </div>

          )}



          {pasoActualFormulario === 3 && (

            <div className="space-y-4">

              <h3 className="text-lg font-semibold text-gray-800 mb-4">Información de Contacto</h3>

              

              <div className="grid md:grid-cols-2 gap-4">

                <FormFieldInput

                  name="telefono"

                  label="Teléfono"

                  placeholder="3001234567"

                  value={formInstitucion.telefono}

                  onChange={(e) => setFormInstitucion({ ...formInstitucion, telefono: e.target.value })}

                />

                

                <FormFieldInput

                  name="correo"

                  label="Correo electrónico"

                  placeholder="institucion@correo.com"

                  type="email"

                  value={formInstitucion.correo}

                  onChange={(e) => setFormInstitucion({ ...formInstitucion, correo: e.target.value })}

                />

              </div>



              <FormFieldInput

                name="direccion"

                label="Dirección"

                placeholder="Calle 123 #45-67"

                value={formInstitucion.direccion}

                onChange={(e) => setFormInstitucion({ ...formInstitucion, direccion: e.target.value })}

              />



              <div className="grid md:grid-cols-2 gap-4">

                <FormFieldInput

                  name="telefonoPrincipal"

                  label="Teléfono Principal"

                  placeholder="3001234567"

                  value={formInstitucion.telefonoPrincipal}

                  onChange={(e) => setFormInstitucion({ ...formInstitucion, telefonoPrincipal: e.target.value })}

                />

                

                <FormFieldInput

                  name="telefonoSecretaria"

                  label="Teléfono Secretaría"

                  placeholder="3007654321"

                  value={formInstitucion.telefonoSecretaria}

                  onChange={(e) => setFormInstitucion({ ...formInstitucion, telefonoSecretaria: e.target.value })}

                />

              </div>



              <div className="grid md:grid-cols-2 gap-4">

                <FormFieldInput

                  name="correoInstitucional"

                  label="Correo Institucional"

                  placeholder="contacto@institucion.edu.co"

                  type="email"

                  value={formInstitucion.correoInstitucional}

                  onChange={(e) => setFormInstitucion({ ...formInstitucion, correoInstitucional: e.target.value })}

                />

                

                <FormFieldInput

                  name="correoRectoria"

                  label="Correo Rectoría"

                  placeholder="rector@institucion.edu.co"

                  type="email"

                  value={formInstitucion.correoRectoria}

                  onChange={(e) => setFormInstitucion({ ...formInstitucion, correoRectoria: e.target.value })}

                />

              </div>



              <FormFieldInput

                name="sitioWeb"

                label="Sitio Web"

                placeholder="https://www.institucion.edu.co"

                value={formInstitucion.sitioWeb}

                onChange={(e) => setFormInstitucion({ ...formInstitucion, sitioWeb: e.target.value })}

              />



              <div className="grid md:grid-cols-2 gap-4">

                <FormFieldInput

                  name="direccionCompleta"

                  label="Dirección Completa"

                  placeholder="Calle 123 #45-67, Barrio Centro"

                  value={formInstitucion.direccionCompleta}

                  onChange={(e) => setFormInstitucion({ ...formInstitucion, direccionCompleta: e.target.value })}

                />

                

                <FormFieldInput

                  name="barrio"

                  label="Barrio"

                  placeholder="Centro"

                  value={formInstitucion.barrio}

                  onChange={(e) => setFormInstitucion({ ...formInstitucion, barrio: e.target.value })}

                />

              </div>



              <div className="grid md:grid-cols-2 gap-4">

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">Estrato</label>

                  <select

                    value={formInstitucion.estrato}

                    onChange={(e) => setFormInstitucion({ ...formInstitucion, estrato: parseInt(e.target.value) })}

                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"

                  >

                    <option value={1}>Estrato 1</option>

                    <option value={2}>Estrato 2</option>

                    <option value={3}>Estrato 3</option>

                    <option value={4}>Estrato 4</option>

                    <option value={5}>Estrato 5</option>

                    <option value={6}>Estrato 6</option>

                  </select>

                </div>

                

                <FormFieldInput

                  name="coordenadasGps"

                  label="Coordenadas GPS"

                  placeholder="4.123456,-73.654321"

                  value={formInstitucion.coordenadasGps}

                  onChange={(e) => setFormInstitucion({ ...formInstitucion, coordenadasGps: e.target.value })}

                />

              </div>

            </div>

          )}



          {pasoActualFormulario === 4 && (

            <div className="space-y-4">

              <h3 className="text-lg font-semibold text-gray-800 mb-4">Información del Rector</h3>

              

              <div className="grid md:grid-cols-2 gap-4">

                <FormFieldInput

                  name="rectorNombre"

                  label="Nombre Completo del Rector"

                  placeholder="Juan Pérez"

                  value={formInstitucion.rectorNombre}

                  onChange={(e) => setFormInstitucion({ ...formInstitucion, rectorNombre: e.target.value })}

                />

                

                <FormFieldInput

                  name="rectorDocumento"

                  label="Documento del Rector"

                  placeholder="12345678"

                  value={formInstitucion.rectorDocumento}

                  onChange={(e) => setFormInstitucion({ ...formInstitucion, rectorDocumento: e.target.value })}

                />

              </div>

              

              <div className="grid md:grid-cols-2 gap-4">

                <FormFieldInput

                  name="rectorTelefono"

                  label="Teléfono del Rector"

                  placeholder="3009876543"

                  value={formInstitucion.rectorTelefono}

                  onChange={(e) => setFormInstitucion({ ...formInstitucion, rectorTelefono: e.target.value })}

                />

                

                <FormFieldInput

                  name="rectorCorreo"

                  label="Correo del Rector"

                  placeholder="rector@institucion.edu.co"

                  type="email"

                  value={formInstitucion.rectorCorreo}

                  onChange={(e) => setFormInstitucion({ ...formInstitucion, rectorCorreo: e.target.value })}

                />

              </div>



              <div className="border-t pt-4">

                <h4 className="font-medium text-gray-800 mb-3">Características Adicionales</h4>

                <div className="grid md:grid-cols-2 gap-4">

                  <div>

                    <label className="flex items-center gap-2 text-sm text-gray-700">

                      <input

                        type="checkbox"

                        checked={formInstitucion.confesional}

                        onChange={(e) => setFormInstitucion({ ...formInstitucion, confesional: e.target.checked })}

                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"

                      />

                      Institución confesional

                    </label>

                  </div>

                  

                  <FormFieldInput

                    name="religion"

                    label="Religión (si aplica)"

                    placeholder="Católica"

                    value={formInstitucion.religion}

                    onChange={(e) => setFormInstitucion({ ...formInstitucion, religion: e.target.value })}

                    disabled={!formInstitucion.confesional}

                  />

                </div>

              </div>

            </div>

          )}



          {pasoActualFormulario === 5 && (

            <div className="space-y-4">

              <h3 className="text-lg font-semibold text-gray-800 mb-4">🎓 Configuración de Grados y Cursos</h3>

              

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">

                <div className="text-sm text-blue-800">

                  <div className="font-medium mb-2">📋 Configura los grados y cursos para tu institución</div>

                  <p className="text-xs">Genera los grados según los niveles educativos seleccionados y luego asigna cursos a cada grado.</p>

                </div>

              </div>



              {/* Mostrar niveles seleccionados y sus grados */}

              <div className="space-y-4">

                {nivelesEducativosCombinados

                  .filter(nivel => (formInstitucion.nivelesEducativos || []).includes(nivel.id || nivel.nombre))

                  .map((nivel) => (

                    <div key={nivel.id || nivel.nombre} className="border rounded-lg p-4 bg-white">

                      <div className="flex items-center gap-3 mb-4">

                        <h4 className="font-semibold text-gray-800 text-lg">{nivel.nombre}</h4>

                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">

                          {nivel.abreviatura}

                        </span>

                        {nivel.tipo === 'personalizado' && (

                          <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">

                            Personalizado

                          </span>

                        )}

                      </div>

                      

                      {/* Botón para generar grados de este nivel */}

                      <div className="mb-4">

                        <Button

                          onClick={() => generarGradosParaNivel(nivel.id || nivel.nombre)}

                          disabled={estructuraAcademica.loadingGrados}

                          variant="outline"

                          size="sm"

                        >

                          {estructuraAcademica.loadingGrados ? 'Generando...' : `Generar grados para ${nivel.nombre}`}

                        </Button>

                        

                        {estructuraAcademica.gradosGenerados.find(g => g.nivelId === (nivel.id || nivel.nombre)) && (

                          <span className="ml-3 text-sm text-green-600">

                            ✅ Grados generados

                          </span>

                        )}

                      </div>

                      

                      {/* Mostrar grados generados y configuración de cursos */}

                      {estructuraAcademica.gradosGenerados

                        .filter(g => g.nivelId === (nivel.id || nivel.nombre))

                        .map((grupoNivel) => (

                          <div key={grupoNivel.nivelId} className="space-y-3">

                            <div className="border-l-4 border-blue-200 pl-4">

                              <h5 className="font-medium text-gray-700 mb-3">Grados de {grupoNivel.nivel}:</h5>

                              

                              {grupoNivel.grados.map((grado) => (

                                <div key={grado.id} className="mb-4 p-3 border rounded-lg bg-gray-50">

                                  <div className="flex items-center justify-between mb-2">

                                    <div className="flex items-center gap-2">

                                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">

                                        {grado.nombre}

                                      </span>

                                      <span className="text-sm text-gray-500">Grado</span>

                                    </div>

                                    

                                    <Button

                                      size="sm"

                                      variant="ghost"

                                      onClick={() => obtenerSugerenciasCursos(grado.id)}

                                      disabled={estructuraAcademica.loadingCursos}

                                    >

                                      Configurar cursos →

                                    </Button>

                                  </div>

                                  

                                  {/* Configuración de cursos para este grado */}

                                  {estructuraAcademica.cursosPorGrado[grado.id] && (

                                    <div className="mt-3 space-y-2">

                                      <div className="flex items-center justify-between mb-2">

                                        <span className="text-sm font-medium text-gray-700">

                                          Cursos para {grado.nombre}:

                                        </span>

                                        <div className="flex gap-2">

                                          <Button

                                            size="sm"

                                            variant="outline"

                                            onClick={() => agregarCursoSugerido(grado.id)}

                                          >

                                            + Agregar

                                          </Button>

                                          <Button

                                            size="sm"

                                            variant="ghost"

                                            onClick={() => obtenerSugerenciasCursos(grado.id)}

                                            disabled={estructuraAcademica.loadingCursos}

                                          >

                                            Sugerencias

                                          </Button>

                                        </div>

                                      </div>

                                      

                                      <div className="flex flex-wrap gap-2">

                                        {estructuraAcademica.cursosPorGrado[grado.id].seleccionados.map((curso, index) => (

                                          <div key={index} className="flex items-center gap-1 bg-white border rounded-lg p-2">

                                            <input

                                              type="text"

                                              value={curso.nombre}

                                              onChange={(e) => actualizarNombreCurso(grado.id, index, e.target.value)}

                                              className="w-16 px-1 py-0 text-sm border-b border-gray-300 focus:border-teal-500 focus:outline-none"

                                            />

                                            <select

                                              value={curso.jornada}

                                              onChange={(e) => actualizarJornadaCurso(grado.id, index, e.target.value)}

                                              className="text-xs px-1 py-0 border border-gray-300 rounded focus:border-teal-500 focus:outline-none"

                                            >

                                              <option value="mañana">Mañana</option>

                                              <option value="tarde">Tarde</option>

                                              <option value="completa">Completa</option>

                                            </select>

                                            <Button

                                              size="sm"

                                              variant="ghost"

                                              onClick={() => eliminarCurso(grado.id, index)}

                                              className="text-red-500 hover:text-red-700 px-1"

                                            >

                                              ×

                                            </Button>

                                          </div>

                                        ))}

                                      </div>

                                      

                                      {/* Sugerencias rápidas */}

                                      {estructuraAcademica.cursosPorGrado[grado.id].sugerencias && (

                                        <div className="mt-2">

                                          <div className="text-xs text-gray-500 mb-1">Sugerencias rápidas:</div>

                                          <div className="flex flex-wrap gap-1">

                                            {estructuraAcademica.cursosPorGrado[grado.id].sugerencias.map((sugerencia) => (

                                              <Button

                                                key={sugerencia.nombre}

                                                size="sm"

                                                variant="ghost"

                                                onClick={() => agregarCursoDesdeSugerencia(grado.id, sugerencia)}

                                                className="text-xs h-6 px-2"

                                              >

                                                {sugerencia.nombre} ({sugerencia.jornada})

                                              </Button>

                                            ))}

                                          </div>

                                        </div>

                                      )}

                                    </div>

                                  )}

                                  

                                  {/* Si no hay cursos configurados, mostrar mensaje */}

                                  {!estructuraAcademica.cursosPorGrado[grado.id] && (

                                    <div className="text-center py-3 text-gray-500 text-sm">

                                      <div className="mb-1">📚</div>

                                      <p>Sin cursos configurados</p>

                                      <p className="text-xs">Haz clic en "Configurar cursos →" para comenzar</p>

                                    </div>

                                  )}

                                </div>

                              ))}

                            </div>

                          </div>

                        ))}

                    </div>

                  ))}

              </div>



              {/* Resumen de la configuración */}

              {estructuraAcademica.gradosGenerados.length > 0 && (

                <div className="border-t pt-4">

                  <h4 className="font-medium text-gray-800 mb-3">📊 Resumen de la Configuración</h4>

                  <div className="grid md:grid-cols-3 gap-4 text-sm">

                    <div>

                      <div className="text-gray-600">Niveles seleccionados:</div>

                      <div className="font-medium text-lg">{formInstitucion.nivelesEducativos.length}</div>

                    </div>

                    <div>

                      <div className="text-gray-600">Grados generados:</div>

                      <div className="font-medium text-lg">

                        {estructuraAcademica.gradosGenerados.reduce((total, nivel) => total + nivel.grados.length, 0)}

                      </div>

                    </div>

                    <div>

                      <div className="text-gray-600">Cursos configurados:</div>

                      <div className="font-medium text-lg text-green-600">

                        {Object.values(estructuraAcademica.cursosPorGrado).reduce((total, grado) => total + grado.seleccionados.length, 0)}

                      </div>

                    </div>

                  </div>

                  

                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">

                    <div className="text-sm text-yellow-800">

                      <div className="font-medium mb-1">💡 Sugerencia:</div>

                      <p className="text-xs">Puedes continuar agregando más cursos o modificar los nombres existentes antes de crear la institución.</p>

                    </div>

                  </div>

                </div>

              )}

            </div>

          )}



          {/* Navegación del formulario */}

        <div className="flex justify-between items-center pt-6 border-t">

          <div>

            {pasoActualFormulario > 1 && (

              <Button variant="ghost" onClick={pasoAnterior}>

                ← Anterior

              </Button>

            )}

          </div>

          

          <div className="flex gap-2">

            {pasoActualFormulario < 5 ? (

              <Button onClick={siguientePaso}>

                Siguiente →

              </Button>

            ) : (

              <Button 

                onClick={editingInstitucion ? handleUpdateInstitucion : handleCreateInstitucion}

                disabled={creatingInstitucion}

              >

                {creatingInstitucion ? 'Creando...' : editingInstitucion ? 'Actualizar' : 'Crear'} Institución

              </Button>

            )}

          </div>

        </div>

      </div>

      </Modal>



      {/* Modal Crear Nivel Educativo Personalizado */}

      <Modal

        isOpen={modalNivelEducativo}

        onClose={() => {

          setModalNivelEducativo(false);

          setFormNivelEducativo({

            nombre: '',

            descripcion: '',

            abreviatura: '',

            orden: 1,

            institucionId: 1

          });

        }}

        title="Crear Nivel Educativo Personalizado"

        size="md"

      >

        <div className="space-y-4">

          <div className="grid md:grid-cols-2 gap-4">

            <FormFieldInput

              name="nombre"

              label="Nombre del Nivel *"

              placeholder="Ej: Transición Especial"

              value={formNivelEducativo.nombre}

              onChange={(e) => setFormNivelEducativo({ ...formNivelEducativo, nombre: e.target.value })}

              required

            />

            

            <FormFieldInput

              name="abreviatura"

              label="Abreviatura *"

              placeholder="Ej: TRE"

              maxLength={5}

              value={formNivelEducativo.abreviatura}

              onChange={(e) => setFormNivelEducativo({ ...formNivelEducativo, abreviatura: e.target.value.toUpperCase() })}

              required

            />

          </div>



          <FormFieldInput

            name="descripcion"

            label="Descripción"

            placeholder="Ej: Nivel para niños con necesidades especiales"

            value={formNivelEducativo.descripcion}

            onChange={(e) => setFormNivelEducativo({ ...formNivelEducativo, descripcion: e.target.value })}

          />



          <div className="grid md:grid-cols-2 gap-4">

            <FormFieldInput

              name="orden"

              label="Orden"

              type="number"

              placeholder="1"

              value={formNivelEducativo.orden}

              onChange={(e) => setFormNivelEducativo({ ...formNivelEducativo, orden: parseInt(e.target.value) || 1 })}

              min="1"

            />

            

            <FormFieldInput

              name="institucionId"

              label="ID Institución"

              type="number"

              placeholder="1"

              value={formNivelEducativo.institucionId}

              onChange={(e) => setFormNivelEducativo({ ...formNivelEducativo, institucionId: parseInt(e.target.value) || 1 })}

              min="1"

            />

          </div>



          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">

            <div className="text-sm text-blue-800">

              <div className="font-medium mb-1">💡 Información:</div>

              <ul className="text-xs space-y-1">

                <li>• Los niveles personalizados están disponibles solo para esta institución</li>

                <li>• La abreviatura se usará en reportes y documentos</li>

                <li>• El orden define la posición en listas y reportes</li>

                <li>• Puede crear niveles como "Transición Especial", "Bachillerato Acelerado", etc.</li>

              </ul>

            </div>

          </div>



          <div className="flex justify-end gap-3 pt-4 border-t">

            <Button variant="ghost" onClick={() => {

              setModalNivelEducativo(false);

              setFormNivelEducativo({

                nombre: '',

                descripcion: '',

                abreviatura: '',

                orden: 1,

                institucionId: 1

              });

            }}>

              Cancelar

            </Button>

            <Button onClick={handleCreateNivelEducativo}>

              Crear Nivel

            </Button>

          </div>

        </div>

      </Modal>



      {/* Modal Nuevo Usuario */}

      <Modal

        isOpen={modalUsuario}

        onClose={() => {

          setModalUsuario(false);

          setEditingUsuario(null);

          setFormUsuario({ nombre: '', apellidos: '', correo: '', telefono: '', documento: '', tipoDocumento: 'cc', contrasena: '', rol: 'docente_aula', institucionId: 1, telefonoEmergencia: '', personaEmergencia: '', direccion: '', esDirectorGrado: false, gradoAsignado: '', areaQueOrienta: '', centroInteres: '' });

          setError(null);

        }}

        title={editingUsuario ? 'Editar Usuario' : 'Nuevo Usuario'}

        size="lg"

      >

        <div className="space-y-4">

          <div className="grid grid-cols-2 gap-4">

            <FormFieldInput

              name="nombre"

              label="Nombre"

              placeholder="Nombre"

              value={formUsuario.nombre}

              onChange={(e) => setFormUsuario({ ...formUsuario, nombre: e.target.value })}

              required

            />

            <FormFieldInput

              name="apellidos"

              label="Apellidos"

              placeholder="Apellidos"

              value={formUsuario.apellidos}

              onChange={(e) => setFormUsuario({ ...formUsuario, apellidos: e.target.value })}

              required

            />

          </div>

          

          <div className="grid grid-cols-2 gap-4">

            <div>

              <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Documento</label>

              <select 

                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"

                value={formUsuario.tipoDocumento}

                onChange={(e) => setFormUsuario({ ...formUsuario, tipoDocumento: e.target.value as any })}

              >

                <option value="cc">Cédula</option>

                <option value="ti">Tarjeta de Identidad</option>

                <option value="ce">Cédula de Extranjería</option>

                <option value="pasaporte">Pasaporte</option>

              </select>

            </div>

            <FormFieldInput

              name="documento"

              label="Número de Documento"

              placeholder="1234567890"

              value={formUsuario.documento}

              onChange={(e) => setFormUsuario({ ...formUsuario, documento: e.target.value })}

              required

            />

          </div>



          {(formUsuario.rol === 'rector' || formUsuario.rol === 'coordinador') && (

            <FormFieldInput

              name="contrasena"

              label="Contraseña"

              type="password"

              placeholder="Mínimo 8 caracteres, mayúscula, minúscula, número y símbolo"

              value={formUsuario.contrasena}

              onChange={(e) => setFormUsuario({ ...formUsuario, contrasena: e.target.value })}

              required

            />

          )}



          <FormFieldInput

            name="correo"

            label="Correo electrónico"

            type="email"

            placeholder="usuario@correo.com"

            value={formUsuario.correo}

            onChange={(e) => setFormUsuario({ ...formUsuario, correo: e.target.value })}

            required

          />

          

          <FormFieldInput

            name="telefono"

            label={`Teléfono${(formUsuario.rol === 'rector' || formUsuario.rol === 'coordinador') ? ' (requerido, 10 dígitos)' : ''}`}

            placeholder="3001234567"

            value={formUsuario.telefono}

            onChange={(e) => setFormUsuario({ ...formUsuario, telefono: e.target.value })}

            required={formUsuario.rol === 'rector' || formUsuario.rol === 'coordinador'}

          />



          {/* Campos extendidos solo para Docente de Aula */}

          {formUsuario.rol === 'docente_aula' && (

            <>

              <div className="grid grid-cols-2 gap-4">

                <FormFieldInput

                  name="telefonoEmergencia"

                  label="Teléfono de Emergencia"

                  placeholder="Contacto de emergencia"

                  value={formUsuario.telefonoEmergencia as any}

                  onChange={(e) => setFormUsuario({ ...formUsuario, telefonoEmergencia: e.target.value })}

                />

                <FormFieldInput

                  name="personaEmergencia"

                  label="Persona de Emergencia"

                  placeholder="Nombre del contacto"

                  value={formUsuario.personaEmergencia as any}

                  onChange={(e) => setFormUsuario({ ...formUsuario, personaEmergencia: e.target.value })}

                />

              </div>



              <FormFieldInput

                name="direccion"

                label="Dirección"

                placeholder="Dirección de residencia"

                value={formUsuario.direccion as any}

                onChange={(e) => setFormUsuario({ ...formUsuario, direccion: e.target.value })}

              />



              <div className="grid grid-cols-2 gap-4 items-center">

                <label className="flex items-center gap-2 text-sm text-slate-700">

                  <input

                    type="checkbox"

                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"

                    checked={Boolean(formUsuario.esDirectorGrado)}

                    onChange={(e) => setFormUsuario({ ...formUsuario, esDirectorGrado: e.target.checked })}

                  />

                  Es director de grado

                </label>

                <FormFieldInput

                  name="gradoAsignado"

                  label="Grado Asignado"

                  placeholder="Ej: 5B o 1"

                  value={formUsuario.gradoAsignado as any}

                  onChange={(e) => setFormUsuario({ ...formUsuario, gradoAsignado: e.target.value })}

                />

              </div>



              <div className="grid grid-cols-2 gap-4">

                <FormFieldInput

                  name="areaQueOrienta"

                  label="Área que Orienta"

                  placeholder="Ej: Matemáticas"

                  value={formUsuario.areaQueOrienta as any}

                  onChange={(e) => setFormUsuario({ ...formUsuario, areaQueOrienta: e.target.value })}

                />

                <FormFieldInput

                  name="centroInteres"

                  label="Centro de Interés"

                  placeholder="Ej: Robótica"

                  value={formUsuario.centroInteres as any}

                  onChange={(e) => setFormUsuario({ ...formUsuario, centroInteres: e.target.value })}

                />

              </div>

            </>

          )}

          

          {/* Campo de contraseña - solo visible para rector y coordinador */}

          {(formUsuario.rol === 'rector' || formUsuario.rol === 'coordinador') && (

            <FormFieldInput

              name="contrasena"

              label="Contraseña inicial"

              type="password"

              placeholder="Mínimo 8 caracteres, incluir mayúscula, minúscula, número y símbolo"

              value={formUsuario.contrasena}

              onChange={(e) => setFormUsuario({ ...formUsuario, contrasena: e.target.value })}

              required

            />

          )}

          

          {/* Mensaje informativo sobre contraseña */}

          {(formUsuario.rol === 'rector' || formUsuario.rol === 'coordinador') && (

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">

              <div className="flex items-start gap-2">

                <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">

                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />

                </svg>

                <div>

                  <p className="text-sm font-medium text-amber-800">Requisitos de contraseña:</p>

                  <ul className="text-xs text-amber-700 mt-1 space-y-0.5">

                    <li>• Mínimo 8 caracteres</li>

                    <li>• Al menos 1 letra minúscula</li>

                    <li>• Al menos 1 letra mayúscula</li>

                    <li>• Al menos 1 número</li>

                    <li>• Al menos 1 carácter especial (!@#$%^&*)</li>

                  </ul>

                  <p className="text-xs text-amber-600 mt-2 font-medium">El usuario deberá cambiar esta contraseña en su primer inicio de sesión.</p>

                </div>

              </div>

            </div>

          )}



          <div className="grid grid-cols-2 gap-4">

            <div>

              <label className="block text-sm font-medium text-slate-700 mb-2">Rol</label>

              <select 

                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"

                value={formUsuario.rol}

                onChange={(e) => setFormUsuario({ ...formUsuario, rol: e.target.value as any })}

              >

                <option value="docente_aula">Docente de Aula</option>

                <option value="orientador">Orientador</option>

                <option value="coordinador">Coordinador</option>

                <option value="rector">Rector</option>

                <option value="acudiente">Acudiente</option>

              </select>

            </div>

            <div>

              <label className="block text-sm font-medium text-slate-700 mb-2">Institución</label>

              <select 

                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"

                value={formUsuario.institucionId}

                onChange={(e) => setFormUsuario({ ...formUsuario, institucionId: parseInt(e.target.value) })}

              >

                {/* Mostrar todas las instituciones - el filtro de rectores se habilitará cuando el backend tenga /usuarios */}

                {instituciones.length === 0 ? (

                  <option value="">No hay instituciones disponibles</option>

                ) : (

                  instituciones.map(inst => (

                    <option key={inst.id} value={inst.id}>{inst.nombre}</option>

                  ))

                )}

              </select>

              {(formUsuario.rol === 'rector' || formUsuario.rol === 'coordinador') && (

                <p className="text-xs text-teal-600 mt-1">

                  ℹ️ Se creará con contraseña temporal que deberá cambiar en su primer inicio de sesión

                </p>

              )}

            </div>

          </div>

          

          <div className="flex justify-end gap-3 pt-4">

            <Button variant="ghost" onClick={() => {

              setModalUsuario(false);

              setEditingUsuario(null);

              setFormUsuario({ nombre: '', apellidos: '', correo: '', telefono: '', documento: '', tipoDocumento: 'cc', contrasena: '', rol: 'docente_aula', institucionId: 1 });

              setError(null);

            }}>

              Cancelar

            </Button>

            <Button onClick={editingUsuario ? handleUpdateUsuario : handleCreateUsuario}>

              {editingUsuario ? 'Actualizar' : 'Crear'} Usuario

            </Button>

          </div>

        </div>

      </Modal>



      {/* Modal Nuevo Período */}

      <Modal

        isOpen={modalPeriodo}

        onClose={() => {

          setModalPeriodo(false);

          setEditingPeriodo(null);

          setFormPeriodo({ nombre: '', fechaInicio: '', fechaFin: '', institucionId: 1, anio: new Date().getFullYear(), estado: 'planificado' });

          setError(null);

        }}

        title={editingPeriodo ? 'Editar Período' : 'Nuevo Período'}

        size="lg"

      >

        <div className="space-y-4">

          <FormFieldInput

            name="nombre"

            label="Nombre del período"

            placeholder="Ej: Período 1 - 2024"

            value={formPeriodo.nombre}

            onChange={(e) => setFormPeriodo({ ...formPeriodo, nombre: e.target.value })}

            required

          />

          

          <div className="grid grid-cols-3 gap-4">

            <FormFieldInput

              name="fechaInicio"

              label="Fecha de inicio"

              type="date"

              value={formPeriodo.fechaInicio}

              onChange={(e) => setFormPeriodo({ ...formPeriodo, fechaInicio: e.target.value })}

              required

            />

            <FormFieldInput

              name="fechaFin"

              label="Fecha de fin"

              type="date"

              value={formPeriodo.fechaFin}

              onChange={(e) => setFormPeriodo({ ...formPeriodo, fechaFin: e.target.value })}

              required

            />

            <FormFieldInput

              name="anio"

              label="Año"

              type="number"

              value={formPeriodo.anio.toString()}

              onChange={(e) => setFormPeriodo({ ...formPeriodo, anio: parseInt(e.target.value) })}

              required

            />

          </div>



          <div className="grid grid-cols-2 gap-4">

            <div>

              <label className="block text-sm font-medium text-slate-700 mb-2">Estado</label>

              <select 

                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"

                value={formPeriodo.estado}

                onChange={(e) => setFormPeriodo({ ...formPeriodo, estado: e.target.value as any })}

              >

                <option value="planificado">Planificado</option>

                <option value="activo">Activo</option>

                <option value="cerrado">Cerrado</option>

              </select>

            </div>

            <div>

              <label className="block text-sm font-medium text-slate-700 mb-2">Institución</label>

              <select 

                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"

                value={formPeriodo.institucionId}

                onChange={(e) => setFormPeriodo({ ...formPeriodo, institucionId: parseInt(e.target.value) })}

              >

                {instituciones.map(inst => (

                  <option key={inst.id} value={inst.id}>{inst.nombre}</option>

                ))}

              </select>

            </div>

          </div>

          

          <div className="flex justify-end gap-3 pt-4">

            <Button variant="ghost" onClick={() => {

              setModalPeriodo(false);

              setEditingPeriodo(null);

              setFormPeriodo({ nombre: '', fechaInicio: '', fechaFin: '', institucionId: 1, anio: new Date().getFullYear(), estado: 'planificado' });

              setError(null);

            }}>

              Cancelar

            </Button>

            <Button onClick={editingPeriodo ? handleUpdatePeriodo : handleCreatePeriodo}>

              {editingPeriodo ? 'Actualizar' : 'Crear'} Período

            </Button>

          </div>

        </div>

      </Modal>



      {/* Modal Nuevo Grado */}

      <Modal

        isOpen={modalGrado}

        onClose={() => {

          setModalGrado(false);

          setEditingGrado(null);

          setFormGrado({ nombre: '', orden: 0, institucionId: 1 });

          setError(null);

        }}

        title={editingGrado ? 'Editar Grado' : 'Nuevo Grado'}

        size="md"

      >

        <div className="space-y-4">

          <FormFieldInput

            name="nombre"

            label="Nombre del grado"

            placeholder="Ej: 1° Primaria, 6° Bachillerato"

            value={formGrado.nombre}

            onChange={(e) => setFormGrado({ ...formGrado, nombre: e.target.value })}

            required

          />

          

          <div className="grid grid-cols-2 gap-4">

            <FormFieldInput

              name="orden"

              label="Orden"

              type="number"

              placeholder="1"

              value={formGrado.orden.toString()}

              onChange={(e) => setFormGrado({ ...formGrado, orden: parseInt(e.target.value) || 0 })}

              required

            />

            <div>

              <label className="block text-sm font-medium text-slate-700 mb-2">Institución</label>

              <select 

                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"

                value={formGrado.institucionId}

                onChange={(e) => setFormGrado({ ...formGrado, institucionId: parseInt(e.target.value) })}

              >

                {instituciones.map(inst => (

                  <option key={inst.id} value={inst.id}>{inst.nombre}</option>

                ))}

              </select>

            </div>

          </div>

          

          <div className="flex justify-end gap-3 pt-4">

            <Button variant="ghost" onClick={() => {

              setModalGrado(false);

              setEditingGrado(null);

              setFormGrado({ nombre: '', orden: 0, institucionId: 1 });

              setError(null);

            }}>

              Cancelar

            </Button>

            <Button onClick={editingGrado ? handleUpdateGrado : handleCreateGrado}>

              {editingGrado ? 'Actualizar' : 'Crear'} Grado

            </Button>

          </div>

        </div>

      </Modal>



      {/* Modal Nuevo Curso */}

      <Modal

        isOpen={modalCurso}

        onClose={() => {

          setModalCurso(false);

          setEditingCurso(null);

          setFormCurso({ nombre: '', gradoId: 1, jornada: 'mañana', institucionId: 1, docenteDirectorId: undefined });

          setError(null);

        }}

        title={editingCurso ? 'Editar Curso' : 'Nuevo Curso'}

        size="lg"

      >

        <div className="space-y-4">

          <FormFieldInput

            name="nombre"

            label="Nombre del curso"

            placeholder="Ej: 6-A, 10-B"

            value={formCurso.nombre}

            onChange={(e) => setFormCurso({ ...formCurso, nombre: e.target.value })}

            required

          />

          

          <div className="grid grid-cols-3 gap-4">

            <div>

              <label className="block text-sm font-medium text-slate-700 mb-2">Grado</label>

              <select 

                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"

                value={formCurso.gradoId}

                onChange={(e) => setFormCurso({ ...formCurso, gradoId: parseInt(e.target.value) })}

              >

                {grados.map(grado => (

                  <option key={grado.id} value={grado.id}>{grado.nombre}</option>

                ))}

              </select>

            </div>

            <div>

              <label className="block text-sm font-medium text-slate-700 mb-2">Jornada</label>

              <select 

                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"

                value={formCurso.jornada}

                onChange={(e) => setFormCurso({ ...formCurso, jornada: e.target.value as any })}

              >

                <option value="mañana">Mañana</option>

                <option value="tarde">Tarde</option>

                <option value="completa">Completa</option>

              </select>

            </div>

            <div>

              <label className="block text-sm font-medium text-slate-700 mb-2">Institución</label>

              <select 

                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"

                value={formCurso.institucionId}

                onChange={(e) => setFormCurso({ ...formCurso, institucionId: parseInt(e.target.value) })}

              >

                {instituciones.map(inst => (

                  <option key={inst.id} value={inst.id}>{inst.nombre}</option>

                ))}

              </select>

            </div>

          </div>



          <div>

            <label className="block text-sm font-medium text-slate-700 mb-2">Director de Curso (Opcional)</label>

            <select 

              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"

              value={formCurso.docenteDirectorId || ''}

              onChange={(e) => setFormCurso({ ...formCurso, docenteDirectorId: e.target.value ? parseInt(e.target.value) : undefined })}

            >

              <option value="">Sin asignar</option>

              {usuarios.filter(u => u.rol === 'docente_aula' && u.institucionId === formCurso.institucionId).map(docente => (

                <option key={docente.id} value={docente.id}>{docente.nombre} {docente.apellidos}</option>

              ))}

            </select>

          </div>

          

          <div className="flex justify-end gap-3 pt-4">

            <Button variant="ghost" onClick={() => {

              setModalCurso(false);

              setEditingCurso(null);

              setFormCurso({ nombre: '', gradoId: 1, jornada: 'mañana', institucionId: 1, docenteDirectorId: undefined });

              setError(null);

            }}>

              Cancelar

            </Button>

            <Button onClick={editingCurso ? handleUpdateCurso : handleCreateCurso}>

              {editingCurso ? 'Actualizar' : 'Crear'} Curso

            </Button>

          </div>

        </div>

      </Modal>



      {/* Modal Institución Completa */}

      <Modal

        isOpen={modalInstitucionCompleta}

        onClose={() => {

          setModalInstitucionCompleta(false);

          setFormInstitucionCompleta({

            institucion: {

              nombre: '',

              naturaleza: 'privada',

              municipioId: 1,

              codigoDane: '',

              nit: '',

              telefono: '',

              correo: '',

              direccion: '',

              telefonoPrincipal: '',

              telefonoSecretaria: '',

              correoInstitucional: '',

              correoRectoria: '',

              sitioWeb: '',

              direccionCompleta: '',

              barrio: '',

              estrato: 4,

              coordenadasGps: '',

              capacidadEstudiantes: 300,

              anoFundacion: new Date().getFullYear(),

              enfoquePedagogico: '',

              confesional: false,

              religion: '',

              rectorNombre: '',

              rectorDocumento: '',

              rectorTelefono: '',

              rectorCorreo: '',

              jornadas: [],

              modalidad: 'academica',

              nivelesEducativos: []

            },

            grados: []

          });

        }}

        title="Nueva Institución Completa"

        size="full"

      >

        <div className="max-h-[80vh] overflow-y-auto">

          {/* Sección 1: Datos Básicos de la Institución */}

          <div className="mb-8">

            <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b">🏫 Datos Básicos de la Institución</h3>

            

            <div className="grid md:grid-cols-2 gap-4">

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>

                <input

                  type="text"

                  value={formInstitucionCompleta.institucion.nombre}

                  onChange={(e) => actualizarInstitucion('nombre', e.target.value)}

                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"

                  placeholder="Colegio Ejemplo"

                  required

                />

              </div>

              

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">Naturaleza *</label>

                <select

                  value={formInstitucionCompleta.institucion.naturaleza}

                  onChange={(e) => actualizarInstitucion('naturaleza', e.target.value)}

                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"

                  required

                >

                  <option value="publica">Pública</option>

                  <option value="privada">Privada</option>

                </select>

              </div>

              

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">Municipio *</label>

                <select

                  value={formInstitucionCompleta.institucion.municipioId}

                  onChange={(e) => actualizarInstitucion('municipioId', parseInt(e.target.value))}

                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"

                  required

                >

                  <option value="">Seleccionar municipio</option>

                  {catalogos.municipios.map(municipio => (

                    <option key={municipio.id} value={municipio.id}>{municipio.nombre}</option>

                  ))}

                </select>

                {/* Debug info */}

                <div className="text-xs text-gray-500 mt-1">

                  Debug: {catalogos.municipios.length} municipios cargados

                </div>

              </div>

              

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">Código DANE</label>

                <input

                  type="text"

                  value={formInstitucionCompleta.institucion.codigoDane}

                  onChange={(e) => actualizarInstitucion('codigoDane', e.target.value)}

                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"

                  placeholder="119000001"

                />

              </div>

              

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">NIT</label>

                <input

                  type="text"

                  value={formInstitucionCompleta.institucion.nit}

                  onChange={(e) => actualizarInstitucion('nit', e.target.value)}

                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"

                  placeholder="8000001-8"

                />

              </div>

              

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>

                <input

                  type="tel"

                  value={formInstitucionCompleta.institucion.telefono}

                  onChange={(e) => actualizarInstitucion('telefono', e.target.value)}

                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"

                  placeholder="3001234567"

                />

              </div>

              

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">Correo</label>

                <input

                  type="email"

                  value={formInstitucionCompleta.institucion.correo}

                  onChange={(e) => actualizarInstitucion('correo', e.target.value)}

                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"

                  placeholder="colegio@ejemplo.com"

                />

              </div>

              

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">Dirección</label>

                <input

                  type="text"

                  value={formInstitucionCompleta.institucion.direccion}

                  onChange={(e) => actualizarInstitucion('direccion', e.target.value)}

                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"

                  placeholder="Calle 5 # 10-20"

                />

              </div>

              

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono Principal</label>

                <input

                  type="tel"

                  value={formInstitucionCompleta.institucion.telefonoPrincipal}

                  onChange={(e) => actualizarInstitucion('telefonoPrincipal', e.target.value)}

                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"

                  placeholder="3033243"

                />

              </div>

              

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">Correo Institucional</label>

                <input

                  type="email"

                  value={formInstitucionCompleta.institucion.correoInstitucional}

                  onChange={(e) => actualizarInstitucion('correoInstitucional', e.target.value)}

                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"

                  placeholder="colegio@edu.co"

                />

              </div>

            </div>

          </div>



          {/* Sección 2: Datos del Rector */}

          <div className="mb-8">

            <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b">👨‍🎓 Datos del Rector</h3>

            

            <div className="grid md:grid-cols-2 gap-4">

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Rector *</label>

                <input

                  type="text"

                  value={formInstitucionCompleta.institucion.rectorNombre}

                  onChange={(e) => actualizarInstitucion('rectorNombre', e.target.value)}

                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"

                  placeholder="Juan Pérez"

                  required

                />

              </div>

              

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">Documento del Rector *</label>

                <input

                  type="text"

                  value={formInstitucionCompleta.institucion.rectorDocumento}

                  onChange={(e) => actualizarInstitucion('rectorDocumento', e.target.value)}

                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"

                  placeholder="12345678"

                  required

                />

              </div>

              

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono del Rector *</label>

                <input

                  type="tel"

                  value={formInstitucionCompleta.institucion.rectorTelefono}

                  onChange={(e) => actualizarInstitucion('rectorTelefono', e.target.value)}

                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"

                  placeholder="3001234567"

                  required

                />

              </div>

              

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">Correo del Rector *</label>

                <input

                  type="email"

                  value={formInstitucionCompleta.institucion.rectorCorreo}

                  onChange={(e) => actualizarInstitucion('rectorCorreo', e.target.value)}

                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"

                  placeholder="rector@colegio.edu"

                  required

                />

              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña inicial del Rector (opcional)</label>
                <input
                  type="password"
                  value={formInstitucionCompleta.institucion.rectorContrasena}
                  onChange={(e) => actualizarInstitucion('rectorContrasena', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Ej: Temp123456"
                />
                <div className="text-xs text-gray-500 mt-1">Si no se establece, se usará una contraseña temporal y se pedirá cambio al primer inicio de sesión.</div>
              </div>

            </div>

          </div>



          {/* Sección 3: Configuración Académica */}

          <div className="mb-8">

            <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b">📚 Configuración Académica</h3>

            

            <div className="grid md:grid-cols-2 gap-6">

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">Jornadas *</label>

                <div className="space-y-2">

                  {catalogos.jornadas.map(jornada => (

                    <label key={jornada.id} className="flex items-center">

                      <input

                        type="checkbox"

                        checked={formInstitucionCompleta.institucion.jornadas.includes(jornada.id)}

                        onChange={() => toggleJornada(jornada.id)}

                        className="mr-2"

                      />

                      {jornada.nombre}

                    </label>

                  ))}

                </div>

              </div>

              

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">Niveles Educativos *</label>

                <div className="space-y-2">

                  {nivelesEducativosCombinados.map(nivel => (

                    <label key={nivel.id || nivel.nombre} className="flex items-center">

                      <input

                        type="checkbox"

                        checked={formInstitucionCompleta.institucion.nivelesEducativos.includes(nivel.nombre)}

                        onChange={() => toggleNivelEducativo(nivel.nombre)}

                        className="mr-2"

                      />

                      {nivel.nombre}

                    </label>

                  ))}

                </div>

              </div>

            </div>

            

            <div className="mt-4">

              <label className="block text-sm font-medium text-gray-700 mb-2">Modalidad *</label>

              <select

                value={formInstitucionCompleta.institucion.modalidad}

                onChange={(e) => actualizarInstitucion('modalidad', e.target.value)}

                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"

                required

              >

                <option value="academica">Académica</option>

                <option value="tecnica">Técnica</option>

                <option value="artistica">Artística</option>

              </select>

            </div>

          </div>



          {/* Sección 4: Grados y Cursos */}

          <div className="mb-8">

            <div className="flex justify-between items-center mb-4 pb-2 border-b">

              <h3 className="text-xl font-semibold text-gray-800">📓 Grados y Cursos</h3>

              <button

                onClick={agregarGradoCompleto}

                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"

              >

                + Agregar Grado

              </button>

            </div>

            

            {formInstitucionCompleta.grados.map((grado, gradoIndex) => (

              <div key={gradoIndex} className="mb-6 p-4 border border-gray-200 rounded-lg">

                <div className="flex justify-between items-start mb-4">

                  <h4 className="text-lg font-medium text-gray-700">Grado {gradoIndex + 1}</h4>

                  <button

                    onClick={() => eliminarGradoCompleto(gradoIndex)}

                    className="text-red-600 hover:text-red-800"

                  >

                    Eliminar Grado

                  </button>

                </div>

                

                <div className="grid md:grid-cols-3 gap-4 mb-4">

                  <div>

                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Grado *</label>

                    <input

                      type="text"

                      value={grado.nombre}

                      onChange={(e) => actualizarGradoCompleto(gradoIndex, 'nombre', e.target.value)}

                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"

                      placeholder="10°"

                      required

                    />

                  </div>

                  

                  <div>

                    <label className="block text-sm font-medium text-gray-700 mb-2">Orden *</label>

                    <input

                      type="number"

                      value={grado.orden}

                      onChange={(e) => actualizarGradoCompleto(gradoIndex, 'orden', parseInt(e.target.value))}

                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"

                      placeholder="10"

                      required

                    />

                  </div>

                  

                  <div className="flex items-end">

                    <button

                      onClick={() => agregarCursoCompleto(gradoIndex)}

                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"

                    >

                      + Agregar Curso

                    </button>

                  </div>

                </div>

                

                {/* Cursos del grado */}

                <div className="space-y-2">

                  <h5 className="text-sm font-medium text-gray-600">Cursos:</h5>

                  {grado.cursos.map((curso, cursoIndex) => (

                    <div key={cursoIndex} className="flex gap-2 items-center p-2 bg-gray-50 rounded">

                      <input

                        type="text"

                        value={curso.nombre}

                        onChange={(e) => actualizarCursoCompleto(gradoIndex, cursoIndex, 'nombre', e.target.value)}

                        className="flex-1 px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"

                        placeholder="10A"

                        required

                      />

                      

                      <select

                        value={curso.jornada}

                        onChange={(e) => actualizarCursoCompleto(gradoIndex, cursoIndex, 'jornada', e.target.value)}

                        className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"

                        required

                      >

                        <option value="manana">Mañana</option>

                        <option value="tarde">Tarde</option>

                        <option value="noche">Noche</option>

                        <option value="completa">Completa</option>

                      </select>

                      

                      <button

                        onClick={() => eliminarCursoCompleto(gradoIndex, cursoIndex)}

                        className="text-red-600 hover:text-red-800"

                      >

                        Eliminar

                      </button>

                    </div>

                  ))}

                  

                  {grado.cursos.length === 0 && (

                    <p className="text-gray-500 text-sm">No hay cursos configurados</p>

                  )}

                </div>

              </div>

            ))}

            

            {formInstitucionCompleta.grados.length === 0 && (

              <p className="text-gray-500 text-center py-4">No hay grados configurados. Agrega al menos un grado.</p>

            )}

          </div>



          {/* Botones de acción */}

          <div className="flex justify-end gap-4 pt-6 border-t">

            <button

              onClick={() => setModalInstitucionCompleta(false)}

              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"

            >

              Cancelar

            </button>

            <button

              onClick={handleCreateInstitucionCompleta}

              disabled={creatingInstitucion || !formInstitucionCompleta.institucion.nombre || !formInstitucionCompleta.institucion.rectorNombre || formInstitucionCompleta.grados.length === 0}

              className="px-6 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"

            >

              {creatingInstitucion ? 'Creando...' : 'Crear Institución Completa'}

            </button>

          </div>

        </div>

      </Modal>

    </DashboardLayout>

  );

}

