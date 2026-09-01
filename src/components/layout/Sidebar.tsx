'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn, getInitials } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: '📊' },
  { label: 'Pedagogos', href: '/admin/pedagogos', icon: '👥' },
  { label: 'Relatórios', href: '/admin/relatorios', icon: '📈' },
  { label: 'Configurações', href: '/admin/configuracoes', icon: '⚙️' },
];

const pedagogoNav: NavItem[] = [
  { label: 'Dashboard', href: '/pedagogo', icon: '📊' },
  { label: 'Professores', href: '/pedagogo/professores', icon: '👨‍🏫' },
  { label: 'Turmas', href: '/pedagogo/turmas', icon: '🏫' },
  { label: 'Alunos', href: '/pedagogo/alunos', icon: '🎒' },
  { label: 'Conteudos IA', href: '/pedagogo/conteudo-ia', icon: '🤖' },
  { label: 'Relatorios', href: '/pedagogo/relatorios', icon: '📈' },
  { label: 'Configuracoes', href: '/pedagogo/configuracoes', icon: '⚙️' },
];

const professorNav: NavItem[] = [
  { label: 'Dashboard', href: '/professor', icon: '📊' },
  { label: 'Minhas Turmas', href: '/professor/turmas', icon: '🏫' },
  { label: 'Histórico', href: '/professor/historico', icon: '📜' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = user?.role === 'admin' ? adminNav : user?.role === 'pedagogo' ? pedagogoNav : professorNav;

  const roleLabel = user?.role === 'admin' ? 'Administrador' : user?.role === 'pedagogo' ? 'Pedagogo' : 'Professor';

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r border-gray-200 bg-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
          {!collapsed && (
            <span className="text-lg font-bold text-blue-600">DomicilIA</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <span className="text-lg">{item.icon}</span>
                {!collapsed && <span className="ml-3">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-4">
          {!collapsed && user && (
            <div className="mb-3">
              <div className="flex items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600">
                  {getInitials(user.name)}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{roleLabel}</p>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <span className="text-lg">🚪</span>
            {!collapsed && <span className="ml-3">Sair</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
