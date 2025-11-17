import React from 'react';
import { AlertOctagon, X } from 'lucide-react';

interface Props {
  hostname: string | null;
  onClose: () => void;
}

const CriticalAlertModal: React.FC<Props> = ({ hostname, onClose }) => {
  if (!hostname) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-red-600 rounded-2xl shadow-[0_0_50px_-12px_rgb(220,38,38)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header piscante */}
        <div className="bg-red-600 px-6 py-4 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <AlertOctagon className="w-8 h-8 text-white" />
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">ALERTA CRÍTICO</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-8 text-center space-y-6">
          <div className="inline-flex p-4 bg-red-600/20 rounded-full mb-2">
            <AlertOctagon className="w-16 h-16 text-red-500" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-3xl font-bold text-red-500">HELP</h3>
            <p className="text-xl text-slate-100">
              Servidor <span className="font-mono font-bold text-red-400 bg-red-950/50 px-2 py-1 rounded">{hostname}</span>
            </p>
            <p className="text-lg text-slate-300 uppercase font-semibold">
              EM MODO CRÍTICO
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors uppercase tracking-wide"
          >
            Reconhecer Alerta
          </button>
        </div>
      </div>
    </div>
  );
};

export default CriticalAlertModal;
