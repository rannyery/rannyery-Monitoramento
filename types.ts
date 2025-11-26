
export type HostStatus = 'healthy' | 'warning' | 'critical' | 'offline';
export type OSType = 'linux' | 'windows';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type ServiceStatus = 'active' | 'inactive' | 'failed' | 'warning';

// Adiciona definição global para o arquivo de config
declare global {
  interface Window {
    INTELLI_CONFIG?: {
      backendUrl?: string;
    };
  }
}

export interface MetricPoint {
  timestamp: number;
  value: number;
}

export interface DiskInfo {
  mount: string;
  total: number; // GB
  used: number; // GB
}

export interface MonitoredService {
  name: string;
  status: ServiceStatus;
  type: 'service' | 'database';
  details?: string;
  enabled?: boolean; // Adicionado para controle de monitoramento
}

// --- Agent Configuration Types ---
export type ServiceType = 'oracle' | 'socket' | 'webservice' | 'report' | 'registry' | 'process';

export interface BaseServiceConfig {
  id: string;
  name: string;
  enabled: boolean;
}

export interface OracleConfig extends BaseServiceConfig {
  type: 'oracle';
  oracleUser: string;
  oraclePassword: string;
  tnsName: string;
}

export interface IpPortConfig extends BaseServiceConfig {
  type: 'socket' | 'report' | 'registry';
  ip: string;
  port: string;
}

export interface WebServiceConfig extends BaseServiceConfig {
    type: 'webservice';
    url: string;
    clientId: string;
    clientSecret: string;
}

export interface ProcessConfig extends BaseServiceConfig {
    type: 'process';
    processName: string;
}

export type ServiceConfig = OracleConfig | IpPortConfig | WebServiceConfig | ProcessConfig;

export interface AgentConfig {
    services: ServiceConfig[];
    monitoringEnabled: boolean;
}

export interface Host {
  id: string;
  hostname: string;
  ip: string;
  os: OSType;
  status: HostStatus;
  uptimeSeconds: number;
  lastSeen: number;
  monitoringEnabled?: boolean; // Adicionado para controle de monitoramento
  agentConfig?: AgentConfig; // Armazena a configuração completa do agente vinda do backend
  metrics: {
    cpu: MetricPoint[];
    memory: MetricPoint[];
    networkIn: MetricPoint[]; // MB/s
    networkOut: MetricPoint[]; // MB/s
  };
  disks: DiskInfo[];
  services: MonitoredService[];
  // Campos internos para cálculo de taxa de rede
  _lastNetInData?: { timestamp: number; value: number };
  _lastNetOutData?: { timestamp: number; value: number };
}

export interface Alert {
  id: string;
  hostId: string;
  hostname: string;
  severity: AlertSeverity;
  message: string;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
}

export interface UserGroup {
  id: number;
  name: string;
  description: string;
  created_at?: string;
}

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'viewer' | 'operador' | string;
  group_id?: number;
  group_name?: string;
  token: string;
  created_at?: string;
}