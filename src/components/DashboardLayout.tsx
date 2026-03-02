import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logout, getSession, setPreviewRole } from '../api/endpoints';
import { usuariosMock, type RolUsuario } from '../mocks/data';
import { useEffect, useState } from 'react';
import {
  IconHome,
  IconBarChart,
  IconClipboard,
  IconPlus,
  IconInbox,
  IconUsers,
  IconTrendingUp,
  IconTeacher,
  IconGraduationCap,
  IconSettings,
  IconBuilding,
  IconFamily,
  IconLogout,
  IconMenu,
  IconX,
  IconUser,
  IconChevronRight
} from './ui/Icons';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Mapeo de iconos para navegación
const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  home: IconHome,
  dashboard: IconBarChart,
  tasks: IconClipboard,
  plus: IconPlus,
  inbox: IconInbox,
  users: IconUsers,
  reports: IconTrendingUp,
  teachers: IconTeacher,
  courses: IconGraduationCap,
  settings: IconSettings,
  institutions: IconBuilding,
  family: IconFamily,
  profile: IconUser,
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const session = getSession();
  const user = session?.user;
  const isPreview = session?.isPreview;
  
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [showInviteAdmin, setShowInviteAdmin] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedNavGroups, setExpandedNavGroups] = useState<Record<string, boolean>>({});

  // Verificar si el usuario actual es admin
  const isAdmin = user?.rol === 'admin' || user?.rol === 'admin_sistema';

  const handleInviteAdmin = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) return;
    
    setInviteLoading(true);
    try {
      // Simular envío de invitación (reemplazar con llamada real a API)
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Invitación enviada a:', inviteEmail);
      setInviteSuccess(true);
      setTimeout(() => {
        setShowInviteAdmin(false);
        setInviteEmail('');
        setInviteSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error al enviar invitación:', error);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSwitchRole = (role: string) => {
    setPreviewRole(role);
    setShowRoleSwitcher(false);
    
    // Redirigir al dashboard correspondiente (solo roles web)
    const roleRoutes: Record<string, string> = {
      docente: '/dashboard/docente',
      docente_aula: '/dashboard/docente',
      orientador: '/dashboard/orientador',
      coordinador: '/dashboard/coordinador',
      rector: '/dashboard/rector',
      admin: '/dashboard/admin',
      admin_sistema: '/dashboard/admin',
      acudiente: '/dashboard/acudiente',
    };
    navigate(roleRoutes[role] || '/dashboard/docente');
  };

  const getNavItems = () => {
    const rol = user?.rol;
    
    const commonItems = [
      { type: 'link', path: '/dashboard', label: 'Inicio', icon: 'home' },
    ];

    const profileItem = { type: 'link', path: '/perfil', label: 'Mi Perfil', icon: 'profile' };

    type NavItemLink = { type: 'link'; path: string; label: string; icon: string };
    type NavItemGroup = { type: 'group'; key: string; label: string; icon: string; children: NavItem[] };
    type NavItem = NavItemLink | NavItemGroup;

    switch (rol) {
      case 'docente_aula':
        return [
          ...commonItems,
          { type: 'link', path: '/dashboard/docente', label: 'Mi Panel', icon: 'dashboard' },
          { type: 'link', path: '/docente/banco-tareas', label: 'Banco de Tareas', icon: 'tasks' },
          { type: 'link', path: '/entregas', label: 'Entregas', icon: 'inbox' },
          { type: 'link', path: '/docente/estudiantes', label: 'Estudiantes', icon: 'users' },
          { type: 'link', path: '/docente/acudientes', label: 'Acudientes', icon: 'users' },
          { type: 'link', path: '/reportes/docente', label: 'Reportes', icon: 'reports' },
          profileItem,
        ];
      case 'orientador':
        return [
          ...commonItems,
          { type: 'link', path: '/dashboard/orientador', label: 'Mi Panel', icon: 'dashboard' },
          { type: 'link', path: '/tareas', label: 'Tareas', icon: 'tasks' },
          { type: 'link', path: '/docente/asignaciones', label: 'Asignaciones', icon: 'tasks' },
          { type: 'link', path: '/asignaciones/nueva', label: 'Asignar tarea', icon: 'tasks' },
   /*        { type: 'link', path: '/orientador/entregas', label: 'Entregas', icon: 'inbox' }, */
          { type: 'link', path: '/padres-familia', label: 'Padres de Familia', icon: 'family' },
          {
            type: 'group',
            key: 'mi-institucion',
            label: 'Mi institución',
            icon: 'institutions',
            children: [
              { type: 'link', path: '/estudiantes', label: 'Estudiantes', icon: 'users' },
              { type: 'link', path: '/cursos', label: 'Cursos', icon: 'courses' },
            ],
          },
          { type: 'link', path: '/reportes/orientador', label: 'Reportes', icon: 'reports' },
          profileItem,
        ];
      case 'coordinador':
        return [
          ...commonItems,
          { type: 'link', path: '/dashboard/coordinador', label: 'Mi Panel', icon: 'dashboard' },
          { type: 'link', path: '/gestion-orientacion', label: 'Gestión de Orientación', icon: 'teachers' },
          { type: 'link', path: '/cursos', label: 'Cursos', icon: 'courses' },
          { type: 'link', path: '/reportes/coordinador', label: 'Reportes', icon: 'reports' },
          profileItem,
        ];
      case 'rector':
        return [
          ...commonItems,
          { type: 'link', path: '/dashboard/rector', label: 'Mi Panel', icon: 'dashboard' },
          { type: 'link', path: '/directivos', label: 'Directivos', icon: 'users' },
          { type: 'link', path: '/reportes/rector', label: 'Reportes', icon: 'reports' },
          { type: 'link', path: '/configuracion', label: 'Configuración', icon: 'settings' },
          profileItem,
        ];
      case 'admin':
      case 'admin_sistema':
        return [
          ...commonItems,
          { type: 'link', path: '/dashboard/admin', label: 'Mi Panel', icon: 'dashboard' },
          { type: 'link', path: '/dashboard/admin/manage?tab=instituciones', label: 'Instituciones', icon: 'institutions' },
          { type: 'link', path: '/dashboard/admin/manage?tab=usuarios', label: 'Usuarios', icon: 'users' },
          { type: 'link', path: '/reportes/admin', label: 'Reportes', icon: 'reports' },
          { type: 'link', path: '/dashboard/admin/manage?tab=configuracion', label: 'Sistema', icon: 'settings' },
          // Admin no tiene perfil - solo gestiona sistema e invita admins
        ];
      case 'acudiente':
        return [
          ...commonItems,
          { type: 'link', path: '/dashboard/acudiente', label: 'Mi Panel', icon: 'dashboard' },
          { type: 'link', path: '/acudiente/especiales', label: 'Entregas especiales', icon: 'inbox' },
          profileItem,
        ];
      default:
        return [...commonItems, profileItem];
    }
  };

  const getRolLabel = (rol: RolUsuario) => {
    const labels: Record<RolUsuario, string> = {
      acudiente: 'Acudiente',
      docente_aula: 'Docente',
      orientador: 'Orientador',
      coordinador: 'Coordinador',
      rector: 'Rector',
      admin: 'Administrador',
      admin_sistema: 'Admin Sistema',
    };
    return labels[rol] || rol;
  };

  const navItems = getNavItems();

  const fullPath = location.pathname + (location.search || '');

  const isNavLinkActive = (path: string) => fullPath === path || location.pathname === path;

  const isNavItemActive = (item: any): boolean => {
    if (item?.type === 'link') return isNavLinkActive(item.path);
    if (item?.type === 'group') return Array.isArray(item.children) && item.children.some((c: any) => isNavItemActive(c));
    return false;
  };

  const ensureActiveGroupsExpanded = (items: any[]) => {
    const activeGroupKeys: string[] = [];

    const walk = (node: any) => {
      if (!node) return;
      if (node.type === 'group') {
        const active = isNavItemActive(node);
        if (active) activeGroupKeys.push(node.key);
        if (Array.isArray(node.children)) node.children.forEach(walk);
      }
    };

    items.forEach(walk);

    setExpandedNavGroups((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const key of activeGroupKeys) {
        if (!next[key]) {
          next[key] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  };

  useEffect(() => {
    ensureActiveGroupsExpanded(navItems as any);
  }, [location.pathname, location.search, user?.rol]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Preview Mode Banner */}
      {isPreview && (
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 text-amber-900 py-2 px-4 text-center text-sm font-medium">
          <span className="inline-flex items-center gap-2">
            Modo Preview - Estás viendo como: <strong>{getRolLabel(user?.rol || 'acudiente')}</strong>
            <button 
              onClick={() => setShowRoleSwitcher(true)}
              className="ml-2 px-2 py-0.5 bg-white/30 rounded hover:bg-white/50 transition-colors"
            >
              Cambiar rol
            </button>
          </span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <IconMenu size={22} />
            </button>
            
            <div className="flex items-center gap-3 cursor-default">
              <img src="/src/assets/logo.jpg" alt="Logo" className="w-10 h-10 rounded-xl object-cover shadow-sm" />
              <div className="hidden sm:block">
                <div className="font-display font-bold text-slate-800">Cátedra de Familia</div>
                <div className="text-xs text-slate-500">{user?.institucion || 'Parchando Juntos'}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Invite Admin Button (solo para admin) */}
            {isAdmin && (
              <button
                onClick={() => setShowInviteAdmin(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-teal-600 rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors text-white shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>Invitar Admin</span>
              </button>
            )}

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-slate-800">{user?.nombre} {user?.apellidos}</div>
                <div className="text-xs text-slate-500">{getRolLabel(user?.rol || 'acudiente')}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold shadow-md">
                {user?.nombre?.charAt(0) || 'U'}
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                title="Cerrar sesión"
              >
                <IconLogout size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - sticky en desktop, fixed en mobile */}
        <aside className={`
          fixed lg:sticky inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200/80 transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isPreview ? 'top-10' : 'top-0'} lg:top-[61px] h-screen lg:h-[calc(100vh-61px)] overflow-y-auto
        `}>
          <div className="p-4 flex justify-between items-center lg:hidden">
            <span className="font-semibold text-slate-800">Menú</span>
            <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg">
              <IconX size={20} />
            </button>
          </div>
          <nav className="p-3 space-y-1">
            {(() => {
              const renderNavItem = (item: any, depth = 0) => {
                const paddingLeft = 16 + depth * 14;

                if (item?.type === 'link') {
                  const Icon = iconMap[item.icon] || IconHome;
                  const isActive = isNavLinkActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      style={{ paddingLeft }}
                      className={`flex items-center gap-3 py-3 pr-4 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md shadow-teal-200/50'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                      }`}
                    >
                      <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400'} />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                }

                if (item?.type === 'group') {
                  const Icon = iconMap[item.icon] || IconHome;
                  const isOpen = !!expandedNavGroups[item.key];
                  const isActive = isNavItemActive(item);

                  return (
                    <div key={item.key} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setExpandedNavGroups((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                        style={{ paddingLeft }}
                        className={`w-full flex items-center gap-3 py-3 pr-4 rounded-xl transition-all duration-200 ${
                          isActive
                            ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md shadow-teal-200/50'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                        }`}
                      >
                        <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400'} />
                        <span className="font-medium flex-1 text-left">{item.label}</span>
                        <span className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                          <IconChevronRight size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                        </span>
                      </button>

                      {isOpen && Array.isArray(item.children) && (
                        <div className="space-y-1">
                          {item.children.map((child: any) => renderNavItem(child, depth + 1))}
                        </div>
                      )}
                    </div>
                  );
                }

                return null;
              };

              return (navItems as any[]).map((item) => renderNavItem(item, 0));
            })()}
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 min-h-[calc(100vh-64px)] bg-slate-50">
          {children}
        </main>
      </div>

      {/* Role Switcher Modal - Solo para roles NO admin */}
      {showRoleSwitcher && !isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowRoleSwitcher(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Cambiar Vista de Rol</h3>
            <p className="text-slate-600 text-sm mb-4">
              Selecciona un rol para ver la plataforma desde su perspectiva (Modo Preview).
            </p>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(usuariosMock).map(([key, user]) => (
                <button
                  key={key}
                  onClick={() => handleSwitchRole(key)}
                  className={`p-4 rounded-xl border-2 text-left hover:border-teal-500 transition-all ${
                    session?.user?.rol === user.rol 
                      ? 'border-teal-500 bg-teal-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-semibold text-gray-900">{getRolLabel(user.rol)}</div>
                  <div className="text-xs text-gray-500">{user.nombre}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowRoleSwitcher(false)}
              className="mt-4 w-full py-2 text-gray-600 hover:text-gray-900"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Invite Admin Modal */}
      {showInviteAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !inviteLoading && setShowInviteAdmin(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            {inviteSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">¡Invitación Enviada!</h3>
                <p className="text-slate-600 text-sm">
                  Se ha enviado un correo a <span className="font-medium">{inviteEmail}</span> con las instrucciones para crear su cuenta de administrador.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Invitar Administrador</h3>
                    <p className="text-sm text-slate-500">Envía una invitación por correo</p>
                  </div>
                </div>
                
                <p className="text-slate-600 text-sm mb-4">
                  Ingresa el correo electrónico de la persona que deseas invitar como administrador del sistema.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="admin@educacion.gov.co"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                      disabled={inviteLoading}
                    />
                  </div>
                  
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <div className="flex gap-2">
                      <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="text-sm text-amber-800">
                        El nuevo administrador tendrá acceso completo al sistema. Asegúrate de que sea una persona autorizada.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowInviteAdmin(false)}
                    disabled={inviteLoading}
                    className="flex-1 py-2.5 px-4 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleInviteAdmin}
                    disabled={inviteLoading || !inviteEmail || !inviteEmail.includes('@')}
                    className="flex-1 py-2.5 px-4 bg-teal-600 rounded-xl text-white font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {inviteLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span>Enviar Invitación</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
