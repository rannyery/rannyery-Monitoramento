import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { isAuthenticated, getCurrentUser } from '../services/authService';
import { getHosts, fetchAndUpdateData } from '../services/mockData';
import CriticalAlertModal from './CriticalAlertModal';
import ServiceAlertModal from './ServiceAlertModal';
import RecoveryAlertModal from './RecoveryAlertModal';
import MinimizedAlert from './MinimizedAlert';
import DiskAlertModal from './DiskAlertModal'; // Novo
import { MonitoredService, Host, DiskInfo } from '../types';
import { Volume2 } from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";

const AUTO_MINIMIZE_SECONDS = 15;
const AUDIO_UNLOCKED_KEY = 'intelli_audio_unlocked';
// Som de notificação (curto "ting") em Base64 para ser tocado instantaneamente.
const NOTIFICATION_SOUND_BASE64 = 'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjMuMTAwAAAAAAAAAAAAA//nAxAAAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/GgAAAFhZWVkzExgbFxgWFRUTFBQTExMSERAPCgYFBQQDAgEAAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/GgAAAFhZWVkzExgbFxgWFRUTFBQTExMSERAPCgYFBQQDAgEAAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAATED/8/nAxLgAACAAARn//+//+eXNqf/8w//9//+//8//+////+eP//f/+/////+eX//+f///8/f/9//9//9//9//98/85//f/+////+f//+f//8//+f/9//9//9/8///9//+f//8//9/85//f/+////+f//+f//8//+f/9//9//9/8///9//+f//8//9/85//f/+////+f//+f//8//+f/9//9//9/8///9//+f//8//9/85//f/+////+f//+f//8//+f/9//9//9/8///9//+f//8//9/85//f/+////+f//+f//8//+f/9//9//9/8///9//+f//8//9/85//f/+////+f//+f//8//+f/9//9//9/8///9//+f//8//9/85//f/+////+f//+f//8//+f/9//9//9/8///9//+f//8//9/85//f/+////+f//+f//8//+f/9//9//9/8///9//+f//8//9/85//f/+////+f//+f//8//+f/9//9//9/8///9//+f//8//9/85//f/+////+f//+f//8//+f/9//9//9/8///9//+f//8//9/85//f/+////+f//+f//8//+f/9//9//9/8///9//+f//8//9/85//f/+////+f//+f//8//+f/9//9//9/8///9//+f//8//9/85//f/+////+f//+f//8//+f/9//9//9/8///9//+f//8//9/85//f/+////+f//+f//8//+f/9//9//9/8///9//+f//8//9/85//f/+////+f//+f//8//+f/9//9//9/8///9//+f//8//9/85//f/+////+f//+f//8//+f/9//9//9/8///9//+f//8//9/85//f/+////+f//+f//8//+f/9//9//9/8///9//+f//8//9/85//f/+////+f//+f//8//+f/9//9//9/8///9//+f//8//9/85//f/+////+f//+f//8//+f/9//9//9/8///9//+f//8//9/85//f/+////+f//+f//8//+f/9//9//9/8///9//+f//8//9/85//f/+////+f//+f//8//+f/9//9//9/8///9//+f//8//9/85//f/+////+f//+f//8//+f/9//9//9/8///9//+f//8//9/85//f/+////+f//+f//8//+f/9//9//9/8///9//+f//8//9/85//f/+////+f//+f//8//+f/9//9//9/8///9//+f//8//9/85//f/+////+f//+f//8//+f/9//9//9/8///9//+f//8//9/85//f/+////+f//+f//8//+f/9//9//9/8///9//+f//8//9/85//f/+////+f//+f//8//+f/9//9//9/8///9//+f//8//9/85//f/+////+f//+f//8//+f/9//9//9/8///9//+f//8//9/85//f/+////+f//+f//8//+f/gac...';

// --- Instância da API do Gemini (criada uma única vez) ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Audio Decoding Helpers (Base64 -> Uint8Array) ---
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Renamed to avoid conflict with native window.decodeAudioData
async function decodePcmAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


const Layout: React.FC = () => {
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // State for critical alerts (host-level, closable)
  const [criticalAlertHost, setCriticalAlertHost] = useState<string | null>(null);
  
  // State for failed service alerts (persistent, minimizable)
  const [failedServiceHost, setFailedServiceHost] = useState<{ hostname: string; services: MonitoredService[] } | null>(null);
  const [isAlertMinimized, setIsAlertMinimized] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_MINIMIZE_SECONDS);

  // NEW: State for disk alerts
  const [diskAlertHost, setDiskAlertHost] = useState<{ hostname: string; disks: DiskInfo[] } | null>(null);

  // NEW: State for the recovery alert modal (transient)
  const [recoveredServiceInfo, setRecoveredServiceInfo] = useState<{ hostname: string; services: Partial<MonitoredService>[] } | null>(null);
  
  // State and Refs for audio/voice alerts
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const notificationAudioBufferRef = useRef<AudioBuffer | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const repeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // --- Refs to manage state inside the stable interval ---
  const acknowledgedHostsRef = useRef<Set<string>>(new Set());
  const acknowledgedDiskAlertsRef = useRef<Set<string>>(new Set()); // Para o modal de disco
  const announcedFailuresRef = useRef<Set<string>>(new Set());
  const announcedResourceAlertsRef = useRef<Set<string>>(new Set()); // Para alertas de voz de CPU/Mem/Disco
  const failedServiceHostRef = useRef(failedServiceHost);
  const criticalAlertHostRef = useRef(criticalAlertHost);
  const diskAlertHostRef = useRef(diskAlertHost);
  const isAudioUnlockedRef = useRef(isAudioUnlocked);

  // Check localStorage for audio permission on initial load
  useEffect(() => {
    const unlocked = localStorage.getItem(AUDIO_UNLOCKED_KEY) === 'true';
    if (unlocked) {
        setIsAudioUnlocked(true);
        // Pre-initialize AudioContext if permission was already granted
        if (!audioContextRef.current) {
             try {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
             } catch (e) {
                console.error("AudioContext could not be created on initial load.", e);
             }
        }
    }
  }, []);

  // Update refs on every render to provide the latest state to the stable interval
  useEffect(() => {
      failedServiceHostRef.current = failedServiceHost;
      criticalAlertHostRef.current = criticalAlertHost;
      diskAlertHostRef.current = diskAlertHost;
      isAudioUnlockedRef.current = isAudioUnlocked;
  });

  // --- Main Stable Interval Effect ---
  useEffect(() => {
    if (!isAuthenticated()) return;
    
    const playNotificationSound = async () => {
        if (!isAudioUnlockedRef.current || !audioContextRef.current) return;
        const ctx = audioContextRef.current;
        
        // Se o buffer de áudio já foi decodificado, toca do cache.
        if (notificationAudioBufferRef.current) {
            const source = ctx.createBufferSource();
            source.buffer = notificationAudioBufferRef.current;
            source.connect(ctx.destination);
            source.start();
            return;
        }

        // Se for a primeira vez, decodifica o som Base64 e armazena no cache.
        try {
            const audioData = decode(NOTIFICATION_SOUND_BASE64);
            const buffer = await ctx.decodeAudioData(audioData.buffer);
            notificationAudioBufferRef.current = buffer;
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start();
        } catch (e) {
            console.error("Falha ao decodificar ou tocar o som de notificação:", e);
        }
    };
    
    const speakWithGemini = async (textToSpeak: string) => {
        if (!isAudioUnlockedRef.current || !audioContextRef.current) {
            console.warn("[TTS LOG] Audio context not ready or unlocked. Skipping Gemini speech.");
            return;
        }
        
        if (audioSourceRef.current) {
            try { audioSourceRef.current.stop(); } catch (e) {}
            audioSourceRef.current = null;
        }

        console.log(`[TTS LOG] Requesting speech from Gemini for: "${textToSpeak}"`);

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: textToSpeak }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                    },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) {
                throw new Error("No audio data received from Gemini.");
            }
            
            const audioBytes = decode(base64Audio);
            const audioBuffer = await decodePcmAudioData(
                audioBytes,
                audioContextRef.current,
                24000, // sample rate for gemini-tts
                1,     // mono channel
            );

            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            audioSourceRef.current = source;
            
            source.addEventListener('ended', () => {
                if (audioSourceRef.current === source) {
                    audioSourceRef.current = null;
                }
            });

            source.connect(audioContextRef.current.destination);
            source.start();

            console.log(`[TTS LOG] Playing Gemini audio for: "${textToSpeak}"`);

        } catch (error) {
            console.error("[TTS LOG] ERRO ao gerar ou tocar áudio com Gemini:", error);
        }
    };


    // 3. Set up the health check interval
    const runHealthChecks = async () => {
        const hosts: Host[] = await getHosts();
        
        // --- MODAL TRIGGERS ---
        // 1. Critical Host Modal (geralmente por CPU/Mem alta)
        if (!criticalAlertHostRef.current) {
            const critical = hosts.find(h => h.status === 'critical' && !acknowledgedHostsRef.current.has(h.id));
            if (critical) {
                setCriticalAlertHost(critical.hostname);
                acknowledgedHostsRef.current.add(critical.id);
            }
        }
        
        // 2. Disk Usage Modal (Disco > 85%)
        if (!diskAlertHostRef.current) {
            const diskAlertTarget = hosts.find(h => {
                const disk = h.disks[0];
                if (!disk || h.status === 'offline') return false;
                const usage = disk.total > 0 ? (disk.used / disk.total) * 100 : 0;
                return usage > 85 && !acknowledgedDiskAlertsRef.current.has(h.id);
            });
            if (diskAlertTarget) {
                setDiskAlertHost({ hostname: diskAlertTarget.hostname, disks: diskAlertTarget.disks });
                acknowledgedDiskAlertsRef.current.add(diskAlertTarget.id);
            }
        }
        
        // --- VOICE ALERTS ---
        if (isAudioUnlockedRef.current) {
            const resourceAlertsToAnnounce: string[] = [];
            hosts.forEach(host => {
                if (host.status === 'offline') return;

                const lastCpu = host.metrics.cpu[host.metrics.cpu.length - 1]?.value ?? 0;
                const lastMem = host.metrics.memory[host.metrics.memory.length - 1]?.value ?? 0;
                const disk = host.disks[0];
                const diskUsage = disk && disk.total > 0 ? (disk.used / disk.total) * 100 : 0;

                const announceIfExceeds = (type: string, value: number, threshold: number, message: string) => {
                    const alertId = `${host.hostname}-${type}`;
                    if (value > threshold && !announcedResourceAlertsRef.current.has(alertId)) {
                        resourceAlertsToAnnounce.push(message);
                        announcedResourceAlertsRef.current.add(alertId);
                    } else if (value < threshold - 5) { // Hysteresis to clear
                        announcedResourceAlertsRef.current.delete(alertId);
                    }
                };

                // --- CPU / Mem (Critical only) ---
                announceIfExceeds('cpu-critical', lastCpu, 95, `o uso da CPU no servidor ${host.hostname} está em estado crítico, atingindo ${Math.round(lastCpu)} por cento`);
                announceIfExceeds('mem-critical', lastMem, 98, `o uso da memória no servidor ${host.hostname} está em estado crítico, atingindo ${Math.round(lastMem)} por cento`);
                
                // --- Disk (Mutually Exclusive Critical/Warning) ---
                const diskCriticalId = `${host.hostname}-disk-critical`;
                const diskWarningId = `${host.hostname}-disk-warning`;

                if (diskUsage > 95) {
                    if (!announcedResourceAlertsRef.current.has(diskCriticalId)) {
                        resourceAlertsToAnnounce.push(`o uso do espaço em disco no servidor ${host.hostname} está em estado crítico, atingindo ${Math.round(diskUsage)} por cento`);
                        announcedResourceAlertsRef.current.add(diskCriticalId);
                        announcedResourceAlertsRef.current.delete(diskWarningId);
                    }
                } else if (diskUsage > 85) {
                    if (!announcedResourceAlertsRef.current.has(diskWarningId)) {
                        resourceAlertsToAnnounce.push(`o uso do espaço em disco no servidor ${host.hostname} está em estado preocupante, atingindo ${Math.round(diskUsage)} por cento`);
                        announcedResourceAlertsRef.current.add(diskWarningId);
                    }
                    if (diskUsage < 90) {
                         announcedResourceAlertsRef.current.delete(diskCriticalId);
                    }
                } else {
                    announcedResourceAlertsRef.current.delete(diskCriticalId);
                    announcedResourceAlertsRef.current.delete(diskWarningId);
                }
            });

            if (resourceAlertsToAnnounce.length > 0) {
                const textToSpeak = `Atenção. ${resourceAlertsToAnnounce.join('. ')}.`;
                playNotificationSound();
                speakWithGemini(textToSpeak);
            }
        }
        
        // 2. Service Failure/Recovery Voice & Modal Logic (Existente)
        const currentFailedServices = new Set<string>();
        const newFailuresToAnnounce: Array<{hostname: string, serviceName: string, serviceDetails?: string}> = [];

        hosts.forEach(host => {
            if (Array.isArray(host.services)) {
                host.services.forEach(service => {
                    const failureId = JSON.stringify({ hostname: host.hostname, serviceName: service.name });
                    if (service.status === 'failed') {
                        currentFailedServices.add(failureId);
                        if (!announcedFailuresRef.current.has(failureId)) {
                            newFailuresToAnnounce.push({ hostname: host.hostname, serviceName: service.name, serviceDetails: service.details });
                            announcedFailuresRef.current.add(failureId);
                        }
                    }
                });
            }
        });
        
        const recoveredServicesToAnnounce: Array<{ hostname: string; serviceName: string }> = [];
        const failuresToDelete = new Set<string>();

        announcedFailuresRef.current.forEach(announcedIdJson => {
            if (!currentFailedServices.has(announcedIdJson)) {
                try {
                    const recoveredService = JSON.parse(announcedIdJson);
                    recoveredServicesToAnnounce.push(recoveredService);
                    failuresToDelete.add(announcedIdJson);
                } catch (e) {
                    console.error("Falha ao analisar JSON do ID de falha:", announcedIdJson, e);
                    failuresToDelete.add(announcedIdJson); // Deleta dados malformados
                }
            }
        });

        if (repeatTimeoutRef.current) {
            clearTimeout(repeatTimeoutRef.current);
            repeatTimeoutRef.current = null;
        }

        if (newFailuresToAnnounce.length > 0) {
            if(isAudioUnlockedRef.current) {
                let textToSpeak = '';
                if (newFailuresToAnnounce.length === 1) {
                    const { hostname, serviceName } = newFailuresToAnnounce[0];
                    textToSpeak = `Atenção. O serviço ${serviceName}, no servidor ${hostname}, está apresentando problemas.`;
                } else {
                    const failuresByHost = newFailuresToAnnounce.reduce((acc, { hostname, serviceName }) => {
                        if (!acc[hostname]) acc[hostname] = [];
                        acc[hostname].push(serviceName);
                        return acc;
                    }, {} as Record<string, string[]>);

                    const serviceDescriptions = Object.entries(failuresByHost).map(([hostname, services]) => {
                        const serviceNames = services.length > 1 ? `${services.slice(0, -1).join(', ')} e ${services.slice(-1)}` : services[0];
                        const serviceNoun = services.length > 1 ? 'os serviços' : 'o serviço';
                        return `no servidor ${hostname}, ${serviceNoun} ${serviceNames}`;
                    });
                    
                    let fullDescription;
                    if (serviceDescriptions.length > 1) {
                        const last = serviceDescriptions.pop();
                        fullDescription = serviceDescriptions.join('; ') + `; e também ${last}`;
                    } else {
                        fullDescription = serviceDescriptions[0];
                    }
                    textToSpeak = `Atenção. Detectamos problemas em ${newFailuresToAnnounce.length} serviços. ${fullDescription}.`;
                }

                playNotificationSound();
                speakWithGemini(textToSpeak); // Não-bloqueante

                const failuresForRepeatCheck = newFailuresToAnnounce.map(f => JSON.stringify({ hostname: f.hostname, serviceName: f.serviceName }));
                repeatTimeoutRef.current = setTimeout(async () => {
                    console.log("[SPEECH LOG] Verificando se a repetição do alerta é necessária...");
                    await fetchAndUpdateData();
                    const currentHosts = await getHosts();
                    
                    const currentFailedServicesForRepeatCheck = new Set<string>();
                    currentHosts.forEach(host => {
                        host.services?.forEach(service => {
                            if (service.status === 'failed') {
                                currentFailedServicesForRepeatCheck.add(JSON.stringify({ hostname: host.hostname, serviceName: service.name }));
                            }
                        });
                    });

                    const stillFailing = failuresForRepeatCheck.every(failureIdJson => {
                        return currentFailedServicesForRepeatCheck.has(failureIdJson);
                    });

                    if (stillFailing) {
                        console.log("[SPEECH LOG] Falhas persistem. Repetindo o alerta detalhado.");
                        speakWithGemini(textToSpeak); // Repete apenas a voz de alta qualidade
                    } else {
                        console.log("[SPEECH LOG] Pelo menos uma falha foi resolvida. Cancelando repetição.");
                    }
                    repeatTimeoutRef.current = null;
                }, 30000); // Aumentado para 30 segundos para ser menos repetitivo
            }
        }

        if (recoveredServicesToAnnounce.length > 0) {
             setRecoveredServiceInfo({
                hostname: recoveredServicesToAnnounce[0].hostname,
                services: recoveredServicesToAnnounce.map(s => ({ name: s.serviceName }))
            });

            if (isAudioUnlockedRef.current) {
                const remainingFailuresCount = announcedFailuresRef.current.size - failuresToDelete.size;
                const isEverythingOkNow = remainingFailuresCount === 0;

                let textToSpeak = '';
                let intro = isEverythingOkNow ? 'Ótima notícia.' : 'Atualização.';

                if (recoveredServicesToAnnounce.length === 1) {
                    const { hostname, serviceName } = recoveredServicesToAnnounce[0];
                    textToSpeak = `${intro} O serviço ${serviceName}, no servidor ${hostname}, foi restabelecido.`;
                } else {
                    const recoveriesByHost = recoveredServicesToAnnounce.reduce((acc, { hostname, serviceName }) => {
                        if (!acc[hostname]) acc[hostname] = [];
                        acc[hostname].push(serviceName);
                        return acc;
                    }, {} as Record<string, string[]>);

                    const serviceDescriptions = Object.entries(recoveriesByHost).map(([hostname, services]) => {
                        const serviceNames = services.length > 1 ? `${services.slice(0, -1).join(', ')} e ${services.slice(-1)}` : services[0];
                        const serviceNoun = services.length > 1 ? 'os serviços' : 'o serviço';
                        return `no servidor ${hostname}, ${serviceNoun} ${serviceNames}`;
                    });
                    
                    let fullDescription;
                    if (serviceDescriptions.length > 1) {
                        const last = serviceDescriptions.pop();
                        fullDescription = serviceDescriptions.join('; ') + `; e também ${last}`;
                    } else {
                        fullDescription = serviceDescriptions[0];
                    }
                    textToSpeak = `${intro} ${recoveredServicesToAnnounce.length} serviços foram restabelecidos. ${fullDescription}.`;
                }
                
                if (isEverythingOkNow) {
                     textToSpeak += ' Todos os serviços estão operacionais.';
                } else if (remainingFailuresCount > 0) {
                     textToSpeak += ` No entanto, ${remainingFailuresCount} outro serviço ainda necessita de atenção.`;
                }
                
                playNotificationSound();
                speakWithGemini(textToSpeak); // Não-bloqueante
            }
        }

        // Atomically update the announced failures ref after all logic is done
        failuresToDelete.forEach(id => {
            announcedFailuresRef.current.delete(id);
        });

        let foundFailedServiceHost: { hostname: string; services: MonitoredService[] } | null = null;
        for (const host of hosts) {
            const failedServices = host.services?.filter(s => s.status === 'failed');
            if (failedServices && failedServices.length > 0) {
                foundFailedServiceHost = { hostname: host.hostname, services: failedServices };
                break; 
            }
        }
        
        if (JSON.stringify(foundFailedServiceHost) !== JSON.stringify(failedServiceHostRef.current)) {
            if (foundFailedServiceHost) {
                setIsAlertMinimized(false);
                setFailedServiceHost(foundFailedServiceHost);
            } else {
                setFailedServiceHost(null);
                setIsAlertMinimized(false);
                if (audioSourceRef.current) {
                  try { audioSourceRef.current.stop(); } catch(e) {}
                  audioSourceRef.current = null;
                }
            }
        }
    };

    const interval = setInterval(runHealthChecks, 2000);

    return () => {
        clearInterval(interval);
        if (repeatTimeoutRef.current) {
            clearTimeout(repeatTimeoutRef.current);
        }
         if (audioSourceRef.current) {
            try { audioSourceRef.current.stop(); } catch(e) {}
            audioSourceRef.current = null;
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(e => console.warn("Error closing AudioContext", e));
        }
    };
  }, []); // <-- EMPTY DEPENDENCY ARRAY ensures this runs only once.

  // Auto-minimize countdown timer effect
  useEffect(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    if (failedServiceHost && !isAlertMinimized) {
      setCountdown(AUTO_MINIMIZE_SECONDS);
      
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prevCountdown => {
          if (prevCountdown <= 1) {
            clearInterval(countdownIntervalRef.current!);
            setIsAlertMinimized(true);
            return 0;
          }
          return prevCountdown - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [failedServiceHost, isAlertMinimized]);
  
  // NEW: Auto-close effect for the recovery modal
  useEffect(() => {
    if (recoveredServiceInfo) {
      const timer = setTimeout(() => {
        setRecoveredServiceInfo(null);
      }, 7000); // Modal stays for 7 seconds
      return () => clearTimeout(timer);
    }
  }, [recoveredServiceInfo]);

  // NEW: Auto-close effect for CriticalAlertModal
  useEffect(() => {
    if (criticalAlertHost) {
      const timer = setTimeout(() => {
        setCriticalAlertHost(null);
      }, 15000); // 15 seconds
      return () => clearTimeout(timer);
    }
  }, [criticalAlertHost]);

  // NEW: Auto-close effect for DiskAlertModal
  useEffect(() => {
    if (diskAlertHost) {
      const timer = setTimeout(() => {
        setDiskAlertHost(null);
      }, 15000); // 15 seconds
      return () => clearTimeout(timer);
    }
  }, [diskAlertHost]);


  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const user = getCurrentUser();

  const handleMinimize = () => {
    if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
    }
    if (audioSourceRef.current) {
        try { audioSourceRef.current.stop(); } catch(e) {}
        audioSourceRef.current = null;
    }
    window.speechSynthesis.cancel(); // Para também a voz nativa
    setIsAlertMinimized(true);
  };
  
  const handleUnlockAudio = async () => {
      if (!audioContextRef.current) {
        try {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        } catch (e) {
            console.error("AudioContext could not be created.", e);
            alert("Seu navegador não suporta a API de Áudio necessária para as notificações de voz.");
            return;
        }
    }
    
    if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
    }
      
      setIsAudioUnlocked(true);
      localStorage.setItem(AUDIO_UNLOCKED_KEY, 'true');

      // Toca uma confirmação usando a voz do Gemini
      try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: 'Áudio ativado.' }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio && audioContextRef.current) {
            const audioBytes = decode(base64Audio);
            const audioBuffer = await decodePcmAudioData(audioBytes, audioContextRef.current, 24000, 1);
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            source.start();
        }
      } catch (error) {
          console.error("Failed to play activation sound", error);
      }
  };

  let pageTitle = '';
  if (location.pathname === '/') pageTitle = 'Visão Geral';
  else if (location.pathname === '/hosts') pageTitle = 'Gerenciar Hosts';
  else if (location.pathname.startsWith('/hosts/')) pageTitle = 'Detalhes do Host';
  else if (location.pathname === '/alerts') pageTitle = 'Alertas';
  else if (location.pathname === '/settings') pageTitle = 'Configurações';
  else if (location.pathname === '/install') pageTitle = 'Instalação do Agente';
  else pageTitle = location.pathname.slice(1).charAt(0).toUpperCase() + location.pathname.slice(2);

  return (
    <div className="flex min-h-screen bg-slate-950">
      {!isAudioUnlocked && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-amber-600/95 backdrop-blur-sm p-3 text-white text-center flex items-center justify-center gap-4 animate-in fade-in slide-in-from-top-4">
            <Volume2 className="w-5 h-5" />
            <p className="font-medium">Alertas de voz estão desativados para cumprir a política do navegador.</p>
            <button
                onClick={handleUnlockAudio}
                className="bg-slate-900/50 hover:bg-slate-900 px-4 py-1.5 rounded-md font-bold transition-colors"
            >
                Ativar Áudio
            </button>
        </div>
      )}
      <DiskAlertModal 
        hostInfo={diskAlertHost} 
        onClose={() => setDiskAlertHost(null)} 
      />
      <CriticalAlertModal 
        hostname={criticalAlertHost} 
        onClose={() => setCriticalAlertHost(null)} 
      />
      <RecoveryAlertModal info={recoveredServiceInfo} />
      {failedServiceHost && !isAlertMinimized && (
        <ServiceAlertModal
          hostname={failedServiceHost.hostname}
          services={failedServiceHost.services}
          onMinimize={handleMinimize}
          countdown={countdown}
        />
      )}
      {failedServiceHost && isAlertMinimized && (
         <MinimizedAlert
            hostname={failedServiceHost.hostname}
            services={failedServiceHost.services}
            onRestore={() => setIsAlertMinimized(false)}
        />
      )}
      
      <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      <main className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <header className="h-16 bg-slate-900/50 backdrop-blur border-b border-slate-800 sticky top-0 z-10 px-8 flex items-center justify-between">
           <h2 className="text-slate-100 font-medium">
             {pageTitle}
           </h2>
           <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
                 {user?.username.slice(0, 2).toUpperCase()}
               </div>
               <span className="text-sm text-slate-300">{user?.username}</span>
             </div>
           </div>
        </header>
        <div className="p-8 flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
