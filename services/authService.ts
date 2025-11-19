import { User } from '../types';
import { getBackendUrl } from './mockData';

export const login = async (username: string, password: string): Promise<User> => {
  const backendUrl = getBackendUrl();
  if (!backendUrl) {
    throw new Error('URL do Backend não configurada. Verifique as Configurações.');
  }

  try {
    const response = await fetch(`${backendUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Credenciais inválidas');
    }

    // A resposta do backend agora deve ser o objeto User completo com o token
    const user: User = data;
    localStorage.setItem('intelli_user', JSON.stringify(user));
    return user;

  } catch (err: any) {
    if (err.message.includes('Failed to fetch')) {
        throw new Error('Não foi possível conectar ao servidor. Verifique a URL do backend e se ele está online.');
    }
    // Re-throw a mensagem de erro do backend ou uma genérica
    throw err;
  }
};

export const logout = () => {
  localStorage.removeItem('intelli_user');
};

export const getCurrentUser = (): User | null => {
  const stored = localStorage.getItem('intelli_user');
  return stored ? JSON.parse(stored) : null;
};

export const isAuthenticated = (): boolean => {
  return !!getCurrentUser();
};