import path from 'path';
import { logger } from './logger';

export async function loadFunction(functionPath: string): Promise<Function> {
  try {
    // Convert relative path to absolute
    const absolutePath = path.resolve(process.cwd(), functionPath);
    
    // Import the function module
    const module = await import(absolutePath);
    
    // Most TypeScript files export default
    const fn = module.default || module;
    
    if (typeof fn !== 'function') {
      throw new Error(`Module at ${functionPath} does not export a function`);
    }
    
    return fn;
  } catch (error) {
    logger.error(`Failed to load function from ${functionPath}:`, error);
    throw error;
  }
}