import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession } from '../api/endpoints';
import { httpService } from '../api/httpService';
import { createCategoria, createTarea, getCategorias, getTareaById, getTareas } from '../api/endpointsDocente-orinetador';
import DashboardLayout from '../components/DashboardLayout';
import OrientadorLayout from '../components/orientador-acudiente/OrientadorLayout';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { IconPlus, IconFileText, IconUsers, IconBook, IconEdit, IconTrash, IconEye, IconUpload } from '../components/ui/Icons';
 import Swal from 'sweetalert2';

// ⚠️ DATOS HARDCODEADOS TEMPORALES - Mientras el backend configura las categorías
const CATEGORIAS_MOCK = [
  { id: 1, nombre: 'Valores y Convivencia' },
  { id: 2, nombre: 'Desarrollo Personal' },
  { id: 3, nombre: 'Comunicación Familiar' },
  { id: 4, nombre: 'Resolución de Conflictos' },
  { id: 5, nombre: 'Acompañamiento Académico' }
];

const GRADOS = [
  { id: 1, nombre: 'Primero' },
  { id: 2, nombre: 'Segundo' },
  { id: 3, nombre: 'Tercero' },
  { id: 4, nombre: 'Cuarto' },
  { id: 5, nombre: 'Quinto' },
  { id: 6, nombre: 'Sexto' },
  { id: 7, nombre: 'Séptimo' },
  { id: 8, nombre: 'Octavo' },
  { id: 9, nombre: 'Noveno' },
  { id: 10, nombre: 'Décimo' },
  { id: 11, nombre: 'Once' }
];

interface BancoTarea {
  id: number;
  titulo: string;
  descripcion: string;
  enlace: string | null;
  categoriaId: number;
  tema: string | null;
  entregableEsperado: string | null;
  gradosObjetivo: number[] | null;
  esMultiGrado: boolean;
  tipoCalificacion: 'cualitativa' | 'cuantitativa';
  criteriosAutomaticos: any | null;
  vecesUtilizada: number;
  creadoEn: string;
  actualizadoEn: string;
  archivoUrl?: string | null;
  archivo_url?: string | null;
  archivo?: string | null;
  // Institución (para separar "Mi institución" vs "Otras")
  institucionId?: number;
  institucion?: { id: number; nombre: string } | null;
}

export default function TareasPage() {
  const session = getSession();
  const user = session?.user;
  const userRole = user?.rol;

  const Layout = userRole === 'orientador' ? OrientadorLayout : DashboardLayout;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [tareas, setTareas] = useState<BancoTarea[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<number | null>(null);
  const [modalCrear, setModalCrear] = useState(false);
  const [modalCategoria, setModalCategoria] = useState(false);
  const [modalAsignar, setModalAsignar] = useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = useState<BancoTarea | null>(null);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [tareaDetalle, setTareaDetalle] = useState<BancoTarea | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [fileBlobUrl, setFileBlobUrl] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);

  const [categorias, setCategorias] = useState<{ id: number; nombre: string }[]>(CATEGORIAS_MOCK);

  const [savingCategoria, setSavingCategoria] = useState(false);
  const [savingTarea, setSavingTarea] = useState(false);
  const [formCategoria, setFormCategoria] = useState({
    nombre: '',
    descripcion: '',
    icono: '',
  });

  // Formulario para crear tarea
  const [formTarea, setFormTarea] = useState({
    titulo: '',
    descripcion: '',
    categoriaId: '',
    enlace: '',
    entregableEsperado: '',
    gradosObjetivo: [] as number[],
    esMultiGrado: false,
    tipoCalificacion: 'cualitativa' as 'cualitativa' | 'cuantitativa',
  });

  const [archivoTarea, setArchivoTarea] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadTareas();
    loadCategorias();
  }, []);

  useEffect(() => {
    return () => {
      if (fileBlobUrl) URL.revokeObjectURL(fileBlobUrl);
    };
  }, [fileBlobUrl]);

  const normalizeTarea = (raw: any): BancoTarea => {
    const categoriaId = Number(raw?.categoriaId ?? raw?.categoria_id ?? 0);

    const gradosRaw = raw?.gradosObjetivo ?? raw?.grados_objetivo;
    const gradosObjetivo: number[] | null =
      Array.isArray(gradosRaw)
        ? gradosRaw.map((x: any) => Number(x)).filter((x: any) => Number.isFinite(x))
        : typeof gradosRaw === 'string' && gradosRaw.trim() !== ''
          ? (() => {
              try {
                const parsed = JSON.parse(gradosRaw);
                return Array.isArray(parsed) ? parsed.map((x: any) => Number(x)).filter((x: any) => Number.isFinite(x)) : null;
              } catch {
                return null;
              }
            })()
          : null;

    const esMultiRaw = raw?.esMultiGrado ?? raw?.es_multi_grado;
    const esMultiGrado = typeof esMultiRaw === 'boolean' ? esMultiRaw : String(esMultiRaw) === 'true';

    return {
      id: Number(raw?.id),
      titulo: raw?.titulo ?? '',
      descripcion: raw?.descripcion ?? '',
      enlace: raw?.enlace ?? null,
      categoriaId,
      tema: raw?.tema ?? null,
      entregableEsperado: raw?.entregableEsperado ?? raw?.entregable_esperado ?? null,
      gradosObjetivo,
      esMultiGrado,
      tipoCalificacion: (raw?.tipoCalificacion ?? raw?.tipo_calificacion ?? 'cualitativa') as any,
      criteriosAutomaticos: raw?.criteriosAutomaticos ?? raw?.criterios_automaticos ?? null,
      vecesUtilizada: Number(raw?.vecesUtilizada ?? raw?.veces_utilizada ?? 0),
      creadoEn: raw?.creadoEn ?? raw?.creado_en ?? '',
      actualizadoEn: raw?.actualizadoEn ?? raw?.actualizado_en ?? '',
      archivoUrl: raw?.archivoUrl ?? raw?.archivo_url ?? raw?.archivo ?? null,
      archivo_url: raw?.archivo_url ?? null,
      archivo: raw?.archivo ?? null,
    };
  };

  const loadCategorias = async () => {
    try {
      const result = await getCategorias();
      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        const mapped = result.data
          .map((c: any) => ({
            id: Number(c.id),
            nombre: c.nombre || ''
          }))
          .filter((c: any) => !!c.nombre);
        setCategorias(mapped.length > 0 ? mapped : CATEGORIAS_MOCK);
        return;
      }

      setCategorias(CATEGORIAS_MOCK);
    } catch (e) {
      setCategorias(CATEGORIAS_MOCK);
    }
  };

  const loadTareas = async () => {
    try {
      setLoading(true);
      console.log('📞 [Tareas] Cargando tareas del banco...');
      
      const result = await getTareas();
      console.log('📥 [Tareas] Respuesta:', result);
      
      if (result.success && result.data) {
        const normalized = (result.data || []).map((t: any) => normalizeTarea(t));
        setTareas(normalized);
        console.log('✅ [Tareas] Tareas cargadas:', normalized.length);
      } else {
        console.warn('⚠️ [Tareas] No se pudieron cargar las tareas');
        setTareas([]);
      }
    } catch (error) {
      console.error('❌ [Tareas] Error al cargar tareas:', error);
      setTareas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearTarea = async () => {
    try {
      if (savingTarea) return;
      console.log('📤 [Tareas] Creando tarea:', formTarea);
      
      // Validaciones básicas
      if (!formTarea.titulo.trim() || !formTarea.descripcion.trim()) {
        await Swal.fire({
          title: 'Datos incompletos',
          text: 'El título y la descripción son obligatorios',
          icon: 'warning',
          confirmButtonText: 'OK',
          confirmButtonColor: '#4f46e5'
        });
        return;
      }

      const categoriaIdNum = Number(formTarea.categoriaId);
      if (!Number.isFinite(categoriaIdNum) || categoriaIdNum <= 0) {
        await Swal.fire({
          title: 'Datos incompletos',
          text: 'Debes seleccionar una categoría',
          icon: 'warning',
          confirmButtonText: 'OK',
          confirmButtonColor: '#4f46e5'
        });
        return;
      }

      setSavingTarea(true);

      const enlaceTrim = formTarea.enlace.trim();
      const hasFile = Boolean(archivoTarea);
      const hasLink = Boolean(enlaceTrim);
      const isExternalLink = /^https?:\/\//i.test(enlaceTrim);

      if (hasFile && hasLink) {
        await Swal.fire({
          title: 'Adjunto inválido',
          text: 'Debes elegir SOLO uno: enlace externo o archivo.',
          icon: 'warning',
          confirmButtonText: 'OK',
          confirmButtonColor: '#4f46e5'
        });
        return;
      }

      let payload: Record<string, any> | FormData;

      // Caso A: LINK externo -> JSON
      if (hasLink && isExternalLink && !hasFile) {
        payload = {
          titulo: formTarea.titulo.trim(),
          descripcion: formTarea.descripcion.trim(),
          categoriaId: categoriaIdNum,
          enlace: enlaceTrim,
          entregableEsperado: formTarea.entregableEsperado.trim() ? formTarea.entregableEsperado.trim() : undefined,
          gradosObjetivo: formTarea.gradosObjetivo.length > 0 ? formTarea.gradosObjetivo : undefined,
          esMultiGrado: Boolean(formTarea.esMultiGrado),
          tipoCalificacion: formTarea.tipoCalificacion,
        };
      } else {
        // Caso B: ARCHIVO real (multipart) o enlace interno/otro string (también multipart para mantener compatibilidad)
        const fd = new FormData();
        fd.append('titulo', formTarea.titulo.trim());
        fd.append('descripcion', formTarea.descripcion.trim());
        fd.append('categoriaId', String(categoriaIdNum));

        if (hasLink) fd.append('enlace', enlaceTrim);
        if (formTarea.entregableEsperado.trim()) fd.append('entregableEsperado', formTarea.entregableEsperado.trim());
        if (formTarea.gradosObjetivo.length > 0) fd.append('gradosObjetivo', JSON.stringify(formTarea.gradosObjetivo));
        fd.append('esMultiGrado', String(Boolean(formTarea.esMultiGrado)));
        fd.append('tipoCalificacion', formTarea.tipoCalificacion);

        if (archivoTarea) {
          fd.append('archivo', archivoTarea);
        }

        payload = fd;
      }

      const result = await createTarea(payload);
      console.log('📥 [Tareas] Respuesta crear:', result);

      if (result.success) {
        const createdId = Number((result as any)?.data?.id ?? (result as any)?.id ?? 0);
        await Swal.fire({
          title: 'Tarea creada correctamente',
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#4f46e5'
        });
        setModalCrear(false);
        resetForm();
        loadTareas();
        // Ofrecer asignar inmediatamente si el usuario es orientador o docente
        if ((userRole === 'orientador' || userRole === 'docente_aula') && Number.isFinite(createdId) && createdId > 0) {
          try {
            const r = await Swal.fire({
              title: '¿Asignar ahora?',
              text: 'Para que los acudientes la vean, debes asignarla a curso(s) y período.',
              icon: 'question',
              showCancelButton: true,
              cancelButtonText: 'Luego',
              confirmButtonText: 'Asignar',
              confirmButtonColor: '#0f766e'
            });
            if (r.isConfirmed) {
              navigate(`/asignaciones/nueva?bancoTareaId=${createdId}`);
            }
          } catch {}
        }
      } else {
        const status = (result as any)?.status;
        const msg = result.message || 'Error al crear la tarea';

        if (status === 401) {
          await Swal.fire({
            title: 'Sesión expirada',
            text: 'Debes iniciar sesión nuevamente',
            icon: 'warning',
            confirmButtonText: 'Ir a login',
            confirmButtonColor: '#4f46e5'
          });
          window.location.href = '/login';
          return;
        }

        await Swal.fire({
          title: 'No se pudo crear la tarea',
          text: msg,
          icon: status === 403 ? 'info' : 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#4f46e5'
        });
      }
    } catch (error) {
      console.error('❌ [Tareas] Error al crear tarea:', error);
      const msg = (error as any)?.message || 'Error al crear la tarea';
      await Swal.fire({
        title: 'Error',
        text: msg,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#4f46e5'
      });
    } finally {
      setSavingTarea(false);
    }
  };

  const resetForm = () => {
    setFormTarea({
      titulo: '',
      descripcion: '',
      categoriaId: '',
      enlace: '',
      entregableEsperado: '',
      gradosObjetivo: [],
      esMultiGrado: false,
      tipoCalificacion: 'cualitativa',
    });
    setArchivoTarea(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resetFormCategoria = () => {
    setFormCategoria({
      nombre: '',
      descripcion: '',
      icono: '',
    });
  };

  const handleCrearCategoria = async () => {
    const nombre = formCategoria.nombre.trim();
    if (!nombre || nombre.length < 2) {
      alert('El nombre de la categoría es obligatorio (mínimo 2 caracteres)');
      return;
    }

    const nombreLower = nombre.toLowerCase();
    const existeLocal = categorias.some((c) => (c?.nombre || '').trim().toLowerCase() === nombreLower);
    if (existeLocal) {
      alert('Ya existe una categoría con ese nombre');
      return;
    }

    setSavingCategoria(true);
    try {
      const result = await createCategoria({
        nombre,
        descripcion: formCategoria.descripcion.trim() ? formCategoria.descripcion.trim() : null,
        icono: formCategoria.icono.trim() ? formCategoria.icono.trim() : null,
      });

      if (result.success) {
        await Swal.fire({
          title: 'Categoría creada',
          text: 'Ya se creó la categoría.',
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#4f46e5'
        });
        setModalCategoria(false);
        resetFormCategoria();
        await loadCategorias();
      } else {
        const msg = result.message || 'No se pudo crear la categoría';
        const isDuplicada =
          msg.toLowerCase().includes('categorias_nombre_key') ||
          msg.toLowerCase().includes('llave duplicada') ||
          msg.toLowerCase().includes('duplicate key') ||
          msg.toLowerCase().includes('unique') ||
          msg.toLowerCase().includes('unicidad');
        if (isDuplicada) {
          alert('Ya existe una categoría con ese nombre');
        } else {
          alert(`❌ Error: ${msg}`);
        }
      }
    } catch (e: any) {
      const msg = e?.message || 'Error al crear la categoría';
      const isDuplicada =
        String(msg).toLowerCase().includes('categorias_nombre_key') ||
        String(msg).toLowerCase().includes('llave duplicada') ||
        String(msg).toLowerCase().includes('duplicate key') ||
        String(msg).toLowerCase().includes('unique') ||
        String(msg).toLowerCase().includes('unicidad');
      if (isDuplicada) {
        alert('Ya existe una categoría con ese nombre');
      } else {
        alert(msg);
      }
    } finally {
      setSavingCategoria(false);
    }
  };

  const handleAsignarTarea = (tarea: BancoTarea) => {
    // Navegar a la pantalla de creación con la tarea preseleccionada
    navigate(`/asignaciones/nueva?bancoTareaId=${Number(tarea.id) || 0}`);
  };

  const handleVerDetalleTarea = async (tarea: BancoTarea) => {
    setModalDetalle(true);
    setLoadingDetalle(true);
    setTareaDetalle(null);

    const res = await getTareaById(tarea.id);
    if (!res.success) {
      const status = (res as any)?.status;
      const msg = res.message || 'No se pudo cargar el detalle de la tarea';

      if (status === 401) {
        await Swal.fire({
          title: 'Sesión expirada',
          text: 'Debes iniciar sesión nuevamente',
          icon: 'warning',
          confirmButtonText: 'Ir a login',
          confirmButtonColor: '#4f46e5'
        });
        window.location.href = '/login';
        return;
      }

      if (status === 404) {
        await Swal.fire({
          title: 'Tarea no encontrada',
          text: msg,
          icon: 'info',
          confirmButtonText: 'OK',
          confirmButtonColor: '#4f46e5'
        });
        setModalDetalle(false);
        return;
      }

      await Swal.fire({
        title: 'Error',
        text: msg,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#4f46e5'
      });
      setModalDetalle(false);
      return;
    }

    setTareaDetalle(normalizeTarea(res.data));
    setLoadingDetalle(false);
  };

  const tareasFiltradas = tareas.filter(tarea => {
    const matchBusqueda = !busqueda || 
      tarea.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      tarea.tema?.toLowerCase().includes(busqueda.toLowerCase());
    
    const matchCategoria = !categoriaFiltro || tarea.categoriaId === categoriaFiltro;
    
    return matchBusqueda && matchCategoria;
  });

  const getCategoriaName = (id: number) => {
    return categorias.find(c => c.id === id)?.nombre || CATEGORIAS_MOCK.find(c => c.id === id)?.nombre || 'Sin categoría';
  };

  const buildFileUrl = (pathOrUrl: string) => {
    if (!pathOrUrl) return '';
    if (pathOrUrl.startsWith('http')) return pathOrUrl;
    const base = '/api';
    const normalizedPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
    return `${base}${normalizedPath}`;
  };

  const isExternalUrl = (value: string) => /^https?:\/\//i.test(value);

  const isBackendStoredUploadPath = (value: string) => {
    const v = (value || '').trim().toLowerCase();
    return v.startsWith('/uploads/') || v.startsWith('uploads/');
  };

  const getToken = (): string | null => {
    try {
      const sessionRaw = localStorage.getItem('session');
      if (!sessionRaw) return null;
      const parsed = JSON.parse(sessionRaw);
      return parsed?.token || null;
    } catch {
      return null;
    }
  };

  const getFileNameFromPath = (path: string) => {
    try {
      const clean = path.split('?')[0];
      const parts = clean.split('/').filter(Boolean);
      return parts[parts.length - 1] || 'archivo';
    } catch {
      return 'archivo';
    }
  };

  const fetchFileBlobUrl = async (url: string): Promise<string | null> => {
    setLoadingFile(true);
    try {
      // Si es un path de uploads, usar el proxy /uploads
      // Si no, usar la URL tal cual (para URLs externas)
      let fetchUrl = url;
      if (isBackendStoredUploadPath(url)) {
        // Para uploads, usar el proxy /uploads que apunta al backend
        fetchUrl = url.startsWith('/') ? url : `/${url}`;
      }
      
      const response = await httpService.get(fetchUrl, { responseType: 'blob' });
      if (response.status === 401) {
        await Swal.fire({
          title: 'Sesión expirada',
          text: 'Debes iniciar sesión nuevamente',
          icon: 'warning',
          confirmButtonText: 'Ir a login',
          confirmButtonColor: '#4f46e5'
        });
        window.location.href = '/login';
        return null;
      }
      if (response.status === 404) {
        await Swal.fire({
          title: 'No se pudo abrir el archivo',
          text: `Archivo no existe o fue eliminado\n${url}`,
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#4f46e5'
        });
        return null;
      }
      if (response.status !== 200) {
        await Swal.fire({
          title: 'No se pudo abrir el archivo',
          text: `Error ${response.status}\n${url}`,
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#4f46e5'
        });
        return null;
      }
      const blob = response.data;
      const blobUrl = URL.createObjectURL(blob);
      if (fileBlobUrl) URL.revokeObjectURL(fileBlobUrl);
      setFileBlobUrl(blobUrl);
      return blobUrl;
    } finally {
      setLoadingFile(false);
    }
  };

  const handleViewInternalFileByTareaId = async (tareaId: number) => {
    if (!tareaDetalle?.enlace) return;
    
    let url = tareaDetalle.enlace;
    
    // Si es un path de uploads, asegurarse de que comience con /
    if (isBackendStoredUploadPath(url)) {
      url = url.startsWith('/') ? url : `/${url}`;
    }
    
    const blobUrl = await fetchFileBlobUrl(url);
    if (!blobUrl) return;
    window.open(blobUrl, '_blank', 'noreferrer');
  };

  const handleDownloadInternalFileByTareaId = async (tareaId: number, fileNameHint?: string) => {
    if (!tareaDetalle?.enlace) return;
    
    let url = tareaDetalle.enlace;
    
    // Si es un path de uploads, asegurarse de que comience con /
    if (isBackendStoredUploadPath(url)) {
      url = url.startsWith('/') ? url : `/${url}`;
    }
    
    const blobUrl = await fetchFileBlobUrl(url);
    if (!blobUrl) return;

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileNameHint || `tarea_${tareaId}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const getGradosText = (gradosIds: number[] | null) => {
    if (!gradosIds || gradosIds.length === 0) return 'Todos los grados';
    return gradosIds.map(id => GRADOS.find(g => g.id === id)?.nombre || id).join(', ');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" text="Cargando tareas..." />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Banco de Tareas</h1>
          <p className="text-slate-600 mt-1">Gestiona1 las tareas de Cátedra de Familia</p>
        </div>
        <div className="flex items-center gap-2">
          {(userRole === 'orientador' || userRole === 'docente_aula') && (
            <button
              onClick={() => setModalCrear(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-md"
            >
              <IconPlus size={20} />
              Nueva Tarea
            </button>
          )}

          <button
            onClick={() => setModalCategoria(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
          >
            <IconPlus size={20} />
            Más categoría
          </button>
        </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Buscar</label>
              <input
                type="text"
                placeholder="Buscar por título o tema..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Categoría <span className="text-xs text-amber-600">(Datos temporales)</span>
              </label>
              <select
                value={categoriaFiltro || ''}
                onChange={(e) => setCategoriaFiltro(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Todas las categorías</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-100 text-sm font-medium">Total Tareas</p>
                <p className="text-3xl font-bold mt-1">{tareas.length}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <IconFileText size={24} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Resultados</p>
                <p className="text-3xl font-bold mt-1">{tareasFiltradas.length}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <IconBook size={24} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Más Usadas</p>
                <p className="text-3xl font-bold mt-1">
                  {tareas.reduce((max, t) => Math.max(max, t.vecesUtilizada || 0), 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <IconUsers size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Tareas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tareasFiltradas.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500">
              <IconFileText className="mx-auto mb-3 text-slate-400" size={48} />
              <p className="font-medium">No hay tareas disponibles</p>
              {busqueda && <p className="text-sm text-slate-400 mt-1">No se encontraron resultados para "{busqueda}"</p>}
            </div>
          ) : (
            tareasFiltradas.map((tarea) => {
              const hasArchivo = Boolean(tarea.archivoUrl || tarea.archivo_url || tarea.archivo);
              const hasLink = Boolean(tarea.enlace);
              const hasRecurso = hasArchivo || hasLink;
              return (
                <div key={tarea.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-slate-900 text-lg leading-snug line-clamp-2">{tarea.titulo}</h3>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                          {getCategoriaName(tarea.categoriaId)}
                        </span>
                        {tarea.tema && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded font-medium">
                            {tarea.tema}
                          </span>
                        )}
                        {hasRecurso && (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded font-medium">
                            Recurso sugerido
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded text-xs font-semibold">
                      {tarea.vecesUtilizada || 0} usos
                    </span>
                  </div>

                  <p className="text-sm text-slate-700 mb-4 line-clamp-3">{tarea.descripcion}</p>

                  <div className="grid grid-cols-2 gap-2 mb-5 text-xs text-slate-600">
                    {tarea.gradosObjetivo && tarea.gradosObjetivo.length > 0 ? (
                      <div className="col-span-2">📚 {getGradosText(tarea.gradosObjetivo)}</div>
                    ) : (
                      <div className="col-span-2">📚 Todos los grados</div>
                    )}
                    <div>Calificación: <span className="font-medium">{tarea.tipoCalificacion}</span></div>
                    <div>ID: <span className="font-mono">{tarea.id}</span></div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleVerDetalleTarea(tarea)}
                      className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                      title="Ver detalle"
                    >
                      <IconEye size={16} />
                    </button>
                    <button
                      onClick={() => handleAsignarTarea(tarea)}
                      className="flex-1 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
                      title="Asignar a cursos"
                    >
                      Asignar
                    </button>
                    {(userRole === 'orientador' || userRole === 'docente_aula') && (
                      <>
                        <button className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors" title="Editar tarea">
                          <IconEdit size={16} />
                        </button>
                        <button className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors" title="Eliminar tarea">
                          <IconTrash size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Crear Tarea */}
        {modalCrear && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Nueva Tarea</h2>
                <button onClick={() => { setModalCrear(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Título *</label>
                  <input
                    type="text"
                    value={formTarea.titulo}
                    onChange={(e) => setFormTarea({...formTarea, titulo: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Ej: Taller de Valores Familiares"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Descripción *</label>
                  <textarea
                    value={formTarea.descripcion}
                    onChange={(e) => setFormTarea({...formTarea, descripcion: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Describe la actividad..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Categoría *</label>
                  <select
                    value={formTarea.categoriaId}
                    onChange={(e) => setFormTarea({ ...formTarea, categoriaId: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Seleccionar...</option>
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Enlace (URL o archivo)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formTarea.enlace}
                      onChange={(e) => setFormTarea({ ...formTarea, enlace: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="https://..."
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                      title="Subir archivo"
                    >
                      <IconUpload size={16} />
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => setArchivoTarea(e.target.files?.[0] || null)}
                  />
                  {archivoTarea && (
                    <div className="text-xs text-slate-600 mt-2">
                      Archivo seleccionado: <span className="font-medium">{archivoTarea.name}</span>
                    </div>
                  )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Calificación</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          checked={formTarea.tipoCalificacion === 'cualitativa'}
                          onChange={() => setFormTarea({ ...formTarea, tipoCalificacion: 'cualitativa' })}
                          className="border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        Cualitativa
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          checked={formTarea.tipoCalificacion === 'cuantitativa'}
                          onChange={() => setFormTarea({ ...formTarea, tipoCalificacion: 'cuantitativa' })}
                          className="border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        Cuantitativa
                      </label>
                    </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Entregable Esperado</label>
                  <textarea
                    value={formTarea.entregableEsperado}
                    onChange={(e) => setFormTarea({ ...formTarea, entregableEsperado: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Ej: Resumen de 1 página"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Grados Objetivo</label>
                  <div className="grid grid-cols-3 gap-2">
                    {GRADOS.map(grado => (
                      <label key={grado.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={formTarea.gradosObjetivo.includes(grado.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormTarea({ ...formTarea, gradosObjetivo: [...formTarea.gradosObjetivo, grado.id] });
                            } else {
                              setFormTarea({ ...formTarea, gradosObjetivo: formTarea.gradosObjetivo.filter(id => id !== grado.id) });
                            }
                          }}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        {grado.nombre}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formTarea.esMultiGrado}
                      onChange={(e) => setFormTarea({ ...formTarea, esMultiGrado: e.target.checked })}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    Es multi-grado
                  </label>
                </div>

              </div>

              <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex gap-3">
                <button
                  onClick={() => { setModalCrear(false); resetForm(); }}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                  disabled={savingTarea}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCrearTarea}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50"
                  disabled={savingTarea}
                >
                  {savingTarea ? 'Creando...' : 'Crear Tarea'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Crear Categoría */}
        {modalCategoria && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Nueva Categoría</h2>
                <button onClick={() => { setModalCategoria(false); resetFormCategoria(); }} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nombre *</label>
                  <input
                    type="text"
                    value={formCategoria.nombre}
                    onChange={(e) => setFormCategoria({ ...formCategoria, nombre: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej: Matemáticas"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Descripción</label>
                  <textarea
                    value={formCategoria.descripcion}
                    onChange={(e) => setFormCategoria({ ...formCategoria, descripcion: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Descripción opcional..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Icono</label>
                    <input
                      type="text"
                      value={formCategoria.icono}
                      onChange={(e) => setFormCategoria({ ...formCategoria, icono: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="calculator"
                    />
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex gap-3">
                <button
                  onClick={() => { setModalCategoria(false); resetFormCategoria(); }}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                  disabled={savingCategoria}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCrearCategoria}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
                  disabled={savingCategoria}
                >
                  {savingCategoria ? 'Creando...' : 'Crear Categoría'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Asignar (Placeholder) */}
        {modalAsignar && tareaSeleccionada && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-xl font-bold text-slate-800">Asignar Tarea</h2>
                <button onClick={() => { setModalAsignar(false); setTareaSeleccionada(null); }} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
              
              <div className="p-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  <p className="font-semibold mb-2">🚧 Funcionalidad en desarrollo</p>
                  <p>El backend está preparando el endpoint <code className="bg-blue-100 px-1 rounded">POST /asignaciones</code></p>
                  <p className="mt-2">Tarea seleccionada: <strong>{tareaSeleccionada.titulo}</strong></p>
                </div>
              </div>

              <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 rounded-b-2xl">
                <button
                  onClick={() => { setModalAsignar(false); setTareaSeleccionada(null); }}
                  className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Detalle Tarea */}
        {modalDetalle && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Detalle de tarea</h2>
                <button
                  onClick={() => {
                    setModalDetalle(false);
                    setTareaDetalle(null);
                    if (fileBlobUrl) URL.revokeObjectURL(fileBlobUrl);
                    setFileBlobUrl(null);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                {loadingDetalle || !tareaDetalle ? (
                  <div className="flex items-center justify-center h-40">
                    <LoadingSpinner size="md" text="Cargando detalle..." />
                  </div>
                ) : (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">{tareaDetalle.titulo}</h3>
                      <p className="text-slate-600 mt-1 whitespace-pre-wrap">{tareaDetalle.descripcion}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <div className="text-xs text-slate-500">Categoría</div>
                        <div className="font-medium text-slate-800">{getCategoriaName(tareaDetalle.categoriaId)}</div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <div className="text-xs text-slate-500">Tipo de calificación</div>
                        <div className="font-medium text-slate-800">{tareaDetalle.tipoCalificacion}</div>
                      </div>
                    </div>

                    {tareaDetalle.enlace && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <div className="text-xs text-slate-500">Enlace / Archivo</div>
                        <div className="space-y-3">
                          <div className="text-slate-700 break-all text-sm">{tareaDetalle.enlace}</div>

                          {isExternalUrl(tareaDetalle.enlace) ? (
                            <button
                              type="button"
                              onClick={() => window.open(tareaDetalle.enlace as string, '_blank', 'noreferrer')}
                              className="inline-flex px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
                            >
                              Ver enlace
                            </button>
                          ) : isBackendStoredUploadPath(tareaDetalle.enlace) ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleViewInternalFileByTareaId(tareaDetalle.id)}
                                className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium disabled:opacity-50"
                                disabled={loadingFile}
                              >
                                {loadingFile ? 'Cargando...' : 'Ver archivo'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadInternalFileByTareaId(tareaDetalle.id, getFileNameFromPath(tareaDetalle.enlace as string))}
                                className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium disabled:opacity-50"
                                disabled={loadingFile}
                              >
                                Descargar archivo
                              </button>
                            </div>
                          ) : (
                            <div className="text-sm text-slate-600">
                              Este adjunto no es un enlace externo válido.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {tareaDetalle.entregableEsperado && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <div className="text-xs text-slate-500">Entregable esperado</div>
                        <div className="font-medium text-slate-800 whitespace-pre-wrap">{tareaDetalle.entregableEsperado}</div>
                      </div>
                    )}

                    {tareaDetalle.gradosObjetivo && tareaDetalle.gradosObjetivo.length > 0 && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <div className="text-xs text-slate-500">Grados objetivo</div>
                        <div className="font-medium text-slate-800">{getGradosText(tareaDetalle.gradosObjetivo)}</div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <div className="text-xs text-slate-500">Es multi-grado</div>
                        <div className="font-medium text-slate-800">{tareaDetalle.esMultiGrado ? 'Sí' : 'No'}</div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <div className="text-xs text-slate-500">Veces utilizada</div>
                        <div className="font-medium text-slate-800">{tareaDetalle.vecesUtilizada || 0}</div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="bg-slate-50 border-t border-slate-200 px-6 py-4">
                <button
                  onClick={() => { setModalDetalle(false); setTareaDetalle(null); }}
                  className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
