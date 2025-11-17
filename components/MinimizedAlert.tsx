import React from 'react';
import { ServerCrash } from 'lucide-react';
import { MonitoredService } from '../types';

interface Props {
  hostname: string;
  services: MonitoredService[];
  onRestore: () => void;
}

const MinimizedAlert: React.FC<Props> = ({ hostname, services, onRestore }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <button 
        onClick={onRestore}
        title="Clique para restaurar e ver detalhes"
        className="flex items-center gap-4 pl-4 pr-5 py-3 bg-red-600/90 text-white rounded-xl border border-red-400 shadow-2xl hover:bg-red-600 transition-all duration-300 animate-pulse-glow cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-4 focus:ring-offset-slate-950"
        >
        <ServerCrash className="w-7 h-7 flex-shrink-0" />
        <div className="text-left">
            <div className="text-xs font-bold uppercase tracking-wider">Alerta Ativo</div>
            <div className="font-mono font-semibold">{hostname}</div>
            <div className="text-xs opacity-80">{services.length} serviço(s) com falha</div>
        </div>
      </button>
    </div>
  );
};

export default MinimizedAlert;
