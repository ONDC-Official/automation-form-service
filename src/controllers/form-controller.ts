import { Request, Response } from 'express';
import { FormConfig } from '../types/form-types';
import { centralConfigService } from '../config/central-config';
import { updateSession } from '../services/session-service';
import { callMockService } from '../utils/mock-service';
import ejs from 'ejs';
import { randomUUID } from 'crypto';

export const getForm = async (req: Request, res: Response) => {
  const { domain, formUrl } = req.params;
  const { session_id, flow_id, transaction_id } = req.query;
  // Determine the actual form URL to look up
  const actualFormUrl = domain ? `${domain}/${formUrl}` : formUrl;

  const formConfig = await centralConfigService.getFormConfig(actualFormUrl);

  if (!formConfig) {
    return res.status(404).json({ error: 'Form not found' });
  }

  // Get form service configuration for auto-injection
  const formServiceConfig = centralConfigService.getFormServiceConfig();
  const submitUrl = `${formServiceConfig.baseUrl}/forms/${actualFormUrl}/submit?flow_id=${flow_id}&session_id=${session_id}&transaction_id=${transaction_id}`;

  // Always load the form HTML from the config-specified path
  const htmlContent = formConfig.content;
  const submissionData = {
    session_id: session_id,
    transaction_id: transaction_id,
    flow_id: flow_id,
  };

  const newContent = ejs.render(htmlContent, {
    actionUrl: submitUrl,
    submissionData: JSON.stringify(submissionData),
  });
  if (formConfig.type == 'dynamic') {
    return res.set('Content-Type', 'application/html').send(newContent);
  } else {
    return res.type('html').send(newContent);
  }
};

export const submitForm = async (req: Request, res: Response) => {
  const { domain, formUrl } = req.params;
  const formData = req.body;
  const {session_id,flow_id,transaction_id} = req.query

  
  
  if(!session_id || !flow_id || !transaction_id){
    return res.status(400).send({error:true, message:"session_id or flow_id or transaction_id not found in submission url "})
  }

  const submissionData : any = {
    session_id:session_id,
    flow_id:flow_id,
    transaction_id:transaction_id
  }

  // Determine the actual form URL to look up
  const actualFormUrl = domain ? `${domain}/${formUrl}` : formUrl;

  const formConfig = await centralConfigService.getFormConfig(actualFormUrl);

  if (!formConfig) {
    return res.status(404).json({ error: 'Form not found' });
  }

  try {
    // Update session with form data using the custom function
    console.log('Updating session with form data:', formData);
    const submission_id = randomUUID();
    formData.form_submission_id = submission_id;
    await updateSession(formConfig.url, formData, submissionData.transaction_id);
    console.log('Session updated successfully');
    await callMockService(domain, submissionData, submission_id);
    // console.log('Mock service called successfully');
    res.json({ success: true, submission_id: submission_id });
  } catch (error) {
    console.error('Form submission error:', error);
    res.status(500).json({ error: 'Failed to process form submission' });
  }
};
