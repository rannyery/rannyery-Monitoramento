
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import HostDetails from './pages/HostDetails';
import AlertsPage from './pages/AlertsPage';
import Login from './pages/Login';
import HostList from './pages/HostList';
import InstallGuide from './pages/InstallGuide';
import Settings from './pages/Settings';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="hosts" element={<HostList />} />
          <Route path="hosts/:hostId" element={<HostDetails />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="install/:hostId?" element={<InstallGuide />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;
