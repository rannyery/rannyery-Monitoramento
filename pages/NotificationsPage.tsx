import React, { useState, useEffect } from 'react';
import { Smartphone, Send, UserPlus, Trash2, Phone, MessageSquare, Save } from 'lucide-react';
import { NotificationContact } from '../types';

const NOTIFICATION_CONTACTS_KEY = 'intelli_notification_contacts';
const SENDER_NUMBER = '+55 73 98802-0220'; // Número fixo de plantão

// NEW: Keys and default templates
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


const NotificationsPage: React.FC = () => {
  const [contacts, setContacts] = useState<NotificationContact[]>([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  // State for message templates
  const [failureTemplate, setFailureTemplate] = useState(DEFAULT_FAILURE_TEMPLATE);
  const [recoveryTemplate, setRecoveryTemplate] = useState(DEFAULT_RECOVERY_TEMPLATE);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  // Load contacts and templates from localStorage on initial render
  useEffect(() => {
    try {
      const storedContacts = localStorage.getItem(NOTIFICATION_CONTACTS_KEY);
      if (storedContacts) {
        setContacts(JSON.parse(storedContacts));
      }
      const storedFailureTemplate = localStorage.getItem(FAILURE_TEMPLATE_KEY);
      setFailureTemplate(storedFailureTemplate || DEFAULT_FAILURE_TEMPLATE);

      const storedRecoveryTemplate = localStorage.getItem(RECOVERY_TEMPLATE_KEY);
      setRecoveryTemplate(storedRecoveryTemplate || DEFAULT_RECOVERY_TEMPLATE);

    } catch (error) {
      console.error("Failed to load notification settings from localStorage", error);
    }
  }, []);

  // Save contacts to localStorage whenever the list changes
  useEffect(() => {
    try {
      localStorage.setItem(NOTIFICATION_CONTACTS_KEY, JSON.stringify(contacts));
    } catch (error) {
      console.error("Failed to save notification contacts to localStorage", error);
    }
  }, [contacts]);

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (newContactName.trim() && newContactPhone.trim()) {
      const newContact: NotificationContact = {
        id: `contact-${Date.now()}`,
        name: newContactName.trim(),
        phone: newContactPhone.trim().replace(/\D/g, ''), // Remove non-digit characters
      };
      setContacts([...contacts, newContact]);
      setNewContactName('');
      setNewContactPhone('');
    }
  };

  const handleRemoveContact = (id: string) => {
    setContacts(contacts.filter(contact => contact.id !== id));
  };

  // Handle saving templates
  const handleSaveTemplates = () => {
    localStorage.setItem(FAILURE_TEMPLATE_KEY, failureTemplate);
    localStorage.setItem(RECOVERY_TEMPLATE_KEY, recoveryTemplate);
    setShowSaveConfirmation(true);
    setTimeout(() => setShowSaveConfirmation(false), 2500);
  };


  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Smartphone className="w-6 h-6 text-blue-400" />
          Notificações por WhatsApp
        </h1>
        <p className="text-slate-400 mt-1">
          Gerencie os contatos e personalize as mensagens que receberão alertas de falha e recuperação de serviços.
        </p>
      </div>

      {/* Sender Number Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Send className="w-5 h-5 text-slate-400"/>
          Número Remetente
        </h3>
        <p className="text-slate-400 text-sm mb-2">
          As mensagens de notificação serão enviadas a partir do seguinte número de plantão:
        </p>
        <div className="bg-slate-800/50 p-3 rounded-lg text-center font-mono text-lg text-emerald-400 border border-slate-700">
          {SENDER_NUMBER}
        </div>
      </div>

       {/* Message Templates Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-slate-400" />
          Modelos de Mensagem
        </h3>
        <p className="text-slate-400 text-sm mb-4">
          Personalize as mensagens enviadas. Use <code className="bg-slate-700 text-xs px-1 py-0.5 rounded font-mono">{'{hostname}'}</code> para o nome do servidor e <code className="bg-slate-700 text-xs px-1 py-0.5 rounded font-mono">{'{services}'}</code> para a lista de serviços.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Failure Template */}
          <div>
            <label htmlFor="failureTemplate" className="block text-sm font-medium text-red-400 mb-2">
              Mensagem de Falha
            </label>
            <textarea
              id="failureTemplate"
              value={failureTemplate}
              onChange={(e) => setFailureTemplate(e.target.value)}
              rows={10}
              className="w-full bg-slate-950 border border-slate-700 rounded-md p-3 text-sm focus:outline-none focus:border-red-500 font-mono resize-y"
            />
          </div>
          {/* Recovery Template */}
          <div>
            <label htmlFor="recoveryTemplate" className="block text-sm font-medium text-emerald-400 mb-2">
              Mensagem de Recuperação
            </label>
            <textarea
              id="recoveryTemplate"
              value={recoveryTemplate}
              onChange={(e) => setRecoveryTemplate(e.target.value)}
              rows={10}
              className="w-full bg-slate-950 border border-slate-700 rounded-md p-3 text-sm focus:outline-none focus:border-emerald-500 font-mono resize-y"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end items-center gap-4">
          {showSaveConfirmation && (
            <span className="text-sm text-emerald-400 animate-pulse">Modelos salvos com sucesso!</span>
          )}
          <button
            onClick={handleSaveTemplates}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm"
          >
            <Save className="w-4 h-4" /> Salvar Modelos
          </button>
        </div>
      </div>

      {/* Recipients Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-slate-400"/>
            Gerenciar Destinatários
        </h3>
        
        {/* Add Contact Form */}
        <form onSubmit={handleAddContact} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 space-y-3 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
                <input
                    type="text"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder="Nome do Contato"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-md p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    required
                />
                <input
                    type="tel"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    placeholder="Número do WhatsApp (Ex: 5573988887777)"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-md p-2.5 text-sm focus:outline-none focus:border-blue-500"
                    required
                />
            </div>
             <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm"
            >
                <UserPlus className="w-4 h-4"/> Adicionar Contato
            </button>
        </form>

        {/* Contact List */}
        <div>
            {contacts.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-4">Nenhum contato adicionado.</p>
            ) : (
                <ul className="space-y-3">
                    {contacts.map(contact => (
                        <li key={contact.id} className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 animate-in fade-in duration-300">
                            <div className="flex items-center gap-3">
                                <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                <div>
                                    <p className="font-medium text-slate-200">{contact.name}</p>
                                    <p className="text-xs text-slate-400 font-mono">+{contact.phone}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleRemoveContact(contact.id)}
                                className="p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400 rounded-md transition-colors"
                                title="Remover Contato"
                            >
                                <Trash2 className="w-4 h-4"/>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;