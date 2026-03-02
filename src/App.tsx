import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './components/ui/ToastGlobal'
import SessionTimeoutProvider from './components/SessionTimeoutProvider'
import { getSession } from './api/endpoints'

// Pages - Solo roles web (Admin, Rector, Coordinador, Orientador, Docente)
import Landing from './pages/Landing'
import NotFoundPage from './pages/NotFoundPage'
import LoginPage from './pages/LoginPage'
import DashboardDocentePage from './pages/DashboardDocentePage'
import DashboardSupervisorPage from './pages/DashboardSupervisorPage'
import DashboardRectorPage from './pages/DashboardRectorPage'
import DashboardAdminPage from './pages/DashboardAdminPage'
import DashboardAdminHome from './pages/DashboardAdminHome'
import DashboardCoordinadorPage from './pages/DashboardCoordinadorPage'
import DashboardAcudientePage from './pages/DashboardAcudientePage'
import DirectivosPage from './pages/DirectivosPage'
import ProfilePage from './pages/ProfilePage'
import ReportesRector from './components/reportes/ReportesRector'
import ReportesCoordinador from './components/reportes/ReportesCoordinador'
import ReportesOrientador from './components/reportes/ReportesOrientador'
import ReportesDocente from './components/reportes/ReportesDocente'
import ReportesAdmin from './components/reportes/ReportesAdmin'
import GestionOrientacionPage from './pages/GestionOrientacionPage'
import CursosPage from './pages/CursosPage'
import ConfiguracionRectorPage from './pages/ConfiguracionRectorPage'
import PadresFamiliaPage from './pages/PadresFamiliaPage'
import TareasPage from './pages/TareasPage'
import EstudiantesDocentePage from './pages/EstudiantesDocentePage'
import PadresDocentePage from './pages/PadresDocentePage'
import BancoTareasDocentePage from './pages/BancoTareasDocentePage'
import EspecialesListPage from './pages/EspecialesListPage'
import EspecialNuevaPage from './pages/EspecialNuevaPage'
import EntregasDocentePage from './pages/EntregasDocentePage'
import EntregasOrientadorPage from './pages/EntregasOrientadorPage'
import DocenteAsignacionesListPage from './pages/DocenteAsignacionesListPage'
import DocenteAsignacionResumenPage from './pages/DocenteAsignacionResumenPage'
import ReporteEntregasCursoPage from './pages/ReporteEntregasCursoPage'
import ReporteCalificacionesCursoPage from './pages/ReporteCalificacionesCursoPage'
import AsignacionesPage from './pages/AsignacionesPage'
import PerfilAcudientePage from './pages/PerfilAcudientePage'
import AcudienteTareasEstudiantePage from './pages/AcudienteTareasEstudiantePage'
import AcudienteAsignacionDetallePage from './pages/AcudienteAsignacionDetallePage'
import AcudienteHijosPage from './pages/AcudienteHijosPage'
import EstudiantesPage from './pages/EstudiantesPage'
import OrientadorLayout from './components/orientador-acudiente/OrientadorLayout'
import AcudienteTareasAutoPage from './pages/AcudienteTareasAutoPage'
import AcudienteEspecialesPage from './pages/AcudienteEspecialesPage'

// Legacy
import DashboardPage from './pages/DashboardPage'
import PagePlaceholder from './components/PagePlaceholder'
import DocentesPage from './pages/DocentesPage'

// Protected Route wrapper
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactElement, allowedRoles?: string[] }) {
  const session = getSession();
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  
  let currentRole = (session as any).isPreview && (session as any).previewRole 
    ? (session as any).previewRole 
    : session.user.rol;
  
  // Normalizar admin_sistema a admin para verificación de permisos
  const normalizedRole = currentRole === 'admin_sistema' ? 'admin' : currentRole;
  
  // Verificar permisos usando rol normalizado (admin_sistema cuenta como admin)
  if (allowedRoles && !allowedRoles.includes(currentRole) && !allowedRoles.includes(normalizedRole)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

// Redirect based on role
function DashboardRedirect() {
  const session = getSession();
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  
  const currentRole = (session as any).isPreview && (session as any).previewRole 
    ? (session as any).previewRole 
    : session.user.rol;
  
  switch (currentRole) {
    case 'docente':
    case 'docente_aula':
      return <Navigate to="/dashboard/docente" replace />;
    case 'orientador':
      return <Navigate to="/dashboard/orientador" replace />;
    case 'coordinador':
      return <Navigate to="/dashboard/coordinador" replace />;
    case 'rector':
      return <Navigate to="/dashboard/rector" replace />;
    case 'admin':
    case 'admin_sistema':
      return <Navigate to="/dashboard/admin" replace />;
    case 'acudiente':
      return <Navigate to="/dashboard/acudiente" replace />;
    default:
      // Si es acudiente u otro rol no permitido, redirigir a página de acceso denegado
      return <Navigate to="/acceso-denegado" replace />;
  }
}

// Página de acceso denegado para acudientes
function AccesoDenegado() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">📱</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Acceso desde App Móvil
        </h1>
        <p className="text-gray-600 mb-6">
          Los acudientes y padres de familia deben acceder a través de la 
          <strong> aplicación móvil de Cátedra de Familia</strong>.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Descarga la app desde Google Play Store para ver las tareas de tus hijos, 
          enviar evidencias y recibir notificaciones.
        </p>
        <div className="space-y-3">
          <a 
            href="#" 
            className="block w-full px-6 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors"
          >
            📲 Descargar App Android
          </a>
          <a 
            href="/" 
            className="block w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export default function App(){
  return (
    <ToastProvider>
      <BrowserRouter>
        <SessionTimeoutProvider>
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing/>} />
          <Route path="/login" element={<LoginPage/>} />
          <Route path="/acceso-denegado" element={<AccesoDenegado/>} />
          
          {/* Dashboard redirect based on role */}
          <Route path="/dashboard" element={<DashboardRedirect />} />
          
          {/* Protected Dashboard Routes - Solo roles web */}
          {/* Rutas de gestión para docente */}
<Route path="/docente/estudiantes" element={
  <ProtectedRoute allowedRoles={['docente','docente_aula','orientador','coordinador','rector','admin']}>
    <EstudiantesDocentePage />
  </ProtectedRoute>
} />
<Route path="/docente/banco-tareas" element={
  <ProtectedRoute allowedRoles={['docente','docente_aula','orientador','coordinador','rector','admin']}>
    <BancoTareasDocentePage />
  </ProtectedRoute>
} />
<Route path="/docente/asignaciones" element={
  <ProtectedRoute allowedRoles={['docente','docente_aula','orientador','coordinador','rector','admin']}>
    <DocenteAsignacionesListPage />
  </ProtectedRoute>
} />
<Route path="/docente/especiales" element={
  <ProtectedRoute allowedRoles={['docente','docente_aula','orientador','coordinador','rector','admin']}>
    <EspecialesListPage />
  </ProtectedRoute>
} />
<Route path="/docente/especiales/nueva" element={
  <ProtectedRoute allowedRoles={['docente','docente_aula','orientador','coordinador','rector','admin']}>
    <EspecialNuevaPage />
  </ProtectedRoute>
} />
<Route path="/docente/asignaciones/:id" element={
  <ProtectedRoute allowedRoles={['docente','docente_aula','orientador','coordinador','rector','admin']}>
    <DocenteAsignacionResumenPage />
  </ProtectedRoute>
} />
<Route path="/asignaciones/nueva" element={
  <ProtectedRoute allowedRoles={['docente','docente_aula','orientador','coordinador','rector','admin']}>
    <AsignacionesPage />
  </ProtectedRoute>
} />
<Route path="/docente/acudientes" element={
  <ProtectedRoute allowedRoles={['docente','docente_aula','orientador','coordinador','rector','admin']}>
    <PadresDocentePage />
  </ProtectedRoute>
} />
          <Route path="/dashboard/docente" element={
            <ProtectedRoute allowedRoles={['docente', 'docente_aula', 'orientador', 'coordinador', 'rector', 'admin']}>
              <DashboardDocentePage />
              
            </ProtectedRoute>
            
          } />
          
          <Route path="/dashboard/orientador" element={
            <ProtectedRoute allowedRoles={['orientador', 'coordinador', 'rector', 'admin']}>
              <DashboardSupervisorPage />
            </ProtectedRoute>
          } />
          
          <Route path="/dashboard/coordinador" element={
            <ProtectedRoute allowedRoles={['coordinador', 'rector', 'admin']}>
              <DashboardCoordinadorPage />
            </ProtectedRoute>
          } />
          
          <Route path="/dashboard/rector" element={
            <ProtectedRoute allowedRoles={['rector', 'admin']}>
              <DashboardRectorPage />
            </ProtectedRoute>
          } />
          
          <Route path="/dashboard/acudiente" element={
            <ProtectedRoute allowedRoles={['acudiente']}>
              <DashboardAcudientePage />
            </ProtectedRoute>
          } />
          <Route path="/acudiente/perfil" element={
            <ProtectedRoute allowedRoles={['acudiente']}>
              <PerfilAcudientePage />
            </ProtectedRoute>
          } />
          <Route path="/acudiente/hijos" element={
            <ProtectedRoute allowedRoles={['acudiente']}>
              <AcudienteHijosPage />
            </ProtectedRoute>
          } />
          <Route path="/acudiente/tareas" element={
            <ProtectedRoute allowedRoles={['acudiente']}>
              <AcudienteTareasAutoPage />
            </ProtectedRoute>
          } />
          <Route path="/acudiente/especiales" element={
            <ProtectedRoute allowedRoles={['acudiente']}>
              <AcudienteEspecialesPage />
            </ProtectedRoute>
          } />
          <Route path="/acudiente/estudiantes/:id/tareas" element={
            <ProtectedRoute allowedRoles={['acudiente']}>
              <AcudienteTareasEstudiantePage />
            </ProtectedRoute>
          } />
          <Route path="/acudiente/asignaciones/:id" element={
            <ProtectedRoute allowedRoles={['acudiente']}>
              <AcudienteAsignacionDetallePage />
            </ProtectedRoute>
          } />
          
          <Route path="/dashboard/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DashboardAdminHome />
            </ProtectedRoute>
          } />

          <Route path="/dashboard/admin/manage" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DashboardAdminPage />
            </ProtectedRoute>
          } />

          {/* Docente - Entregas con layout docente */}
          <Route path="/entregas" element={<ProtectedRoute allowedRoles={['docente','docente_aula']}><EntregasDocentePage /></ProtectedRoute>} />
          <Route path="/docente/entregas" element={<ProtectedRoute allowedRoles={['docente','docente_aula']}><EntregasDocentePage /></ProtectedRoute>} />
          {/* Orientador - Entregas */}
          <Route path="/" element={<ProtectedRoute allowedRoles={['orientador']}><EntregasOrientadorPage /></ProtectedRoute>} />
<Route path="/estudiantes" element={
  <ProtectedRoute allowedRoles={['orientador']}>
    <OrientadorLayout>
      <EstudiantesPage />
    </OrientadorLayout>
  </ProtectedRoute>
} />
          <Route path="/gestion-orientacion" element={<ProtectedRoute allowedRoles={['coordinador','rector','admin']}><GestionOrientacionPage /></ProtectedRoute>} />
          <Route path="/directivos" element={<ProtectedRoute allowedRoles={['rector','admin']}><DirectivosPage /></ProtectedRoute>} />
          <Route path="/cursos" element={<ProtectedRoute allowedRoles={['orientador','coordinador','rector','admin']}><CursosPage /></ProtectedRoute>} />
          <Route path="/padres-familia" element={<ProtectedRoute allowedRoles={['orientador','coordinador','rector','admin']}><PadresFamiliaPage /></ProtectedRoute>} />
          <Route path="/reportes/rector" element={<ProtectedRoute allowedRoles={['rector']}><ReportesRector /></ProtectedRoute>} />
          <Route path="/reportes/coordinador" element={<ProtectedRoute allowedRoles={['coordinador']}><ReportesCoordinador /></ProtectedRoute>} />
          <Route path="/reportes/orientador" element={<ProtectedRoute allowedRoles={['orientador']}><ReportesOrientador /></ProtectedRoute>} />
          <Route path="/reportes/docente" element={<ProtectedRoute allowedRoles={['docente','docente_aula']}><ReportesDocente /></ProtectedRoute>} />
          <Route path="/tareas" element={
  <ProtectedRoute allowedRoles={['orientador','coordinador','rector','admin']}>
    <TareasPage />
  </ProtectedRoute>
} />
          <Route path="/docentes" element={
            <ProtectedRoute allowedRoles={['orientador']}>
              <DocentesPage />
            </ProtectedRoute>
          } />
          <Route path="/reportes/cursos/:id/entregas" element={<ProtectedRoute allowedRoles={['docente','docente_aula']}><ReporteEntregasCursoPage /></ProtectedRoute>} />
          <Route path="/reportes/cursos/:id/calificaciones" element={<ProtectedRoute allowedRoles={['docente','docente_aula']}><ReporteCalificacionesCursoPage /></ProtectedRoute>} />
          <Route path="/reportes/admin" element={<ProtectedRoute allowedRoles={['admin']}><ReportesAdmin /></ProtectedRoute>} />
          <Route path="/configuracion" element={<ProtectedRoute allowedRoles={['rector','admin']}><ConfiguracionRectorPage /></ProtectedRoute>} />
          <Route path="/instituciones" element={<ProtectedRoute allowedRoles={['admin']}><PagePlaceholder title="Instituciones" description="Gestión de instituciones."/></ProtectedRoute>} />
          <Route path="/usuarios" element={<ProtectedRoute allowedRoles={['admin']}><PagePlaceholder title="Usuarios" description="Gestión de usuarios."/></ProtectedRoute>} />
          
          {/* Perfil de usuario - disponible para todos los roles autenticados */}
          <Route path="/perfil" element={
            <ProtectedRoute allowedRoles={['docente','docente_aula','orientador','coordinador','rector','admin','acudiente']}>
              <ProfilePage />
            </ProtectedRoute>
          } />
          
          {/* Legacy route */}
          <Route path="/dashboard-old" element={<DashboardPage/>} />
          
          {/* 404 fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </SessionTimeoutProvider>
      </BrowserRouter>
    </ToastProvider>
  )
}


