import { SessionService } from './mock-session-service';

export const updateSession = async (
  formUrl: string,
  currentFormData: Record<string, any>,
  transaction_id: string
): Promise<void> => {
  try {
    const sessionData = await SessionService.getSessionData(transaction_id);

    const form_data = {
      ...sessionData?.form_data,
      [formUrl]: currentFormData,
    };

    if (!sessionData) {
      SessionService.updateSessionData(transaction_id, {
        form_data,
      });
    } else {
      sessionData.form_data = form_data;

      await SessionService.updateSessionData(transaction_id, sessionData);
    }
  } catch (error) {
    console.error('Error updating session:', error);
    throw error;
  }
};
