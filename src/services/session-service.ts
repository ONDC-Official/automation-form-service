
import { SessionService } from './mock-session-service';
import logger from '@ondc/automation-logger';

/**
 * Saves form data to a dedicated Redis key `form_data_{transaction_id}`.
 * This key is NEVER overwritten by the mock service's HTML_FORM handler
 * or saveDataForConfig, so it survives the race condition.
 */
export const saveFormDataSeparately = async (
  formUrl: string,
  formData: Record<string, any>,
  transaction_id: string
): Promise<void> => {
  try {
    const key = `form_data_${transaction_id}`;
    const existing = await SessionService.getSessionData(key);
    const merged = {
      ...(existing || {}),
      [formUrl]: formData,
    };
    await SessionService.updateSessionData(key, merged);
    logger.info(`[form-service] Saved form_data to dedicated key: ${key}`, { formUrl, fields: Object.keys(formData) });
    console.log(`[form-service] Dedicated form_data key ${key} saved with fields:`, Object.keys(formData));
  } catch (error) {
    logger.error('Error saving form data separately:', error);
    throw error;
  }
};

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
    if (sessionData.form_data.down_payment_form) {
      sessionData.updateDownpayment = sessionData.form_data.down_payment_form.updateDownpayment
    }
    console.log("form_data", JSON.stringify(form_data))
    console.log("sessionData", JSON.stringify(sessionData))
    if (!sessionData) {
      SessionService.updateSessionData(transaction_id, {
        form_data,
      });
    } else {
      sessionData.form_data = form_data;

      await SessionService.updateSessionData(transaction_id, sessionData);
    }
    //get sessionData after update
    const updatedSessionData = await SessionService.getSessionData(transaction_id);
    console.log("updatedSessionData", JSON.stringify(updatedSessionData))
    console.log("updatedSessionDataFormData", JSON.stringify(updatedSessionData.form_data))

  } catch (error) {
    console.error('Error updating session:', error);
    throw error;
  }
};

export const updateMainSessionWithFormSubmission = async (
  session_id: string, transaction_id: string, submission_id: string, formUrl?: string, idType?: string): Promise<void> => {
  try {
    // Create unique key using transactionId and formUrl to distinguish multiple forms in same transaction
    const formKey = formUrl ? `${transaction_id}_${formUrl}` : transaction_id;

    console.log(`Updating main session ${session_id} to mark form ${formKey} as submitted`);
    console.log(`🔴 [FORM-SERVICE] updateMainSessionWithFormSubmission called with:`);
    console.log(`   session_id: "${session_id}"`);
    console.log(`   transaction_id: "${transaction_id}"`);
    console.log(`   submission_id: "${submission_id}"`);
    console.log(`   formUrl: "${formUrl}"`);
    console.log(`   formKey: "${formKey}"`);

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

    // Mark this specific form as submitted using unique key (transactionId_formUrl)
    sessionData.formSubmissions[formKey] = {
      submitted: true,
      submission_id: submission_id,
      timestamp: new Date().toISOString(),
      formUrl: formUrl || '',
      ...(idType && { idType }),
    };

    console.log(`About to save formSubmissions:`, JSON.stringify(sessionData.formSubmissions, null, 2));

    // Save back to Redis
    await SessionService.updateSessionData(session_id, sessionData);
    console.log(`✅ Main session updated: formSubmissions[${formKey}] =`, sessionData.formSubmissions[formKey]);

    // Verify it was saved correctly
    const verifyData = await SessionService.getSessionData(session_id);
    console.log(`🔍 Verification - formSubmissions after save:`, verifyData.formSubmissions);
  } catch (error) {
    console.error('Error updating main session with form submission:', error);
    throw error;
  }
};

