import { useState, useEffect } from 'react';
import { 
  getSession, 
  getCursosCRUD,
  crearCurso,
  actualizarCurso,
  eliminarCurso,
  getGradosCRUD,
  getDocentesCRUD
} from '../api/endpoints';
import DashboardLayout from '../components/DashboardLayout';
import OrientadorLayout from '../components/orientador-acudiente/OrientadorLayout';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import FormFieldInput from '../components/ui/FormFieldInput';
import {
  IconBook,
  IconPlus,
  IconEdit,
  IconTrash,
  IconSearch,
  IconCheckCircle,
  IconAlertTriangle,
  IconUsers
} from '../components/ui/Icons';

interface Curso {
  id: number;
  nombre: string;
  jornada: 'Mañana' | 'Tarde' | 'Completa';
  gradoId: number;
  grado?: { id: number; nombre: string };
  docenteId?: number;
  docente?: { id: number; nombre: string; apellido: string };
  institucionId: number;
  totalEstudiantes?: number;
}

interface Grado {
  id: number;
  nombre: string;
}

interface Docente {
  id: number;
  nombre: string;
  apellido: string;
}

export default function CursosPage() {
  const session = getSession();
  const user = session?.user;

  const Layout = user?.rol === 'orientador' ? OrientadorLayout : DashboardLayout;
  
  const [loading, setLoading] = useState(true);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [grados, setGrados] = useState<Grado[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroJornada, setFiltroJornada] = useState<'todas' | 'Mañana' | 'Tarde' | 'Completa'>('todas');
  const [filtroGrado, setFiltroGrado] = useState<number | ''>('');
  
  // Modal
  const [modalCurso, setModalCurso] = useState(false);
  const [editingCurso, setEditingCurso] = useState<Curso | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Curso | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Formulario
  const [formCurso, setFormCurso] = useState({
    nombre: '',
    gradoId: 0,
    jornada: 'Mañana' as 'Mañana' | 'Tarde' | 'Completa',
    docenteId: undefined as number | undefined
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const session = getSession();
      const user = session?.user;
      const userInstitucionId = user?.institucionId || (session as any)?.context?.institucionId;
      
      console.log('[DEBUG][CursosPage] Usuario:', {
        rol: user?.rol,
        id: user?.id,
        institucionId: userInstitucionId
      });

      const [cursosData, gradosData, docentesData] = await Promise.all([
        getCursosCRUD(),
        getGradosCRUD(),
        getDocentesCRUD()
      ]);
      
      // Filtrar cursos por institución del usuario
      const cursosFiltrados = Array.isArray(cursosData) 
        ? cursosData.filter((curso: any) => {
            const cursoInstitucionId = curso?.institucionId || curso?.institucion_id || curso?.institucion?.id;
            const pasa = !cursoInstitucionId || cursoInstitucionId === userInstitucionId;
            
            console.log('[DEBUG][CursosPage] Filtrando curso:', {
              id: curso.id,
              nombre: curso.nombre,
              cursoInstitucionId,
              userInstitucionId,
              pasa
            });
            
            return pasa;
          })
        : [];

      console.log('[DEBUG][CursosPage] Cursos:', {
        total: cursosData?.length || 0,
        filtrados: cursosFiltrados.length,
        institucionId: userInstitucionId
      });

      setCursos(cursosFiltrados);
      setGrados(Array.isArray(gradosData) ? gradosData : []);
      setDocentes(Array.isArray(docentesData) ? docentesData : []);
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
    setEditingCurso(null);
    setFormCurso({
      nombre: '',
      gradoId: (Array.isArray(grados) && grados.length > 0) ? grados[0].id : 0,
      jornada: 'Mañana',
      docenteId: undefined
    });
    setModalCurso(true);
  };

  const handleOpenEdit = (curso: Curso) => {
    setEditingCurso(curso);
    setFormCurso({
      nombre: curso.nombre,
      gradoId: curso.gradoId || curso.grado?.id || 0,
      jornada: curso.jornada,
      docenteId: curso.docenteId || curso.docente?.id
    });
    setModalCurso(true);
  };

  const handleSaveCurso = async () => {
    if (!formCurso.nombre.trim()) {
      showToast('error', 'El nombre del curso es obligatorio');
      return;
    }

    if (!formCurso.gradoId) {
      showToast('error', 'Debe seleccionar un grado');
      return;
    }

    setSaving(true);
    try {
      if (editingCurso) {
        const result = await actualizarCurso(editingCurso.id, {
          nombre: formCurso.nombre,
          gradoId: formCurso.gradoId,
          jornada: formCurso.jornada,
          docenteId: formCurso.docenteId
        });
        if (result.success) {
          showToast('success', 'Curso actualizado correctamente');
          setModalCurso(false);
          loadData();
        } else {
          showToast('error', result.error || 'Error al actualizar');
        }
      } else {
        const result = await crearCurso({
          nombre: formCurso.nombre,
          gradoId: formCurso.gradoId,
          jornada: formCurso.jornada,
          institucionId: user?.institucionId || 1,
          docenteId: formCurso.docenteId
        });
        if (result.success) {
          showToast('success', 'Curso creado correctamente');
          setModalCurso(false);
          loadData();
        } else {
          showToast('error', result.error || 'Error al crear');
        }
      }
    } catch (error) {
      showToast('error', 'Error al guardar curso');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCurso = async () => {
    if (!confirmDelete) return;
    
    setSaving(true);
    try {
      const result = await eliminarCurso(confirmDelete.id);
      if (result.success) {
        showToast('success', 'Curso eliminado correctamente');
        setConfirmDelete(null);
        loadData();
      } else {
        showToast('error', result.error || 'Error al eliminar');
      }
    } catch (error) {
      showToast('error', 'Error al eliminar curso');
    } finally {
      setSaving(false);
    }
  };

  // Filtrar cursos
  const cursosFiltrados = cursos.filter(c => {
    const matchBusqueda = c.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const matchJornada = filtroJornada === 'todas' || c.jornada.toLowerCase() === filtroJornada.toLowerCase();
    const matchGrado = !filtroGrado || c.gradoId === filtroGrado || c.grado?.id === filtroGrado;
    
    return matchBusqueda && matchJornada && matchGrado;
  });

  // Estadísticas
  const estadisticas = {
    total: cursos.length,
    porJornada: {
      manana: cursos.filter(c => c.jornada === 'Mañana').length,
      tarde: cursos.filter(c => c.jornada === 'Tarde').length,
      completa: cursos.filter(c => c.jornada === 'Completa').length
    }
  };

  const getJornadaColor = (jornada: string) => {
    switch (jornada) {
      case 'Mañana': return 'bg-amber-100 text-amber-700';
      case 'Tarde': return 'bg-blue-100 text-blue-700';
      case 'Completa': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <IconBook className="w-7 h-7 text-primary-600" />
              Gestión de Cursos
            </h1>
            <p className="text-gray-600 mt-1">
              Administra los cursos de tu institución
            </p>
          </div>
          <Button onClick={handleOpenCreate} className="flex items-center gap-2">
            <IconPlus className="w-5 h-5" />
            Nuevo Curso
          </Button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <select
              value={filtroJornada}
              onChange={(e) => setFiltroJornada(e.target.value as any)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="todas">Todas las jornadas</option>
              <option value="Mañana">Mañana</option>
                
              <option value="Tarde">Tarde</option>
              <option value="Completa">Completa</option>
            </select>
            <select
              value={filtroGrado}
              onChange={(e) => setFiltroGrado(e.target.value ? Number(e.target.value) : '')}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Todos los grados</option>
              {Array.isArray(grados) && grados.map(g => (
                <option key={g.id} value={g.id}>{g.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500">Total Cursos</p>
            <p className="text-2xl font-bold text-gray-900">{estadisticas.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500">Jornada Mañana</p>
            <p className="text-2xl font-bold text-amber-600">{estadisticas.porJornada.manana}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500">Jornada Tarde</p>
            <p className="text-2xl font-bold text-blue-600">{estadisticas.porJornada.tarde}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500">Jornada Completa</p>
            <p className="text-2xl font-bold text-purple-600">{estadisticas.porJornada.completa}</p>
          </div>
        </div>

        {/* Grid de cursos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cursosFiltrados.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl p-12 text-center text-gray-500 border border-gray-100">
              No se encontraron cursos
            </div>
          ) : (
            cursosFiltrados.map((curso) => (
              <div 
                key={curso.id} 
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{curso.nombre}</h3>
                    <p className="text-sm text-gray-500">
                      {curso.grado?.nombre || `Grado ID: ${curso.gradoId}`}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getJornadaColor(curso.jornada)}`}>
                    {curso.jornada}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <IconUsers className="w-4 h-4" />
                    <span>{curso.totalEstudiantes || 0} estudiantes</span>
                    
                  </div>
                  {(curso.docente || curso.docenteId) && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-4 h-4 rounded-full bg-primary-100 flex items-center justify-center text-xs text-primary-700 font-medium">
                        D
                      </span>
                      <span>
                        {curso.docente 
                          ? `${curso.docente.nombre} ${curso.docente.apellido}` 
                          : 'Docente asignado'}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleOpenEdit(curso)}
                    className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <IconEdit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(curso)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <IconTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Crear/Editar Curso */}
      <Modal
        isOpen={modalCurso}
        onClose={() => setModalCurso(false)}
        title={editingCurso ? 'Editar Curso' : 'Nuevo Curso'}
        size="md"
      >
        <div className="p-6 space-y-4">
          <FormFieldInput
            name="nombre"
            label="Nombre del Curso"
            value={formCurso.nombre}
            onChange={(e) => setFormCurso(prev => ({ ...prev, nombre: e.target.value }))}
            placeholder="Ej: 5°A, 10°B"
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grado <span className="text-red-500">*</span>
            </label>
            <select
              value={formCurso.gradoId}
              onChange={(e) => setFormCurso(prev => ({ ...prev, gradoId: Number(e.target.value) }))}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value={0}>Seleccionar grado...</option>
              {Array.isArray(grados) && grados.map(g => (
                <option key={g.id} value={g.id}>{g.nombre}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jornada <span className="text-red-500">*</span>
            </label>
            <select
              value={formCurso.jornada}
              onChange={(e) => setFormCurso(prev => ({ 
                ...prev, 
                jornada: e.target.value as 'Mañana' | 'Tarde' | 'Completa' 
              }))}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="Mañana">Mañana</option>
              <option value="Tarde">Tarde</option>
              <option value="Completa">Completa</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Docente Titular (opcional)
            </label>
            <select
              value={formCurso.docenteId || ''}
              onChange={(e) => setFormCurso(prev => ({ 
                ...prev, 
                docenteId: e.target.value ? Number(e.target.value) : undefined 
              }))}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Sin docente asignado</option>
              {Array.isArray(docentes) && docentes.map(d => (
                <option key={d.id} value={d.id}>{d.nombre} {d.apellido}</option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setModalCurso(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCurso} disabled={saving}>
              {saving ? 'Guardando...' : editingCurso ? 'Actualizar' : 'Crear'}
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
            ¿Estás seguro de eliminar el curso{' '}
            <span className="font-semibold text-gray-900">{confirmDelete?.nombre}</span>?
            Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDeleteCurso} disabled={saving}>
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
    </Layout>
  );
}
