import React from 'react';
import { HostStatus, AlertSeverity, ServiceStatus } from '../types';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';

interface Props {
  status: HostStatus | AlertSeverity | ServiceStatus | 'resolved';
  type?: 'host' | 'alert' | 'service';
}

const StatusBadge: React.FC<Props> = ({ status, type = 'host' }) => {
  let colorClass = 'bg-slate-700 text-slate-300';
  let Icon = HelpCircle;
  let label = status.toString();

  switch (status) {
    case 'healthy':
    case 'active':
    case 'resolved':
      colorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      Icon = CheckCircle2;
      label = type === 'service' ? 'Ativo' : (status === 'resolved' ? 'Resolvido' : 'Online');
      break;
    case 'warning':
      colorClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      Icon = AlertTriangle;
      label = 'Atenção';
      break;
    case 'critical':
    case 'failed':
      colorClass = 'bg-red-500/10 text-red-400 border-red-500/20';
      Icon = XCircle;
      label = type === 'service' ? 'Falha' : 'Crítico';
      break;
    case 'offline':
    case 'inactive':
       colorClass = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
       Icon = XCircle;
       label = type === 'service' ? 'Inativo' : 'Offline';
       break;
    case 'info':
       colorClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
       Icon = HelpCircle;
       label = 'Info';
       break;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
};

export default StatusBadge;