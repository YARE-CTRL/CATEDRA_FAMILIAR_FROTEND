import { useState, useEffect } from 'react';
import { 
  getSession, 
  getDocentesCRUD,
  crearDocente,
  actualizarDocente,
  eliminarDocente,
  getCursosCRUD
} from '../api/endpoints';
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
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  institucionId: number;
  estaActivo: boolean;
  cursos?: { id: number; nombre: string }[];
}

interface Curso {
  id: number;
  nombre: string;
}

export default function DocentesPage() {
  const session = getSession();
  const user = session?.user;
  
  const [loading, setLoading] = useState(true);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
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
  const [formDocente, setFormDocente] = useState({
    correo: '',
    contrasena: generarContrasenaDocente(),
    nombre: '',
    apellido: '',
    numeroDocumento: '',
    telefono: '',
    // Campos extendidos según contrato backend
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
        } catch (error) {
          console.log('[DEBUG][DocentesPage] Error con /orientadores/docentes, usando fallback:', error);
          // Fallback al endpoint general
          docentesData = await getDocentesCRUD();
        }
      } else {
        docentesData = await getDocentesCRUD();
      }

      console.log('[DEBUG][DocentesPage] Docentes recibidos:', {
        cantidad: docentesData?.length || 0,
        datos: docentesData?.slice(0, 3),
        tipo: typeof docentesData
      });

      // Filtrar docentes por institución del usuario
      const userInstitucionId = user?.institucionId || (session as any)?.context?.institucionId;
      const filtrados = userInstitucionId
        ? docentesData.filter((d: any) => {
            const docenteInstitucionId = d?.institucionId || d?.institucion_id || d?.institucion?.id;
            const pasa = Number(docenteInstitucionId) === Number(userInstitucionId);
            
            console.log('[DEBUG][DocentesPage] Filtrando docente:', {
              id: d.id,
              nombre: d.nombre,
              apellido: d.apellido,
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
      setCursos(await getCursosCRUD());
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
    setFormDocente({
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
    setFormDocente({
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
    if (!formDocente.nombre.trim() || !formDocente.apellido.trim() || !formDocente.correo.trim()) {
      showToast('error', 'Nombre, apellido y correo son obligatorios');
      return;
    }

    if (!editingDocente && !formDocente.numeroDocumento.trim()) {
      showToast('error', 'El número de documento es obligatorio para nuevos docentes');
      return;
    }

    if (!editingDocente && !formDocente.contrasena) {
      showToast('error', 'La contraseña es obligatoria para nuevos docentes');
      return;
    }

    setSaving(true);
    try {
      if (editingDocente) {
        const result = await actualizarDocente(editingDocente.id, {
          nombre: formDocente.nombre,
          apellido: formDocente.apellido,
          telefono: formDocente.telefono || undefined,
          cursoIds: formDocente.cursoIds.length > 0 ? formDocente.cursoIds : undefined
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
          const n = Number(formDocente.gradoAsignado);
          return Number.isFinite(n) && !isNaN(n) ? n : formDocente.gradoAsignado;
        })();
        const crearPayload = {
          correo: formDocente.correo,
          contrasena: formDocente.contrasena,
          nombre: formDocente.nombre,
          apellido: formDocente.apellido,
          // Campos duplicados para compatibilidad con backend: usar nombres/apellidos
          nombres: formDocente.nombre,
          apellidos: formDocente.apellido,
          numeroDocumento: formDocente.numeroDocumento,
          telefono: formDocente.telefono || undefined,
          institucionId: Number(formDocente.institucionId) || (user?.institucionId as number) || 1,
          cursoIds: formDocente.cursoIds.length > 0 ? formDocente.cursoIds : undefined,
          tipoDocumento: formDocente.tipoDocumento,
          telefonoEmergencia: formDocente.telefonoEmergencia || undefined,
          personaEmergencia: formDocente.personaEmergencia || undefined,
          direccion: formDocente.direccion || undefined,
          esDirectorGrado: formDocente.esDirectorGrado || undefined,
          gradoAsignado: gradoAsignadoValue || undefined,
          areaQueOrienta: formDocente.areaQueOrienta || undefined,
          centroInteres: formDocente.centroInteres || undefined
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
              nombre: dRaw.nombre || dRaw.nombres || formDocente.nombre,
              apellido: dRaw.apellido || dRaw.apellidos || formDocente.apellido,
              correo: body?.usuario?.correo || formDocente.correo,
              telefono: dRaw.telefono || formDocente.telefono,
              institucionId: dRaw.institucionId || (user?.institucionId as number) || 1,
              estaActivo: true,
              cursos: Array.isArray(dRaw.cursos) ? dRaw.cursos.map((c: any) => ({ id: c.id, nombre: c.nombre })) : []
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
    setFormDocente(prev => ({
      ...prev,
      cursoIds: prev.cursoIds.includes(cursoId)
        ? prev.cursoIds.filter(id => id !== cursoId)
        : [...prev.cursoIds, cursoId]
    }));
  };

  // Filtrar docentes
  const docentesFiltrados = docentes.filter(d => {
    const matchBusqueda = 
      (d.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || '') ||
      (d.apellido?.toLowerCase().includes(busqueda.toLowerCase()) || '') ||
      (d.correo?.toLowerCase().includes(busqueda.toLowerCase()) || '');
    
    const matchActivo = 
      filtroActivo === 'todos' ||
      (filtroActivo === 'activos' && d.estaActivo) ||
      (filtroActivo === 'inactivos' && !d.estaActivo);
    
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
              {docentes.filter(d => d.estaActivo).length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500">Docentes Inactivos</p>
            <p className="text-2xl font-bold text-red-600">
              {docentes.filter(d => !d.estaActivo).length}
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
                              {(docente.nombre || '?')[0]}{(docente.apellido || '?')[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {docente.nombre} {docente.apellido}
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
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {docente.cursos && docente.cursos.length > 0 ? (
                            docente.cursos.slice(0, 2).map(c => (
                              <span key={c.id} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                {c.nombre}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-sm">Sin cursos</span>
                          )}
                          {docente.cursos && docente.cursos.length > 2 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                              +{docente.cursos.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {docente.estaActivo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                            <IconCheckCircle className="w-3 h-3" />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                            <IconAlertTriangle className="w-3 h-3" />
                            Inactivo
                          </span>
                        )}
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
              value={formDocente.nombre}
              onChange={(e) => setFormDocente(prev => ({ ...prev, nombre: e.target.value }))}
              placeholder="Nombre del docente"
              required name={''}            />
            <FormFieldInput
              label="Apellido"
              value={formDocente.apellido}
              onChange={(e) => {
                const nuevoApellido = e.target.value;
                setFormDocente(prev => ({
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
            value={formDocente.correo}
            onChange={(e) => setFormDocente(prev => ({ ...prev, correo: e.target.value }))}
            placeholder="correo@institucion.edu.co"
            required
            disabled={!!editingDocente} name={''}          />

          <FormFieldInput
            label="Número de Documento"
            type="text"
            value={formDocente.numeroDocumento}
            onChange={(e) => setFormDocente(prev => ({ ...prev, numeroDocumento: e.target.value }))}
            placeholder="Documento de identidad"
            required={!editingDocente} name={''}          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Documento</label>
              <select
                value={formDocente.tipoDocumento}
                onChange={(e) => setFormDocente(prev => ({ ...prev, tipoDocumento: e.target.value }))}
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
              value={formDocente.telefonoEmergencia}
              onChange={(e) => setFormDocente(prev => ({ ...prev, telefonoEmergencia: e.target.value }))}
              placeholder="Contacto de emergencia" name={''}            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormFieldInput
              label="Persona de Emergencia"
              type="text"
              value={formDocente.personaEmergencia}
              onChange={(e) => setFormDocente(prev => ({ ...prev, personaEmergencia: e.target.value }))}
              placeholder="Nombre del contacto" name={''}            />
            <FormFieldInput
              label="Dirección"
              type="text"
              value={formDocente.direccion}
              onChange={(e) => setFormDocente(prev => ({ ...prev, direccion: e.target.value }))}
              placeholder="Dirección de residencia" name={''}            />
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formDocente.esDirectorGrado}
                onChange={(e) => setFormDocente(prev => ({ ...prev, esDirectorGrado: e.target.checked }))}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Es director de grado
            </label>
            <FormFieldInput
              label="Grado Asignado"
              type="text"
              value={formDocente.gradoAsignado}
              onChange={(e) => setFormDocente(prev => ({ ...prev, gradoAsignado: e.target.value }))}
              placeholder="Ej: 5B" name={''}            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormFieldInput
              label="Área que Orienta"
              type="text"
              value={formDocente.areaQueOrienta}
              onChange={(e) => setFormDocente(prev => ({ ...prev, areaQueOrienta: e.target.value }))}
              placeholder="Ej: Matemáticas" name={''}            />
            <FormFieldInput
              label="Centro de Interés"
              type="text"
              value={formDocente.centroInteres}
              onChange={(e) => setFormDocente(prev => ({ ...prev, centroInteres: e.target.value }))}
              placeholder="Ej: Robótica" name={''}            />
          </div>
          
          {!editingDocente && (
            <div>
              <FormFieldInput
                label="Contraseña Temporal"
                type="text"
                value={formDocente.contrasena}
                onChange={(e) => setFormDocente(prev => ({ ...prev, contrasena: e.target.value }))}
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
            value={formDocente.telefono}
            onChange={(e) => setFormDocente(prev => ({ ...prev, telefono: e.target.value }))}
            placeholder="Número de contacto" name={''}          />

          <FormFieldInput
            label="Institución ID"
            type="number"
            value={String(formDocente.institucionId ?? '')}
            onChange={(e) => setFormDocente(prev => ({ ...prev, institucionId: Number(e.target.value) }))}
            placeholder="ID de la institución"
            name="institucionId"
          />
          
          {/* Selector de cursos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Asignar Cursos
            </label>
            <div className="border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto">
              {cursos.length === 0 ? (
                <p className="text-gray-400 text-sm">No hay cursos disponibles</p>
              ) : (
                <div className="space-y-2">
                  {cursos.map(curso => (
                    <label key={curso.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formDocente.cursoIds.includes(curso.id)}
                        onChange={() => toggleCurso(curso.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">{curso.nombre}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {formDocente.cursoIds.length > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                {formDocente.cursoIds.length} curso(s) seleccionado(s)
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
