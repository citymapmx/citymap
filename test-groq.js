import fs from 'fs';
fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
  },
  body: JSON.stringify({
    model: 'llama-3.2-11b-vision-preview',
    messages: [{ role: 'user', content: 'test' }]
  })
}).then(res => res.json()).then(console.log);
