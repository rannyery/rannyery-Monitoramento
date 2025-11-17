import React, { useEffect, useState } from 'react';
// FIX: Import MonitoredService to allow for explicit type casting.
import { Host, Alert, MonitoredService, ServiceStatus } from '../types';
import { getHosts, getAlerts, fetchAndUpdateData, getRefreshInterval, getLastConnectionError, getBackendUrl } from '../services/mockData';
import StatusBadge from '../components/StatusBadge';
import MetricChart from '../components/MetricChart';
import { Server, AlertTriangle, Activity, HardDrive, Cpu, Monitor, Clock, AlertCircle, Database, ServerCog } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const loadData = async () => {
      await fetchAndUpdateData();
      const error = getLastConnectionError();
      setConnectionError(error);
      
      if (!error) {
          const [hostsData, alertsData] = await Promise.all([getHosts(), getAlerts()]);
          setHosts(hostsData);
          setAlerts(alertsData);
          setLastUpdated(Date.now());
      }
      
      if (isLoading) setIsLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, getRefreshInterval());
    return () => clearInterval(interval);
  }, []);

  const stats = {
      total: hosts.length,
      healthy: hosts.filter(h => h.status === 'healthy').length,
      warning: hosts.filter(h => h.status === 'warning').length,
      critical: hosts.filter(h => h.status === 'critical').length,
      offline: hosts.filter(h => h.status === 'offline').length,
  };

  const getRelativeTime = (timestamp: number) => {
      const diff = Math.floor((Date.now() - timestamp) / 1000);
      if (diff < 60) return `${diff}s atrás`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
      return `${Math.floor(diff / 3600)}h atrás`;
  };
  
  const backendUrl = getBackendUrl();

  if (isLoading && hosts.length === 0 && !connectionError) {
      return (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <Activity className="w-8 h-8 animate-spin mb-4 text-blue-500" />
              <p>Buscando dados reais...</p>
          </div>
      );
  }

  return (
    <div className="space-y-8">
      {/* Connection Error Banner */}
      {connectionError && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6 flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
              {connectionError === 'CERT_ERROR' && backendUrl ? (
                  <div>
                      <h3 className="text-red-400 font-bold text-lg">Ação Necessária: Confiar no Certificado do Backend</h3>
                      <p className="text-slate-300 text-sm mt-2 mb-4">
                          A conexão com o backend falhou. Isso é esperado ao usar um endereço HTTPS (`{backendUrl}`) com um certificado autoassinado pela primeira vez.
                      </p>
                      <div className="bg-slate-950/40 p-4 rounded-lg border border-slate-800">
                          <h4 className="font-semibold text-slate-200 mb-2">Como Resolver em 2 Passos:</h4>
                          <ol className="text-sm space-y-2 list-decimal list-inside text-slate-400">
                              <li>
                                  <strong>Abra o Backend:</strong> Clique no botão abaixo para abrir o endereço em uma nova aba.
                              </li>
                              <li>
                                  <strong>Aceite o Risco:</strong> Na nova aba, o navegador mostrará um aviso. Clique em <strong>"Avançado"</strong> e depois em <strong>"Continuar para {new URL(backendUrl).hostname} (não seguro)"</strong>.
                              </li>
                          </ol>
                          <p className="text-xs text-slate-500 mt-3">Após aceitar, volte para esta aba. O painel se conectará automaticamente.</p>
                      </div>
                      <a 
                          href={backendUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="mt-4 inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-md shadow-blue-900/50"
                      >
                          Passo 1: Abrir Endereço do Backend &rarr;
                      </a>
                      <p className="text-xs text-slate-600 mt-4 italic">
                          Nota: Esta confiança é por endereço. Se você já fez isso para 'localhost', ainda precisa fazer para o endereço IP e vice-versa.
                      </p>
                  </div>
              ) : (
                  <div>
                      <h3 className="text-red-400 font-bold">Falha de Conexão com Backend</h3>
                      <p className="text-slate-300 text-sm mt-1">{connectionError}</p>
                      <Link to="/settings" className="text-blue-400 hover:underline text-sm mt-2 inline-block">
                          Verificar Configurações &rarr;
                      </Link>
                  </div>
              )}
          </div>
      )}

      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="bg-slate-900 border border-slate-800 p-4 lg:p-6 rounded-xl flex items-center gap-4">
              <div className="bg-blue-900/20 p-3 rounded-lg hidden sm:block">
                  <Server className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                  <p className="text-slate-400 text-xs lg:text-sm font-medium uppercase tracking-wider">Total Hosts</p>
                  <h3 className="text-2xl lg:text-3xl font-bold text-slate-100">{stats.total}</h3>
              </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 lg:p-6 rounded-xl flex items-center gap-4">
               <div className="bg-emerald-900/20 p-3 rounded-lg hidden sm:block">
                  <Activity className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                  <p className="text-slate-400 text-xs lg:text-sm font-medium uppercase tracking-wider">Online</p>
                  <h3 className="text-2xl lg:text-3xl font-bold text-emerald-400">{stats.healthy}</h3>
              </div>
          </div>
           <div className="bg-slate-900 border border-slate-800 p-4 lg:p-6 rounded-xl flex items-center gap-4">
               <div className="bg-amber-900/20 p-3 rounded-lg hidden sm:block">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                  <p className="text-slate-400 text-xs lg:text-sm font-medium uppercase tracking-wider">Alerta</p>
                  <h3 className="text-2xl lg:text-3xl font-bold text-amber-400">{stats.warning}</h3>
              </div>
          </div>
           <div className="bg-slate-900 border border-slate-800 p-4 lg:p-6 rounded-xl flex items-center gap-4">
               <div className="bg-red-900/20 p-3 rounded-lg hidden sm:block">
                  <Server className="w-6 h-6 text-red-500" />
              </div>
              <div>
                  <p className="text-slate-400 text-xs lg:text-sm font-medium uppercase tracking-wider">Offline/Crítico</p>
                  <h3 className="text-2xl lg:text-3xl font-bold text-red-400">{stats.critical + stats.offline}</h3>
              </div>
          </div>
      </div>

      {/* SECTION: Host Cards Grid */}
      <div>
          <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Server className="w-5 h-5 text-blue-400" />
                  Monitoramento em Tempo Real
              </h2>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Atualizado: {new Date(lastUpdated).toLocaleTimeString()}
              </span>
          </div>

          {hosts.length === 0 && !connectionError ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                  <Server className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-300 mb-2">Nenhum host detectado</h3>
                  <p className="text-slate-500 max-w-md mx-auto">
                      Aguardando conexão dos agentes. Certifique-se de que seus servidores estão rodando o script do agente e apontando para o backend correto.
                  </p>
                  <Link to="/install" className="mt-6 inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                      Ver Guia de Instalação
                  </Link>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                  {hosts.map(host => {
                      const hasFailedService = host.services?.some(s => s.status === 'failed');

                      let borderColor = 'border-slate-800';
                      if (hasFailedService) {
                          borderColor = 'border-red-500'; // Borda vermelha forte para falha de serviço
                      } else if (host.status === 'critical') {
                          borderColor = 'border-red-900/50';
                      } else if (host.status === 'warning') {
                          borderColor = 'border-amber-900/50';
                      } else if (host.status === 'offline') {
                          borderColor = 'border-slate-800 opacity-75';
                      }

                      return (
                          <div 
                            key={host.id} 
                            className={`bg-slate-900 border ${borderColor} rounded-xl overflow-hidden hover:shadow-lg transition-all hover:border-blue-900/50 group ${hasFailedService ? 'animate-pulse-glow' : ''}`}
                          >
                              {/* Card Header */}
                              <div className={`px-5 py-4 border-b flex justify-between items-start ${hasFailedService ? 'bg-red-950/50 border-red-800/50' : 'bg-slate-950/30 border-slate-800/50'}`}>
                                  <div className="flex items-center gap-3">
                                      <div className={`p-2 rounded-lg ${host.os === 'windows' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-700/50 text-slate-400'}`}>
                                          {host.os === 'windows' ? <Monitor className="w-5 h-5" /> : <Server className="w-5 h-5" />}
                                      </div>
                                      <div>
                                          <Link to={`/hosts/${host.id}`} className="font-medium text-slate-100 group-hover:text-blue-400 transition-colors block truncate max-w-[150px]" title={host.hostname}>
                                              {host.hostname}
                                          </Link>
                                          <div className="text-xs text-slate-500 font-mono mt-0.5">{host.ip}</div>
                                      </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                      {hasFailedService ? (
                                        <StatusBadge status="failed" type="service" />
                                      ) : (
                                        <StatusBadge status={host.status} />
                                      )}
                                      <span className="text-[10px] text-slate-600">
                                          visto {getRelativeTime(host.lastSeen)}
                                      </span>
                                  </div>
                              </div>

                              {/* Card Body - Metrics */}
                              <div className="p-5 space-y-4">
                                  {host.status === 'offline' ? (
                                      <div className="flex items-center justify-center h-[148px] text-slate-600 text-sm bg-slate-950/20 rounded-lg border border-slate-800/50 border-dashed">
                                          Host offline
                                      </div>
                                  ) : (
                                      <>
                                          {/* CPU Metric */}
                                          <div className="flex items-center gap-4">
                                              <div className="w-24 flex-shrink-0">
                                                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                                                      <Cpu className="w-3.5 h-3.5" /> CPU
                                                  </div>
                                                  <div className="text-lg font-bold text-slate-200">
                                                      {host.metrics.cpu[host.metrics.cpu.length - 1]?.value.toFixed(0)}%
                                                  </div>
                                              </div>
                                              <div className="flex-1 h-10">
                                                  <MetricChart 
                                                      data={host.metrics.cpu} 
                                                      color={host.metrics.cpu[host.metrics.cpu.length - 1]?.value > 90 ? '#ef4444' : '#3b82f6'} 
                                                      height={40} 
                                                  />
                                              </div>
                                          </div>

                                          {/* Memory Metric */}
                                          <div className="flex items-center gap-4">
                                              <div className="w-24 flex-shrink-0">
                                                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                                                      <HardDrive className="w-3.5 h-3.5" /> Mem
                                                  </div>
                                                  <div className="text-lg font-bold text-slate-200">
                                                      {host.metrics.memory[host.metrics.memory.length - 1]?.value.toFixed(0)}%
                                                  </div>
                                              </div>
                                              <div className="flex-1 h-10">
                                                   <MetricChart 
                                                      data={host.metrics.memory} 
                                                      color={host.metrics.memory[host.metrics.memory.length - 1]?.value > 90 ? '#ef4444' : '#8b5cf6'} 
                                                      height={40} 
                                                  />
                                              </div>
                                          </div>
                                          
                                           {(() => {
                                              // A fonte da verdade são os serviços configurados no backend.
                                              const configuredServices = host.agentConfig?.services?.filter(s => s.enabled) || [];
                                              if (configuredServices.length === 0) return null;

                                              // FIX: Explicitly type the Map to ensure correct type inference for its values, preventing 'status' property access errors.
                                              const reportedServicesMap = new Map<string, MonitoredService>(host.services?.map((s) => [s.name, s]));
                                              
                                              const statusStyles: Record<ServiceStatus, { dot: string; text: string; bg: string }> = {
                                                  active: { dot: 'bg-emerald-500', text: 'text-emerald-300', bg: 'bg-emerald-500/10' },
                                                  failed: { dot: 'bg-red-500', text: 'text-red-300', bg: 'bg-red-500/10' },
                                                  inactive: { dot: 'bg-slate-500', text: 'text-slate-400', bg: 'bg-slate-500/10' },
                                              };
                                              
                                              return (
                                                <div className="space-y-2 pt-2">
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                                        <ServerCog className="w-3.5 h-3.5" /> Serviços Monitorados
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {configuredServices.map((configService) => {
                                                            const reportedService = reportedServicesMap.get(configService.name);
                                                            const status = reportedService ? reportedService.status : 'inactive';
                                                            const details = reportedService ? reportedService.details : 'Aguardando dados do agente...';
                                                            const style = statusStyles[status];

                                                            return (
                                                                <div 
                                                                    key={configService.id}
                                                                    className={`relative group flex items-center gap-2 text-xs font-medium px-2 py-1 rounded-full ${style.bg} ${style.text} border border-transparent hover:border-slate-600 transition-colors cursor-help`}
                                                                >
                                                                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
                                                                    <span className="truncate max-w-[120px]">{configService.name}</span>
                                                                    {/* Custom, enhanced tooltip */}
                                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs bg-slate-800 text-slate-200 text-xs rounded-md p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-300 z-10">
                                                                        {details}
                                                                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800"></div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                              );
                                          })()}
                                      </>
                                  )}
                              </div>
                              
                              {/* Card Footer */}
                               <div className="px-5 py-3 bg-slate-950/30 border-t border-slate-800/50 flex justify-between items-center text-xs">
                                  <div className="flex items-center gap-4 text-slate-400">
                                      {/* Disk Info */}
                                      {host.disks[0] && host.disks[0].total > 0 ? (
                                          <div className="flex items-center gap-1.5" title={`Disk: ${host.disks[0].used.toFixed(1)}GB / ${host.disks[0].total.toFixed(1)}GB`}>
                                              <HardDrive className="w-3.5 h-3.5" />
                                              <span>{((host.disks[0].used / host.disks[0].total) * 100).toFixed(0)}%</span>
                                          </div>
                                      ) : host.status !== 'offline' ? (
                                          <div className="flex items-center gap-1.5 text-slate-600">
                                              <HardDrive className="w-3.5 h-3.5" />
                                              <span>--%</span>
                                          </div>
                                      ) : <div className="h-[17px]">&nbsp;</div>}
                                  </div>
                                  <Link to={`/hosts/${host.id}`} className="text-blue-500 hover:text-blue-400 font-medium transition-colors">
                                      Detalhes &rarr;
                                  </Link>
                              </div>
                          </div>
                      );
                  })}
              </div>
          )}
      </div>
    </div>
  );
};

export default Dashboard;