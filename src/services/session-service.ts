
import axios from 'axios';
import { SessionService } from './mock-session-service';
import logger from '@ondc/automation-logger';

/**
 * Fires an HTTP POST callback to the subscriber URL after a successful form submission.
 * This is fire-and-forget — callback failures are logged but never thrown,
 * so they do NOT break the form submission flow.
 */
const sendCallbackToSubscriber = async (
  subscriberUrl: string,
  transaction_id: string,
  formUrl: string
): Promise<void> => {
  const callbackUrl = `${subscriberUrl}/callback`;
  const payload = {
    success: "true",
    message: "Form submitted successfully",
    transaction_id,
    form_id:formUrl
  };
  try {
    logger.info(`[form-service] Firing callback to subscriber`, { callbackUrl, transaction_id });
    const response = await axios.post(callbackUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    });
    logger.info(`[form-service] Callback response received`, { status: response.status, callbackUrl });
  } catch (err: any) {
    // Non-fatal: log and continue — form data is already persisted in Redis
    logger.error(`[form-service] Callback to subscriber failed (non-fatal)`, {
      callbackUrl,
      transaction_id,
      error: err?.message,
    });
  }
};

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
  session_id: string,
  transaction_id?: string
): Promise<void> => {
  try {
    const sessionData = await SessionService.getSessionData(session_id);
    formUrl = sessionData?.form_id;
    logger.info("session updated sessiondata", { subscriberUrl: sessionData?.subscriberUrl });
    const form_data = {
      ...sessionData?.form_data,
      [formUrl]: currentFormData,
    };
    if (!sessionData) {
      await SessionService.updateSessionData(session_id, {
        form_data,
      });
    } else {
      sessionData.form_data = form_data;
      await SessionService.updateSessionData(session_id, sessionData);
    }
    logger.info("session updated sessiondata", { subscriberUrl: sessionData?.subscriberUrl });
    // Fire callback to subscriber after successful session update
    if (transaction_id && sessionData?.subscriberUrl) {
      await sendCallbackToSubscriber(sessionData.subscriberUrl, transaction_id, formUrl);
    } else {
      logger.error(`[form-service] No subscriberUrl in session — skipping callback`, { transaction_id });
    }

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

