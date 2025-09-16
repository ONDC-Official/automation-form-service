import express from 'express';
import { formRoutes } from './routes/form-routes';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the forms directory
app.use('/static', express.static('forms'));

// Form routes
app.use('/forms', formRoutes);

app.listen(PORT, () => {
  console.log(`Form service listening at http://localhost:${PORT}`);
});
