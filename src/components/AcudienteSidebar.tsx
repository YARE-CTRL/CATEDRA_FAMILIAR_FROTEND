import { Link, useLocation } from 'react-router-dom';
import { getSession } from '../api/endpoints';
import {
  IconHome,
  IconBarChart,
  IconX,
} from './ui/Icons';

import { useMemo } from 'react';

const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  home: IconHome,
  dashboard: IconBarChart,
};

export default function AcudienteSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation();
  const session = getSession();
  const user = session?.user;
  const fullPath = location.pathname + (location.search || '');

  const preferredEstudianteId = (() => {
    try {
      const v = localStorage.getItem('acudiente_estudiante_id');
      return v ? Number(v) : null;
    } catch { return null; }
  })();

  const navItems = useMemo(() => [
    { key: 'inicio', path: '/dashboard', label: 'Inicio', icon: 'home' },
    { key: 'panel', path: '/dashboard/acudiente', label: 'Mi Panel', icon: 'dashboard' },
    { key: 'tareas', path: '/acudiente/tareas', label: 'Tareas', icon: 'dashboard' },
    { key: 'especiales', path: '/acudiente/especiales', label: 'Entregas especiales', icon: 'dashboard' },
    { key: 'perfil', path: '/acudiente/perfil', label: 'Mi Perfil', icon: 'dashboard' },
  ], [preferredEstudianteId]);

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
        className={`fixed lg:static z-50 top-0 left-0 h-full w-72 bg-white border-r border-slate-200/70 shadow-xl lg:shadow-none transform transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/70">
          <div className="font-display font-bold text-slate-800">
            Sidebar Acudiente
          </div>
          <button className="lg:hidden p-2 rounded-lg hover:bg-slate-100" onClick={onClose}>
            <IconX size={18} />
          </button>
        </div>

        <div className="px-3 py-4">
          <div className="px-2 py-2 mb-3 rounded-lg bg-teal-50 text-teal-700 text-sm font-medium">
            Bienvenido, {user?.nombre || 'Acudiente'}
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = iconMap[item.icon];
              const active = isActive(item.path);
              return (
                <Link
                  key={item.key}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                    active
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  onClick={onClose}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
