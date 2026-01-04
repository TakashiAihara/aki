import axios from 'axios';
import { ConfigService } from './config.service';
import { DeviceCodeResponse, TokenPair } from '@aki/shared';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';

interface DeviceTokenResponse extends TokenPair {
  error?: string;
}

export const AuthService = {
  async initiateDeviceFlow(): Promise<DeviceCodeResponse> {
    const response = await axios.post<DeviceCodeResponse>(
      `${USER_SERVICE_URL}/api/v1/auth/device/code`,
      {},
    );
    return response.data;
  },

  async pollForToken(deviceCode: string): Promise<DeviceTokenResponse> {
    const response = await axios.post<DeviceTokenResponse>(
      `${USER_SERVICE_URL}/api/v1/auth/device/token`,
      { deviceCode },
    );
    return response.data;
  },

  async refreshToken(): Promise<TokenPair | null> {
    const refreshToken = ConfigService.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await axios.post<TokenPair>(
        `${USER_SERVICE_URL}/api/v1/tokens/refresh`,
        {},
        {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
          },
        },
      );

      ConfigService.setAccessToken(response.data.accessToken);
      ConfigService.setRefreshToken(response.data.refreshToken);

      return response.data;
    } catch {
      ConfigService.clearAuth();
      return null;
    }
  },

  async logout(): Promise<void> {
    const accessToken = ConfigService.getAccessToken();
    if (accessToken) {
      try {
        await axios.post(
          `${USER_SERVICE_URL}/api/v1/auth/logout`,
          {},
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );
      } catch {
        // Ignore errors during logout
      }
    }
    ConfigService.clearAuth();
  },
};
