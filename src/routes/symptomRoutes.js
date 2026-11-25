export function generateHealthInsight(query) {
  const lower = String(query || '').toLowerCase();
  if (/\b(chest pain|shortness of breath|faint|emergency|severe bleeding)\b/.test(lower)) {
    return 'Urgent guidance: Seek immediate emergency medical attention or contact local emergency services right away.';
  }
  if (lower.includes('headache') || lower.includes('migraine')) {
    return 'Tip: Hydrate steadily, dim bright screens, rest in a quiet room, and seek medical care if pain persists or worsens.';
  }
  if (lower.includes('fatigue') || lower.includes('tired') || lower.includes('sleep')) {
    return 'Tip: Aim for consistent 7-8 hour sleep windows, drink water, and log recurring daytime fatigue for your clinician.';
  }
  if (lower.includes('cold') || lower.includes('cough') || lower.includes('fever')) {
    return 'Tip: Rest, drink warm fluids, monitor temperature, and consult a healthcare provider if fever persists over 48 hours.';
  }
  if (lower.includes('stress') || lower.includes('anxious')) {
    return 'Tip: Try 4-7-8 paced breathing, take a brief walk outdoors, and keep caffeine moderate.';
  }
  return 'Tip: Maintain steady hydration, balanced nutrition, daily light activity, and log symptoms consistently.';
}

export function handleSymptomRoutes({ method, pathname, url, body, db, sendJson }) {
  if (pathname === '/api/symptoms' && method === 'GET') {
    const email = (url.searchParams.get('email') || '').trim().toLowerCase();
    const rows = email
      ? db.prepare('SELECT * FROM symptoms WHERE LOWER(user_email) = ? ORDER BY id DESC').all(email)
      : db.prepare('SELECT * FROM symptoms ORDER BY id DESC').all();
    return sendJson(200, { success: true, symptoms: rows });
  }

  if (pathname === '/api/symptoms' && method === 'POST') {
    const email = String(body.email || 'demo@medbuddy.local').trim().toLowerCase();
    const symptom = String(body.symptom || '').trim();
    const notes = String(body.notes || '').trim();
    const severity = ['mild', 'moderate', 'severe'].includes(body.severity) ? body.severity : 'moderate';
    if (!symptom) {
      return sendJson(400, { success: false, error: 'Symptom description is required.' });
    }
    const res = db.prepare(
      'INSERT INTO symptoms (user_email, symptom, notes, severity) VALUES (?, ?, ?, ?)',
    ).run(email, symptom, notes, severity);
    const created = db.prepare('SELECT * FROM symptoms WHERE id = ?').get(Number(res.lastInsertRowid));
    return sendJson(201, { success: true, symptom: created });
  }

  if (pathname === '/api/insights' && method === 'POST') {
    const concern = String(body.concern || '').trim();
    if (!concern) return sendJson(400, { success: false, error: 'Health concern is required.' });
    return sendJson(200, { success: true, insight: generateHealthInsight(concern) });
  }

  return false;
}
