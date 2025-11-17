import React, { useEffect, useState } from 'react';
import { Alert } from '../types';
import { getAlerts, fetchAndUpdateData, getRefreshInterval } from '../services/mockData';
import StatusBadge from '../components/StatusBadge';
import { Link } from 'react-router-dom';

const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');

  useEffect(() => {
    const fetchData = async () => {
        await fetchAndUpdateData(); // Garante que a lógica de alertas seja executada
        const alertsData = await getAlerts();
        setAlerts(alertsData.sort((a, b) => b.timestamp - a.timestamp)); // Ordena mais recentes primeiro
    }
    fetchData();
    
    const intervalMs = getRefreshInterval();
    const interval = setInterval(fetchData, intervalMs);
    
    return () => clearInterval(interval);
  }, []);

  const filteredAlerts = alerts.filter(a => {
      if (filter === 'active') return !a.resolved;
      if (filter === 'resolved') return a.resolved;
      return true;
  });

  const formatTime = (ts: number) => new Date(ts).toLocaleString('pt-BR');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Histórico de Alertas</h1>
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
              <button onClick={() => setFilter('all')} className={`px-4 py-1.5 text-sm rounded-md transition-colors ${filter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Todos</button>
              <button onClick={() => setFilter('active')} className={`px-4 py-1.5 text-sm rounded-md transition-colors ${filter === 'active' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Ativos</button>
              <button onClick={() => setFilter('resolved')} className={`px-4 py-1.5 text-sm rounded-md transition-colors ${filter === 'resolved' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Resolvidos</button>
          </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
                  <tr>
                      <th className="px-6 py-4 font-medium">Severidade</th>
                      <th className="px-6 py-4 font-medium">Ocorrência</th>
                      <th className="px-6 py-4 font-medium">Host</th>
                      <th className="px-6 py-4 font-medium w-1/2">Detalhes</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                  {filteredAlerts.length === 0 ? (
                      <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                              Nenhum alerta encontrado com este filtro.
                          </td>
                      </tr>
                  ) : filteredAlerts.map(alert => {
                      const [alertTitle, ...alertDetails] = alert.message.split(':');
                      const detailsText = alertDetails.join(':').trim();

                      return (
                          <tr key={alert.id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="px-6 py-4">
                                  <StatusBadge status={alert.severity} type="alert" />
                              </td>
                              <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                                  {formatTime(alert.timestamp)}
                              </td>
                              <td className="px-6 py-4 font-medium text-blue-400">
                                  <Link to={`/hosts/${alert.hostId}`} className="hover:underline">
                                    {alert.hostname}
                                  </Link>
                              </td>
                              <td className="px-6 py-4 text-slate-300">
                                  <p className="font-semibold text-slate-200">{alertTitle}</p>
                                  {detailsText && <p className="text-xs text-slate-400 mt-1 italic">{detailsText}</p>}
                              </td>
                              <td className="px-6 py-4">
                                   {alert.resolved ? (
                                       <div className="flex flex-col">
                                           <StatusBadge status="resolved" />
                                           {alert.resolvedAt && (
                                               <span className="text-xs text-slate-500 mt-1 whitespace-nowrap">
                                                   {formatTime(alert.resolvedAt)}
                                               </span>
                                           )}
                                       </div>
                                   ) : (
                                       <span className="text-amber-500 text-xs font-medium animate-pulse">Ativo</span>
                                   )}
                              </td>
                          </tr>
                      );
                  })}
              </tbody>
          </table>
      </div>
    </div>
  );
};

export default AlertsPage;