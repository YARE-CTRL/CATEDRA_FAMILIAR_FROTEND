import { useState, useEffect } from 'react';
import { 
  getSession, 
  getDocentesCRUD,
  getOrientadoresCoordinador,
  crearOrientador,
  actualizarOrientador,
  desactivarOrientador
} from '../api/endpoints';
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
  IconUserPlus
} from '../components/ui/Icons';

const GestionOrientacionPage = () => {
  const session = getSession();
  const user = session?.user;
  const userRole = user?.rol;

  // Protección básica: solo coordinador puede ver esta página
  if (userRole !== 'coordinador') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-md">
          <h2 className="text-2xl font-bold mb-2 text-teal-700">Acceso denegado</h2>
          <p className="text-slate-600 mb-4">Esta sección es exclusiva para el rol Coordinador.</p>
        </div>
      </div>
    );
  }

  // Solo Coordinador y Admin pueden crear/editar
  const canManage = userRole === 'coordinador' || userRole === 'admin' || userRole === 'admin_sistema';
  
  const [loading, setLoading] = useState(true);
  const [docentes, setDocentes] = useState<any[]>([]);
  const [orientadores, setOrientadores] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'docentes' | 'orientadores'>('docentes');
  
  // Modal de orientador
  const [modalOrientador, setModalOrientador] = useState(false);
  const [editingOrientador, setEditingOrientador] = useState<any>(null);
  const [formOrientador, setFormOrientador] = useState({
    nombre: '',
    apellido: '',
    correo: '',
    contrasena: '',
    telefono: '',
    address: '',
    institucionId: user?.institucionId || 0
  });
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [docentesData, orientadoresData] = await Promise.all([
        getDocentesCRUD(),
        getOrientadoresCoordinador()
      ]);
      setDocentes(docentesData || []);
      setOrientadores(orientadoresData || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const resetFormOrientador = () => {
    setFormOrientador({
      nombre: '',
      apellido: '',
      correo: '',
      contrasena: '',
      telefono: '',
      address: '',
      institucionId: user?.institucionId || 0
    });
  };

  const openEditOrientador = (orientador: any) => {
    setEditingOrientador(orientador);
    setFormOrientador({
      nombre: orientador.firstName || orientador.nombre || '',
      apellido: orientador.lastName || orientador.apellido || '',
      correo: orientador.email || orientador.correo || '',
      contrasena: '',
      telefono: orientador.phone || orientador.telefono || '',
      address: orientador.address || orientador.direccion || '',
      institucionId: orientador.institucionId || user?.institucionId || 0
    });
    setModalOrientador(true);
  };

  const handleSaveOrientador = async () => {
    setSaving(true);
    setError(null);
    try {
      const errs: string[] = [];
      if (!formOrientador.nombre.trim()) errs.push('Nombres requeridos');
      if (!formOrientador.apellido.trim()) errs.push('Apellidos requeridos');
      if (!formOrientador.correo.trim()) errs.push('Correo requerido');
      if (!formOrientador.telefono.trim()) errs.push('Teléfono requerido');
      if (!formOrientador.address.trim()) errs.push('Dirección requerida');
      if (errs.length > 0) {
        setError(errs.join('. '));
        return;
      }
      // Mapear campos al formato del backend
      const orientadorData = {
        firstName: formOrientador.nombre,
        lastName: formOrientador.apellido,
        email: formOrientador.correo,
        phone: formOrientador.telefono,
        address: formOrientador.address,
        ...(formOrientador.contrasena?.trim() ? { contrasena: formOrientador.contrasena.trim() } : {})
      };

      let res;
      if (editingOrientador) {
        res = await actualizarOrientador(editingOrientador.id, orientadorData);
      } else {
        res = await crearOrientador(orientadorData);
      }

      if ((res as any).success) {
        const data = (res as any).data;
        const backendMsg = (res as any).message;
        setSuccess(backendMsg || (editingOrientador ? 'Orientador actualizado exitosamente' : 'Orientador creado exitosamente'));
        setModalOrientador(false);
        setEditingOrientador(null);
        resetFormOrientador();
        await loadData();
        setTimeout(() => setSuccess(null), 3000);
        if (data && data.passwordTemporal) {
          alert(`✅ Orientador creado. Contraseña temporal: ${data.passwordTemporal}`);
        }
      } else {
        setError((res as any).message || (res as any).error || 'Error al guardar orientador');
      }
    } catch (error: any) {
      const msg = error?.message || 'Error al guardar orientador';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrientador = async (id: number, nombre: string) => {
    if (!confirm(`¿Está seguro de eliminar al orientador ${nombre}?`)) return;
    
    try {
      const result = await desactivarOrientador(id);
      if (result.success) {
        setSuccess('Orientador eliminado correctamente');
        await loadData();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || result.error || 'Error al eliminar orientador');
        setTimeout(() => setError(null), 5000);
      }
    } catch (error: any) {
      console.error('Error al eliminar orientador:', error);
      setError(error.message || 'Error al eliminar orientador. Por favor, intente nuevamente.');
      setTimeout(() => setError(null), 5000);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" text="Cargando gestión de orientación..." />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">{/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Gestión de Orientación</h1>
              <p className="text-slate-600 mt-1">Administra docentes y orientadores de tu institución</p>
            </div>
            {activeTab === 'orientadores' && canManage && (
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

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex gap-2 border-b border-slate-200 p-4">
            <button
              onClick={() => setActiveTab('docentes')}
              className={`px-4 py-2 font-medium transition-colors rounded-lg ${
                activeTab === 'docentes'
                  ? 'bg-indigo-100 text-indigo-600'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              Docentes ({docentes.length})
            </button>
            <button
              onClick={() => setActiveTab('orientadores')}
              className={`px-4 py-2 font-medium transition-colors rounded-lg ${
                activeTab === 'orientadores'
                  ? 'bg-indigo-100 text-indigo-600'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              Orientadores ({orientadores.length})
            </button>
          </div>

          <div className="p-6">
            {/* Contenido de Docentes */}
            {activeTab === 'docentes' && (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="text-left py-3.5 px-5 font-semibold text-slate-600 text-sm">Docente</th>
                      <th className="text-center py-3.5 px-4 font-semibold text-slate-600 text-sm">Correo</th>
                      <th className="text-center py-3.5 px-4 font-semibold text-slate-600 text-sm">Teléfono</th>
                      <th className="text-center py-3.5 px-4 font-semibold text-slate-600 text-sm">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!Array.isArray(docentes) || docentes.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-slate-500">
                          <IconUsers className="mx-auto mb-3 text-slate-400" size={48} />
                          <p className="font-medium">No hay docentes registrados</p>
                        </td>
                      </tr>
                    ) : (
                      docentes.map((docente: any) => (
                        <tr key={docente.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                {docente.nombre?.[0] || '?'}{docente.apellido?.[0] || ''}
                              </div>
                              <div>
                                <div className="font-medium text-slate-800">{docente.nombre} {docente.apellido}</div>
                              </div>
                            </div>
                          </td>
                          <td className="text-center py-4 px-4 text-slate-600 text-sm">
                            {docente.correo}
                          </td>
                          <td className="text-center py-4 px-4 text-slate-600">
                            {docente.telefono || '-'}
                          </td>
                          <td className="text-center py-4 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              docente.activo 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {docente.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Contenido de Orientadores */}
            {activeTab === 'orientadores' && (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="text-left py-3.5 px-5 font-semibold text-slate-600 text-sm">Orientador</th>
                      <th className="text-center py-3.5 px-4 font-semibold text-slate-600 text-sm">Correo</th>
                      <th className="text-center py-3.5 px-4 font-semibold text-slate-600 text-sm">Teléfono</th>
                      <th className="text-center py-3.5 px-4 font-semibold text-slate-600 text-sm">Estado</th>
                      <th className="text-center py-3.5 px-4 font-semibold text-slate-600 text-sm">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!Array.isArray(orientadores) || orientadores.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500">
                          <IconUserPlus className="mx-auto mb-3 text-slate-400" size={48} />
                          <p className="font-medium">No hay orientadores registrados</p>
                          <p className="text-sm text-slate-400 mt-1">Haz clic en "Nuevo Orientador" para agregar uno</p>
                        </td>
                      </tr>
                    ) : (
                      orientadores.map((orientador: any) => {
                        const nombre = orientador.firstName || orientador.nombre || '';
                        const apellido = orientador.lastName || orientador.apellido || '';
                        const email = orientador.email || orientador.correo || '';
                        const telefono = orientador.telefono || orientador.phone || '-';
                        const activo = orientador.estaActivo ?? orientador.activo ?? true;
                        
                        return (
                          <tr key={orientador.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                  {nombre[0] || '?'}{apellido[0] || ''}
                                </div>
                                <div>
                                  <div className="font-medium text-slate-800">{nombre} {apellido}</div>
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
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Orientador */}
      <Modal
        isOpen={modalOrientador}
        onClose={() => {
          setModalOrientador(false);
          setEditingOrientador(null);
          resetFormOrientador();
          setError(null);
        }}
        title={editingOrientador ? 'Editar Orientador' : 'Nuevo Orientador'}
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <FormFieldInput
            name="nombre"
            label="Nombre"
            value={formOrientador.nombre}
            onChange={(e) => setFormOrientador({ ...formOrientador, nombre: e.target.value })}
            required
          />
          
          <FormFieldInput
            name="apellido"
            label="Apellido"
            value={formOrientador.apellido}
            onChange={(e) => setFormOrientador({ ...formOrientador, apellido: e.target.value })}
            required
          />
          
          <FormFieldInput
            name="correo"
            label="Correo Electrónico"
            type="email"
            value={formOrientador.correo}
            onChange={(e) => setFormOrientador({ ...formOrientador, correo: e.target.value })}
            required
          />
          
          <FormFieldInput
            name="address"
            label="Dirección"
            value={formOrientador.address}
            onChange={(e) => setFormOrientador({ ...formOrientador, address: e.target.value })}
            required
          />
          
          {!editingOrientador && (
            <FormFieldInput
              name="contrasena"
              label="Contraseña"
              type="password"
              value={formOrientador.contrasena}
              onChange={(e) => setFormOrientador({ ...formOrientador, contrasena: e.target.value })}
              
            />
          )}
          
          <FormFieldInput
            name="telefono"
            label="Teléfono"
            value={formOrientador.telefono}
            onChange={(e) => setFormOrientador({ ...formOrientador, telefono: e.target.value })}
          />
          
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
            <Button onClick={handleSaveOrientador} disabled={saving}>
              {saving ? 'Guardando...' : (editingOrientador ? 'Actualizar' : 'Crear')} Orientador
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default GestionOrientacionPage;
