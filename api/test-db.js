// A public diagnostic endpoint must never insert data into production.
export default function handler(req, res) {
  return res.status(410).json({ error: 'Diagnóstico retirado' });
}
