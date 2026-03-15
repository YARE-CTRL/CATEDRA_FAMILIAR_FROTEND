import { useState, useEffect } from 'react';

import { getSession, getUsuarios, getInstituciones, crearCoordinadorRector, getMiInstitucion } from '../api/endpoints';

import apiClient from '../api/apiClient';

import { type Usuario, type Institucion } from '../mocks/data';

import DashboardLayout from '../components/DashboardLayout';

import LoadingSpinner from '../components/ui/LoadingSpinner';

import { exportToExcel, exportToPDF } from '../utils/exportUtils';

import {

  IconUsers,

  IconDownload,

  IconSearch,

  IconShield,

  IconFilter,

  IconCheck,

  IconX,

  IconPlus

} from '../components/ui/Icons';



export default function DirectivosPage() {

  const session = getSession();

  const user = session?.user;

  const esRector = user?.rol === 'rector' || user?.rolId === 2;

  

  const [loading, setLoading] = useState(true);

  const [directivos, setDirectivos] = useState<Usuario[]>([]);

  const [instituciones, setInstituciones] = useState<Institucion[]>([]);

  const [miInstitucion, setMiInstitucion] = useState<Institucion | null>(null);

  const [filtroRol, setFiltroRol] = useState<'todos' | 'coordinador' | 'orientador'>('todos');

  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activo' | 'inactivo'>('todos');

  const [searchTerm, setSearchTerm] = useState('');

  

  // Estado para modal de crear coordinador

  const [showModal, setShowModal] = useState(false);

  const [formError, setFormError] = useState('');

  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({

    nombre: '',

    apellido: '',

    correo: '',

    telefono: '',

    direccion: '',

    areaQueOrienta: '',

    centroInteres: '',

    tipoDocumento: 'CC' as 'CC' | 'TI' | 'CE',

    numeroDocumento: ''

  });



  useEffect(() => {

    loadData();

  }, []);



  const loadData = async () => {

    setLoading(true);

    try {

      // Si es rector, cargar su institución

      if (esRector && user?.institucionId) {

        const inst = await getMiInstitucion();

        setMiInstitucion(inst);

      }

      

      let directivosData: Usuario[] = [];

      const esAdmin = user?.rol === 'admin' || user?.rol === 'admin_sistema';

      

      if (esAdmin) {

        // Admin usa /admin/usuarios

        const [usuariosData, institucionesData] = await Promise.all([

          getUsuarios(),

          getInstituciones()

        ]);

        const usuariosArray = Array.isArray(usuariosData) ? usuariosData : [];

        directivosData = usuariosArray.filter(

          (u: Usuario) => ['coordinador', 'orientador'].includes(u.rol)

        );

        setInstituciones(Array.isArray(institucionesData) ? institucionesData : []);

      } else if (esRector) {

        // Rector usa endpoints específicos

        const [coordRes, orientRes] = await Promise.all([

          apiClient.getCoordinadoresRector(),

          apiClient.getOrientadoresRector()

        ]);

        

        if (coordRes.success && coordRes.data) {

          coordRes.data.forEach((c: any) => {

            directivosData.push({

              id: c.usuarioId || c.id,

              nombre: c.nombre || '',

              apellidos: c.apellido || '',

              correo: c.correo || '',

              telefono: c.telefono || '',

              rol: 'coordinador',

              activo: c.estaActivo ?? false,

              institucionId: c.institucionId

            } as Usuario);

          });

        }

        if (orientRes.success && orientRes.data) {

          orientRes.data.forEach((o: any) => {

            directivosData.push({

              id: o.usuarioId || o.id,

              nombre: o.nombre || '',

              apellidos: o.apellido || '',

              correo: o.correo || '',

              telefono: o.telefono || '',

              rol: 'orientador',

              activo: o.estaActivo ?? false,

              institucionId: o.institucionId

            } as Usuario);

          });

        }

      }



      setDirectivos(directivosData);

    } catch (error) {

      console.error('Error loading directivos:', error);

    } finally {

      setLoading(false);

    }

  };



  // Función para crear coordinador (solo rector)

  const handleCrearCoordinador = async () => {

    setFormError('');

    

    // Validaciones

    if (!formData.nombre.trim() || !formData.apellido.trim()) {

      setFormError('Nombre y apellido son requeridos');

      return;

    }

    if (!formData.correo.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo)) {

      setFormError('Correo electrónico inválido');

      return;

    }

    if (!formData.telefono.trim() || !/^\d{10}$/.test(formData.telefono.replace(/\D/g, ''))) {

      setFormError('Teléfono debe tener 10 dígitos');

      return;

    }

    if (!formData.direccion.trim()) {

      setFormError('La dirección es requerida');

      return;

    }

    if (!formData.areaQueOrienta.trim()) {

      setFormError('El área que orienta es requerida');

      return;

    }

    if (!formData.centroInteres.trim()) {

      setFormError('El centro de interés es requerido');

      return;

    }

    if (!formData.numeroDocumento.trim()) {

      setFormError('El número de documento es requerido');

      return;

    }

    

    setSaving(true);

    try {

      const result = await crearCoordinadorRector({

        nombre: formData.nombre,

        apellido: formData.apellido,

        correo: formData.correo,

        contrasena: 'Temp123456@', // Contraseña temporal que cumple con los requisitos: 8+ chars, mayúscula, minúscula, número, carácter especial

        telefono: formData.telefono.replace(/\D/g, ''),

        documento: formData.numeroDocumento,

        tipoDocumento: formData.tipoDocumento,

        direccion: formData.direccion,

        areaQueOrienta: formData.areaQueOrienta,

        centroInteres: formData.centroInteres

      });

      

      if (result.success) {

        // Mostrar mensaje de éxito

        setFormError(''); // Limpiar cualquier error anterior

        

        // Crear mensaje de éxito

        const mensajeExito = `✅ Coordinador creado exitosamente${result.institucionNombre ? ` en ${result.institucionNombre}` : ''}!\n\n📧 Correo: ${formData.correo}\n🔑 Contraseña temporal: Temp123456@\n\n⚠️ El coordinador debe cambiar la contraseña en su primer inicio.`;

        

        // Mostrar en un alert más visible

        window.alert(mensajeExito);

        

        setShowModal(false);

        setFormData({ 

          nombre: '', 

          apellido: '', 

          correo: '', 

          telefono: '', 

          direccion: '', 

          areaQueOrienta: '', 

          centroInteres: '', 

          tipoDocumento: 'CC', 

          numeroDocumento: '' 

        });

        await loadData();

      } else {

        setFormError(result.error || 'Error al crear coordinador');

      }

    } catch (error: any) {

      setFormError(error.message || 'Error de conexión');

    } finally {

      setSaving(false);

    }

  };



  // Filtrado de directivos

  const directivosFiltrados = directivos.filter(d => {

    const matchRol = filtroRol === 'todos' || d.rol === filtroRol;

    const matchEstado = filtroEstado === 'todos' || 

      (filtroEstado === 'activo' && d.activo) || 

      (filtroEstado === 'inactivo' && !d.activo);

    const matchSearch = searchTerm === '' || 

      `${d.nombre} ${d.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||

      d.correo.toLowerCase().includes(searchTerm.toLowerCase());

    

    return matchRol && matchEstado && matchSearch;

  });



  // Estadísticas

  const stats = {

    totalDirectivos: directivos.length,

    coordinadores: directivos.filter(d => d.rol === 'coordinador').length,

    orientadores: directivos.filter(d => d.rol === 'orientador').length,

    activos: directivos.filter(d => d.activo).length,

  };



  if (loading) {

    return (

      <DashboardLayout>

        <div className="flex flex-col items-center justify-center h-64 gap-4">

          <LoadingSpinner size="lg" />

          <p className="text-slate-500 animate-pulse">Cargando directivos...</p>

        </div>

      </DashboardLayout>

    );

  }



  const getInstitucionNombre = (institucionId: number | undefined) => {

    if (!institucionId) return 'Sin asignar';

    const inst = instituciones.find(i => i.id === institucionId);

    return inst?.nombre || 'Sin asignar';

  };



  return (

    <DashboardLayout>

      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}

        <div className="relative overflow-hidden bg-gradient-to-br from-purple-700 via-indigo-700 to-purple-800 rounded-2xl p-8 text-white shadow-xl">

          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-purple-400/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/3" />

          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-indigo-400/15 to-transparent rounded-full translate-y-1/2 -translate-x-1/3" />

          

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">

            <div className="flex items-center gap-5">

              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/40 ring-4 ring-white/10">

                <IconShield className="text-white" size={28} />

              </div>

              <div>

                <p className="text-purple-200 text-sm font-semibold uppercase tracking-wider mb-1">

                  Gestión de Personal

                </p>

                <h1 className="text-2xl md:text-3xl font-display font-bold">

                  Directivos

                </h1>

                <p className="text-indigo-200 mt-1">

                  Coordinadores y orientadores de la institución

                </p>

              </div>

            </div>

            

            {/* Exportar y Crear */}

            <div className="flex gap-3">

              {/* Botón crear coordinador (solo rector) */}

              {esRector && (

                <button 

                  onClick={() => setShowModal(true)}

                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/30"

                >

                  <IconPlus size={18} />

                  Crear Coordinador

                </button>

              )}

              <button 

                onClick={() => {

                  const data = directivosFiltrados.map(d => ({

                    'Nombre': `${d.nombre} ${d.apellidos}`,

                    'Correo': d.correo,

                    'Rol': d.rol === 'coordinador' ? 'Coordinador' : 'Orientador',

                    'Teléfono': d.telefono || '-',

                    'Institución': getInstitucionNombre(d.institucionId),

                    'Estado': d.activo ? 'Activo' : 'Inactivo'

                  }));

                  exportToExcel(data, 'Directivos', 'Directivos');

                }}

                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all flex items-center gap-2 backdrop-blur-sm border border-white/10"

              >

                <IconDownload size={18} />

                Excel

              </button>

              <button 

                onClick={() => {

                  const data = directivosFiltrados.map(d => ({

                    'Nombre': `${d.nombre} ${d.apellidos}`,

                    'Correo': d.correo,

                    'Rol': d.rol === 'coordinador' ? 'Coordinador' : 'Orientador',

                    'Institución': getInstitucionNombre(d.institucionId),

                    'Estado': d.activo ? 'Activo' : 'Inactivo'

                  }));

                  exportToPDF(

                    data,

                    'Listado_Directivos',

                    'Listado de Directivos',

                    [

                      { header: 'Nombre', dataKey: 'Nombre' },

                      { header: 'Rol', dataKey: 'Rol' },

                      { header: 'Institución', dataKey: 'Institución' },

                      { header: 'Estado', dataKey: 'Estado' }

                    ]

                  );

                }}

                className="px-4 py-2.5 bg-purple-500/50 hover:bg-purple-500/70 text-white rounded-xl font-medium transition-all flex items-center gap-2 backdrop-blur-sm border border-purple-400/30"

              >

                <IconDownload size={18} />

                PDF

              </button>

            </div>

          </div>

        </div>



        {/* Stats */}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">

            <div className="flex items-center gap-4">

              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">

                <IconShield className="text-white" size={22} />

              </div>

              <div>

                <div className="text-2xl font-bold text-slate-800">{stats.totalDirectivos}</div>

                <div className="text-sm text-slate-500 font-medium">Total Directivos</div>

              </div>

            </div>

          </div>



          <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">

            <div className="flex items-center gap-4">

              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center">

                <IconUsers className="text-white" size={22} />

              </div>

              <div>

                <div className="text-2xl font-bold text-slate-800">{stats.coordinadores}</div>

                <div className="text-sm text-slate-500 font-medium">Coordinadores</div>

              </div>

            </div>

          </div>



          <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">

            <div className="flex items-center gap-4">

              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">

                <IconUsers className="text-white" size={22} />

              </div>

              <div>

                <div className="text-2xl font-bold text-slate-800">{stats.orientadores}</div>

                <div className="text-sm text-slate-500 font-medium">Orientadores</div>

              </div>

            </div>

          </div>



          <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">

            <div className="flex items-center gap-4">

              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">

                <IconCheck className="text-white" size={22} />

              </div>

              <div>

                <div className="text-2xl font-bold text-slate-800">{stats.activos}</div>

                <div className="text-sm text-slate-500 font-medium">Activos</div>

              </div>

            </div>

          </div>

        </div>



        {/* Filtros y Búsqueda */}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">

          <div className="flex flex-col md:flex-row gap-4">

            {/* Búsqueda */}

            <div className="flex-1 relative">

              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />

              <input

                type="text"

                placeholder="Buscar por nombre o correo..."

                value={searchTerm}

                onChange={(e) => setSearchTerm(e.target.value)}

                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"

              />

            </div>

            

            {/* Filtro por rol */}

            <div className="flex items-center gap-2">

              <IconFilter className="text-slate-400" size={18} />

              <select

                value={filtroRol}

                onChange={(e) => setFiltroRol(e.target.value as typeof filtroRol)}

                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"

              >

                <option value="todos">Todos los roles</option>

                <option value="coordinador">Coordinadores</option>

                <option value="orientador">Orientadores</option>

              </select>

            </div>

            

            {/* Filtro por estado */}

            <select

              value={filtroEstado}

              onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)}

              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"

            >

              <option value="todos">Todos los estados</option>

              <option value="activo">Activos</option>

              <option value="inactivo">Inactivos</option>

            </select>

          </div>

        </div>



        {/* Lista de Directivos */}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

          <div className="p-4 border-b border-slate-100 flex items-center justify-between">

            <div className="text-sm text-slate-500">

              Mostrando <span className="font-semibold text-slate-700">{directivosFiltrados.length}</span> de {directivos.length} directivos

            </div>

          </div>

          

          {directivosFiltrados.length === 0 ? (

            <div className="p-12 text-center">

              <IconShield className="mx-auto mb-4 text-slate-300" size={48} />

              <h3 className="font-semibold text-slate-600 mb-2">No se encontraron directivos</h3>

              <p className="text-sm text-slate-500">Intenta ajustar los filtros de búsqueda</p>

            </div>

          ) : (

            <div className="divide-y divide-slate-100">

              {directivosFiltrados.map(directivo => (

                <div key={directivo.id} className="p-4 hover:bg-slate-50 transition-colors">

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-4">

                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold ${

                        directivo.rol === 'coordinador' 

                          ? 'bg-gradient-to-br from-purple-400 to-purple-600' 

                          : 'bg-gradient-to-br from-teal-400 to-teal-600'

                      }`}>

                        {directivo.nombre.charAt(0)}{directivo.apellidos?.charAt(0) || ''}

                      </div>

                      <div>

                        <h4 className="font-semibold text-gray-800">

                          {directivo.nombre} {directivo.apellidos}

                        </h4>

                        <div className="flex items-center gap-3 mt-1">

                          <span className="text-sm text-gray-500">{directivo.correo}</span>

                          {directivo.telefono && (

                            <span className="text-sm text-gray-400">• {directivo.telefono}</span>

                          )}

                        </div>

                      </div>

                    </div>

                    

                    <div className="flex items-center gap-4">

                      <div className="text-right">

                        <span className={`inline-block px-2.5 py-1 text-xs rounded-full font-medium ${

                          directivo.rol === 'coordinador' 

                            ? 'bg-purple-100 text-purple-700' 

                            : 'bg-teal-100 text-teal-700'

                        }`}>

                          {directivo.rol === 'coordinador' ? 'Coordinador' : 'Orientador'}

                        </span>

                        <p className="text-xs text-gray-500 mt-1">

                          {getInstitucionNombre(directivo.institucionId)}

                        </p>

                      </div>

                      

                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${

                        directivo.activo 

                          ? 'bg-green-100 text-green-600' 

                          : 'bg-red-100 text-red-600'

                      }`}>

                        {directivo.activo ? <IconCheck size={16} /> : <IconX size={16} />}

                      </div>

                    </div>

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

        

        {/* Modal para crear coordinador */}

        {showModal && (

          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

              <div className="p-6 border-b border-slate-100">

                <div className="flex items-center justify-between">

                  <div>

                    <h2 className="text-xl font-bold text-slate-800">Crear Coordinador</h2>

                    <p className="text-sm text-slate-500 mt-1">

                      {miInstitucion ? `Para: ${miInstitucion.nombre}` : 'En tu institución'}

                    </p>

                  </div>

                  <button 

                    onClick={() => setShowModal(false)}

                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"

                  >

                    <IconX size={18} />

                  </button>

                </div>

              </div>

              

              <div className="p-6 space-y-4">

                {formError && (

                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">

                    {formError}

                  </div>

                )}

                

                <div className="grid grid-cols-2 gap-4">

                  <div>

                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>

                    <input

                      type="text"

                      value={formData.nombre}

                      onChange={(e) => setFormData({...formData, nombre: e.target.value})}

                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"

                      placeholder="Juan Carlos"

                    />

                  </div>

                  <div>

                    <label className="block text-sm font-medium text-slate-700 mb-1">Apellido *</label>

                    <input

                      type="text"

                      value={formData.apellido}

                      onChange={(e) => setFormData({...formData, apellido: e.target.value})}

                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"

                      placeholder="Pérez González"

                    />

                  </div>

                </div>

                

                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-1">Correo electrónico *</label>

                  <input

                    type="email"

                    value={formData.correo}

                    onChange={(e) => setFormData({...formData, correo: e.target.value})}

                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"

                    placeholder="coordinador@institucion.edu.co"

                  />

                </div>

                

                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono *</label>

                  <input

                    type="tel"

                    value={formData.telefono}

                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}

                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"

                    placeholder="3001234567"

                  />

                </div>

                

                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-1">Dirección *</label>

                  <input

                    type="text"

                    value={formData.direccion}

                    onChange={(e) => setFormData({...formData, direccion: e.target.value})}

                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"

                    placeholder="Calle 123 #45-67"

                  />

                </div>

                

                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-1">Área que orienta *</label>

                  <input

                    type="text"

                    value={formData.areaQueOrienta}

                    onChange={(e) => setFormData({...formData, areaQueOrienta: e.target.value})}

                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"

                    placeholder="Coordinación Académica"

                  />

                </div>

                

                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-1">Centro de interés *</label>

                  <input

                    type="text"

                    value={formData.centroInteres}

                    onChange={(e) => setFormData({...formData, centroInteres: e.target.value})}

                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"

                    placeholder="Gestión Curricular"

                  />

                </div>

                

                <div className="grid grid-cols-3 gap-4">

                  <div className="col-span-1">

                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo Doc.</label>

                    <select

                      value={formData.tipoDocumento}

                      onChange={(e) => setFormData({...formData, tipoDocumento: e.target.value as 'CC' | 'TI' | 'CE'})}

                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"

                    >

                      <option value="CC">CC</option>

                      <option value="TI">TI</option>

                      <option value="CE">CE</option>

                    </select>

                  </div>

                  <div className="col-span-2">

                    <label className="block text-sm font-medium text-slate-700 mb-1">Número de Documento *</label>

                    <input

                      type="text"

                      value={formData.numeroDocumento}

                      onChange={(e) => setFormData({...formData, numeroDocumento: e.target.value})}

                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"

                      placeholder="123456789"

                    />

                  </div>

                </div>

              </div>

              

              <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">

                <button

                  onClick={() => setShowModal(false)}

                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"

                  disabled={saving}

                >

                  Cancelar

                </button>

                <button

                  onClick={handleCrearCoordinador}

                  disabled={saving}

                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"

                >

                  {saving ? (

                    <>

                      <LoadingSpinner size="sm" />

                      Creando...

                    </>

                  ) : (

                    <>

                      <IconPlus size={18} />

                      Crear Coordinador

                    </>

                  )}

                </button>

              </div>

            </div>

          </div>

        )}

      </div>

    </DashboardLayout>

  );

}

