import React, { useState, useEffect } from 'react';
import { MessageSquare, X, Send, ServerCrash, ShieldCheck } from 'lucide-react';
import { NotificationContact } from '../types';

interface Props {
  notification: {
    type: 'failure' | 'recovery';
    hostname: string;
    services: { name: string; details?: string }[];
  } | null;
  onClose: () => void;
}

const NOTIFICATION_CONTACTS_KEY = 'intelli_notification_contacts';
// NEW: Keys and defaults for fallback
const FAILURE_TEMPLATE_KEY = 'intelli_whatsapp_failure_template';
const RECOVERY_TEMPLATE_KEY = 'intelli_whatsapp_recovery_template';

const DEFAULT_FAILURE_TEMPLATE = `🚨 *ALERTA IntelliMonitor* 🚨

O servidor *{hostname}* reportou uma falha nos seguintes serviços:

{services}

A equipe de TI já foi acionada.`;

const DEFAULT_RECOVERY_TEMPLATE = `✅ *RECUPERAÇÃO IntelliMonitor* ✅

Os seguintes serviços do servidor *{hostname}* foram restabelecidos:

{services}

Operação normalizada.`;


const WhatsAppNotificationModal: React.FC<Props> = ({ notification, onClose }) => {
  const [contacts, setContacts] = useState<NotificationContact[]>([]);

  useEffect(() => {
    if (notification) {
      try {
        const storedContacts = localStorage.getItem(NOTIFICATION_CONTACTS_KEY);
        if (storedContacts) {
          setContacts(JSON.parse(storedContacts));
        }
      } catch (error) {
        console.error("Failed to load contacts for notification", error);
      }
    }
  }, [notification]);

  if (!notification) return null;

  const { type, hostname, services } = notification;
  const isFailure = type === 'failure';

  // UPDATED: Dynamic message formatting
  const getFormattedMessage = (): string => {
    const templateKey = isFailure ? FAILURE_TEMPLATE_KEY : RECOVERY_TEMPLATE_KEY;
    const defaultTemplate = isFailure ? DEFAULT_FAILURE_TEMPLATE : DEFAULT_RECOVERY_TEMPLATE;
    
    const template = localStorage.getItem(templateKey) || defaultTemplate;

    const servicesString = services
      .map(s => isFailure ? `- *${s.name}*: ${s.details || 'N/A'}` : `- *${s.name}*`)
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

  const title = isFailure ? "Notificar Falha de Serviço" : "Notificar Recuperação";
  const Icon = isFailure ? ServerCrash : ShieldCheck;
  const iconColor = isFailure ? "text-red-500" : "text-emerald-500";
  const bgColor = isFailure ? "bg-red-600" : "bg-emerald-600";
  const borderColor = isFailure ? "border-red-500" : "border-emerald-500";
  const shadowColor = isFailure ? "shadow-[0_0_50px_-15px_rgb(239,68,68)]" : "shadow-[0_0_50px_-15px_rgb(16,185,129)]";

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`bg-slate-950 border-2 ${borderColor} rounded-2xl ${shadowColor} w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200`}>
        {/* Header */}
        <div className={`${bgColor}/90 px-6 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <MessageSquare className="w-7 h-7 text-white" />
            <h2 className="text-xl font-black text-white uppercase tracking-wider">{title}</h2>
          </div>
          <button onClick={onClose} className="p-1 -mr-2 text-white/70 hover:bg-white/20 hover:text-white rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-5">
          <div className="text-center flex flex-col items-center">
            <Icon className={`w-12 h-12 mb-3 ${iconColor}`} />
            <p className="text-base text-slate-300 mb-1">
              {isFailure ? "Falha detectada no host:" : "Serviços recuperados no host:"}
            </p>
            <p className={`text-xl font-mono font-bold ${iconColor} bg-slate-800/50 px-3 py-1.5 rounded-lg inline-block`}>
              {hostname}
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-slate-200 mb-2 text-sm text-center">Detalhes do Alerta:</h4>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 max-h-32 overflow-y-auto text-sm">
                <ul className="space-y-2">
                    {services.map(service => (
                        <li key={service.name}>
                            <p className="font-mono font-medium text-slate-300">{service.name}</p>
                            {isFailure && service.details && <p className="text-xs text-slate-400 italic pl-2">{service.details}</p>}
                        </li>
                    ))}
                </ul>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-200 mb-2 text-sm text-center">Enviar notificação para:</h4>
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

          <div className="border-t border-slate-800 pt-4 flex justify-end">
             <button
                onClick={onClose}
                className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg transition-colors text-sm"
            >
                Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppNotificationModal;