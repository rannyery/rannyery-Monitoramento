import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, Terminal, Server, AlertTriangle, Database, PlugZap, Globe, FileText, Archive, Plus, Trash2, Download, Wand2, ArrowRight, ArrowLeft, Save as SaveIcon, Upload, ToggleLeft, ToggleRight, Cog } from 'lucide-react';
import { getBackendUrl, getHostById, saveAgentConfiguration } from '../services/mockData';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Host, MonitoredService, ServiceConfig, ServiceType, BaseServiceConfig, OracleConfig, WebServiceConfig, IpPortConfig, AgentConfig, ProcessConfig } from '../types';

// --- Tipos e Configurações ---
// Tipos foram movidos para types.ts

// Novo tipo para a configuração salva de templates
interface SavedAgentConfig {
  id: string;
  name: string;
  services: ServiceConfig[];
}


const serviceMetadata: Record<ServiceType, { label: string; icon: React.FC<any> }> = {
    oracle: { label: 'Banco de Dados Oracle', icon: Database },
    socket: { label: 'Conexão Socket', icon: PlugZap },
    webservice: { label: 'WebService (URL)', icon: Globe },
    report: { label: 'Serviço de Relatório', icon: FileText },
    registry: { label: 'Serviço de Registro', icon: Archive },
    process: { label: 'Processo (Executável)', icon: Cog },
};

const backendServerCode = `const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5077; // Porta padrão para o backend

// --- Carregamento dos Certificados SSL ---
// Este bloco é crítico para rodar o servidor em modo HTTPS.
let sslOptions = {};
try {
    const keyPath = path.join(__dirname, 'key.pem');
    const certPath = path.join(__dirname, 'cert.pem');
    
    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
        throw new Error("Arquivos 'key.pem' ou 'cert.pem' não encontrados. Gere-os e coloque na mesma pasta do servidor.");
    }

    sslOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    };
    console.log("✅ Certificados SSL carregados com sucesso.");

} catch (error) {
    console.error("❌ ERRO CRÍTICO AO CARREGAR CERTIFICADOS SSL:");
    console.error(error.message);
    console.error("O servidor não pode iniciar em modo HTTPS. Verifique seus arquivos .pem.");
    process.exit(1);
}

// --- Middlewares ---
// Log de requisições
app.use((req, res, next) => {
    console.log(\`[\${new Date().toLocaleTimeString()}] \${req.method} \${req.url} from \${req.ip}\`);
    next();
});
// Habilita CORS para permitir que o painel se conecte
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
// Habilita o parse de JSON no corpo das requisições
app.use(express.json());

// --- Armazenamento em memória ---
// Em um ambiente de produção, substitua isso por um banco de dados.
const activeHosts = {};

// --- Rotas da API ---
app.get('/', (req, res) => {
    res.send('✅ IntelliMonitor Backend está ONLINE (HTTPS)!');
});

// Recebe métricas dos agentes
app.post('/api/metrics', (req, res) => {
    const { hostname, os, metrics, ip, uptimeSeconds, services } = req.body;
    if (!hostname || !metrics) {
        return res.status(400).json({ error: 'Dados de métricas inválidos' });
    }
    
    const serviceCount = Array.isArray(services) ? services.length : 0;
    
    // Mantém configurações existentes se o host já existir
    const existingHost = activeHosts[hostname] || {};
    
    activeHosts[hostname] = {
        ...existingHost, // Preserva dados como 'agentConfig' que são definidos pela rota /api/config
        lastSeen: new Date(),
        os,
        ip,
        uptimeSeconds,
        latestMetrics: metrics,
        services: Array.isArray(services) ? services : []
    };
    
    console.log(\` -> Métricas de \${hostname} (\${os}): \${serviceCount} serviço(s) recebido(s).\`);
    res.json({ status: 'ok' });
});

// Recebe e salva a configuração do agente vinda do painel
app.post('/api/config', (req, res) => {
    const { hostname, services, monitoringEnabled } = req.body;
    if (!hostname) {
        return res.status(400).json({ error: 'Hostname é obrigatório' });
    }

    // Cria um registro para o host se ele for novo, para que a config seja salva
    // antes mesmo do primeiro reporte do agente.
    if (!activeHosts[hostname]) {
        console.log(\`Criando placeholder de configuração para o novo host: \${hostname}\`);
        activeHosts[hostname] = {};
    }

    activeHosts[hostname].agentConfig = { services, monitoringEnabled };
    console.log(\` -> Configuração do agente para \${hostname} foi atualizada.\`);
    res.json({ status: 'ok', message: 'Configuração salva com sucesso.' });
});

// Envia a lista de todos os hosts para o painel
app.get('/api/hosts', (req, res) => {
    res.json(activeHosts);
});

// --- Inicia o servidor ---
https.createServer(sslOptions, app).listen(PORT, '0.0.0.0', () => {
    console.log(\`\\n🚀 Backend SEGURO (HTTPS) rodando na porta \${PORT}!\`);
    console.log("------------------------------------------------------------------");
    console.log("Lembre-se de usar 'https' no endereço do backend no painel e nos agentes.");
    console.log(\`Exemplo de URL do backend: https://SEU_IP_PUBLICO:\${PORT}\`);
    console.log("------------------------------------------------------------------\\n");
});
`;

// --- Funções de Persistência (Templates) ---
const getSavedConfigs = (): SavedAgentConfig[] => {
    try {
        const stored = localStorage.getItem('intelli_agent_configs');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Falha ao ler configurações salvas:", e);
        return [];
    }
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
    const [services, setServices] = useState<ServiceConfig[]>([]);
    const [newServiceType, setNewServiceType] = useState<ServiceType>('oracle');
    const [backendUrl, setBackendUrl] = useState('');
    const [generatedScript, setGeneratedScript] = useState('');
    
    // Estados para gerenciamento de config (templates)
    const [savedConfigs, setSavedConfigs] = useState<SavedAgentConfig[]>([]);
    const [configName, setConfigName] = useState('');
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'warning' } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Estados para modo de edição
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
        
        if (isEditMode && hostId) {
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
                
                // Prioriza a configuração vinda do backend
                if (hostData.agentConfig) {
                    setServices(hostData.agentConfig.services);
                    setIsHostMonitoringEnabled(hostData.agentConfig.monitoringEnabled);
                    showNotification("Configuração carregada do backend.", 'success');
                } else {
                    // Fallback para conversão de dados se não houver config salva
                    showNotification("Configuração de agente não encontrada no backend. Preencha os detalhes.", 'warning');
                    
                    setIsHostMonitoringEnabled(hostData.monitoringEnabled !== false);
                     const convertedServices: ServiceConfig[] = hostData.services.map((s: MonitoredService) => {
                        const base: BaseServiceConfig = {
                            id: `s-${Math.random().toString(36).substr(2, 9)}`,
                            name: s.name,
                            enabled: s.enabled !== false,
                        };

                        if (s.type === 'database') {
                            return { 
                                ...base, 
                                type: 'oracle', 
                                oracleUser: '', 
                                oraclePassword: '', 
                                tnsName: '' 
                            } as OracleConfig;
                        }

                        const nameLower = s.name.toLowerCase();
                        const detailsLower = s.details?.toLowerCase() || '';

                        if (nameLower.includes('webservice') || detailsLower.includes('http')) {
                            return { ...base, type: 'webservice', url: '', clientId: '', clientSecret: '' } as WebServiceConfig;
                        }
                        if (nameLower.includes('report')) {
                            return { ...base, type: 'report', ip: '', port: '' } as IpPortConfig;
                        }
                        if (nameLower.includes('registry')) {
                            return { ...base, type: 'registry', ip: '', port: '' } as IpPortConfig;
                        }
                        
                        return { ...base, type: 'socket', ip: '', port: '' } as IpPortConfig;
                    });
                    setServices(convertedServices);
                }
                setIsLoadingHost(false);
            };
            loadHostData();
        }

    }, [hostId, isEditMode, navigate]);
    

    const copyToClipboard = (text: string, section: string) => {
        navigator.clipboard.writeText(text);
        setCopiedSection(section);
        setTimeout(() => setCopiedSection(null), 2000);
    };

    const handleAddService = () => {
        const baseService: BaseServiceConfig = { 
            id: `s-${Date.now()}`, 
            name: `${serviceMetadata[newServiceType].label} ${services.filter(s => s.type === newServiceType).length + 1}`,
            enabled: true 
        };
        let newService: ServiceConfig;

        switch (newServiceType) {
            case 'oracle':
                newService = { ...baseService, type: 'oracle', oracleUser: '', oraclePassword: '', tnsName: '' };
                break;
            case 'webservice':
                newService = { ...baseService, type: 'webservice', url: '', clientId: '', clientSecret: '' };
                break;
            case 'process':
                newService = { ...baseService, type: 'process', processName: '' };
                break;
            case 'socket':
            case 'report':
            case 'registry':
                newService = { ...baseService, type: newServiceType, ip: '', port: '' };
                break;
        }
        setServices([...services, newService]);
    };
    
    const handleUpdateService = (id: string, field: string, value: string | boolean) => {
        setServices(services.map(s => s.id === id ? { ...s, [field]: value } : s));
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
            // Atualiza configuração existente
             if (window.confirm(`Já existe um template com o nome "${configName}". Deseja sobrescrevê-lo?`)) {
                existingConfigs[existingIndex].services = services;
                saveConfigs(existingConfigs);
                setSavedConfigs(existingConfigs);
                showNotification(`Template "${configName}" atualizado com sucesso!`);
             }
        } else {
            // Salva nova configuração
            const newConfig: SavedAgentConfig = {
                id: `c-${Date.now()}`,
                name: configName.trim(),
                services: services
            };
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
            setConfigName(configToLoad.name); // Preenche o nome para facilitar a atualização
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
    
    const parseAgentScript = (scriptContent: string): ServiceConfig[] | null => {
        const importedServices: ServiceConfig[] = [];
        
        const oracleRegex = /check_oracle_status\("([^"]+)", "([^"]*)", "([^"]*)", "([^"]*)"/g;
        const socketRegex = /check_socket_status\("([^"]+)", "([^"]*)", "([^"]*)"\)/g;
        const webserviceRegex = /check_webservice_status\("([^"]+)", "([^"]*)", "([^"]*)", "([^"]*)"\)/g;
        const processRegex = /check_process_status\("([^"]+)", "([^"]*)"\)/g;

        let match;
        
        while((match = oracleRegex.exec(scriptContent)) !== null) {
            importedServices.push({
                id: `s-imp-${Date.now()}-${importedServices.length}`, type: 'oracle', enabled: true,
                name: match[1], oracleUser: match[2], oraclePassword: match[3], tnsName: match[4]
            });
        }
        
        while((match = webserviceRegex.exec(scriptContent)) !== null) {
            importedServices.push({
                id: `s-imp-${Date.now()}-${importedServices.length}`, type: 'webservice', enabled: true,
                name: match[1], url: match[2], clientId: match[3], clientSecret: match[4]
            });
        }

        while((match = socketRegex.exec(scriptContent)) !== null) {
            // Precisamos inferir o tipo original. Não é perfeito, mas podemos usar o nome.
            const name = match[1].toLowerCase();
            let type: 'socket' | 'report' | 'registry' = 'socket';
            if (name.includes('report')) type = 'report';
            else if (name.includes('registry')) type = 'registry';
            
            importedServices.push({
                id: `s-imp-${Date.now()}-${importedServices.length}`, type, enabled: true,
                name: match[1], ip: match[2], port: match[3]
            });
        }

        while((match = processRegex.exec(scriptContent)) !== null) {
            importedServices.push({
                id: `s-imp-${Date.now()}-${importedServices.length}`, type: 'process', enabled: true,
                name: match[1], processName: match[2]
            });
        }

        return importedServices.length > 0 ? importedServices : null;
    };
    
    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (content) {
                const parsedServices = parseAgentScript(content);
                if (parsedServices) {
                    setServices(parsedServices);
                    showNotification(`${parsedServices.length} serviço(s) importado(s) com sucesso!`);
                    setConfigName(`Importado de ${file.name}`);
                } else {
                    showNotification("Nenhuma configuração de serviço válida encontrada no arquivo.", 'error');
                }
            }
        };
        reader.onerror = () => {
            showNotification("Erro ao ler o arquivo.", 'error');
        };
        reader.readAsText(file);
        
        // Limpa o valor do input para permitir re-selecionar o mesmo arquivo
        event.target.value = '';
    };

    const generateAgentScript = async () => {
        const hostnameToSave = originalHostname || `novo-host-${Date.now()}`;

        if (!isHostMonitoringEnabled) {
            const disabledScript = `import time
import socket

def main():
    hostname = socket.gethostname()
    print("--- IntelliMonitor Agent ---")
    print(f"Host: {hostname}")
    print("MONITORAMENTO DESABILITADO PARA ESTE HOST.")
    print("O agente permanecerá inativo. Para reativar, gere um novo script no painel.")
    while True:
        time.sleep(3600) # Dorme por uma hora

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\\nAgente interrompido pelo usuário.")
    finally:
        input("Pressione ENTER para fechar a janela...")
`;
            if (isEditMode) {
                const config = { services, monitoringEnabled: isHostMonitoringEnabled };
                const result = await saveAgentConfiguration(hostnameToSave, config);
                if(result.success) {
                    showNotification("Configuração (desativada) salva no backend!", 'success');
                } else {
                    showNotification(`Erro ao salvar no backend: ${result.message}`, 'error');
                }
            }
            setGeneratedScript(disabledScript);
            setStep(2);
            return;
        }

        const activeServices = services.filter(s => s.enabled);
        const serviceTypes = new Set(activeServices.map(s => s.type));
        const hasOracle = serviceTypes.has('oracle');
        const hasSocket = serviceTypes.has('socket') || serviceTypes.has('report') || serviceTypes.has('registry');
        const hasWebService = serviceTypes.has('webservice');
        const hasProcess = serviceTypes.has('process');

        const imports = `import time
import psutil
import requests
import platform
import socket
import os
import urllib3${hasOracle ? `
import oracledb` : ''}`;
        
        const oracleInit = hasOracle ? `
# --- Globais ---
ORACLE_CLIENT_INITIALIZED = False
TNS_ADMIN_PATH = None
ORACLE_CONNECTIONS = {} # Dicionário para manter conexões persistentes

# --- Inicialização do Oracle Client ---
def initialize_oracle_client():
    global ORACLE_CLIENT_INITIALIZED, TNS_ADMIN_PATH
    
    if platform.system() != "Windows":
        try:
            oracledb.init_oracle_client()
            print("INFO: Oracle Client inicializado (Linux/Outros).")
            ORACLE_CLIENT_INITIALIZED = True
        except Exception as e:
            print(f"AVISO: Falha ao inicializar Oracle Client: {e}. Usando modo Thin.")
        return

    try:
        if oracledb.thick_mode():
            print("INFO: Modo Thick do Oracle Client já está ativo.")
            ORACLE_CLIENT_INITIALIZED = True
            return
    except Exception:
        pass

    print("INFO: Procurando por Oracle Client e TNS_ADMIN em 'C:\\\\app'...")
    search_root = 'C:\\\\app'
    potential_clients = []
    
    if os.path.isdir(search_root):
        for root, _, files in os.walk(search_root):
            if TNS_ADMIN_PATH is None:
                for f in files:
                    if f.lower() == 'tnsnames.ora':
                        TNS_ADMIN_PATH = root
                        os.environ['TNS_ADMIN'] = TNS_ADMIN_PATH
                        print(f" -> TNS_ADMIN encontrado em: {TNS_ADMIN_PATH}")
                        break
            if 'oci.dll' in files:
                potential_clients.append(root)

    for client_path in potential_clients:
        if ORACLE_CLIENT_INITIALIZED: break
        print(f" -> Testando client em: {client_path}")
        try:
            oracledb.init_oracle_client(lib_dir=client_path)
            print("✅ SUCESSO: Client compatível encontrado. Usando modo Thick.")
            ORACLE_CLIENT_INITIALIZED = True
            break
        except oracledb.DatabaseError as e_init:
            error, = e_init.args
            if hasattr(error, "message") and "DPY-1002" in error.message:
                print(" -> AVISO: Re-inicialização detectada. Usuando instância já ativa.")
                ORACLE_CLIENT_INITIALIZED = True
                break
            if hasattr(error, "message") and "DPI-1047" in error.message:
                print(" -> AVISO DE ARQUITETURA: Client incompatível. Procurando outro...")
                continue
            print(f" -> AVISO: Falha ao usar client: {getattr(error,'message', str(error))}")
        except Exception as e_generic:
            print(f" -> AVISO: Erro inesperado ao testar client: {e_generic}")
    
    if not ORACLE_CLIENT_INITIALIZED:
        print("AVISO: Nenhum client compatível encontrado em 'C:\\\\app'. Tentando via PATH...")
        try:
            oracledb.init_oracle_client()
            print("✅ SUCESSO: Oracle Client inicializado via PATH.")
            ORACLE_CLIENT_INITIALIZED = True
        except oracledb.DatabaseError as e:
            error, = e.args
            msg = "ERRO"
            if hasattr(error, "message") and "DPI-1047" in error.message:
                msg = "ERRO DE ARQUITETURA"
            print(f"❌ {msg}: Falha na inicialização via PATH: {getattr(error,'message', str(error)).strip()}")
        except Exception as e:
            print(f"❌ ERRO INESPERADO na inicialização via PATH: {e}")

    if ORACLE_CLIENT_INITIALIZED:
        print("--- Resumo: Modo Thick ATIVO ---")
    else:
        print("--- Resumo: Modo Thin SERÁ USADO ---")
        if TNS_ADMIN_PATH:
            print(f"   -> Usando tnsnames.ora de: {TNS_ADMIN_PATH}")
        else:
            print("   -> AVISO: Nenhum tnsnames.ora foi encontrado. Conexões via TNS podem falhar.")

initialize_oracle_client()
` : '';

        const oracleFunction = hasOracle ? `
def check_oracle_status(db_name, user, password, dsn, use_persistent=False):
    """
    Versão robusta: por segurança, realiza uma conexão rápida (curta vida)
    para verificar disponibilidade. Se use_persistent=True, tenta ping/validar
    conexão persistente antes de realizar nova conexão.
    """
    global ORACLE_CLIENT_INITIALIZED, TNS_ADMIN_PATH, ORACLE_CONNECTIONS
    status_dict = {"name": db_name, "type": "database", "status": "failed", "details": "Configuração incompleta."}

    if not all([user, password, dsn]):
        status_dict["details"] = "Parâmetros de conexão incompletos."
        return status_dict

    # Se habilitar persistente, tente validar rapidamente
    if use_persistent and db_name in ORACLE_CONNECTIONS:
        conn = ORACLE_CONNECTIONS[db_name]
        try:
            # try ping() if available — é rápido e evita re-open
            if hasattr(conn, "ping"):
                conn.ping()
            else:
                # fallback: execução simples com timeout curto via atributo de conexão
                with conn.cursor() as cur:
                    cur.execute("SELECT 1 FROM DUAL")
                    cur.fetchone()
            status_dict["status"] = "active"
            status_dict["details"] = "Conexão persistente ativa."
            return status_dict
        except Exception as e:
            # Conexão persistente inválida -> remove e prossegue para nova tentativa
            try:
                conn.close()
            except Exception:
                pass
            del ORACLE_CONNECTIONS[db_name]
            print(f"AVISO: Conexão persistente '{db_name}' inválida: {e}. Tentando reconectar (curta).")

    # --- Sempre tentamos uma conexão curta (fast-check) ---
    connect_params = {
        "user": user,
        "password": password,
        "dsn": dsn,
        # TCP connect timeout evita longos bloqueios ao tentar conectar
        "tcp_connect_timeout": 5
    }
    # Se estiver em modo Thin e houver tnsnames.ora disponível
    if not ORACLE_CLIENT_INITIALIZED and TNS_ADMIN_PATH:
        connect_params["config_dir"] = TNS_ADMIN_PATH

    try:
        # Abre uma conexão curta para checagem; fecha logo depois
        # Isso detecta ORA-12154 e outras falhas rapidamente
        new_conn = oracledb.connect(**connect_params)
        try:
            with new_conn.cursor() as cur:
                cur.execute("SELECT 1 FROM DUAL")
                cur.fetchone()
            status_dict["status"] = "active"
            status_dict["details"] = "Conexão estabelecida e verificada (short-lived)."
            # Opcional: manter persistente para reuso (se use_persistent True)
            if use_persistent:
                ORACLE_CONNECTIONS[db_name] = new_conn
            else:
                try:
                    new_conn.close()
                except Exception:
                    pass
        except Exception as e:
            # Query falhou mesmo com conexão -> marca como falha
            try:
                new_conn.close()
            except Exception:
                pass
            raise
    except oracledb.DatabaseError as e:
        # Extrai detalhes do erro Oracle com segurança
        try:
            error, = e.args
            code = getattr(error, "code", None)
            message = getattr(error, "message", str(error)).replace("\\n", " ").strip()
        except Exception:
            code = None
            message = str(e)
        # Mensagens claras para o backend
        if code == 12154 or "ORA-12154" in message:
            status_dict["details"] = f"ORA-12154: TNS name not resolved. {message}"
        else:
            status_dict["details"] = f"Oracle Error {code if code else ''}: {message}"
    except Exception as e:
        status_dict["details"] = f"Erro inesperado ao conectar: {str(e)}"

    return status_dict
` : '';

        const socketFunction = hasSocket ? `
def check_socket_status(service_name, ip, port):
    """Tenta conectar a um IP e Porta e retorna um dicionário de status."""
    status_dict = { "name": service_name, "type": "service", "status": "failed", "details": "Configuração incompleta." }
    if not all([ip, port]): return status_dict
    try:
        port_num = int(port)
        with socket.create_connection((ip, port_num), timeout=5):
            status_dict["status"] = "active"
            status_dict["details"] = f"Conexão bem-sucedida com {ip}:{port}"
    except socket.timeout:
        status_dict["details"] = f"Falha: Timeout ao conectar em {ip}:{port}"
    except ConnectionRefusedError:
        status_dict["details"] = f"Falha: Conexão recusada por {ip}:{port}"
    except Exception as e:
        status_dict["details"] = f"Erro: {str(e)}"
    return status_dict
` : '';

        const webServiceFunction = hasWebService ? `
def check_webservice_status(service_name, url, client_id, client_secret):
    """Verifica o status de uma URL e retorna um dicionário."""
    status_dict = { "name": service_name, "type": "service", "status": "failed", "details": "URL não configurada." }
    if not url: return status_dict
    headers = {}
    if client_id: headers['X-Client-ID'] = client_id
    if client_secret: headers['X-Client-Secret'] = client_secret
    try:
        response = requests.get(url, headers=headers, timeout=10, verify=False)
        if 200 <= response.status_code < 400:
            status_dict["status"] = "active"
            status_dict["details"] = f"Sucesso (HTTP {response.status_code})"
        else:
            status_dict["details"] = f"Falha (HTTP {response.status_code})"
    except requests.exceptions.RequestException as e:
        status_dict["details"] = f"Erro de conexão: {str(e).split(')')[0])}"
    return status_dict
` : '';
        
        const processFunction = hasProcess ? `
def check_process_status(service_name, process_name):
    """Verifica se um processo está em execução pelo nome do executável."""
    status_dict = { "name": service_name, "type": "service", "status": "failed", "details": f"Processo '{process_name}' não encontrado." }
    if not process_name:
        status_dict["details"] = "Nome do processo não configurado."
        return status_dict

    process_name_lower = process_name.lower()
    is_running = any(p.name().lower() == process_name_lower for p in psutil.process_iter(['name']))

    if is_running:
        status_dict["status"] = "active"
        status_dict["details"] = f"Processo '{process_name}' está em execução."
    
    return status_dict
` : '';

        const serviceChecks = activeServices.map(s => {
            const safeId = s.id.replace(/-/g, '_');
            switch (s.type) {
                case 'oracle':
                    // A nova função tem um parâmetro 'use_persistent'. O padrão é False, que é mais seguro.
                    return `    services.append(check_oracle_status("${s.name}", "${s.oracleUser}", "${s.oraclePassword}", "${(s as OracleConfig).tnsName}", use_persistent=False))`;
                case 'webservice':
                    return `    services.append(check_webservice_status("${s.name}", "${s.url}", "${s.clientId}", "${s.clientSecret}"))`;
                case 'process':
                    return `    services.append(check_process_status("${s.name}", "${(s as ProcessConfig).processName}"))`;
                case 'socket':
                case 'report':
                case 'registry':
                     return `    services.append(check_socket_status("${s.name}", "${s.ip}", "${s.port}"))`;
            }
            return '';
        }).join('\n');

        const script = `${imports}
${oracleInit}
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# --- CONFIGURAÇÃO ---
API_URL = "${backendUrl}/api/metrics"
HOST_TOKEN = "token-secreto-do-host-123"
INTERVAL = 15
${oracleFunction}${socketFunction}${webServiceFunction}${processFunction}

def get_host_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

def get_system_metrics():
    cpu_samples = [psutil.cpu_percent(interval=0.1) for _ in range(5)]
    cpu_percent = sum(cpu_samples) / len(cpu_samples)
    vm = psutil.virtual_memory()
    memory_percent = vm.percent
    
    disk_path = 'C:\\\\' if platform.system() == 'Windows' else '/'
    try:
        disk = psutil.disk_usage(disk_path)
        disk_used = round(disk.used / (1024**3), 2)
        disk_total = round(disk.total / (1024**3), 2)
    except Exception:
        disk_used, disk_total = 0, 0
    
    net_io = psutil.net_io_counters()
    sent_mb = round(net_io.bytes_sent / (1024**2), 2)
    recv_mb = round(net_io.bytes_recv / (1024**2), 2)
    uptime_seconds = int(time.time() - psutil.boot_time())

    services = []
${serviceChecks}

    return {
        "hostname": socket.gethostname(), "ip": get_host_ip(), "os": platform.system().lower(),
        "uptimeSeconds": uptime_seconds, "token": HOST_TOKEN, "timestamp": int(time.time() * 1000),
        "services": [s for s in services if s is not None],
        "metrics": {
            "cpu": cpu_percent, "memory": memory_percent, "disk_used_gb": disk_used,
            "disk_total_gb": disk_total, "net_sent_mb": sent_mb, "net_recv_mb": recv_mb
        }
    }

def cleanup_connections():
    global ORACLE_CONNECTIONS
    print("\\nEncerrando conexões persistentes...")
    for db_name, connection in ORACLE_CONNECTIONS.items():
        try:
            connection.close()
            print(f" -> Conexão com '{db_name}' fechada.")
        except Exception as e:
            print(f" -> Erro ao fechar conexão com '{db_name}': {e}")
    ORACLE_CONNECTIONS = {}

def main():
    print("--- IntelliMonitor Agent (HTTPS) ---")
    print(f"Host: {socket.gethostname()}")
    print(f"Alvo: {API_URL}")
    print("Iniciando coleta...")
    
    while True:
        loop_start_time = time.time()
        try:
            data = get_system_metrics()
            print(f"Enviando métricas... CPU: {data['metrics']['cpu']:.1f}% | MEM: {data['metrics']['memory']:.1f}% | Serviços: {len(data['services'])}")
            response = requests.post(API_URL, json=data, timeout=10, verify=False)
            if response.status_code == 200:
                print(" -> Sucesso: Recebido pelo backend.")
            else:
                print(f" -> Erro do Backend: {response.status_code} - {response.text}")
        except requests.exceptions.ConnectionError:
             print(f" -> ERRO DE CONEXÃO: Não foi possível contatar {API_URL}")
        except Exception as e:
            print(f" -> Erro inesperado: {e}")
        finally:
            elapsed_time = time.time() - loop_start_time
            sleep_duration = max(0, INTERVAL - elapsed_time)
            time.sleep(sleep_duration)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\\nAgente interrompido pelo usuário.")
    except Exception as e:
        import traceback
        print("\\n" + "="*60)
        print("❌ OCORREU UM ERRO FATAL E O AGENTE FOI ENCERRADO ❌")
        print("="*60)
        print("Por favor, verifique a mensagem de erro abaixo:")
        traceback.print_exc()
        print("="*60)
    finally:
        cleanup_connections()
        try:
            input("Pressione ENTER para fechar a janela...")
        except Exception:
            pass
`;
        
        if (isEditMode) {
            const config = { services, monitoringEnabled: isHostMonitoringEnabled };
            const result = await saveAgentConfiguration(hostnameToSave, config);
            
            if (result.success) {
                showNotification("Configuração salva no backend e script atualizado!", 'success');
            } else {
                showNotification(`Erro ao salvar no backend: ${result.message}`, 'error');
            }
        }

        setGeneratedScript(script);
        setStep(2);
    };
    
    const downloadAgentScript = () => {
        const blob = new Blob([generatedScript], { type: 'text/python' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'agent.py';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
  
  const PageTitle = () => {
     if (isEditMode) {
        return (
            <div>
                <h1 className="text-2xl font-bold text-white mb-2">Editar Configuração do Agente</h1>
                <p className="text-slate-400 max-w-xl">
                    Ajuste o monitoramento para <span className="font-bold text-slate-300">{originalHostname || '...'}</span>. As configurações são enviadas para o backend e usadas para gerar um novo script de agente para ser atualizado no servidor.
                </p>
            </div>
        )
     }
     return (
        <div>
            <h1 className="text-2xl font-bold text-white mb-2">Instalação e Geração do Agente</h1>
            <p className="text-slate-400">
            Siga os passos para configurar o backend e gerar um agente de monitoramento personalizado.
            </p>
        </div>
     );
  }


  return (
    <div className="max-w-4xl space-y-8 pb-12">
      {/* Notificação flutuante */}
      {notification && (
        <div className={`fixed top-20 right-8 z-50 text-white px-4 py-2 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-4 ${notification.type === 'success' ? 'bg-emerald-500' : (notification.type === 'error' ? 'bg-red-500' : 'bg-amber-500')}`}>
          {notification.message}
        </div>
      )}

      <PageTitle />

      {/* Step 1: Backend */}
      {!isEditMode && (
          <div className="bg-slate-900 border border-indigo-500/30 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/5">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-500/20 p-2 rounded-lg"><Server className="w-5 h-5 text-indigo-400" /></div>
                    <div>
                        <h3 className="font-medium text-slate-100">PASSO 1: Servidor Backend (HTTPS)</h3>
                        <p className="text-xs text-indigo-400">Recebe os dados de forma segura.</p>
                    </div>
                </div>
                <button onClick={() => copyToClipboard(backendServerCode, 'backend')} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-md text-xs text-white transition-colors">
                    {copiedSection === 'backend' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedSection === 'backend' ? 'Copiado!' : 'Copiar Código'}
                </button>
            </div>
            <div className="p-6 bg-slate-900">
                <div className="bg-[#0d1117] p-4 rounded-lg border border-slate-800 font-mono text-sm text-slate-300 overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                <pre>{backendServerCode}</pre>
                </div>
                <div className="mt-4 text-sm text-slate-400">
                    <strong>Como rodar:</strong>
                    <div className="mt-2 bg-slate-950 p-3 rounded-md font-mono text-slate-300 border border-slate-800">
                        # 1. Crie uma pasta, coloque 'key.pem' e 'cert.pem' nela.<br/>
                        # 2. Salve o código acima como 'server.js' na mesma pasta.<br/>
                        # 3. Instale as dependências: npm install express cors<br/>
                        # 4. Inicie o servidor seguro: node server.js
                    </div>
                </div>
            </div>
          </div>
      )}
      
      {/* Wizard do Agente */}
       <div className="bg-slate-900 border border-emerald-500/30 rounded-xl overflow-hidden shadow-lg shadow-emerald-500/5">
         <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
            <div className="flex items-center gap-3">
                <div className="bg-emerald-500/20 p-2 rounded-lg"><Wand2 className="w-5 h-5 text-emerald-400" /></div>
                <div>
                    <h3 className="font-medium text-slate-100">{isEditMode ? 'Configuração do Agente' : 'PASSO 2: Gerador de Agente Personalizado'}</h3>
                    <p className="text-xs text-emerald-400">{isEditMode ? 'Ajuste os serviços e o status de monitoramento' : 'Configure, gere e baixe seu agente.'}</p>
                </div>
            </div>
        </div>

        {/* Wizard Content */}
        <div className="p-6 space-y-6">
            {!backendUrl && (
                 <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-amber-200 text-sm flex items-center gap-3">
                     <AlertTriangle className="w-6 h-6 flex-shrink-0 text-amber-400" />
                     <div>
                        <h4 className="font-bold">URL do Backend não configurada!</h4>
                        <p className="mt-1">
                            O gerador precisa da URL do seu backend para funcionar. 
                            <Link to="/settings" className="font-bold underline hover:text-white ml-2">Configure agora</Link>.
                        </p>
                    </div>
                </div>
            )}
            
            {isLoadingHost && isEditMode ? (
                <div className="text-center py-12 text-slate-400">Carregando configuração do host...</div>
            ) : step === 1 ? (
            <div className="animate-in fade-in">
                {/* --- Seção de Gerenciamento de Configurações --- */}
                {!isEditMode && (
                     <div className="bg-slate-850 p-4 rounded-lg border border-slate-750 mb-6 space-y-4">
                        <h4 className="text-base font-semibold text-white">Gerenciar Templates de Configuração</h4>
                        
                        {/* Salvar/Atualizar/Importar */}
                        <div>
                            <h5 className="font-medium text-slate-200 mb-2 text-sm">Salvar ou Importar Template</h5>
                            <div className="flex items-stretch gap-3">
                                <input
                                    type="text"
                                    value={configName}
                                    onChange={(e) => setConfigName(e.target.value)}
                                    placeholder="Nome do Template (ex: Servidor WEB)"
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-md p-2 focus:outline-none focus:border-emerald-500 text-sm"
                                />
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileImport}
                                    accept=".py"
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2 text-sm px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors"
                                >
                                    <Upload className="w-4 h-4" /> Importar de agent.py
                                </button>
                                <button
                                    onClick={handleSaveConfig}
                                    disabled={!configName.trim()}
                                    className="flex items-center gap-2 text-sm px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
                                >
                                    <SaveIcon className="w-4 h-4" /> Salvar
                                </button>
                            </div>
                        </div>

                        {/* Carregar */}
                        <div>
                            <h5 className="font-medium text-slate-200 mb-2 text-sm">Carregar Template Salvo</h5>
                            {savedConfigs.length > 0 ? (
                                <div className="space-y-2">
                                    {savedConfigs.map(config => (
                                        <div key={config.id} className="flex justify-between items-center bg-slate-900 p-2 pl-4 rounded-md border border-slate-700/50">
                                            <div>
                                                <p className="font-medium text-slate-300">{config.name}</p>
                                                <p className="text-xs text-slate-500">{config.services.length} serviço(s)</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleLoadConfig(config.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600/50 hover:bg-emerald-600 text-white rounded-md transition-colors">
                                                    <Download className="w-3.5 h-3.5"/> Carregar
                                                </button>
                                                <button onClick={() => handleDeleteConfig(config.id)} className="p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400 rounded-md transition-colors">
                                                    <Trash2 className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 text-center py-2">Nenhum template salvo.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* --- Controle de Monitoramento do Host (Apenas Edit Mode) --- */}
                 {isEditMode && (
                    <div className="bg-slate-850 p-4 rounded-lg border border-slate-750 mb-6">
                        <h4 className="text-base font-semibold text-white mb-2">Status de Monitoramento</h4>
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-300">
                                {isHostMonitoringEnabled ? 'O monitoramento para este host está ATIVO.' : 'O monitoramento para este host está DESATIVADO.'}
                            </p>
                            <button onClick={() => setIsHostMonitoringEnabled(!isHostMonitoringEnabled)} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-full transition-colors" title={isHostMonitoringEnabled ? "Desativar" : "Ativar"}>
                                {isHostMonitoringEnabled ? 
                                    <ToggleRight className="w-10 h-10 text-emerald-500" /> : 
                                    <ToggleLeft className="w-10 h-10 text-slate-600" />
                                }
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Se desativado, o agente gerado ficará inativo e não enviará dados.
                        </p>
                    </div>
                 )}


                <h4 className="text-lg font-semibold text-white mb-1">Configurar Serviços Monitorados</h4>
                <p className="text-sm text-slate-400 mb-4">Adicione os serviços que este agente deverá monitorar.</p>

                {/* --- Add Service Form --- */}
                <div className="bg-slate-850 p-4 rounded-lg border border-slate-750">
                    <h5 className="font-medium text-slate-200 mb-3">Adicionar Novo Serviço</h5>
                    <div className="flex items-end gap-3">
                        <div className="flex-1">
                            <label className="text-xs text-slate-400 mb-1 block">Tipo de Serviço</label>
                            <select value={newServiceType} onChange={e => setNewServiceType(e.target.value as ServiceType)} className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 focus:outline-none focus:border-emerald-500 text-sm">
                                {Object.entries(serviceMetadata).map(([key, value]) => (
                                    <option key={key} value={key}>{value.label}</option>
                                ))}
                            </select>
                        </div>
                        <button onClick={handleAddService} className="flex items-center gap-2 text-sm px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors h-[42px]">
                            <Plus className="w-4 h-4" /> Adicionar
                        </button>
                    </div>
                </div>

                <div className="space-y-4 pt-4">
                    {services.map((service) => {
                       const { icon: Icon, label } = serviceMetadata[service.type];
                        return (
                        <div key={service.id} className={`bg-slate-850 p-4 rounded-lg border border-slate-700 transition-opacity ${!service.enabled ? 'opacity-50' : ''}`}>
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2 font-medium text-emerald-400">
                                    <Icon className="w-5 h-5" />
                                    <span>{label}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                     <button onClick={() => handleToggleService(service.id)} title={service.enabled ? 'Desabilitar Serviço' : 'Habilitar Serviço'}>
                                        {service.enabled ? <ToggleRight className="w-6 h-6 text-emerald-400" /> : <ToggleLeft className="w-6 h-6 text-slate-500" />}
                                    </button>
                                    <button onClick={() => handleRemoveService(service.id)} className="p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400 rounded-md">
                                        <Trash2 className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <input type="text" placeholder="Nome do Serviço (ex: ICRM)" value={service.name} onChange={e => handleUpdateService(service.id, 'name', e.target.value)} className="bg-slate-900 border border-slate-700 rounded-md p-2 focus:outline-none focus:border-emerald-500"/>
                                
                                {service.type === 'oracle' && <>
                                    <input type="text" placeholder="Usuário Oracle" value={(service as OracleConfig).oracleUser} onChange={e => handleUpdateService(service.id, 'oracleUser', e.target.value)} className="bg-slate-900 border border-slate-700 rounded-md p-2 focus:outline-none focus:border-emerald-500"/>
                                    <input type="password" placeholder="Senha Oracle" value={(service as OracleConfig).oraclePassword} onChange={e => handleUpdateService(service.id, 'oraclePassword', e.target.value)} className="bg-slate-900 border border-slate-700 rounded-md p-2 focus:outline-none focus:border-emerald-500"/>
                                    <input type="text" placeholder="Nome do TNS (do tnsnames.ora)" value={(service as OracleConfig).tnsName} onChange={e => handleUpdateService(service.id, 'tnsName', e.target.value)} className="bg-slate-900 border border-slate-700 rounded-md p-2 focus:outline-none focus:border-emerald-500"/>
                                </>}

                                {(service.type === 'socket' || service.type === 'report' || service.type === 'registry') && <>
                                    <input type="text" placeholder="Endereço IP" value={(service as IpPortConfig).ip} onChange={e => handleUpdateService(service.id, 'ip', e.target.value)} className="bg-slate-900 border border-slate-700 rounded-md p-2 focus:outline-none focus:border-emerald-500"/>
                                    <input type="text" placeholder="Porta" value={(service as IpPortConfig).port} onChange={e => handleUpdateService(service.id, 'port', e.target.value)} className="bg-slate-900 border border-slate-700 rounded-md p-2 focus:outline-none focus:border-emerald-500"/>
                                </>}
                                
                                {service.type === 'webservice' && <>
                                    <input type="text" placeholder="URL Completa" value={(service as WebServiceConfig).url} onChange={e => handleUpdateService(service.id, 'url', e.target.value)} className="md:col-span-2 bg-slate-900 border border-slate-700 rounded-md p-2 focus:outline-none focus:border-emerald-500"/>
                                    <input type="text" placeholder="Client ID (Opcional)" value={(service as WebServiceConfig).clientId} onChange={e => handleUpdateService(service.id, 'clientId', e.target.value)} className="bg-slate-900 border border-slate-700 rounded-md p-2 focus:outline-none focus:border-emerald-500"/>
                                    <input type="password" placeholder="Client Secret (Opcional)" value={(service as WebServiceConfig).clientSecret} onChange={e => handleUpdateService(service.id, 'clientSecret', e.target.value)} className="bg-slate-900 border border-slate-700 rounded-md p-2 focus:outline-none focus:border-emerald-500"/>
                                </>}

                                {service.type === 'process' && <>
                                    <input type="text" placeholder="Nome do Executável (ex: CRMSENDER.exe)" value={(service as ProcessConfig).processName} onChange={e => handleUpdateService(service.id, 'processName', e.target.value)} className="md:col-span-2 bg-slate-900 border border-slate-700 rounded-md p-2 focus:outline-none focus:border-emerald-500"/>
                                </>}
                            </div>
                        </div>
                    )})}
                </div>

                <div className="border-t border-slate-800 mt-6 pt-6 flex justify-end">
                    <button onClick={generateAgentScript} disabled={!backendUrl} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {isEditMode ? "Atualizar Script e Salvar" : "Gerar Script"} <ArrowRight className="w-4 h-4"/>
                    </button>
                </div>
            </div>
            ) : ( // step === 2
            <div className="animate-in fade-in">
                <h4 className="text-lg font-semibold text-white mb-1">Script Gerado</h4>
                <p className="text-sm text-slate-400 mb-4">{isEditMode ? 'Seu agente foi atualizado.' : 'Seu agente personalizado está pronto.'} Baixe e execute no servidor correspondente.</p>
                <div className="bg-[#0d1117] p-4 rounded-lg border border-slate-800 font-mono text-sm text-slate-300 overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                    <pre className="whitespace-pre-wrap">{generatedScript}</pre>
                </div>
                 <div className="border-t border-slate-800 mt-6 pt-6 flex justify-between items-center">
                    <button onClick={() => setStep(1)} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors">
                        <ArrowLeft className="w-4 h-4"/> Voltar e Editar
                    </button>
                    <button onClick={downloadAgentScript} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors">
                        <Download className="w-5 h-5" /> Baixar agent.py
                    </button>
                 </div>
            </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default InstallGuide;