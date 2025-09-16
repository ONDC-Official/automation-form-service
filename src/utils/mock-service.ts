import axios from 'axios';
import logger from '@ondc/automation-logger';
import { RedisService } from 'ondc-automation-cache-lib';
export async function callMockService(domain: any, submissionData: any, submission_id: string) {
  // const submissionUrl = `${process.env.MOCK_SERVICE_URL?.replace("domain",domain)}/flow/new`
  const submissionUrl = await buildMockBaseURL('flows/proceed', submissionData.session_id);

  const mockSubmitData = {
    ...submissionData,
    inputs: {
      submission_id: submission_id,
    },
    json_path_changes: {},
  };
  console.log('Calling mock service with data:', mockSubmitData, 'to URL:', submissionUrl);
  const result = await axios.post(submissionUrl, mockSubmitData);
  console.log(result);
}

export const buildMockBaseURL = async (url: string, sessionId: string) => {
  const sessionData = await getSessionService(sessionId);

  const mockUrl = process.env.MOCK_SERVICE_URL as string;
  if (mockUrl.includes('localhost')) {
    logger.info('Mock service is running in localhost');
    const newUrl = `${process.env.MOCK_SERVICE_URL as string}/${sessionData.domain}/${url}`;
    return newUrl;
  }
  const generatedURL = `${process.env.MOCK_SERVICE_URL as string}/${
    sessionData.domain
  }/${sessionData.version}/${url}`;

  logger.info('generated mock url: ' + generatedURL);
  return generatedURL;
};

export const getSessionService = async (sessionId: string) => {
  try {
    const sessionData = await RedisService.getKey(sessionId);
    if (!sessionData) {
      throw new Error('Session not found');
    }
    return JSON.parse(sessionData) as any;
  } catch (e: any) {
    logger.error('Error fetching session', e);
    throw new Error('Error fetching session');
  }
};
