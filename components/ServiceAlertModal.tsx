import React, { useState, useEffect } from 'react';
import { ServerCrash, ServerCog, Minus, Send, MessageSquare } from 'lucide-react';
import { MonitoredService, NotificationContact } from '../types';

const NOTIFICATION_CONTACTS_KEY = 'intelli_notification_contacts';
const FAILURE_TEMPLATE_KEY = 'intelli_whatsapp_failure_template';
const DEFAULT_FAILURE_TEMPLATE = `🚨 *ALERTA IntelliMonitor* 🚨

O servidor *{hostname}* reportou uma falha nos seguintes serviços:

{services}

A equipe de TI já foi acionada.`;

interface Props {
  hostname: string;
  services: MonitoredService[];
  onMinimize: () => void;
  countdown: number;
}

const ServiceAlertModal: React.FC<Props> = ({ hostname, services, onMinimize, countdown }) => {
  const [contacts, setContacts] = useState<NotificationContact[]>([]);

  useEffect(() => {
    try {
      const storedContacts = localStorage.getItem(NOTIFICATION_CONTACTS_KEY);
      if (storedContacts) {
        setContacts(JSON.parse(storedContacts));
      }
    } catch (error) {
      console.error("Failed to load contacts for notification", error);
    }
  }, []);

  const getFormattedMessage = (): string => {
    const template = localStorage.getItem(FAILURE_TEMPLATE_KEY) || DEFAULT_FAILURE_TEMPLATE;
    const servicesString = services
      .map(s => `- *${s.name}*: ${s.details || 'N/A'}`)
      .join('\n');
    return template
      .replace('{hostname}', hostname)
      .replace('{services}', servicesString);
  };

  const handleSend = (phone: string) => {
    const message = getFormattedMessage();
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${phone}?text=${encodedMessage}`;
    window.open(url, '_blank');
  };
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-950 border-2 border-red-500 rounded-2xl shadow-[0_0_60px_-15px_rgb(239,68,68)] w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header piscante */}
        <div className="bg-red-600/90 px-6 py-4 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <ServerCrash className="w-8 h-8 text-white" />
              <h2 className="text-2xl font-black text-white uppercase tracking-wider">Alerta de Serviço</h2>
            </div>
            <button 
              onClick={onMinimize}
              title="Minimizar Alerta"
              className="p-2 -mr-2 text-white/70 hover:bg-white/20 hover:text-white rounded-full transition-colors"
            >
              <Minus className="w-5 h-5" />
            </button>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="text-center">
            <p className="text-lg text-slate-300 mb-1">
              Detectada falha de serviço no host:
            </p>
            <p className="text-2xl font-mono font-bold text-red-400 bg-red-950/50 px-3 py-1.5 rounded-lg inline-block">
              {hostname}
            </p>
          </div>
          
          <div>
              <h4 className="font-semibold text-slate-200 mb-3 text-center">Serviços com Falha:</h4>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 max-h-40 overflow-y-auto">
                  <ul className="space-y-3">
                      {services.map(service => (
                          <li key={service.name} className="flex items-start gap-3">
                              <ServerCog className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                              <div>
                                  <p className="font-mono font-medium text-red-400">{service.name}</p>
                                  <p className="text-xs text-slate-400 italic mt-0.5">{service.details}</p>
                              </div>
                          </li>
                      ))}
                  </ul>
              </div>
          </div>

          {/* WhatsApp Notification Section */}
          <div className="border-t border-slate-800 pt-5">
            <h4 className="font-semibold text-slate-200 mb-3 text-center flex items-center justify-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                Notificar Equipe via WhatsApp
            </h4>
            {contacts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {contacts.map(contact => (
                        <button
                            key={contact.id}
                            onClick={() => handleSend(contact.phone)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors text-sm"
                        >
                            <Send className="w-4 h-4"/> {contact.name}
                        </button>
                    ))}
                </div>
            ) : (
                <p className="text-center text-amber-400 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 text-sm">
                    Nenhum contato cadastrado na página de Notificações.
                </p>
            )}
          </div>
          
          <p className="text-sm text-slate-400 text-center transition-opacity duration-300">
            Minimizando automaticamente em <span className="font-bold text-white tabular-nums">{countdown}</span> segundos...
          </p>
        </div>
      </div>
    </div>
  );
};

export default ServiceAlertModal;