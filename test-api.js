import { config } from 'dotenv';
config({ path: '.env.production.local' });
import handler from './api/send-notification.js';

const req = {
  method: 'POST',
  body: {
    title: 'Test',
    body: 'Test notification',
    secret: process.env.ADMIN_SECRET
  }
};

const res = {
  status: (code) => ({
    json: (data) => {
      console.log('STATUS:', code, 'DATA:', data);
      return data;
    }
  })
};

handler(req, res).catch(console.error);
