import * as crypto from 'crypto';

function generateApiKey(prefix = 'emp_sync') {
    const timestamp = Date.now().toString(36);
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return `${prefix}_${timestamp}_${randomBytes}`;
}

const apiKey = generateApiKey();
console.log('Generated API Key:');
console.log(apiKey);
console.log('\nAdd this to your .env file:');
console.log(`EMPLOYEE_SYNC_API_KEY=${apiKey}`);
