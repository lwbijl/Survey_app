#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Generate runtime config from environment variables
const config = {
  REACT_APP_SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL || '',
  REACT_APP_SUPABASE_ANON_KEY: process.env.REACT_APP_SUPABASE_ANON_KEY || '',
  REACT_APP_API_URL: process.env.REACT_APP_API_URL || ''
};

// Write to public directory so it's accessible at runtime
const publicDir = path.join(__dirname, '..', 'public');
const configPath = path.join(publicDir, 'runtime-config.js');

const configContent = `window.ENV = ${JSON.stringify(config, null, 2)};`;

fs.writeFileSync(configPath, configContent, 'utf8');
console.log('Runtime config generated successfully');
console.log('Config:', config);
