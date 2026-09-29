const fs = require('fs');

const path = 'src/components/SurpriseModal.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove the "Dejar que la IA decida" button block
// It's in step === 'mood'.
// It looks like:
/*
            <button onClick={() => setStep('ai_vibe')} className="press" style={{
              gridColumn: '1 / -1',
              background: 'transparent',
              border: `1px solid ${dBorder}`,
              borderRadius: 16, padding: '16px 14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
            }}>
              <span style={{ fontSize: 24, lineHeight: 1 }}>🤖</span>
              <div style={{ fontSize: 14, fontWeight: 700, color: dText, lineHeight: 1.2 }}>Dejar que la IA decida</div>
            </button>
*/
content = content.replace(/<button onClick=\{\(\) => setStep\('ai_vibe'\)\} className="press" style=\{\{[\s\S]*?Dejar que la IA decida<\/div>\n\s*<\/button>/, '');

// 2. Remove the "IA decide" button from step === 'result'
// It looks like:
/*
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={() => setStep('mood')} style={{ flex: 1, background: 'transparent', border: `1.5px solid ${dBorder}`, borderRadius: 14, padding: 12, fontWeight: 700, fontSize: 13, color: dSub, cursor: 'pointer', fontFamily: 'inherit' }}>← Cambiar mood</button>
              <button onClick={() => setStep('ai_vibe')} style={{ flex: 1, background: 'transparent', border: `1.5px solid ${dark ? 'rgba(139,92,246,0.4)' : '#DDD6FE'}`, borderRadius: 14, padding: 12, fontWeight: 700, fontSize: 13, color: dark ? '#C4B5FD' : '#7C3AED', cursor: 'pointer', fontFamily: 'inherit' }}>🤖 IA decide</button>
            </div>
*/
// Replace with just the single "Cambiar mood" button taking full width
const oldButtons = `<div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={() => setStep('mood')} style={{ flex: 1, background: 'transparent', border: \`1.5px solid \${dBorder}\`, borderRadius: 14, padding: 12, fontWeight: 700, fontSize: 13, color: dSub, cursor: 'pointer', fontFamily: 'inherit' }}>← Cambiar mood</button>
              <button onClick={() => setStep('ai_vibe')} style={{ flex: 1, background: 'transparent', border: \`1.5px solid \${dark ? 'rgba(139,92,246,0.4)' : '#DDD6FE'}\`, borderRadius: 14, padding: 12, fontWeight: 700, fontSize: 13, color: dark ? '#C4B5FD' : '#7C3AED', cursor: 'pointer', fontFamily: 'inherit' }}>🤖 IA decide</button>
            </div>`;
const newButtons = `<div style={{ marginTop: 10 }}>
              <button onClick={() => setStep('mood')} style={{ width: '100%', background: 'transparent', border: \`1.5px solid \${dBorder}\`, borderRadius: 14, padding: 12, fontWeight: 700, fontSize: 13, color: dSub, cursor: 'pointer', fontFamily: 'inherit' }}>← Cambiar mood</button>
            </div>`;
content = content.replace(oldButtons, newButtons);

// 3. Remove the entire AI steps (ai_vibe, ai_loading, ai_result)
// I'll just remove them, or leave them since they are unreachable now. But it's cleaner to remove them.
content = content.replace(/\{\/\* ── STEP: AI VIBE PICKER ── \*\/\}[\s\S]*?\{\/\* ── END AI STEPS ── \*\/\}/, '');
// Since we might not have a clean END AI STEPS comment, let's just leave the dead code or try to cut it exactly. 
// Actually, it doesn't matter if the dead code is there, the user can't reach it. 
// But let's verify if there is any other way to reach it.
// The user just said "en estas secciones quita lo de la IA".

fs.writeFileSync(path, content);
console.log('Removed AI buttons!');
