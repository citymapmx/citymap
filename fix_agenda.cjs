const fs = require('fs');

let code = fs.readFileSync('src/components/ReservationsAgenda.jsx', 'utf8');

// We know formatTimeAMPM is inside ReservationsAgenda. Let's move it to top.
const formatTimeMatch = code.match(/const formatTimeAMPM = \([^}]*?};/s);
if (formatTimeMatch) {
  code = code.replace(formatTimeMatch[0], '');
  // Insert it right before export default function
  code = code.replace('export default function ReservationsAgenda', formatTimeMatch[0] + '\n\nexport default function ReservationsAgenda');
}

// Now the Cards
const extractCard = (cardName) => {
  const startIdx = code.indexOf(`  const ${cardName} = ({ r }) => {`);
  if (startIdx === -1) return null;
  let braces = 0;
  let endIdx = -1;
  for (let i = startIdx; i < code.length; i++) {
    if (code[i] === '{') braces++;
    if (code[i] === '}') {
      braces--;
      if (braces === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }
  const original = code.substring(startIdx, endIdx);
  code = code.replace(original, '');
  
  // Modify it
  let modified = original.replace(`  const ${cardName} = ({ r }) => {`, `const ${cardName} = ({ r, getWhatsAppLink, updateStatus, deleteRes, T, dark, ownerView }) => {`);
  return modified.trim();
};

const pc = extractCard('PendingCard');
const cc = extractCard('ConfirmedCard');
const hc = extractCard('HistoryCard');

const allCards = [pc, cc, hc].filter(Boolean).join('\n\n');

// Insert them before export default function
code = code.replace('export default function ReservationsAgenda', allCards + '\n\nexport default function ReservationsAgenda');

// Update usages
code = code.replace(/<PendingCard key=\{r\.id\} r=\{r\} \/>/g, '<PendingCard key={r.id} r={r} getWhatsAppLink={getWhatsAppLink} updateStatus={updateStatus} deleteRes={deleteRes} T={T} dark={dark} ownerView={ownerView} />');
code = code.replace(/<ConfirmedCard key=\{r\.id\} r=\{r\} \/>/g, '<ConfirmedCard key={r.id} r={r} getWhatsAppLink={getWhatsAppLink} updateStatus={updateStatus} deleteRes={deleteRes} T={T} dark={dark} ownerView={ownerView} />');
code = code.replace(/<HistoryCard key=\{r\.id\} r=\{r\} \/>/g, '<HistoryCard key={r.id} r={r} getWhatsAppLink={getWhatsAppLink} updateStatus={updateStatus} deleteRes={deleteRes} T={T} dark={dark} ownerView={ownerView} />');

fs.writeFileSync('src/components/ReservationsAgenda.jsx', code);
console.log("Fixed ReservationsAgenda!");
