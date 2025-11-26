
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import HostDetails from './pages/HostDetails';
import AlertsPage from './pages/AlertsPage';
import Login from './pages/Login';
import HostList from './pages/HostList';
import InstallGuide from './pages/InstallGuide';
import Settings from './pages/Settings';
import SecurityPage from './pages/SecurityPage';
import ProtectedRoute from './components/ProtectedRoute';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Rota de Configurações PÚBLICA (para permitir ajuste de URL antes de logar) */}
        <Route path="/settings" element={<Settings />} />

        {/* Rotas protegidas gerais (precisa estar logado) */}
        <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="hosts" element={<HostList />} />
              <Route path="hosts/:hostId" element={<HostDetails />} />
              <Route path="alerts" element={<AlertsPage />} />
              
              {/* Rotas restritas apenas para Admin e Operador (Visualizador não edita) */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'operador']} />}>
                  <Route path="install/:hostId?" element={<InstallGuide />} />
              </Route>

              {/* Rotas restritas APENAS para Admin */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                  <Route path="security" element={<SecurityPage />} />
              </Route>
            </Route>
        </Route>

      </Routes>
    </HashRouter>
  );
};

export default App;
