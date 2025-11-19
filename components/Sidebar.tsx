
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Server, Bell, Settings, LogOut, Activity, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { logout } from '../services/authService';

interface Props {
    isCollapsed: boolean;
    toggleSidebar: () => void;
}

const Sidebar: React.FC<Props> = ({ isCollapsed, toggleSidebar }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-3 transition-colors rounded-md mx-2 ${
      isActive ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
    } ${isCollapsed ? 'justify-center' : ''}`;

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 z-10 transition-all duration-300`}>
      <div className={`h-16 flex items-center px-4 border-b border-slate-800 ${isCollapsed ? 'justify-center' : ''}`}>
        <Activity className="w-8 h-8 text-blue-500 flex-shrink-0" />
        {!isCollapsed && <h1 className="text-lg font-bold text-slate-100 tracking-wide ml-3 whitespace-nowrap overflow-hidden">IntelliMonitor</h1>}
      </div>

      <nav className="flex-1 py-6 space-y-1 overflow-y-auto overflow-x-hidden">
        <NavLink to="/" end className={navClass} title="Dashboard">
          <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>Dashboard</span>}
        </NavLink>
        <NavLink to="/hosts" className={navClass} title="Hosts">
          <Server className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>Hosts</span>}
        </NavLink>
        <NavLink to="/alerts" className={navClass} title="Alertas">
          <Bell className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>Alertas</span>}
        </NavLink>
         <NavLink to="/install" className={navClass} title="Instalação e Agente">
          <Download className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>Instalação e Agente</span>}
        </NavLink>
      </nav>

      <div className="p-2 border-t border-slate-800 space-y-1">
        <button 
            onClick={toggleSidebar} 
            className={`w-full flex items-center gap-3 px-3 py-2 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors rounded-md ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? "Expandir Menu" : "Reduzir Menu"}
        >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            {!isCollapsed && <span>Reduzir Menu</span>}
        </button>
        <NavLink to="/settings" className={navClass} title="Configurações">
            <Settings className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span>Configurações</span>}
        </NavLink>
        <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-3 py-3 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors rounded-md mt-1 ${isCollapsed ? 'justify-center' : ''}`} title="Sair">
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;