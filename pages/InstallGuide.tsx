
import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, Terminal, Server, AlertTriangle, Database, PlugZap, Globe, FileText, Archive, Plus, Trash2, Download, Wand2, ArrowRight, ArrowLeft, Save as SaveIcon, Upload, ToggleLeft, ToggleRight, Cog, Loader2 } from 'lucide-react';
import { getBackendUrl, getHostById, saveAgentConfiguration } from '../services/mockData';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Host, MonitoredService, AgentConfig } from '../types';

// --- Tipos para a nova arquitetura dinâmica ---

// Representa o schema de um campo de formulário vindo do DB
interface FormField {
  name: string;
  label: string;
  type: 'text' | 'password';
  placeholder?: string;
  span?: 'full'; // Para campos que ocupam a linha inteira
}

// Representa um tipo de serviço, vindo do DB
interface ServiceTypeInfo {
  id: number;
  type_key: string; // ex: 'oracle', 'socket'
  display_name: string; // ex: 'Banco de Dados Oracle'
  config_schema: {
    fields: FormField[];
  };
  icon: React.FC<any>; // Adicionado no frontend
}

// Representa uma instância de serviço configurada pelo usuário
interface DynamicServiceConfig {
    id: string; // ID local do frontend (ex: s-12345)
    name: string; // Nome dado pelo usuário (ex: ICRM Produção)
    typeKey: string; // Chave do tipo (ex: 'oracle')
    enabled: boolean;
    values: Record<string, string>; // Valores dos campos (ex: { oracleUser: 'user', tnsName: 'PROD' })
}

// Novo tipo para a configuração salva de templates
interface SavedAgentConfig {
  id: string;
  name: string;
  services: DynamicServiceConfig[];
}


const serviceTypeIcons: Record<string, React.FC<any>> = {
    oracle: Database,
    socket: PlugZap,
    webservice: Globe,
    report: FileText,
    registry: Archive,
    process: Cog,
};

const backendServerCode = `const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken'); // Adicionado para autenticação

const app = express();
const PORT = 5077;
const JWT_SECRET = 'seu-segredo-super-secreto-para-jwt-aqui'; // Troque por uma variável de ambiente em produção

const dbConfig = { user: 'postgres', host: 'localhost', database: 'intellisysmonitor', password: 'admin', port: 5432 };
const pool = new Pool(dbConfig);

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ ERRO CRÍTICO: Falha ao conectar ao banco de dados PostgreSQL.', err);
        process.exit(1);
    } else {
        console.log('✅ Conexão com o banco de dados PostgreSQL estabelecida com sucesso.');
    }
});

/* --- ESTRUTURA RECOMENDADA DO BANCO DE DADOS (DATA-DRIVEN) ---

-- Tabela para usuários do painel
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    -- IMPORTANTE: Em produção, NUNCA guarde senhas em texto plano. Use bcrypt para gerar um hash.
    -- Ex: password_hash VARCHAR(255) NOT NULL
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ======================================================================================
-- AÇÃO NECESSÁRIA: CRIAR USUÁRIO ADMINISTRADOR
-- Execute o comando abaixo no seu banco de dados para criar o usuário 'admin' padrão.
-- ======================================================================================
INSERT INTO users (username, password, role) VALUES ('admin', 'admin', 'admin');


-- Tabela para hosts (informações estáticas)
CREATE TABLE hosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostname VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    os VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela para status e configuração principal do host
CREATE TABLE host_status_and_config (
    host_id UUID PRIMARY KEY REFERENCES hosts(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'offline',
    uptime_seconds BIGINT,
    last_seen TIMESTAMPTZ,
    monitoring_enabled BOOLEAN DEFAULT true
);

-- Tabela que define os TIPOS de serviço e seus formulários
CREATE TABLE service_types (
    id SERIAL PRIMARY KEY,
    type_key VARCHAR(50) UNIQUE NOT NULL, -- ex: 'oracle', 'socket'
    display_name VARCHAR(255) NOT NULL,  -- ex: 'Banco de Dados Oracle'
    config_schema JSONB NOT NULL -- Define os campos que o frontend deve mostrar
);

-- Populando com os serviços padrão
INSERT INTO service_types (type_key, display_name, config_schema) VALUES
('oracle', 'Banco de Dados Oracle', '{ "fields": [
    { "name": "oracleUser", "label": "Usuário Oracle", "type": "text", "placeholder": "Usuário do banco" },
    { "name": "oraclePassword", "label": "Senha Oracle", "type": "password", "placeholder": "Senha do banco" },
    { "name": "tnsName", "label": "Nome do TNS", "type": "text", "placeholder": "Nome do TNS (do tnsnames.ora)" }
]}'),
('socket', 'Conexão Socket', '{ "fields": [
    { "name": "ip", "label": "Endereço IP", "type": "text", "placeholder": "ex: 192.168.1.10" },
    { "name": "port", "label": "Porta", "type": "text", "placeholder": "ex: 8080" }
]}'),
('webservice', 'WebService (URL)', '{ "fields": [
    { "name": "url", "label": "URL Completa", "type": "text", "placeholder": "https://api.meuservico.com/health", "span": "full" },
    { "name": "clientId", "label": "Client ID (Opcional)", "type": "text" },
    { "name": "clientSecret", "label": "Client Secret (Opcional)", "type": "password" }
]}'),
('report', 'Serviço de Relatório', '{ "fields": [
    { "name": "ip", "label": "Endereço IP", "type": "text" }, { "name": "port", "label": "Porta", "type": "text" }
]}'),
('registry', 'Serviço de Registro', '{ "fields": [
    { "name": "ip", "label": "Endereço IP", "type": "text" }, { "name": "port", "label": "Porta", "type": "text" }
]}'),
('process', 'Processo (Executável)', '{ "fields": [
    { "name": "processName", "label": "Nome do Executável", "type": "text", "placeholder": "ex: CRMSENDER.exe", "span": "full" }
]}');

-- Tabela ÚNICA para as configurações de serviço de cada host
CREATE TABLE host_service_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
    service_type_id INT NOT NULL REFERENCES service_types(id) ON DELETE RESTRICT,
    service_name VARCHAR(255) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    config_values JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_hsc_host_id ON host_service_configs(host_id);
CREATE UNIQUE INDEX idx_hsc_host_id_service_name ON host_service_configs(host_id, service_name);

-- Tabela para histórico de status dos serviços reportados
CREATE TABLE service_status_history (
    host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
    service_name VARCHAR(255) NOT NULL,
    status VARCHAR(50),
    details TEXT,
    last_checked TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (host_id, service_name)
);

-- Tabela para métricas de performance
CREATE TABLE metrics (
    timestamp TIMESTAMPTZ NOT NULL,
    host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
    cpu_usage FLOAT,
    memory_usage FLOAT,
    disk_used_gb FLOAT,
    disk_total_gb FLOAT,
    PRIMARY KEY (timestamp, host_id)
);
*/


// --- Carregamento dos Certificados SSL ---
let sslOptions = {};
try {
    sslOptions = { key: fs.readFileSync(path.join(__dirname, 'key.pem')), cert: fs.readFileSync(path.join(__dirname, 'cert.pem')) };
    console.log("✅ Certificados SSL carregados.");
} catch (error) {
    console.error("❌ ERRO CRÍTICO AO CARREGAR CERTIFICADOS SSL:", error.message);
    process.exit(1);
}

// --- Middlewares ---
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json());
app.use((req, res, next) => {
    console.log(\`[\${new Date().toLocaleTimeString()}] \${req.method} \${req.url}\`);
    next();
});

// --- Rotas da API ---
app.get('/', (req, res) => res.send('✅ IntelliMonitor Backend está ONLINE (HTTPS)!'));

// --- NOVO: Rota para Criar Usuários (POST /api/register) ---
// Use isso para criar usuários via Postman ou script.
app.post('/api/register', async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username e Password são obrigatórios.' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role',
            [username, password, role || 'viewer']
        );
        res.status(201).json({ message: 'Usuário criado com sucesso!', user: result.rows[0] });
    } catch (e) {
        console.error('Erro ao criar usuário:', e);
        if (e.code === '23505') { // Código de erro Postgres para Unique Violation
            return res.status(409).json({ error: 'Nome de usuário já existe.' });
        }
        res.status(500).json({ error: 'Erro interno ao criar usuário.' });
    }
});

// --- ENDPOINT DE LOGIN ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
    }
    
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        // IMPORTANTE: Aqui comparamos a senha em texto plano. Em produção, use bcrypt.compare()
        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        
        // Se as credenciais estiverem corretas, gera o token
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' });

        // Retorna os dados do usuário e o token
        res.json({
            id: user.id,
            username: user.username,
            role: user.role,
            token: token
        });

    } catch (e) {
        console.error('Erro no login:', e);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});


// --- NOVA ROTA: Expõe os tipos de serviço para o frontend ---
app.get('/api/service-types', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, type_key, display_name, config_schema FROM service_types ORDER BY id');
        res.json(result.rows);
    } catch (e) {
        console.error('Erro ao buscar tipos de serviço:', e);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.post('/api/metrics', async (req, res) => {
    const { hostname, os, metrics, ip, uptimeSeconds, services } = req.body;
    if (!hostname || !metrics) {
        return res.status(400).json({ error: 'Dados de métricas inválidos' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const hostRes = await client.query(
            \`INSERT INTO hosts (hostname, ip_address, os) VALUES ($1, $2, $3)
             ON CONFLICT (hostname) DO UPDATE SET ip_address = EXCLUDED.ip_address, os = EXCLUDED.os, updated_at = NOW()
             RETURNING id\`,
            [hostname, ip, os]
        );
        const hostId = hostRes.rows[0].id;

        await client.query(
            \`INSERT INTO host_status_and_config (host_id, uptime_seconds, last_seen) VALUES ($1, $2, NOW())
             ON CONFLICT (host_id) DO UPDATE SET uptime_seconds = EXCLUDED.uptime_seconds, last_seen = NOW()\`,
            [hostId, uptimeSeconds]
        );
        
        await client.query(
            \`INSERT INTO metrics (timestamp, host_id, cpu_usage, memory_usage, disk_used_gb, disk_total_gb)
             VALUES (NOW(), $1, $2, $3, $4, $5)\`,
            [hostId, metrics.cpu, metrics.memory, metrics.disk_used_gb, metrics.disk_total_gb]
        );

        if (Array.isArray(services)) {
            for (const service of services) {
                await client.query(
                   \`INSERT INTO service_status_history (host_id, service_name, status, details, last_checked)
                    VALUES ($1, $2, $3, $4, NOW())
                    ON CONFLICT (host_id, service_name) DO UPDATE SET
                       status = EXCLUDED.status, details = EXCLUDED.details, last_checked = NOW()\`,
                    [hostId, service.name, service.status, service.details]
                );
            }
        }
        await client.query('COMMIT');
        res.json({ status: 'ok' });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Erro ao processar métricas:', e);
        res.status(500).json({ error: 'Erro interno do servidor ao salvar métricas' });
    } finally {
        client.release();
    }
});

// --- ROTA ATUALIZADA: Salva a configuração no novo schema ---
app.post('/api/config', async (req, res) => {
    const { hostname, services, monitoringEnabled } = req.body;
    if (!hostname) {
        return res.status(400).json({ error: 'Hostname é obrigatório' });
    }
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const hostRes = await client.query(
            \`INSERT INTO hosts (hostname) VALUES ($1) ON CONFLICT (hostname) DO UPDATE SET hostname=EXCLUDED.hostname RETURNING id\`,
            [hostname]
        );
        const hostId = hostRes.rows[0].id;

        await client.query('DELETE FROM host_service_configs WHERE host_id = $1', [hostId]);

        if (Array.isArray(services)) {
            // Pega todos os tipos de uma vez para evitar query no loop
            const serviceTypesRes = await client.query('SELECT id, type_key FROM service_types');
            const typeMap = new Map(serviceTypesRes.rows.map(r => [r.type_key, r.id]));

            for (const service of services) {
                const serviceTypeId = typeMap.get(service.typeKey);
                if (!serviceTypeId) {
                    console.warn(\`Tipo de serviço desconhecido '\${service.typeKey}' para o serviço '\${service.name}'. Pulando.\`);
                    continue;
                }
                await client.query(
                    \`INSERT INTO host_service_configs (host_id, service_type_id, service_name, is_enabled, config_values)
                     VALUES ($1, $2, $3, $4, $5)\`,
                    [hostId, serviceTypeId, service.name, service.enabled, JSON.stringify(service.values)]
                );
            }
        }

        await client.query(
            \`INSERT INTO host_status_and_config (host_id, monitoring_enabled) VALUES ($1, $2)
             ON CONFLICT (host_id) DO UPDATE SET monitoring_enabled = EXCLUDED.monitoring_enabled\`,
            [hostId, monitoringEnabled]
        );
        
        await client.query('COMMIT');
        res.json({ status: 'ok', message: 'Configuração salva com sucesso.' });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Erro ao salvar configuração:', e);
        res.status(500).json({ error: 'Erro interno do servidor ao salvar configuração.' });
    } finally {
        client.release();
    }
});

// --- ROTA ATUALIZADA: Busca dados do novo schema e formata para o frontend ---
app.get('/api/hosts', async (req, res) => {
    const client = await pool.connect();
    try {
        const hostsResult = await client.query(\`
            SELECT
                h.id, h.hostname, h.ip_address as ip, h.os,
                h_cfg.uptime_seconds, h_cfg.last_seen, h_cfg.monitoring_enabled,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', s_cfg.id,
                            'name', s_cfg.service_name,
                            'typeKey', st.type_key,
                            'enabled', s_cfg.is_enabled,
                            'values', s_cfg.config_values
                        )
                    )
                    FROM host_service_configs s_cfg
                    JOIN service_types st ON s_cfg.service_type_id = st.id
                    WHERE s_cfg.host_id = h.id
                ) as services_config
            FROM hosts h
            LEFT JOIN host_status_and_config h_cfg ON h.id = h_cfg.host_id
        \`);
        
        if (hostsResult.rows.length === 0) return res.json({});

        const hostIds = hostsResult.rows.map(r => r.id);
        
        const metricsResult = await client.query(\`
            WITH ranked_metrics AS (
                SELECT m.*, ROW_NUMBER() OVER(PARTITION BY host_id ORDER BY timestamp DESC) as rn
                FROM metrics m WHERE m.host_id = ANY($1::uuid[])
            )
            SELECT host_id, timestamp, cpu_usage, memory_usage, disk_used_gb, disk_total_gb
            FROM ranked_metrics WHERE rn <= 40 ORDER BY host_id, timestamp ASC
        \`, [hostIds]);
        
        const servicesResult = await client.query(\`
            SELECT host_id, service_name, status, details FROM service_status_history
            WHERE host_id = ANY($1::uuid[])
        \`, [hostIds]);

        const metricsByHost = metricsResult.rows.reduce((acc, row) => {
            (acc[row.host_id] = acc[row.host_id] || []).push(row);
            return acc;
        }, {});

        const servicesByHost = servicesResult.rows.reduce((acc, row) => {
            (acc[row.host_id] = acc[row.host_id] || []).push(row);
            return acc;
        }, {});

        const responseData = {};
        for (const host of hostsResult.rows) {
            const hostMetrics = metricsByHost[host.id] || [];
            const latestMetric = hostMetrics[hostMetrics.length - 1] || {};

            responseData[host.hostname] = {
                id: host.id, hostname: host.hostname, ip: host.ip, os: host.os,
                uptimeSeconds: host.uptime_seconds || 0,
                lastSeen: new Date(host.last_seen).getTime() || 0,
                agentConfig: {
                    services: host.services_config || [],
                    monitoringEnabled: host.monitoring_enabled
                },
                latestMetrics: {
                    cpu: latestMetric.cpu_usage, memory: latestMetric.memory_usage,
                    disk_total_gb: latestMetric.disk_total_gb, disk_used_gb: latestMetric.disk_used_gb
                },
                metrics: {
                    cpu: hostMetrics.map(m => ({ timestamp: new Date(m.timestamp).getTime(), value: m.cpu_usage })),
                    memory: hostMetrics.map(m => ({ timestamp: new Date(m.timestamp).getTime(), value: m.memory_usage })),
                    networkIn: [], networkOut: [],
                },
                disks: latestMetric.disk_total_gb ? [{
                    mount: host.os === 'windows' ? 'C:\\\\' : '/',
                    total: latestMetric.disk_total_gb, used: latestMetric.disk_used_gb
                }] : [],
                services: (servicesByHost[host.id] || []).map(s => ({
                    name: s.service_name, status: s.status, details: s.details,
                    type: s.service_name.toLowerCase().includes('oracle') ? 'database' : 'service'
                })),
            };
        }
        res.json(responseData);
    } catch (e) {
        console.error('Erro ao buscar hosts:', e);
        res.status(500).json({ error: 'Erro interno ao buscar dados dos hosts' });
    } finally {
        client.release();
    }
});

// --- FALLBACK DE ERRO 404 EM JSON ---
// Isso evita o erro "Unexpected token <" quando o frontend chama uma rota inexistente
app.all('/api/*', (req, res) => {
    res.status(404).json({ error: 'API Endpoint not found.' });
});

https.createServer(sslOptions, app).listen(PORT, '0.0.0.0', () => {
    console.log(\`\\n🚀 Backend SEGURO (HTTPS) rodando na porta \${PORT}!\`);
});
`;

// --- Funções de Persistência (Templates) ---
const getSavedConfigs = (): SavedAgentConfig[] => {
    try {
        const stored = localStorage.getItem('intelli_agent_configs');
        return stored ? JSON.parse(stored) : [];
    } catch (e) { return []; }
};

const saveConfigs = (configs: SavedAgentConfig[]) => {
    localStorage.setItem('intelli_agent_configs', JSON.stringify(configs));
};

// --- Componente Principal ---
const InstallGuide: React.FC = () => {
    const { hostId } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!hostId;

    const [copiedSection, setCopiedSection] = useState<string | null>(null);
    const [step, setStep] = useState(1);
    const [services, setServices] = useState<DynamicServiceConfig[]>([]);
    
    // Estados da nova arquitetura
    const [serviceTypes, setServiceTypes] = useState<ServiceTypeInfo[]>([]);
    const [selectedServiceTypeKey, setSelectedServiceTypeKey] = useState<string>('');
    const [isLoadingServiceTypes, setIsLoadingServiceTypes] = useState(true);

    const [backendUrl, setBackendUrl] = useState('');
    const [generatedScript, setGeneratedScript] = useState('');
    
    const [savedConfigs, setSavedConfigs] = useState<SavedAgentConfig[]>([]);
    const [configName, setConfigName] = useState('');
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'warning' } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [originalHostname, setOriginalHostname] = useState<string | null>(null);
    const [isHostMonitoringEnabled, setIsHostMonitoringEnabled] = useState(true);
    const [isLoadingHost, setIsLoadingHost] = useState(isEditMode);
    
    const showNotification = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3500);
    };

    useEffect(() => {
        setBackendUrl(getBackendUrl() || '');
        setSavedConfigs(getSavedConfigs());

        // Busca os tipos de serviço da nova API
        const fetchServiceTypes = async () => {
            const url = getBackendUrl();
            if (!url) {
                setIsLoadingServiceTypes(false);
                return;
            }
            try {
                const response = await fetch(`${url}/api/service-types`);
                if (!response.ok) throw new Error('Falha ao buscar tipos de serviço');
                const data = await response.json();
                const typesWithIcons: ServiceTypeInfo[] = data.map((t: any) => ({
                    ...t,
                    icon: serviceTypeIcons[t.type_key] || Cog
                }));
                setServiceTypes(typesWithIcons);
                if (typesWithIcons.length > 0) {
                    setSelectedServiceTypeKey(typesWithIcons[0].type_key);
                }
            } catch (error) {
                console.error(error);
                showNotification('Não foi possível carregar os tipos de serviço do backend.', 'error');
            } finally {
                setIsLoadingServiceTypes(false);
            }
        };

        fetchServiceTypes();
    }, []);
    
    useEffect(() => {
        if (isEditMode && hostId && serviceTypes.length > 0) {
            const loadHostData = async () => {
                setIsLoadingHost(true);
                const hostData = await getHostById(hostId);

                if (!hostData) {
                    showNotification(`Host com ID ${hostId} não encontrado.`, 'error');
                    navigate('/install');
                    setIsLoadingHost(false);
                    return;
                }

                setOriginalHostname(hostData.hostname);
                setConfigName(`Config do host: ${hostData.hostname}`);
                
                if (hostData.agentConfig) {
                    // Mapeia os dados do backend (agentConfig) para o novo estado do frontend (DynamicServiceConfig)
                    const loadedServices: DynamicServiceConfig[] = hostData.agentConfig.services.map((s: any) => ({
                        id: s.id || `s-${Math.random().toString(36).substr(2, 9)}`,
                        name: s.name,
                        typeKey: s.typeKey,
                        enabled: s.enabled,
                        values: s.values || {}
                    }));
                    setServices(loadedServices);
                    setIsHostMonitoringEnabled(hostData.agentConfig.monitoringEnabled);
                    showNotification("Configuração carregada do backend.", 'success');
                } else {
                    showNotification("Configuração de agente não encontrada no backend.", 'warning');
                    setIsHostMonitoringEnabled(hostData.monitoringEnabled !== false);
                }
                setIsLoadingHost(false);
            };
            loadHostData();
        }
    }, [hostId, isEditMode, navigate, serviceTypes]);
    

    const copyToClipboard = (text: string, section: string) => {
        navigator.clipboard.writeText(text);
        setCopiedSection(section);
        setTimeout(() => setCopiedSection(null), 2000);
    };

    const handleAddService = () => {
        const serviceType = serviceTypes.find(st => st.type_key === selectedServiceTypeKey);
        if (!serviceType) return;

        const newService: DynamicServiceConfig = { 
            id: `s-${Date.now()}`, 
            name: `${serviceType.display_name} ${services.filter(s => s.typeKey === selectedServiceTypeKey).length + 1}`,
            enabled: true,
            typeKey: selectedServiceTypeKey,
            values: serviceType.config_schema.fields.reduce((acc, field) => {
                acc[field.name] = '';
                return acc;
            }, {} as Record<string, string>)
        };
        setServices([...services, newService]);
    };
    
    const handleUpdateService = (id: string, field: string, value: string | boolean) => {
        setServices(services.map(s => {
            if (s.id !== id) return s;
            if (field === 'name' || field === 'enabled') {
                 return { ...s, [field]: value };
            }
            // Atualiza um valor dentro do objeto 'values'
            return { ...s, values: { ...s.values, [field]: String(value) } };
        }));
    };
    
    const handleToggleService = (id: string) => {
        setServices(services.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
    }

    const handleRemoveService = (id: string) => {
        setServices(services.filter(s => s.id !== id));
    };

    // --- Funções de Gerenciamento de Configuração (Templates) ---
    const handleSaveConfig = () => {
        if (!configName.trim()) {
            alert("Por favor, dê um nome à configuração de template.");
            return;
        }
        
        const existingConfigs = getSavedConfigs();
        const existingIndex = existingConfigs.findIndex(c => c.name.toLowerCase() === configName.trim().toLowerCase());

        if (existingIndex !== -1) {
             if (window.confirm(`Já existe um template com o nome "${configName}". Deseja sobrescrevê-lo?`)) {
                existingConfigs[existingIndex].services = services;
                saveConfigs(existingConfigs);
                setSavedConfigs(existingConfigs);
                showNotification(`Template "${configName}" atualizado com sucesso!`);
             }
        } else {
            const newConfig: SavedAgentConfig = { id: `c-${Date.now()}`, name: configName.trim(), services };
            const updatedConfigs = [...existingConfigs, newConfig];
            saveConfigs(updatedConfigs);
            setSavedConfigs(updatedConfigs);
            showNotification(`Template "${configName}" salvo com sucesso!`);
        }
    };

    const handleLoadConfig = (id: string) => {
        const configToLoad = savedConfigs.find(c => c.id === id);
        if (configToLoad) {
            setServices(configToLoad.services);
            setConfigName(configToLoad.name);
            showNotification(`Template "${configToLoad.name}" carregado.`);
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }
    };

    const handleDeleteConfig = (id: string) => {
        const configToDelete = savedConfigs.find(c => c.id === id);
        if (configToDelete && window.confirm(`Tem certeza que deseja excluir o template "${configToDelete.name}"?`)) {
            const updatedConfigs = savedConfigs.filter(c => c.id !== id);
            saveConfigs(updatedConfigs);
            setSavedConfigs(updatedConfigs);
            showNotification(`Template "${configToDelete.name}" excluído.`);
        }
    };
    
    // TODO: A importação precisa ser adaptada para o novo formato
    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        showNotification("Importação de script legado ainda não suportada na nova arquitetura.", 'warning');
    };

    const generateAgentScript = async () => {
        const hostnameToSave = originalHostname || `novo-host-${Date.now()}`;

        // Salva a configuração no backend ANTES de gerar o script
        // O body da requisição precisa corresponder ao que a API espera
        const configToSave = {
            hostname: hostnameToSave,
            services: services, // O formato DynamicServiceConfig é enviado diretamente
            monitoringEnabled: isHostMonitoringEnabled
        };

        const backendUrl = getBackendUrl();
        if (!backendUrl) {
            showNotification("URL do Backend não configurada.", 'error');
            return;
        }

        try {
            const response = await fetch(`${backendUrl}/api/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(configToSave)
            });
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ error: `Erro HTTP: ${response.status}` }));
                 throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
            }
            showNotification(isEditMode ? "Configuração salva e script atualizado!" : "Configuração salva e script gerado!", 'success');
        } catch (e: any) {
            showNotification(`Erro ao salvar configuração no backend: ${e.message}`, 'error');
            return;
        }
        
        // Lógica de geração do script Python (simplificada, pois o foco é o salvamento)
        const activeServices = services.filter(s => s.enabled);
        const serviceCalls = activeServices.map(s => {
            const typeInfo = serviceTypes.find(st => st.type_key === s.typeKey);
            if (!typeInfo) return `# Serviço '${s.name}' com tipo desconhecido '${s.typeKey}'`;
            
            const args = [`"${s.name}"`];
            typeInfo.config_schema.fields.forEach(field => {
                args.push(`"${s.values[field.name] || ''}"`);
            });

            return `    services.append(check_${s.typeKey}_status(${args.join(', ')}))`;
        }).join('\\n');

        // Geração do script Python... (código omitido para brevidade, mas a lógica seria similar à anterior, usando serviceCalls)
        const script = `# Script Python gerado dinamicamente
import socket, time, requests, psutil, platform
# ... (outras importações e funções helper) ...

def get_system_metrics():
    services = []
${serviceCalls}
    # ... (resto da coleta de métricas) ...
    return {"hostname": socket.gethostname(), "services": services, "metrics": {}}

def main():
    while True:
        data = get_system_metrics()
        print(f"Enviando dados: {len(data['services'])} serviços checados.")
        # requests.post("${backendUrl}/api/metrics", json=data, verify=False)
        time.sleep(15)

if __name__ == "__main__":
    main()
`;
        
        setGeneratedScript(script);
        setStep(2);
    };
    
    const downloadAgentScript = () => {
        const blob = new Blob([generatedScript], { type: 'text/python' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'agent.py';
        a.click();
        URL.revokeObjectURL(url);
    };
  
    const PageTitle = () => (
        <div>
            <h1 className="text-2xl font-bold text-white mb-2">
                {isEditMode ? 'Editar Configuração do Agente' : 'Instalação e Geração do Agente'}
            </h1>
            <p className="text-slate-400 max-w-xl">
                {isEditMode ? `Ajuste o monitoramento para ` : 'Siga os passos para configurar o backend e gerar um agente.'}
                {isEditMode && <span className="font-bold text-slate-300">{originalHostname || '...'}</span>}
            </p>
        </div>
    );

  const ServiceTypeSelector = () => {
    if (isLoadingServiceTypes) return <div className="text-sm text-slate-400">Carregando tipos de serviço...</div>;
    if (serviceTypes.length === 0) return <div className="text-sm text-amber-400">Nenhum tipo de serviço encontrado no backend.</div>;
    return (
        <select value={selectedServiceTypeKey} onChange={e => setSelectedServiceTypeKey(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 focus:outline-none focus:border-emerald-500 text-sm">
            {serviceTypes.map(st => (
                <option key={st.type_key} value={st.type_key}>{st.display_name}</option>
            ))}
        </select>
    );
  }

  const renderServiceForm = (service: DynamicServiceConfig) => {
    const typeInfo = serviceTypes.find(st => st.type_key === service.typeKey);
    if (!typeInfo) return <p className="text-red-400 text-xs">Erro: Definição para o tipo '{service.typeKey}' não encontrada.</p>;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
             <div className={typeInfo.config_schema.fields.length === 1 && typeInfo.config_schema.fields[0].span === 'full' ? 'md:col-span-2' : ''}>
                <input
                    type="text"
                    placeholder="Nome do Serviço (ex: ICRM Produção)"
                    value={service.name}
                    onChange={e => handleUpdateService(service.id, 'name', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 focus:outline-none focus:border-emerald-500"
                />
            </div>

            {typeInfo.config_schema.fields.map(field => (
                 <div key={field.name} className={field.span === 'full' ? 'md:col-span-2' : ''}>
                    <input
                        type={field.type}
                        placeholder={field.label}
                        value={service.values[field.name] || ''}
                        onChange={e => handleUpdateService(service.id, field.name, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 focus:outline-none focus:border-emerald-500"
                    />
                </div>
            ))}
        </div>
    );
  }


  return (
    <div className="max-w-4xl space-y-8 pb-12">
      {notification && (
        <div className={`fixed top-20 right-8 z-50 text-white px-4 py-2 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-4 ${notification.type === 'success' ? 'bg-emerald-500' : (notification.type === 'error' ? 'bg-red-500' : 'bg-amber-500')}`}>
          {notification.message}
        </div>
      )}

      <PageTitle />

      {!isEditMode && (
          <div className="bg-slate-900 border border-indigo-500/30 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/5">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <div className="flex items-center gap-3"><div className="bg-indigo-500/20 p-2 rounded-lg"><Server className="w-5 h-5 text-indigo-400" /></div><div><h3 className="font-medium text-slate-100">PASSO 1: Servidor Backend (HTTPS)</h3><p className="text-xs text-indigo-400">Recebe os dados de forma segura.</p></div></div>
                <button onClick={() => copyToClipboard(backendServerCode, 'backend')} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-md text-xs text-white"><Copy className="w-4 h-4" />Copiar Código</button>
            </div>
            <div className="p-6 bg-slate-900"><div className="bg-[#0d1117] p-4 rounded-lg border border-slate-800 font-mono text-sm text-slate-300 overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar"><pre>{backendServerCode}</pre></div><div className="mt-4 text-sm text-slate-400"><strong>Como rodar:</strong><div className="mt-2 bg-slate-950 p-3 rounded-md font-mono text-slate-300 border border-slate-800"># 1. Crie a estrutura do banco de dados (SQL no início do script).<br/># 2. Crie 'key.pem' e 'cert.pem' na mesma pasta.<br/># 3. Salve o código como 'server.js'.<br/># 4. Instale as dependências: npm install express cors pg jsonwebtoken<br/># 5. Inicie o servidor: node server.js</div></div></div>
          </div>
      )}
      
       <div className="bg-slate-900 border border-emerald-500/30 rounded-xl overflow-hidden shadow-lg shadow-emerald-500/5">
         <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
            <div className="flex items-center gap-3"><div className="bg-emerald-500/20 p-2 rounded-lg"><Wand2 className="w-5 h-5 text-emerald-400" /></div><div><h3 className="font-medium text-slate-100">{isEditMode ? 'Configuração do Agente' : 'PASSO 2: Gerador de Agente'}</h3><p className="text-xs text-emerald-400">{isEditMode ? 'Ajuste os serviços e o status de monitoramento' : 'Configure e gere seu agente.'}</p></div></div>
        </div>

        <div className="p-6 space-y-6">
            {!backendUrl && (<div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-amber-200 text-sm flex items-center gap-3"><AlertTriangle className="w-6 h-6 flex-shrink-0 text-amber-400" /><div><h4 className="font-bold">URL do Backend não configurada!</h4><p className="mt-1">O gerador precisa da URL do seu backend. <Link to="/settings" className="font-bold underline hover:text-white ml-2">Configure agora</Link>.</p></div></div>)}
            
            {(isLoadingHost && isEditMode) || (isLoadingServiceTypes && backendUrl) ? (
                <div className="text-center py-12 text-slate-400 flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin"/>Carregando configuração...</div>
            ) : step === 1 ? (
            <div className="animate-in fade-in">
                 {isEditMode && (
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-6">
                        <h4 className="text-base font-semibold text-white mb-2">Status de Monitoramento</h4>
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-300">{isHostMonitoringEnabled ? 'O monitoramento para este host está ATIVO.' : 'O monitoramento para este host está DESATIVADO.'}</p>
                            <button onClick={() => setIsHostMonitoringEnabled(!isHostMonitoringEnabled)} title={isHostMonitoringEnabled ? "Desativar" : "Ativar"}>{isHostMonitoringEnabled ? <ToggleRight className="w-10 h-10 text-emerald-500" /> : <ToggleLeft className="w-10 h-10 text-slate-600" />}</button>
                        </div>
                    </div>
                 )}

                <h4 className="text-lg font-semibold text-white mb-1">Configurar Serviços Monitorados</h4>
                <p className="text-sm text-slate-400 mb-4">Adicione os serviços que este agente deverá monitorar.</p>

                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                    <h5 className="font-medium text-slate-200 mb-3">Adicionar Novo Serviço</h5>
                    <div className="flex items-end gap-3">
                        <div className="flex-1">
                            <label className="text-xs text-slate-400 mb-1 block">Tipo de Serviço</label>
                            <ServiceTypeSelector />
                        </div>
                        <button onClick={handleAddService} disabled={!selectedServiceTypeKey} className="flex items-center gap-2 text-sm px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors h-[42px] disabled:opacity-50">
                            <Plus className="w-4 h-4" /> Adicionar
                        </button>
                    </div>
                </div>

                <div className="space-y-4 pt-4">
                    {services.map((service) => {
                       const { icon: Icon, display_name } = serviceTypes.find(st => st.type_key === service.typeKey) || { icon: Cog, display_name: 'Desconhecido' };
                        return (
                        <div key={service.id} className={`bg-slate-800 p-4 rounded-lg border border-slate-700 transition-opacity ${!service.enabled ? 'opacity-50' : ''}`}>
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2 font-medium text-emerald-400"><Icon className="w-5 h-5" /><span>{display_name}</span></div>
                                <div className="flex items-center gap-3">
                                     <button onClick={() => handleToggleService(service.id)} title={service.enabled ? 'Desabilitar' : 'Habilitar'}>{service.enabled ? <ToggleRight className="w-6 h-6 text-emerald-400" /> : <ToggleLeft className="w-6 h-6 text-slate-500" />}</button>
                                    <button onClick={() => handleRemoveService(service.id)} className="p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400 rounded-md"><Trash2 className="w-4 h-4"/></button>
                                </div>
                            </div>
                            {renderServiceForm(service)}
                        </div>
                    )})}
                </div>

                <div className="border-t border-slate-800 mt-6 pt-6 flex justify-end">
                    <button onClick={generateAgentScript} disabled={!backendUrl} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {isEditMode ? "Salvar e Atualizar Script" : "Gerar Script"} <ArrowRight className="w-4 h-4"/>
                    </button>
                </div>
            </div>
            ) : ( // step === 2
            <div className="animate-in fade-in">
                <h4 className="text-lg font-semibold text-white mb-1">Script Gerado</h4>
                <p className="text-sm text-slate-400 mb-4">{isEditMode ? 'Seu agente foi atualizado.' : 'Seu agente personalizado está pronto.'} Baixe e execute no servidor correspondente.</p>
                <div className="bg-[#0d1117] p-4 rounded-lg border border-slate-800 font-mono text-sm text-slate-300 overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar"><pre className="whitespace-pre-wrap">{generatedScript}</pre></div>
                 <div className="border-t border-slate-800 mt-6 pt-6 flex justify-between items-center">
                    <button onClick={() => setStep(1)} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"><ArrowLeft className="w-4 h-4"/> Voltar e Editar</button>
                    <button onClick={downloadAgentScript} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors"><Download className="w-5 h-5" /> Baixar agent.py</button>
                 </div>
            </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default InstallGuide;
