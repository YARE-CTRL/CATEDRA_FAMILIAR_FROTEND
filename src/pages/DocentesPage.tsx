import { useState, useEffect } from 'react';
import { 
  getSession, 
  getDocentesCRUD,
  crearDocente,
  actualizarDocente,
  eliminarDocente,
  getCursosCRUD,
  getGradosCRUD,
  getCursosOrientador
} from '../api/endpoints';
import { getGradosPublic } from '../api/endpointsDocente-orinetador';
import httpService from '../api/httpService';
import DashboardLayout from '../components/DashboardLayout';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import FormFieldInput from '../components/ui/FormFieldInput';
import {
  IconUsers,
  IconPlus,
  IconEdit,
  IconTrash,
  IconSearch,
  IconCheckCircle,
  IconAlertTriangle
} from '../components/ui/Icons';

interface Docente {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono?: string;
  cursos: { id: number; nombre: string; es_director: boolean }[];
  cantidadCursos: number;
  estado: 'Activo' | 'Inactivo';
  esDirector: boolean;
}

interface Curso {
  id: number;
  nombre: string;
}

interface Grado {
  id: number;
  nombre: string;
}

export default function DocentesPage() {
  const session = getSession();
  const user = session?.user;
  
  const [loading, setLoading] = useState(true);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [grados, setGrados] = useState<Grado[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroActivo, setFiltroActivo] = useState<'todos' | 'activos' | 'inactivos'>('todos');
  // Generar contraseña sugerida para docente
  const generarContrasenaDocente = (apellido?: string) => {
    const año = new Date().getFullYear();
    if (apellido && apellido.trim()) {
      const apellidoCapitalizado = apellido.trim().charAt(0).toUpperCase() + apellido.trim().slice(1).toLowerCase();
      return `${apellidoCapitalizado}${año}!`;
    }
    return `Docente${año}!`;
  };
  
  // Modal
  const [modalDocente, setModalDocente] = useState(false);
  const [editingDocente, setEditingDocente] = useState<Docente | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Docente | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Formulario
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    correo: '',
    telefono: '',
    contrasena: '',
    confirmarContrasena: '',
    estaActivo: true,
    gradoAsignado: '',
    areaQueOrienta: '',
    centroInteres: '',
    institucionId: (user?.institucionId as number) || 1,
    cursoIds: [] as number[]
  });

  // Formulario para el modal (formDocene)
  const [formDocene, setFormDocene] = useState({
    correo: '',
    contrasena: '',
    nombre: '',
    apellido: '',
    numeroDocumento: '',
    telefono: '',
    tipoDocumento: 'CC',
    telefonoEmergencia: '',
    personaEmergencia: '',
    direccion: '',
    esDirectorGrado: false,
    gradoAsignado: '',
    areaQueOrienta: '',
    centroInteres: '',
    institucionId: (user?.institucionId as number) || 1,
    cursoIds: [] as number[]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('[DEBUG][DocentesPage] Usuario:', {
        rol: user?.rol,
        id: user?.id,
        institucionId: user?.institucionId,
        sessionInstitucionId: (session as any)?.context?.institucionId
      });

      // Para orientadores, usar endpoint específico
      let docentesData;
      if (user?.rol === 'orientador') {
        try {
          const response = await httpService.get('/orientadores/docentes');
          const result = response.data;
          docentesData = result?.data || result?.docentes || result || [];
          
          console.log('[DEBUG][DocentesPage] Usando endpoint /orientadores/docentes:', {
            status: response.status,
            cantidad: docentesData?.length || 0,
            datos: docentesData?.slice(0, 3),
            estructura: Object.keys(result || {})
          });
          
          // El endpoint /orientadores/docentes ya filtra por institución, no need to filter again
          console.log('[DEBUG][DocentesPage] Docentes ya filtrados por institución:', {
            cantidad: docentesData?.length || 0,
            muestra: docentesData?.slice(0, 2).map(d => ({
              id: d.id,
              nombres: d.nombres,
              apellidos: d.apellidos,
              correo: d.correo,
              estado: d.estado
            }))
          });
        } catch (error) {
          console.log('[DEBUG][DocentesPage] Error con /orientadores/docentes, usando fallback:', error);
          // Fallback al endpoint general
          docentesData = await getDocentesCRUD();
        }
      } else {
        docentesData = await getDocentesCRUD();
      }

      console.log('[DEBUG][DocentesPage] Docentes finales:', {
        cantidad: docentesData?.length || 0,
        datos: docentesData?.slice(0, 3),
        tipo: typeof docentesData
      });

      // Para orientadores, no filtrar ya que /orientadores/docentes ya filtra por institución
      // Para otros roles, mantener el filtrado existente
      const userInstitucionId = user?.institucionId || (session as any)?.context?.institucionId;
      const filtrados = user?.rol === 'orientador' 
        ? docentesData  // Ya filtrados por el endpoint
        : userInstitucionId
          ? docentesData.filter((d: any) => {
              const docenteInstitucionId = d?.institucionId || d?.institucion_id || d?.institucion?.id;
              const pasa = Number(docenteInstitucionId) === Number(userInstitucionId);
              
              console.log('[DEBUG][DocentesPage] Filtrando docente (no orientador):', {
                id: d.id,
                nombre: d.nombre || d.nombres,
                apellido: d.apellido || d.apellidos,
                docenteInstitucionId,
                userInstitucionId,
                pasa
              });
              
              return pasa;
            })
          : docentesData;

      console.log('[DEBUG][DocentesPage] Resultados:', {
        recibidos: Array.isArray(docentesData) ? docentesData.length : 'no-array',
        institucionId: userInstitucionId,
        filtrados: Array.isArray(filtrados) ? filtrados.length : 'no-array',
        muestra: filtrados?.slice(0, 3)
      });

      setDocentes(filtrados);
      // Cargar cursos: si es orientador, usar su endpoint y filtrar por su institución como segunda barrera
      const instId = Number(userInstitucionId);
      if (user?.rol === 'orientador') {
        try {
          const cursosOri = await getCursosOrientador();
          const soloMiInst = Array.isArray(cursosOri)
            ? cursosOri.filter((c: any) => Number(c?.institucionId || c?.institucion_id || c?.institucion?.id) === instId)
            : [];
          setCursos(soloMiInst);
        } catch (e) {
          const all = await getCursosCRUD();
          const soloMiInst = Array.isArray(all)
            ? all.filter((c: any) => Number(c?.institucionId || c?.institucion_id || c?.institucion?.id) === instId)
            : [];
          setCursos(soloMiInst);
        }
      } else {
        setCursos(await getCursosCRUD());
      }

      try {
        const gradosRes = await getGradosPublic();
        const gradosData = gradosRes.success && Array.isArray(gradosRes.data) ? gradosRes.data : [];
        const soloMiInst = gradosData.filter((g: any) => Number(g?.institucionId || g?.institucion_id || g?.institucion?.id || instId) === instId);
        setGrados(soloMiInst.map((g: any) => ({ id: Number(g.id), nombre: g.nombre || g.name || `Grado ${g.id}` })));
      } catch (e) {
        const allGrados = await getGradosCRUD();
        const soloMiInst = Array.isArray(allGrados)
          ? allGrados.filter((g: any) => Number(g?.institucionId || g?.institucion_id || g?.institucion?.id) === instId)
          : [];
        setGrados(soloMiInst.map((g: any) => ({ id: Number(g.id), nombre: g.nombre || g.name || `Grado ${g.id}` })));
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      showToast('error', 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleOpenCreate = () => {
    setEditingDocente(null);
    setFormDocene({
      correo: '',
      contrasena: generarContrasenaDocente(),
      nombre: '',
      apellido: '',
      numeroDocumento: '',
      telefono: '',
      tipoDocumento: 'CC',
      telefonoEmergencia: '',
      personaEmergencia: '',
      direccion: '',
      esDirectorGrado: false,
      gradoAsignado: '',
      areaQueOrienta: '',
      centroInteres: '',
      institucionId: (user?.institucionId as number) || 1,
      cursoIds: []
    });
    setModalDocente(true);
  };

  const handleOpenEdit = (docente: Docente) => {
    setEditingDocente(docente);
    setFormDocene({
      correo: docente.correo,
      contrasena: '',
      nombre: docente.nombre,
      apellido: docente.apellido,
      numeroDocumento: (docente as any).numeroDocumento || (docente as any).documento || '',
      telefono: docente.telefono || '',
      tipoDocumento: (docente as any).tipoDocumento || 'CC',
      telefonoEmergencia: (docente as any).telefonoEmergencia || '',
      personaEmergencia: (docente as any).personaEmergencia || '',
      direccion: (docente as any).direccion || '',
      esDirectorGrado: Boolean((docente as any).esDirectorGrado) || false,
      gradoAsignado: (docente as any).gradoAsignado || '',
      areaQueOrienta: (docente as any).areaQueOrienta || '',
      centroInteres: (docente as any).centroInteres || '',
      institucionId: docente.institucionId || (user?.institucionId as number) || 1,
      cursoIds: docente.cursos?.map(c => c.id) || []
    });
    setModalDocente(true);
  };

  const handleSaveDocente = async () => {
    if (!formDocene.nombre.trim() || !formDocene.apellido.trim() || !formDocene.correo.trim()) {
      showToast('error', 'Nombre, apellido y correo son obligatorios');
      return;
    }

    if (!editingDocente && !formDocene.numeroDocumento.trim()) {
      showToast('error', 'El número de documento es obligatorio para nuevos docentes');
      return;
    }

    if (!editingDocente && !formDocene.contrasena) {
      showToast('error', 'La contraseña es obligatoria para nuevos docentes');
      return;
    }

    // Verificación de autenticación antes de enviar
    try {
      const sessionRaw = localStorage.getItem('session');
      const sessionParsed = sessionRaw ? JSON.parse(sessionRaw) : null;
      const token = sessionParsed?.token;
      if (!token || typeof token !== 'string' || token.length < 10) {
        showToast('error', 'Sesión no autenticada. Por favor inicia sesión nuevamente.');
        return;
      }
    } catch {
      showToast('error', 'Sesión no autenticada. Por favor inicia sesión nuevamente.');
      return;
    }

    setSaving(true);
    try {
      if (editingDocente) {
        const result = await actualizarDocente(editingDocente.id, {
          nombre: formDocene.nombre,
          apellido: formDocene.apellido,
          telefono: formDocene.telefono || undefined,
          cursoIds: formDocene.cursoIds.length > 0 ? formDocene.cursoIds : undefined
        });
        if (result.success) {
          showToast('success', 'Docente actualizado correctamente');
          setModalDocente(false);
          loadData();
        } else {
          showToast('error', result.error || 'Error al actualizar');
        }
      } else {
        const gradoAsignadoValue: any = (() => {
          const n = Number(formDocene.gradoAsignado);
          return Number.isFinite(n) && !isNaN(n) ? n : formDocene.gradoAsignado;
        })();
        // Seguridad en cliente: si es orientador, limitar cursoIds a los que están cargados (su institución)
        const allowedCursoIds = (() => {
          if (user?.rol === 'orientador') {
            const allowed = new Set((cursos || []).map(c => c.id));
            return (formDocene.cursoIds || []).filter(id => allowed.has(id));
          }
          return formDocene.cursoIds || [];
        })();
        const crearPayload = {
          correo: formDocene.correo,
          contrasena: formDocene.contrasena,
          nombre: formDocene.nombre,
          apellido: formDocene.apellido,
          // Campos duplicados para compatibilidad con backend: usar nombres/apellidos
          nombres: formDocene.nombre,
          apellidos: formDocene.apellido,
          numeroDocumento: formDocene.numeroDocumento,
          telefono: formDocene.telefono || undefined,
          institucionId: (user?.rol === 'orientador')
            ? ((user?.institucionId as number) || Number(formDocene.institucionId) || 1)
            : (Number(formDocene.institucionId) || (user?.institucionId as number) || 1),
          cursoIds: allowedCursoIds.length > 0 ? allowedCursoIds : undefined,
          tipoDocumento: formDocene.tipoDocumento,
          telefonoEmergencia: formDocene.telefonoEmergencia || undefined,
          personaEmergencia: formDocene.personaEmergencia || undefined,
          direccion: formDocene.direccion || undefined,
          esDirectorGrado: formDocene.esDirectorGrado || undefined,
          gradoAsignado: gradoAsignadoValue || undefined,
          areaQueOrienta: formDocene.areaQueOrienta || undefined,
          centroInteres: formDocene.centroInteres || undefined
        } as any;
        console.log('[DocentesPage][crearDocente] payload ->', crearPayload);
        const result = await crearDocente(crearPayload);
        console.log('[DocentesPage][crearDocente] result <-', result);
        if (result.success) {
          const body: any = (result as any).data || {};
          const pwdInfo: string = body?.passwordTemporal ? ` Contraseña temporal: ${body.passwordTemporal}` : '';
          // Optimistic update: insertar el docente retornado en la lista local
          const dRaw: any = body?.docente || body?.data?.docente || null;
          if (dRaw) {
            const docenteNuevo: Docente = {
              id: dRaw.id,
              nombres: dRaw.nombres || formDocene.nombre,
              apellidos: dRaw.apellidos || formDocene.apellido,
              correo: body?.usuario?.correo || formDocene.correo,
              telefono: dRaw.telefono || formDocene.telefono,
              cursos: Array.isArray(dRaw.cursos) ? dRaw.cursos.map((c: any) => ({ id: c.id, nombre: c.nombre, es_director: c.es_director })) : [],
              cantidadCursos: Array.isArray(dRaw.cursos) ? dRaw.cursos.length : 0,
              estado: 'Activo',
              esDirector: false
            };
            setDocentes(prev => [docenteNuevo, ...prev]);
          }
          showToast('success', `Docente creado correctamente.${pwdInfo}`);
          setModalDocente(false);
          // Hacer loadData en background para sincronizar asignaciones/cursos si aplica
          setTimeout(() => { try { loadData(); } catch {} }, 0);
        } else {
          showToast('error', result.error || 'Error al crear');
        }
      }
    } catch (error: any) {
      console.error('[DocentesPage][crearDocente] EXCEPTION:', error?.response?.data || error);
      showToast('error', error?.response?.data?.message || error?.message || 'Error al guardar docente');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDocente = async () => {
    if (!confirmDelete) return;
    
    setSaving(true);
    try {
      const result = await eliminarDocente(confirmDelete.id);
      if (result.success) {
        showToast('success', 'Docente eliminado correctamente');
        setConfirmDelete(null);
        loadData();
      } else {
        showToast('error', result.error || 'Error al eliminar');
      }
    } catch (error) {
      showToast('error', 'Error al eliminar docente');
    } finally {
      setSaving(false);
    }
  };

  const toggleCurso = (cursoId: number) => {
    setFormDocene(prev => ({
      ...prev,
      cursoIds: prev.cursoIds.includes(cursoId)
        ? prev.cursoIds.filter(id => id !== cursoId)
        : [...prev.cursoIds, cursoId]
    }));
  };

  // Filtrar docentes
  const docentesFiltrados = docentes.filter(d => {
    const matchBusqueda = 
      (d.nombres?.toLowerCase().includes(busqueda.toLowerCase()) || '') ||
      (d.apellidos?.toLowerCase().includes(busqueda.toLowerCase()) || '') ||
      (d.correo?.toLowerCase().includes(busqueda.toLowerCase()) || '');
    
    const matchActivo = 
      filtroActivo === 'todos' ||
      (filtroActivo === 'activos' && d.estado === 'Activo') ||
      (filtroActivo === 'inactivos' && d.estado === 'Inactivo');
    
    return matchBusqueda && matchActivo;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <IconUsers className="w-7 h-7 text-primary-600" />
              Gestión de Docentes
            </h1>
            <p className="text-gray-600 mt-1">
              Administra los docentes de tu institución
            </p>
          </div>
          <Button onClick={handleOpenCreate} className="flex items-center gap-2">
            <IconPlus className="w-5 h-5" />
            Nuevo Docente
          </Button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, apellido o correo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <select
              value={filtroActivo}
              onChange={(e) => setFiltroActivo(e.target.value as any)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="todos">Todos</option>
              <option value="activos">Solo activos</option>
              <option value="inactivos">Solo inactivos</option>
            </select>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500">Total Docentes</p>
            <p className="text-2xl font-bold text-gray-900">{docentes.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500">Docentes Activos</p>
            <p className="text-2xl font-bold text-green-600">
              {docentes.filter(d => d.estado === 'Activo').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500">Docentes Inactivos</p>
            <p className="text-2xl font-bold text-red-600">
              {docentes.filter(d => d.estado === 'Inactivo').length}
            </p>
          </div>
        </div>

        {/* Tabla de docentes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Docente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Correo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Cursos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {docentesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No se encontraron docentes
                    </td>
                  </tr>
                ) : (
                  docentesFiltrados.map((docente) => (
                    <tr key={docente.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-700 font-semibold">
                              {(docente.nombres || '?')[0]}{(docente.apellidos || '?')[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {docente.nombres} {docente.apellidos}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {docente.correo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {docente.telefono || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{docente.cantidadCursos}</span>
                          {docente.esDirector && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                              Director
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          docente.estado === 'Activo' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {docente.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(docente)}
                            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <IconEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(docente)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <IconTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Crear/Editar Docente */}
      <Modal
        isOpen={modalDocente}
        onClose={() => setModalDocente(false)}
        title={editingDocente ? 'Editar Docente' : 'Nuevo Docente'}
        size="lg"
      >
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormFieldInput
              label="Nombre"
              value={formDocene.nombre}
              onChange={(e) => setFormDocene(prev => ({ ...prev, nombre: e.target.value }))}
              placeholder="Nombre del docente"
              required name={''}            />
            <FormFieldInput
              label="Apellido"
              value={formDocene.apellido}
              onChange={(e) => {
                const nuevoApellido = e.target.value;
                setFormDocene(prev => ({
                  ...prev,
                  apellido: nuevoApellido,
                  // Actualizar contraseña sugerida si no ha sido modificada manualmente
                  contrasena: !editingDocente && (prev.contrasena === generarContrasenaDocente(prev.apellido) || prev.contrasena === generarContrasenaDocente())
                    ? generarContrasenaDocente(nuevoApellido)
                    : prev.contrasena
                }));
              } }
              placeholder="Apellido del docente"
              required name={''}            />
          </div>
          
          <FormFieldInput
            label="Correo electrónico"
            type="email"
            value={formDocene.correo}
            onChange={(e) => setFormDocene(prev => ({ ...prev, correo: e.target.value }))}
            placeholder="correo@institucion.edu.co"
            required
            disabled={!!editingDocente} name={''}          />

          <FormFieldInput
            label="Número de Documento"
            type="text"
            value={formDocene.numeroDocumento}
            onChange={(e) => setFormDocene(prev => ({ ...prev, numeroDocumento: e.target.value }))}
            placeholder="Documento de identidad"
            required={!editingDocente} name={''}          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Documento</label>
              <select
                value={formDocene.tipoDocumento}
                onChange={(e) => setFormDocene(prev => ({ ...prev, tipoDocumento: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="CC">CC</option>
                <option value="TI">TI</option>
                <option value="CE">CE</option>
                <option value="PA">PA</option>
              </select>
            </div>
            <FormFieldInput
              label="Teléfono de Emergencia"
              type="tel"
              value={formDocene.telefonoEmergencia}
              onChange={(e) => setFormDocene(prev => ({ ...prev, telefonoEmergencia: e.target.value }))}
              placeholder="Contacto de emergencia" name={''}            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormFieldInput
              label="Persona de Emergencia"
              type="text"
              value={formDocene.personaEmergencia}
              onChange={(e) => setFormDocene(prev => ({ ...prev, personaEmergencia: e.target.value }))}
              placeholder="Nombre del contacto" name={''}            />
            <FormFieldInput
              label="Dirección"
              type="text"
              value={formDocene.direccion}
              onChange={(e) => setFormDocene(prev => ({ ...prev, direccion: e.target.value }))}
              placeholder="Dirección de residencia" name={''}            />
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formDocene.esDirectorGrado}
                onChange={(e) => setFormDocene(prev => ({ ...prev, esDirectorGrado: e.target.checked }))}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Es director de grado
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grado Asignado</label>
              <select
                value={formDocene.gradoAsignado}
                onChange={(e) => setFormDocene(prev => ({ ...prev, gradoAsignado: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                disabled={!grados.length}
              >
                <option value="">Selecciona un grado</option>
                {grados.map((grado) => (
                  <option key={grado.id} value={String(grado.id)}>
                    {grado.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormFieldInput
              label="Área que Orienta"
              type="text"
              value={formDocene.areaQueOrienta}
              onChange={(e) => setFormDocene(prev => ({ ...prev, areaQueOrienta: e.target.value }))}
              placeholder="Ej: Matemáticas" name={''}            />
            <FormFieldInput
              label="Centro de Interés"
              type="text"
              value={formDocene.centroInteres}
              onChange={(e) => setFormDocene(prev => ({ ...prev, centroInteres: e.target.value }))}
              placeholder="Ej: Robótica" name={''}            />
          </div>
          
          {!editingDocente && (
            <div>
              <FormFieldInput
                label="Contraseña Temporal"
                type="text"
                value={formDocene.contrasena}
                onChange={(e) => setFormDocene(prev => ({ ...prev, contrasena: e.target.value }))}
                placeholder="Contraseña inicial"
                required name={''}              />
              <p className="text-xs text-gray-500 mt-1">
                💡 Sugerencia auto-generada. El docente deberá cambiarla en su primer inicio de sesión.
              </p>
            </div>
          )}
          
          <FormFieldInput
            label="Teléfono"
            type="tel"
            value={formDocene.telefono}
            onChange={(e) => setFormDocene(prev => ({ ...prev, telefono: e.target.value }))}
            placeholder="Número de contacto" name={''}          />
          
          {/* Selector de cursos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Asignar Cursos
            </label>
            <div className="border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto">
              {(() => {
                const instIdUser = Number(user?.institucionId || (session as any)?.context?.institucionId || 0);
                const visibleCursos = Array.isArray(cursos)
                  ? cursos.filter((c: any) => instIdUser ? Number(c?.institucionId || c?.institucion_id || c?.institucion?.id) === instIdUser : true)
                  : [];
                if (visibleCursos.length === 0) {
                  return <p className="text-gray-400 text-sm">No hay cursos disponibles</p>;
                }
                return (
                  <div className="space-y-2">
                    {visibleCursos.map((curso: any) => (
                      <label key={curso.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formDocene.cursoIds.includes(curso.id)}
                          onChange={() => toggleCurso(curso.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">{curso.nombre}</span>
                      </label>
                    ))}
                  </div>
                );
              })()}
            </div>
            {formDocene.cursoIds.length > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                {formDocene.cursoIds.length} curso(s) seleccionado(s)
              </p>
            )}
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setModalDocente(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveDocente} disabled={saving}>
              {saving ? 'Guardando...' : editingDocente ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Confirmar Eliminación */}
      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Confirmar Eliminación"
        size="sm"
      >
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            ¿Estás seguro de eliminar al docente{' '}
            <span className="font-semibold text-gray-900">
              {confirmDelete?.nombre} {confirmDelete?.apellido}
            </span>?
            Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDeleteDocente} disabled={saving}>
              {saving ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? (
            <IconCheckCircle className="w-5 h-5" />
          ) : (
            <IconAlertTriangle className="w-5 h-5" />
          )}
          {toast.message}
        </div>
      )}
    </DashboardLayout>
  );
}
