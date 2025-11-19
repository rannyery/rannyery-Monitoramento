import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Server, Clock, Activity, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { getRefreshInterval } from '../services/mockData';
import { isAuthenticated } from '../services/authService';

const Settings: React.FC = () => {
    const [backendUrl, setBackendUrl] = useState('');
    const [refreshInterval, setRefreshInterval] = useState(5000);
    const [saved, setSaved] = useState(false);
    
    // Estados para teste de conexão
    const [testingConnection, setTestingConnection] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: React.ReactNode } | null>(null);
    
    const navigate = useNavigate();
    const isAuth = isAuthenticated();

    useEffect(() => {
        const storedUrl = localStorage.getItem('intelli_backend_url') || '';
        setBackendUrl(storedUrl);
        setRefreshInterval(getRefreshInterval());
    }, []);

    const handleSave = () => {
        let urlToSave = backendUrl.trim();
        // Garante que não tenha barra no final para manter padronização
        if (urlToSave.endsWith('/')) {
            urlToSave = urlToSave.slice(0, -1);
        }
        
        localStorage.setItem('intelli_backend_url', urlToSave);
        localStorage.setItem('intelli_refresh_interval', refreshInterval.toString());
        setBackendUrl(urlToSave);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const testConnection = async () => {
        setTestingConnection(true);
        setTestResult(null);
        
        let urlToTest = backendUrl.trim();
        if (!urlToTest) {
            setTestResult({ success: false, message: "URL do backend não pode estar vazia." });
            setTestingConnection(false);
            return;
        }
        if (urlToTest.endsWith('/')) urlToTest = urlToTest.slice(0, -1);


        // Verifica Mixed Content antes de tentar
        if (window.location.protocol === 'https:' && urlToTest.startsWith('http:')) {
             setTestResult({
                success: false,
                message: "Bloqueio de Segurança: Não é possível conectar a um backend HTTP inseguro a partir deste painel HTTPS (Mixed Content)."
            });
            setTestingConnection(false);
            return;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5s

            const response = await fetch(`${urlToTest}/`, {
                method: 'GET',
                mode: 'cors',
                credentials: 'omit',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                const text = await response.text();
                setTestResult({ success: true, message: `Conectado! Resposta: "${text.slice(0, 50)}..."` });
            } else {
                setTestResult({ success: false, message: `Erro HTTP: ${response.status} ${response.statusText}` });
            }
        } catch (error: any) {
            let msg = error.message || 'Falha desconhecida';
            if (error.name === 'AbortError') {
                 setTestResult({ success: false, message: 'Erro: Tempo limite esgotado (5s). O servidor não respondeu.' });
            } else if (error.name === 'TypeError' && msg === 'Failed to fetch') {
                if (urlToTest.startsWith('https://')) {
                    const CertErrorMessage = (
                        <>
                            A conexão falhou. Em HTTPS, isso geralmente indica um certificado SSL não confiável.
                            <a href={urlToTest} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-400 hover:underline mx-1">
                                Abra a URL em uma nova aba para aceitar o risco
                            </a>
                            e depois tente testar novamente.
                        </>
                    );
                    setTestResult({ success: false, message: CertErrorMessage });
                } else {
                    setTestResult({ success: false, message: 'Erro: Falha na rede. Verifique se o IP/Porta estão corretos e se o servidor está rodando.' });
                }
            } else {
               setTestResult({ success: false, message: `Erro: ${msg}` });
            }
        } finally {
            setTestingConnection(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative">
             <div className="w-full max-w-2xl">
                 <button 
                    onClick={() => navigate(isAuth ? '/' : '/login')} 
                    className="absolute top-4 left-4 sm:top-auto sm:-left-8 sm:-translate-x-full flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors text-sm"
                >
                    <ArrowLeft className="w-4 h-4" /> 
                    {isAuth ? 'Voltar ao Dashboard' : 'Voltar para Login'}
                </button>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Configurações</h1>
                        <p className="text-slate-400 mt-1">
                            Ajuste as configurações globais da aplicação.
                        </p>
                    </div>
                    <div className="space-y-6 mt-8">
                        {/* Backend URL Setting */}
                        <div>
                            <label htmlFor="backendUrl" className="block text-sm font-medium text-slate-300 mb-2">
                                URL do Servidor Backend
                            </label>
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input
                                        id="backendUrl"
                                        type="text"
                                        value={backendUrl}
                                        onChange={(e) => setBackendUrl(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        placeholder="https://177.99.170.10:5077"
                                    />
                                </div>
                                <button
                                    onClick={testConnection}
                                    disabled={testingConnection || !backendUrl}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {testingConnection ? <Activity className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                                    {testingConnection ? 'Testando...' : 'Testar'}
                                </button>
                            </div>
                            
                            {/* Resultado do Teste */}
                            {testResult && (
                                <div className={`mt-3 p-3 rounded-lg text-sm flex items-start gap-2 ${testResult.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                    {testResult.success ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                                    <div>{testResult.message}</div>
                                </div>
                            )}

                            <p className="text-xs text-slate-500 mt-2">
                                Endereço completo (com porta) onde seu servidor backend Node.js está rodando. Use https://
                            </p>
                        </div>

                        {/* Refresh Interval Setting */}
                        <div>
                            <label htmlFor="refreshInterval" className="block text-sm font-medium text-slate-300 mb-2">
                                Intervalo de Atualização Automática
                            </label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <select
                                    id="refreshInterval"
                                    value={refreshInterval}
                                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors appearance-none"
                                >
                                    <option value="1000">1 segundo (Tempo Real)</option>
                                    <option value="3000">3 segundos (Rápido)</option>
                                    <option value="5000">5 segundos (Padrão)</option>
                                    <option value="10000">10 segundos</option>
                                    <option value="30000">30 segundos</option>
                                    <option value="60000">1 minuto</option>
                                </select>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                Frequência com que o painel busca novos dados dos hosts.
                            </p>
                        </div>

                        <div className="pt-4 flex justify-end items-center gap-4 border-t border-slate-800 mt-6">
                            {saved && (
                               <span className="text-sm text-emerald-400 animate-pulse">Configurações salvas!</span>
                            )}
                            <button
                                onClick={handleSave}
                                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                            >
                                <Save className="w-4 h-4" />
                                Salvar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;