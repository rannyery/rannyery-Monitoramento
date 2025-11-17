import React from 'react';
import { HardDrive, AlertTriangle, XCircle, X } from 'lucide-react';
import { DiskInfo } from '../types';

interface Props {
  hostInfo: { hostname: string; disks: DiskInfo[] } | null;
  onClose: () => void;
}

const DiskAlertModal: React.FC<Props> = ({ hostInfo, onClose }) => {
  if (!hostInfo) return null;

  // Assume the first disk is the one we're alerting on
  const disk = hostInfo.disks[0];
  if (!disk) return null;

  const usagePercent = disk.total > 0 ? (disk.used / disk.total) * 100 : 0;

  let status: 'preocupante' | 'critico' = 'preocupante';
  if (usagePercent > 95) {
    status = 'critico';
  }

  const config = {
    critico: {
      title: 'Espaço em Disco Crítico',
      Icon: XCircle,
      iconColor: 'text-red-500',
      bgColor: 'bg-red-600',
      borderColor: 'border-red-500',
      shadowColor: 'shadow-[0_0_50px_-15px_rgb(239,68,68)]',
      textColor: 'text-red-400',
      bgMuted: 'bg-red-950/50',
    },
    preocupante: {
      title: 'Espaço em Disco Preocupante',
      Icon: AlertTriangle,
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-600',
      borderColor: 'border-amber-500',
      shadowColor: 'shadow-[0_0_50px_-15px_rgb(245,158,11)]',
      textColor: 'text-amber-400',
      bgMuted: 'bg-amber-950/50',
    },
  };

  const currentConfig = config[status];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`bg-slate-950 border-2 ${currentConfig.borderColor} rounded-2xl ${currentConfig.shadowColor} w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200`}>
        {/* Header */}
        <div className={`${currentConfig.bgColor}/90 px-6 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <HardDrive className="w-8 h-8 text-white" />
            <h2 className="text-xl font-black text-white uppercase tracking-wider">Alerta de Armazenamento</h2>
          </div>
          <button onClick={onClose} className="p-1 -mr-2 text-white/70 hover:bg-white/20 hover:text-white rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-8 text-center space-y-6">
          <div className={`inline-flex p-4 ${currentConfig.bgColor}/20 rounded-full mb-2`}>
            <currentConfig.Icon className={`w-16 h-16 ${currentConfig.iconColor}`} />
          </div>
          
          <div className="space-y-2">
            <h3 className={`text-3xl font-bold ${currentConfig.iconColor} uppercase`}>{currentConfig.title}</h3>
            <p className="text-xl text-slate-100">
              Servidor <span className={`font-mono font-bold ${currentConfig.textColor} ${currentConfig.bgMuted} px-2 py-1 rounded`}>{hostInfo.hostname}</span>
            </p>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-2 text-slate-300">
                  <span>Partição: {disk.mount}</span>
                  <span className="font-semibold">{disk.used.toFixed(1)}GB / {disk.total.toFixed(1)}GB</span>
              </div>
              <div className="h-4 bg-slate-800 rounded-full overflow-hidden relative">
                  <div className={`h-full ${currentConfig.bgColor} transition-all duration-500`} style={{width: `${usagePercent}%`}}></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-white drop-shadow-md">{usagePercent.toFixed(1)}% Usado</span>
                  </div>
              </div>
          </div>

          <button
            onClick={onClose}
            className={`w-full py-3 ${currentConfig.bgColor} hover:opacity-90 text-white font-bold rounded-lg transition-colors uppercase tracking-wide`}
          >
            Reconhecer Alerta
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiskAlertModal;
