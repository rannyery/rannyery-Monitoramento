
import React from 'react';
import { ShieldCheck, ServerCog } from 'lucide-react';
import { MonitoredService } from '../types';

interface Props {
  info: {
    hostname: string;
    services: Partial<MonitoredService>[];
  } | null;
}

const RecoveryAlertModal: React.FC<Props> = ({ info }) => {
  if (!info) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border-2 border-emerald-500 rounded-2xl shadow-[0_0_50px_-15px_rgb(16,185,129)] w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-emerald-600/90 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-white" />
              <h2 className="text-2xl font-black text-white uppercase tracking-wider">Serviço Restabelecido</h2>
            </div>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="text-center">
            <p className="text-lg text-slate-300 mb-1">
              Serviços normalizados no host:
            </p>
            <p className="text-2xl font-mono font-bold text-emerald-400 bg-emerald-950/50 px-3 py-1.5 rounded-lg inline-block">
              {info.hostname}
            </p>
          </div>
          
          <div>
              <h4 className="font-semibold text-slate-200 mb-3 text-center">Serviços Recuperados:</h4>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 max-h-40 overflow-y-auto">
                  <ul className="space-y-3">
                      {info.services.map(service => (
                          <li key={service.name} className="flex items-start gap-3">
                              <ServerCog className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                              <div>
                                  <p className="font-mono font-medium text-emerald-400">{service.name}</p>
                              </div>
                          </li>
                      ))}
                  </ul>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecoveryAlertModal;
