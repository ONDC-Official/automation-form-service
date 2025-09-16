import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { FormConfig } from '../types/form-types';

interface DomainConfig {
  name: string;
  version: string;
  forms: Array<{
    name: string;
    url: string;
    path: string;
    type: string;
  }>;
}

interface ConfigData {
  domains: DomainConfig[];
}

class CentralConfigService {
  private config!: ConfigData;
  private formConfigs: Map<string, FormConfig> = new Map();

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      const configPath = path.join(__dirname, 'index.yaml');
      const configFile = fs.readFileSync(configPath, 'utf8');
      this.config = yaml.load(configFile) as ConfigData;
      // console.dir(this.config, { depth: null });
      this.processFormConfigs();
    } catch (error) {
      console.error('Error loading configuration:', error);
      throw error;
    }
  }

  private processFormConfigs(): void {
    for (const domain of this.config.domains) {
      for (const form of domain.forms) {
        const formKey = `${domain.name}/${form.url}`;
        const formConfig: FormConfig = {
          url: form.url,
          content: this.loadFormContent(domain.name, form.path),
          type: form.type
        };
        this.formConfigs.set(formKey, formConfig);
      }
    }
  }

  private loadFormContent(domainName: string, formPath: string): string {
    try {
      const htmlPath = path.join(__dirname, formPath, 'form.html');
      return fs.readFileSync(htmlPath, 'utf8');
    } catch (error) {
      console.error(`Error loading form content for ${formPath}:`, error);
      return '';
    }
  }

  async getFormConfig(formUrl: string): Promise<FormConfig | null> {
    // Try to find the form by URL pattern
    for (const [key, config] of this.formConfigs.entries()) {
      if (key.endsWith(`/${formUrl}`) || key === formUrl) {
        return config;
      }
    }
    return null;
  }

  getFormServiceConfig() {
    return {
      baseUrl: process.env.BASE_URL || 'http://localhost:3000',
      autoInjectSubmissionUrl: true,
    };
  }

  reloadConfig(): void {
    this.loadConfig();
  }
}

export const centralConfigService = new CentralConfigService();
