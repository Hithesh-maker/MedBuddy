export function handleMedicationRoutes({ method, pathname, url, body, db, sendJson }) {
  if (pathname === '/api/medications' && method === 'GET') {
    const email = (url.searchParams.get('email') || '').trim().toLowerCase();
    const rows = email
      ? db.prepare('SELECT * FROM medications WHERE LOWER(user_email) = ? ORDER BY id DESC').all(email)
      : db.prepare('SELECT * FROM medications ORDER BY id DESC').all();
    return sendJson(200, { success: true, medications: rows });
  }

  if (pathname === '/api/medications' && method === 'POST') {
    const email = String(body.email || 'demo@medbuddy.local').trim().toLowerCase();
    const name = String(body.name || '').trim();
    const dosage = String(body.dosage || '').trim();
    const status = ['active', 'completed', 'missed'].includes(body.status) ? body.status : 'active';

    if (!name || !dosage) {
      return sendJson(400, { success: false, error: 'Medication name and dosage are required.' });
    }
    const res = db.prepare(
      'INSERT INTO medications (user_email, name, dosage, status) VALUES (?, ?, ?, ?)',
    ).run(email, name, dosage, status);
    const created = db.prepare('SELECT * FROM medications WHERE id = ?').get(Number(res.lastInsertRowid));
    return sendJson(201, { success: true, medication: created });
  }

  const patchMatch = pathname.match(/^\/api\/medications\/(\d+)$/);
  if (patchMatch && method === 'PATCH') {
    const status = ['active', 'completed', 'missed'].includes(body.status) ? body.status : null;
    if (!status) return sendJson(400, { success: false, error: 'Invalid status.' });
    const res = db.prepare('UPDATE medications SET status = ? WHERE id = ?').run(status, Number(patchMatch[1]));
    if (res.changes === 0) return sendJson(404, { success: false, error: 'Medication not found.' });
    return sendJson(200, { success: true });
  }

  return false;
}
