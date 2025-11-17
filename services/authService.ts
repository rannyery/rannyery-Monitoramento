import { User } from '../types';

const MOCK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock.token";

export const login = async (username: string, password: string): Promise<User> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));

  if (username === 'admin' && password === 'admin') {
    const user: User = {
      id: 'u-1',
      username: 'admin',
      role: 'admin',
      token: MOCK_TOKEN
    };
    localStorage.setItem('intelli_user', JSON.stringify(user));
    return user;
  }
  throw new Error('Credenciais inválidas');
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
