module.exports = {
  apps: [
    {
      name: 'antifake-api',
      cwd: __dirname,
      script: './scripts/start-deploy.js',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1500M',
      kill_timeout: 10000,
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
