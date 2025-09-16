import { RedisService } from 'ondc-automation-cache-lib';
import { logger } from '../utils/logger';

RedisService.useDb(0);
export class SessionService {
  static async getSessionData(sessionId: string): Promise<any | null> {
    try {
      const exists = await RedisService.keyExists(sessionId);
      if (!exists) {
        logger.error(`Session not found for transaction ID: ${sessionId}`);
        return null;
      }

      const rawData = await RedisService.getKey(sessionId);
      if (!rawData) {
        logger.error(`No data found for transaction ID: ${sessionId}`);
        return null;
      }

      return JSON.parse(rawData);
    } catch (error) {
      logger.error('Error getting session data:', error);
      throw error;
    }
  }

  static async updateSessionData(sessionId: string, sessionData: any): Promise<boolean> {
    try {
      await RedisService.setKey(sessionId, JSON.stringify(sessionData));
      return true;
    } catch (error) {
      logger.error('Error updating session data:', error);
      throw error;
    }
  }
}
