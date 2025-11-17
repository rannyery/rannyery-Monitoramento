import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Host } from '../types';
import { getHosts, fetchAndUpdateData, getRefreshInterval } from '../services/mockData';
import StatusBadge from '../components/StatusBadge';
import { Eye, Server, Wand2 } from 'lucide-react';

const HostList: React.FC = () => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadHosts = async () => {
        await fetchAndUpdateData();
        const data = await getHosts();
        setHosts(data);
        if (isLoading) setIsLoading(false);
    };

    loadHosts();
    
    // Use configured refresh interval
    const intervalMs = getRefreshInterval();
    const interval = setInterval(loadHosts, intervalMs);
    
    return () => clearInterval(interval);
  }, [isLoading]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Gerenciamento de Hosts</h1>
          <p className="text-sm text-slate-400">Hosts são adicionados automaticamente via agente.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
                  <tr>
                      <th className="px-6 py-4 font-medium">Hostname</th>
                      <th className="px-6 py-4 font-medium">Endereço IP</th>
                      <th className="px-6 py-4 font-medium">OS</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium text-right">Ações</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                  {isLoading ? (
                       <tr><td colSpan={5} className="p-6 text-center text-slate-500">Carregando hosts...</td></tr>
                  ) : hosts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-slate-500">
                           <Server className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                           <h4 className="font-semibold text-slate-300">Nenhum host conectado</h4>
                           <p className="text-xs mt-1">Verifique o guia de instalação para conectar seus agentes.</p>
                        </td>
                      </tr>
                  ) : hosts.map(host => (
                      <tr key={host.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-200">
                              {host.hostname}
                          </td>
                          <td className="px-6 py-4 text-slate-400 font-mono">
                              {host.ip}
                          </td>
                          <td className="px-6 py-4 text-slate-400 capitalize">
                              {host.os}
                          </td>
                          <td className="px-6 py-4">
                              <StatusBadge status={host.status} />
                          </td>
                          <td className="px-6 py-4 flex justify-end gap-2">
                               <Link
                                  to={`/install/${host.id}`}
                                  className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors"
                                  title="Configurar Agente"
                               >
                                  <Wand2 className="w-4 h-4" />
                               </Link>
                               <button 
                                  onClick={() => navigate(`/hosts/${host.id}`)} 
                                  className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-colors"
                                  title="Ver Detalhes"
                               >
                                   <Eye className="w-4 h-4" />
                               </button>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>
    </div>
  );
};

export default HostList;