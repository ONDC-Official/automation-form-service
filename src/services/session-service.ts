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

export const updateMainSessionWithFormSubmission = async (
  session_id: string,
  transaction_id: string,
  submission_id: string
): Promise<void> => {
  try {
    console.log(`Updating main session ${session_id} to mark transaction ${transaction_id} as submitted`);
    
    // Get the main session data
    const sessionData = await SessionService.getSessionData(session_id);
    
    if (!sessionData) {
      console.error(`Main session ${session_id} not found`);
      throw new Error(`Session ${session_id} not found`);
    }

    // Initialize formSubmissions object if it doesn't exist
    if (!sessionData.formSubmissions) {
      sessionData.formSubmissions = {};
    }

    // Mark this transaction's form as submitted
    sessionData.formSubmissions[transaction_id] = {
      submitted: true,
      submission_id: submission_id,
      timestamp: new Date().toISOString()
    };

    console.log(`About to save formSubmissions:`, JSON.stringify(sessionData.formSubmissions, null, 2));

    // Save back to Redis
    await SessionService.updateSessionData(session_id, sessionData);
    console.log(`✅ Main session updated: formSubmissions[${transaction_id}] =`, sessionData.formSubmissions[transaction_id]);
    
    // Verify it was saved correctly
    const verifyData = await SessionService.getSessionData(session_id);
    console.log(`🔍 Verification - formSubmissions after save:`, verifyData.formSubmissions);
  } catch (error) {
    console.error('Error updating main session with form submission:', error);
    throw error;
  }
};
