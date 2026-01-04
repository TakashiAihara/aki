import Conf from 'conf';

interface AkiConfig {
  accessToken?: string;
  refreshToken?: string;
  apiUrl?: string;
  userEmail?: string;
}

const config = new Conf<AkiConfig>({
  projectName: 'aki-cli',
  schema: {
    accessToken: { type: 'string' },
    refreshToken: { type: 'string' },
    apiUrl: { type: 'string', default: 'http://localhost:3002' },
    userEmail: { type: 'string' },
  },
});

export const ConfigService = {
  getAccessToken(): string | undefined {
    return config.get('accessToken');
  },

  setAccessToken(token: string): void {
    config.set('accessToken', token);
  },

  getRefreshToken(): string | undefined {
    return config.get('refreshToken');
  },

  setRefreshToken(token: string): void {
    config.set('refreshToken', token);
  },

  getApiUrl(): string {
    return config.get('apiUrl') || 'http://localhost:3002';
  },

  setApiUrl(url: string): void {
    config.set('apiUrl', url);
  },

  getUserEmail(): string | undefined {
    return config.get('userEmail');
  },

  setUserEmail(email: string): void {
    config.set('userEmail', email);
  },

  clearAuth(): void {
    config.delete('accessToken');
    config.delete('refreshToken');
    config.delete('userEmail');
  },

  isLoggedIn(): boolean {
    return !!config.get('accessToken');
  },

  getAll(): AkiConfig {
    return config.store;
  },
};
