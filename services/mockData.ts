import { Host, Alert, MetricPoint, OSType, AlertSeverity } from '../types';

// --- Configuration ---
const DEFAULT_REFRESH_INTERVAL = 5000;
export const getRefreshInterval = (): number => {
  const stored = localStorage.getItem('intelli_refresh_interval');
  return stored ? parseInt(stored, 10) : DEFAULT_REFRESH_INTERVAL;
};

export const getBackendUrl = (): string | null => {
  return localStorage.getItem('intelli_backend_url');
};

// --- In-Memory State & Persistence ---
let hosts: Host[] = [];
let alerts: Alert[] = [];
let lastConnectionError: string | null = null;
const ALERTS_STORAGE_KEY = 'intelli_alerts';

// --- Helper Functions for Persistence ---
const loadAlertsFromStorage = () => {
  try {
    const stored = localStorage.getItem(ALERTS_STORAGE_KEY);
    if (stored) {
      alerts = JSON.parse(stored);
    }
  } catch (e) {
    console.error("Falha ao carregar alertas do storage", e);
    alerts = [];
  }
};

const saveAlertsToStorage = () => {
  try {
    // Mantém apenas os últimos 200 alertas para evitar que o storage cresça indefinidamente.
    const alertsToSave = alerts.slice(0, 200);
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alertsToSave));
  } catch (e) {
    console.error("Falha ao salvar alertas no storage", e);
  }
};

// Carrega os alertas uma vez quando o módulo é iniciado.
loadAlertsFromStorage();


// --- Helper for Deep Cloning ---
const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

// --- Agent Configuration Service ---
export const saveAgentConfiguration = async (hostname: string, config: { services: any[], monitoringEnabled: boolean }): Promise<{success: boolean, message: string}> => {
  const backendUrl = getBackendUrl();
  if (!backendUrl) {
    return { success: false, message: "URL do Backend não configurada." };
  }

  try {
    const response = await fetch(`${backendUrl}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostname, ...config })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Erro HTTP: ${response.status}` }));
      throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
    }

    return { success: true, message: 'Configuração salva no backend.' };
  } catch (e: any) {
    return { success: false, message: `Falha ao salvar configuração: ${e.message}` };
  }
};


// --- Data Fetching (ONLY REAL DATA) ---
export const fetchAndUpdateData = async (): Promise<void> => {
  const backendUrl = getBackendUrl();
  
  if (!backendUrl) {
      lastConnectionError = "URL do Backend não configurada.";
      return;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const sanitizedUrl = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
    const fetchUrl = `${sanitizedUrl}/api/hosts?_t=${Date.now()}`;

    if (window.location.protocol === 'https:' && sanitizedUrl.startsWith('http:')) {
         throw new Error("MIXED_CONTENT_BLOCK");
    }

    const response = await fetch(fetchUrl, { 
        signal: controller.signal,
        mode: 'cors',
        cache: 'no-store',
        credentials: 'omit'
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
    }

    const realData = await response.json();
    lastConnectionError = null;
    
    Object.entries(realData).forEach(([hostname, data]: [string, any]) => {
        if (!data || typeof data !== 'object') {
            console.warn(`Dados inválidos ou nulos recebidos para o host: ${hostname}, pulando.`);
            return;
        }

        let host = hosts.find(h => h.hostname === hostname);

        if (!host) {
            host = {
                id: 'h-' + Math.random().toString(36).substr(2, 9),
                hostname: hostname,
                ip: data.ip || '0.0.0.0',
                os: (data.os as OSType) || 'linux',
                status: 'offline',
                uptimeSeconds: data.uptimeSeconds || 0,
                lastSeen: 0,
                metrics: { cpu: [], memory: [], networkIn: [], networkOut: [] },
                disks: [],
                services: []
            };
            hosts.push(host);
        }

        const now = Date.now();
        const seenDate = new Date(data.lastSeen);
        
        let validLastSeen = !isNaN(seenDate.getTime()) ? seenDate.getTime() : 0;
        
        if (validLastSeen > now + 60000) {
            validLastSeen = now;
        }
        
        host.lastSeen = validLastSeen;
        host.uptimeSeconds = data.uptimeSeconds || host.uptimeSeconds;
        host.ip = data.ip || host.ip;
        host.os = (data.os as OSType) || host.os;
        host.services = Array.isArray(data.services) ? data.services : host.services || [];

        if (data.agentConfig) {
            host.agentConfig = data.agentConfig;
            if (typeof data.agentConfig.monitoringEnabled === 'boolean') {
                host.monitoringEnabled = data.agentConfig.monitoringEnabled;
            }
        }

        const timeSinceLastSeen = now - host.lastSeen;
        if (timeSinceLastSeen > 180000) {
            host.status = 'offline';
        } else if (timeSinceLastSeen > 60000) {
            host.status = 'warning';
        } else {
            host.status = 'healthy';
        }
        
        if (data.latestMetrics) {
                const m = data.latestMetrics;
                
                if (m.disk_total_gb != null && m.disk_used_gb != null) {
                    host.disks = [{ 
                        mount: host.os === 'windows' ? 'C:\\' : '/',
                        total: m.disk_total_gb,
                        used: m.disk_used_gb
                    }];
                    if (host.status !== 'offline' && m.disk_total_gb > 0) {
                        const usage = m.disk_used_gb / m.disk_total_gb;
                        if (usage > 0.95) host.status = 'critical';
                        else if (usage > 0.85 && host.status === 'healthy') host.status = 'warning';
                    }
                }

                const pushMetric = (arr: MetricPoint[], value: number) => {
                    if (Array.isArray(arr)) {
                         arr.push({ timestamp: now, value: Number(value) || 0 });
                         if (arr.length > 40) arr.shift();
                    }
                };

                pushMetric(host.metrics.cpu, m.cpu);
                pushMetric(host.metrics.memory, m.memory);
                
                if (m.net_sent_mb != null && m.net_recv_mb != null) {
                    const prevIn = host._lastNetInData;
                    const prevOut = host._lastNetOutData;
                    
                    if (prevIn && now - prevIn.timestamp < 120000 && m.net_recv_mb >= prevIn.value) {
                        const timeDiffSec = Math.max(1, (now - prevIn.timestamp) / 1000);
                        pushMetric(host.metrics.networkIn, (m.net_recv_mb - prevIn.value) / timeDiffSec);
                    } else {
                        pushMetric(host.metrics.networkIn, 0);
                    }
                    host._lastNetInData = { timestamp: now, value: m.net_recv_mb };

                    if (prevOut && now - prevOut.timestamp < 120000 && m.net_sent_mb >= prevOut.value) {
                            const timeDiffSec = Math.max(1, (now - prevOut.timestamp) / 1000);
                        pushMetric(host.metrics.networkOut, (m.net_sent_mb - prevOut.value) / timeDiffSec);
                    } else {
                        pushMetric(host.metrics.networkOut, 0);
                    }
                    host._lastNetOutData = { timestamp: now, value: m.net_sent_mb };
                }
                
                if (host.status !== 'offline') {
                    if (m.cpu > 95 || m.memory > 98) host.status = 'critical';
                    else if ((m.cpu > 85 || m.memory > 90) && host.status !== 'critical') host.status = 'warning';
                }
        }
    });

    // --- NEW: Alert Generation Logic ---
    const now = Date.now();
    const activeAlerts = alerts.filter(a => !a.resolved);

    const findActiveAlert = (hostId: string, alertKey: string) => {
        return activeAlerts.find(a => a.id.startsWith(`${hostId}-${alertKey}`));
    };

    const createAlert = (host: Host, severity: AlertSeverity, alertKey: string, message: string) => {
        const newAlert: Alert = {
            id: `${host.id}-${alertKey}-${now}`,
            hostId: host.id,
            hostname: host.hostname,
            severity,
            message,
            timestamp: now,
            resolved: false,
        };
        alerts.unshift(newAlert);
    };

    const resolveAlert = (alert: Alert) => {
        alert.resolved = true;
        alert.resolvedAt = now;
    };

    hosts.forEach(host => {
        // 1. Host Status Alerts
        const statusAlertKey = `status-${host.status}`;
        const anyActiveStatusAlert = activeAlerts.find(a => a.hostId === host.id && a.id.includes('-status-'));
        
        if (host.status !== 'healthy') {
            const severityMap = { 'warning': 'warning', 'critical': 'critical', 'offline': 'critical' };
            const currentSeverity = severityMap[host.status] as AlertSeverity;
            const message = `Status do Host: O host está em estado '${host.status}'.`;
            
            if (!anyActiveStatusAlert) {
                createAlert(host, currentSeverity, statusAlertKey, message);
            } else if (!anyActiveStatusAlert.id.includes(statusAlertKey)) {
                resolveAlert(anyActiveStatusAlert);
                createAlert(host, currentSeverity, statusAlertKey, message);
            }
        } else if (anyActiveStatusAlert) {
            resolveAlert(anyActiveStatusAlert);
        }

        // 2. Service Failure Alerts
        (host.services || []).forEach(service => {
            const serviceAlertKey = `service-${service.name.replace(/\s+/g, '_')}`;
            const existingAlert = findActiveAlert(host.id, serviceAlertKey);
            
            if (service.status === 'failed') {
                if (!existingAlert) {
                    const message = `Falha de Serviço '${service.name}': ${service.details || 'N/A'}`;
                    createAlert(host, 'critical', serviceAlertKey, message);
                }
            } else if (existingAlert) {
                resolveAlert(existingAlert);
            }
        });
        
        // 3. Resource Alerts
        const disk = host.disks[0];
        const diskUsage = disk && disk.total > 0 ? (disk.used / disk.total) * 100 : 0;
        
        const resourceChecks = [
            { key: 'cpu-critical', value: host.metrics.cpu.slice(-1)[0]?.value ?? 0, threshold: 95, severity: 'critical', message: 'CPU Crítico' },
            { key: 'mem-critical', value: host.metrics.memory.slice(-1)[0]?.value ?? 0, threshold: 98, severity: 'critical', message: 'Memória Crítica' },
            { key: 'disk-critical', value: diskUsage, threshold: 95, severity: 'critical', message: 'Disco Crítico' },
            { key: 'disk-warning', value: diskUsage, threshold: 85, severity: 'warning', message: 'Disco Elevado', exclusiveMax: 95 }
        ];

        resourceChecks.forEach(check => {
            const existingAlert = findActiveAlert(host.id, check.key);
            const isExceeded = check.value >= check.threshold && (!check.exclusiveMax || check.value < check.exclusiveMax);

            if (isExceeded) {
                if (!existingAlert) {
                    const message = `${check.message}: O uso atingiu ${check.value.toFixed(1)}%.`;
                    createAlert(host, check.severity as AlertSeverity, check.key, message);
                }
            } else if (existingAlert) {
                resolveAlert(existingAlert);
            }
        });
    });

    saveAlertsToStorage();
    // --- End of Alert Logic ---

  } catch (e: any) {
      let msg = e.message || 'Erro desconhecido';
      
      if (msg === 'MIXED_CONTENT_BLOCK' || (e.name === 'TypeError' && msg === 'Failed to fetch' && window.location.protocol === 'https:' && backendUrl?.startsWith('http:'))) {
          lastConnectionError = "BLOQUEIO DE SEGURANÇA: Seu navegador impediu a conexão porque este painel está em HTTPS e o backend em HTTP. Acesse o painel via HTTP ou configure SSL no backend.";
          console.error("🚨 ERRO CRÍTICO DE CONEXÃO (MIXED CONTENT):", lastConnectionError);
      } else if (e.name === 'TypeError' && msg === 'Failed to fetch') {
           if (backendUrl && backendUrl.startsWith('https://')) {
               lastConnectionError = `CERT_ERROR`;
           } else {
               lastConnectionError = `Não foi possível conectar a ${backendUrl}. Verifique se o servidor está rodando e se o IP/Porta estão corretos.`;
           }
           console.warn("⚠️ Falha de conexão:", msg);
      } else {
          lastConnectionError = `Erro ao processar dados do backend: ${msg}`;
          console.warn("⚠️ Erro ao atualizar dados:", e);
      }
  }
};

// --- API Methods ---

export const getLastConnectionError = (): string | null => {
    return lastConnectionError;
};

export const getHosts = async (): Promise<Host[]> => {
  return deepClone(hosts);
};

export const getHostById = async (id: string): Promise<Host | undefined> => {
  const host = hosts.find(h => h.id === id);
  return host ? deepClone(host) : undefined;
};

export const getAlerts = async (): Promise<Alert[]> => {
  return deepClone(alerts);
};

export const addHost = async (hostData?: Partial<Host>): Promise<void> => {
  console.warn("addHost ignorado: Em modo produção, use o Agente para registrar hosts.");
};

export const updateHost = async (id: string, hostData: Partial<Host>): Promise<void> => {
    const index = hosts.findIndex(h => h.id === id);
    if (index !== -1) {
        hosts[index] = { ...hosts[index], ...hostData };
    }
};