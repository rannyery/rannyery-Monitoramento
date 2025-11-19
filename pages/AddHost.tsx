import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addHost } from '../services/mockData';
import { OSType } from '../types';
import { Server, Globe, Monitor } from 'lucide-react';

const AddHost: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
      hostname: '',
      ip: '',
      os: 'linux' as OSType
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
        await addHost(formData);
        navigate('/');
    } catch (error) {
        console.error("Erro ao adicionar host", error);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Registrar Novo Servidor</h2>
                <p className="text-slate-400">Adicione um novo host para começar a coletar métricas.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Hostname</label>
                    <div className="relative">
                        <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            required
                            value={formData.hostname}
                            onChange={(e) => setFormData({...formData, hostname: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                            placeholder="ex: web-app-prod-03"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Endereço IP</label>
                    <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            required
                            value={formData.ip}
                            onChange={(e) => setFormData({...formData, ip: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                            placeholder="ex: 192.168.1.50"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Sistema Operacional</label>
                    <div className="relative">
                        <Monitor className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <select
                            value={formData.os}
                            onChange={(e) => setFormData({...formData, os: e.target.value as OSType})}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors appearance-none"
                        >
                            <option value="linux">Linux</option>
                            <option value="windows">Windows Server</option>
                        </select>
                    </div>
                </div>

                <div className="pt-4 flex gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isLoading ? 'Adicionando...' : 'Adicionar Host'}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};

export default AddHost;