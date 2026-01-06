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
console.log('=================================');
console.log('Runtime config generated successfully');
console.log('Environment variables available:');
console.log('  REACT_APP_SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('  REACT_APP_SUPABASE_ANON_KEY:', process.env.REACT_APP_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
console.log('  REACT_APP_API_URL:', process.env.REACT_APP_API_URL ? 'SET' : 'NOT SET');
console.log('Config values (masked):');
console.log('  SUPABASE_URL:', config.REACT_APP_SUPABASE_URL ? config.REACT_APP_SUPABASE_URL.substring(0, 20) + '...' : 'EMPTY');
console.log('  ANON_KEY:', config.REACT_APP_SUPABASE_ANON_KEY ? config.REACT_APP_SUPABASE_ANON_KEY.substring(0, 20) + '...' : 'EMPTY');
console.log('  API_URL:', config.REACT_APP_API_URL ? config.REACT_APP_API_URL : 'EMPTY');
console.log('=================================');
