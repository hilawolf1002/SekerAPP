module.exports = {
  apps: [{
    name: 'survey-phone-validator',
    script: 'survey_phone_validator.py',
    args: '--silent',
    interpreter: '/home/lior0334/venv/bin/python',
    cwd: '/home/lior0334/pseker/clear_json',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    log_file: './logs/survey-validator.log',
    out_file: './logs/survey-validator-out.log',
    error_file: './logs/survey-validator-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
