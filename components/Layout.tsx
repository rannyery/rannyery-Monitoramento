
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { isAuthenticated } from '../services/authService';
import { getHosts, getAlerts } from '../services/mockData';
import CriticalAlertModal from './CriticalAlertModal';
import ServiceAlertModal from './ServiceAlertModal';
import RecoveryAlertModal from './RecoveryAlertModal';
import MinimizedAlert from './MinimizedAlert';
import DiskAlertModal from './DiskAlertModal';
import { MonitoredService, DiskInfo } from '../types';

const AUTO_MINIMIZE_SECONDS = 15;

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Alert States
  const [criticalHost, setCriticalHost] = useState<string | null>(null);
  const [serviceAlert, setServiceAlert] = useState<{ hostname: string, services: MonitoredService[] } | null>(null);
  const [recoveryInfo, setRecoveryInfo] = useState<{ hostname: string, services: Partial<MonitoredService>[] } | null>(null);
  const [diskAlert, setDiskAlert] = useState<{ hostname: string, disks: DiskInfo[] } | null>(null);
  
  const [isServiceAlertMinimized, setIsServiceAlertMinimized] = useState(false);
  const [minimizeCountdown, setMinimizeCountdown] = useState(AUTO_MINIMIZE_SECONDS);

  // State to track previous alert IDs to detect new ones
  const [prevAlertIds, setPrevAlertIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
      const checkAlerts = async () => {
          const alerts = await getAlerts();
          const hosts = await getHosts();
          
          // 1. Check for new critical alerts to show modal
          const newCriticalAlerts = alerts.filter(a => 
              a.severity === 'critical' && 
              !a.resolved && 
              !prevAlertIds.has(a.id)
          );

          if (newCriticalAlerts.length > 0) {
              // Prioritize showing the most recent critical alert
              const latest = newCriticalAlerts[0];
              
              // Determine type of alert to show specific modal
              if (latest.message.includes('Falha de Serviço')) {
                   const host = hosts.find(h => h.id === latest.hostId);
                   if (host) {
                       const failedServices = host.services?.filter(s => s.status === 'failed') || [];
                       if (failedServices.length > 0) {
                           setServiceAlert({ hostname: host.hostname, services: failedServices });
                           setIsServiceAlertMinimized(false);
                           setMinimizeCountdown(AUTO_MINIMIZE_SECONDS);
                       }
                   }
              } else if (latest.message.includes('Status do Host')) {
                  setCriticalHost(latest.hostname);
              } else if (latest.message.includes('Disco Crítico')) {
                  const host = hosts.find(h => h.id === latest.hostId);
                  if (host) {
                       setDiskAlert({ hostname: host.hostname, disks: host.disks });
                  }
              }

              // Update known alerts
              const newIds = new Set(prevAlertIds);
              newCriticalAlerts.forEach(a => newIds.add(a.id));
              setPrevAlertIds(newIds);
          }
      };

      const interval = setInterval(checkAlerts, 2000);
      return () => clearInterval(interval);
  }, [prevAlertIds]);

  // Countdown timer for minimized alert
  useEffect(() => {
      let timer: any;
      if (serviceAlert && !isServiceAlertMinimized && minimizeCountdown > 0) {
          timer = setInterval(() => {
              setMinimizeCountdown(prev => prev - 1);
          }, 1000);
      } else if (minimizeCountdown === 0 && !isServiceAlertMinimized) {
          setIsServiceAlertMinimized(true);
      }
      return () => clearInterval(timer);
  }, [serviceAlert, isServiceAlertMinimized, minimizeCountdown]);


  return (
    <div className="flex h-screen bg-slate-950 text-slate-300 overflow-hidden font-sans selection:bg-blue-500/30">
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
      />

      <main className={`flex-1 overflow-auto transition-all duration-300 p-4 lg:p-8 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <div className="max-w-7xl mx-auto">
             <Outlet />
        </div>
      </main>

      {/* Modals */}
      <CriticalAlertModal 
        hostname={criticalHost} 
        onClose={() => setCriticalHost(null)} 
      />

      {serviceAlert && !isServiceAlertMinimized && (
        <ServiceAlertModal 
            hostname={serviceAlert.hostname} 
            services={serviceAlert.services}
            countdown={minimizeCountdown}
            onMinimize={() => setIsServiceAlertMinimized(true)}
        />
      )}

      {serviceAlert && isServiceAlertMinimized && (
          <MinimizedAlert 
            hostname={serviceAlert.hostname}
            services={serviceAlert.services}
            onRestore={() => {
                setIsServiceAlertMinimized(false);
                setMinimizeCountdown(AUTO_MINIMIZE_SECONDS);
            }}
          />
      )}

      <RecoveryAlertModal info={recoveryInfo} />
      
      <DiskAlertModal 
        hostInfo={diskAlert} 
        onClose={() => setDiskAlert(null)} 
      />
    </div>
  );
};

export default Layout;
