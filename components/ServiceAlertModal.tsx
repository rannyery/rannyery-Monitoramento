
import React from 'react';
import { ServerCrash, ServerCog, Minus } from 'lucide-react';
import { MonitoredService } from '../types';

interface Props {
  hostname: string;
  services: MonitoredService[];
  onMinimize: () => void;
  countdown: number;
}

const ServiceAlertModal: React.FC<Props> = ({ hostname, services, onMinimize, countdown }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-950 border-2 border-red-500 rounded-2xl shadow-[0_0_60px_-15px_rgb(239,68,68)] w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header piscante */}
        <div className="bg-red-600/90 px-6 py-4 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <ServerCrash className="w-8 h-8 text-white" />
              <h2 className="text-2xl font-black text-white uppercase tracking-wider">Alerta de Serviço</h2>
            </div>
            <button 
              onClick={onMinimize}
              title="Minimizar Alerta"
              className="p-2 -mr-2 text-white/70 hover:bg-white/20 hover:text-white rounded-full transition-colors"
            >
              <Minus className="w-5 h-5" />
            </button>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="text-center">
            <p className="text-lg text-slate-300 mb-1">
              Detectada falha de serviço no host:
            </p>
            <p className="text-2xl font-mono font-bold text-red-400 bg-red-950/50 px-3 py-1.5 rounded-lg inline-block">
              {hostname}
            </p>
          </div>
          
          <div>
              <h4 className="font-semibold text-slate-200 mb-3 text-center">Serviços com Falha:</h4>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 max-h-40 overflow-y-auto">
                  <ul className="space-y-3">
                      {services.map(service => (
                          <li key={service.name} className="flex items-start gap-3">
                              <ServerCog className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                              <div>
                                  <p className="font-mono font-medium text-red-400">{service.name}</p>
                                  <p className="text-xs text-slate-400 italic mt-0.5">{service.details}</p>
                              </div>
                          </li>
                      ))}
                  </ul>
              </div>
          </div>

          <p className="text-sm text-slate-400 text-center transition-opacity duration-300">
            Minimizando automaticamente em <span className="font-bold text-white tabular-nums">{countdown}</span> segundos...
          </p>
        </div>
      </div>
    </div>
  );
};

export default ServiceAlertModal;
