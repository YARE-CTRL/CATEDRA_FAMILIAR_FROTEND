import { Link, useLocation } from 'react-router-dom';
import { getSession } from '../api/endpoints';
import {
  IconHome,
  IconBarChart,
  IconClipboard,
  IconPlus,
  IconInbox,
  IconUsers,
  IconTrendingUp,
  IconX,
} from './ui/Icons';
import { useState } from 'react';

const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  home: IconHome,
  dashboard: IconBarChart,
  tasks: IconClipboard,
  plus: IconPlus,
  inbox: IconInbox,
  users: IconUsers,
  reports: IconTrendingUp,
};

export default function TeacherSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation();
  const session = getSession();
  const user = session?.user;
  const fullPath = location.pathname + (location.search || '');

  

  const navItems = [
    { path: '/dashboard', label: 'Inicio', icon: 'home' },
    { path: '/dashboard/docente', label: 'Mi Panel', icon: 'dashboard' },
    { path: '/docente/banco-tareas', label: 'Banco de Tareas', icon: 'tasks' },
    { path: '/docente/asignaciones', label: 'Asignaciones', icon: 'tasks' },
    { path: '/docente/especiales', label: 'Asignaciones especiales', icon: 'tasks' },
    { path: '/docente/especiales/nueva', label: 'Nueva especial', icon: 'plus' },
    { path: '/entregas', label: 'Entregas', icon: 'inbox' },
    { path: '/docente/estudiantes', label: 'Estudiantes (mis cursos)', icon: 'users' },
    { path: '/docente/acudientes', label: 'Acudientes (mis estudiantes)', icon: 'users' },
    { path: '/reportes/docente', label: 'Reportes', icon: 'reports' },
  ];

  const isActive = (path: string) => fullPath === path || location.pathname === path;

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className={`fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 lg:hidden transition-opacity ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={`fixed lg:fixed z-30 lg:top-16 top-0 left-0 w-72 bg-white border-r border-slate-200/70 shadow-xl lg:shadow-none transform transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ height: '100vh', ...(typeof window !== 'undefined' ? {} : {}) }}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/70">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-slate-700 truncate max-w-[9rem]">{
              (user?.nombre && user?.nombre !== 'Usuario')
                ? `${user?.nombre} ${user?.apellidos || ''}`.trim()
                : (user?.correo ? String(user.correo).split('@')[0] : 'Docente')
            }</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] bg-teal-50 text-teal-700 border border-teal-200">
              {(((user?.rol || 'docente') as string) === 'docente_aula' ? 'Docente' : ((user?.rol || 'docente') as string).replace('_',' '))}
            </span>
          </div>
          <button className="lg:hidden p-2 rounded-lg hover:bg-slate-100" onClick={onClose}>
            <IconX size={18} />
          </button>
        </div>

        <div className="px-3 py-4">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = iconMap[item.icon];
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                    active
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  onClick={onClose}
                >
                  <Icon size={18} />
                  <span className="flex-1">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
