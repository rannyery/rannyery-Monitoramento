import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
// FIX: Import MonitoredService type to be used for explicit typing.
import { Host, MonitoredService } from '../types';
import { getHostById, fetchAndUpdateData, getRefreshInterval } from '../services/mockData';
import StatusBadge from '../components/StatusBadge';
import { ArrowLeft, Cpu, Network, Database, ServerCog, HardDrive, ChevronDown, Cog } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const HostDetails: React.FC = () => {
  const { hostId } = useParams();
  const [host, setHost] = useState<Host | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRawData, setShowRawData] = useState(false); // State for debug viewer

  useEffect(() => {
    if (!hostId) return;
    
    const fetchData = async () => {
        await fetchAndUpdateData();
        const data = await getHostById(hostId);
        setHost(data || null);
        if (loading) setLoading(false);
    };

    fetchData();
    
    const effectiveInterval = Math.max(2000, getRefreshInterval()); 
    const interval = setInterval(fetchData, effectiveInterval);

    return () => clearInterval(interval);
  }, [hostId, loading]);

  if (loading) return <div className="p-8 text-slate-400">Carregando detalhes do host...</div>;
  if (!host) return <div className="p-8 text-red-400">Host não encontrado ou agente offline.</div>;

  const chartData = host.metrics.cpu.map((point, i) => ({
      time: new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      cpu: point.value,
      memory: host.metrics.memory[i]?.value || 0,
      netIn: host.metrics.networkIn[i]?.value || 0,
      netOut: host.metrics.networkOut[i]?.value || 0,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg shadow-xl text-xs">
          <p className="text-slate-400 mb-2">{label}</p>
          {payload.map((p: any) => (
            <div key={p.dataKey} className="flex items-center gap-2 mb-1" style={{color: p.color}}>
                <span>{p.name}:</span>
                <span className="font-bold">
                    {p.value.toFixed(p.dataKey.startsWith('net') ? 2 : 1)}{p.dataKey.startsWith('net') ? ' MB/s' : '%'}
                </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/" className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400">
            <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                {host.hostname}
                <StatusBadge status={host.status} />
            </h1>
            <p className="text-slate-400 font-mono text-sm mt-1">{host.ip} | {host.os.toUpperCase()}</p>
        </div>
      </div>

      {/* Main Performance Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-medium text-white mb-6">Desempenho do Sistema (Ao Vivo)</h3>
        <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" tick={{fontSize: 12}} interval={Math.floor(chartData.length / 5)} />
                <YAxis stroke="#64748b" tick={{fontSize: 12}} domain={[0, 100]} tickFormatter={(v) => `${v}%`}/>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="cpu" name="Uso de CPU" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{r: 4}} animationDuration={300} />
                <Line type="monotone" dataKey="memory" name="Uso de Memória" stroke="#8b5cf6" strokeWidth={2} dot={false} activeDot={{r: 4}} animationDuration={300} />
            </LineChart>
            </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <Network className="w-5 h-5 text-emerald-500"/> E/S de Rede (MB/s)
              </h3>
               <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                     <XAxis dataKey="time" hide />
                    <YAxis stroke="#64748b" tick={{fontSize: 12}} tickFormatter={(v) => v.toFixed(2)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="netIn" name="Entrada" stroke="#10b981" strokeWidth={2} dot={false} animationDuration={300} />
                    <Line type="monotone" dataKey="netOut" name="Saída" stroke="#f59e0b" strokeWidth={2} dot={false} animationDuration={300} />
                </LineChart>
                </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-indigo-500"/> Armazenamento
              </h3>
              <div className="space-y-4">
                  {host.disks.length > 0 ? host.disks.map((disk, i) => {
                      const percent = disk.total > 0 ? (disk.used / disk.total) * 100 : 0;
                      let barColor = 'bg-indigo-500';
                      if (percent > 90) barColor = 'bg-red-500';
                      else if (percent > 75) barColor = 'bg-amber-500';

                      return (
                          <div key={i}>
                              <div className="flex justify-between text-sm mb-1">
                                  <span className="text-slate-300 font-medium">{disk.mount}</span>
                                  <span className="text-slate-400">{disk.used.toFixed(1)}GB / {disk.total.toFixed(1)}GB ({percent.toFixed(0)}%)</span>
                              </div>
                              <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                                  <div className={`h-full ${barColor} transition-all duration-500`} style={{width: `${percent}%`}}></div>
                              </div>
                          </div>
                      )
                  }) : <p className="text-sm text-slate-500 text-center pt-8">Nenhum disco detectado.</p>}
              </div>
          </div>
      </div>

      {/* Services & Databases */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800">
              <h3 className="text-lg font-medium text-white">Serviços Monitorados</h3>
          </div>
          
          {(() => {
              // A fonte da verdade são os serviços configurados no backend.
              const configuredServices = host.agentConfig?.services || [];
              if (configuredServices.length === 0) {
                  return (
                       <div className="px-6 py-8 text-center text-slate-500 text-sm">
                          Nenhum serviço configurado para este host. 
                          <Link to={`/install/${host.id}`} className="text-blue-400 hover:underline ml-1">Configurar agora</Link>.
                      </div>
                  );
              }

              const reportedServicesMap = new Map<string, MonitoredService>(host.services?.map((s) => [s.name, s]));
              
              const displayServices = configuredServices.map(configService => {
                  const reportedService = reportedServicesMap.get(configService.name);
                  const isEnabledInConfig = configService.enabled;

                  let status: MonitoredService['status'] = 'inactive';
                  let details = 'Aguardando dados do agente...';

                  if (!isEnabledInConfig) {
                      details = 'Desabilitado na configuração.';
                  } else if (reportedService) {
                      status = reportedService.status;
                      details = reportedService.details || '-';
                  }

                  return {
                      name: configService.name,
                      type: configService.type, // Usa o tipo detalhado da configuração
                      status: status,
                      details: details
                  };
              });


              return (
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-950/30 text-slate-400">
                          <tr>
                              <th className="px-6 py-3 font-medium w-12">Tipo</th>
                              <th className="px-6 py-3 font-medium">Nome</th>
                              <th className="px-6 py-3 font-medium">Status</th>
                              <th className="px-6 py-3 font-medium">Detalhes</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                          {displayServices.map((service, i) => (
                               <tr key={i} className="hover:bg-slate-800/20">
                                  <td className="px-6 py-4 text-slate-500" title={service.type}>
                                      {service.type === 'oracle' ? <Database className="w-5 h-5"/> : 
                                       service.type === 'process' ? <Cog className="w-5 h-5" /> :
                                       <ServerCog className="w-5 h-5"/>
                                      }
                                  </td>
                                  <td className="px-6 py-4 font-mono text-slate-300">{service.name}</td>
                                  <td className="px-6 py-4">
                                      <StatusBadge status={service.status} type="service" />
                                  </td>
                                  <td className="px-6 py-4 text-slate-400 italic">
                                      {service.details || '-'}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              );
          })()}
      </div>

       {/* Debug Raw Data Viewer */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mt-6">
            <button
                onClick={() => setShowRawData(!showRawData)}
                className="w-full p-4 flex justify-between items-center text-left hover:bg-slate-800/30 transition-colors"
                aria-expanded={showRawData}
            >
                <div className="flex items-center gap-3">
                    <h3 className="text-base font-medium text-slate-300">Dados Brutos do Agente</h3>
                    <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">Debug</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${showRawData ? 'rotate-180' : ''}`} />
            </button>
            {showRawData && (
                <div className="p-6 border-t border-slate-800 bg-slate-950/20 animate-in fade-in duration-300">
                    <p className="text-sm text-slate-400 mb-4">
                        Abaixo estão os dados completos que o painel recebeu para este host. É uma ferramenta útil para verificar se todas as informações, especialmente a lista <code className="bg-slate-700 text-xs px-1.5 py-1 rounded-md font-mono">'services'</code>, estão sendo enviadas corretamente pelo agente e processadas pelo backend.
                    </p>
                    <pre className="bg-slate-950 p-4 rounded-lg text-xs text-slate-200 overflow-x-auto max-h-96 border border-slate-800">
                        {JSON.stringify(host, (key, value) => {
                            // Oculta propriedades internas para não confundir
                            if (key.startsWith('_')) return undefined;
                            return value;
                        }, 2)}
                    </pre>
                </div>
            )}
        </div>
    </div>
  );
};

export default HostDetails;