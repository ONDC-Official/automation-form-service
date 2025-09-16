import { Router } from 'express';
import { getForm, submitForm } from '../controllers/form-controller';

const router = Router();

// Route to get/render form - supports both domain/form and direct form URLs
router.get('/:domain/:formUrl', getForm);
// router.get('/:formUrl', getForm);

// Route to handle form submission - supports both domain/form and direct form URLs
router.post('/:domain/:formUrl/submit', submitForm);
// router.post('/:formUrl/submit', submitForm);

export const formRoutes = router;