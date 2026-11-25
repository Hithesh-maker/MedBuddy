export function handleAppointmentRoutes({ method, pathname, url, body, db, sendJson }) {
  if (pathname === '/api/appointments' && method === 'GET') {
    const email = (url.searchParams.get('email') || '').trim().toLowerCase();
    const rows = email
      ? db.prepare('SELECT * FROM appointments WHERE LOWER(user_email) = ? ORDER BY id DESC').all(email)
      : db.prepare('SELECT * FROM appointments ORDER BY id DESC').all();
    return sendJson(200, { success: true, appointments: rows });
  }

  if (pathname === '/api/appointments' && method === 'POST') {
    const email = String(body.email || 'demo@medbuddy.local').trim().toLowerCase();
    const doctorName = String(body.doctorName || '').trim();
    const department = String(body.department || 'General Medicine').trim();
    const apptDate = String(body.apptDate || '').trim();
    const apptTime = String(body.apptTime || '').trim();

    if (!doctorName || !apptDate || !apptTime) {
      return sendJson(400, { success: false, error: 'Doctor name, date, and time are required.' });
    }
    const res = db.prepare(
      'INSERT INTO appointments (user_email, doctor_name, department, appt_date, appt_time, status) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(email, doctorName, department, apptDate, apptTime, 'Confirmed');
    const created = db.prepare('SELECT * FROM appointments WHERE id = ?').get(Number(res.lastInsertRowid));
    return sendJson(201, { success: true, appointment: created });
  }

  const idMatch = pathname.match(/^\/api\/appointments\/(\d+)$/);
  if (idMatch && method === 'DELETE') {
    const del = db.prepare('DELETE FROM appointments WHERE id = ?').run(Number(idMatch[1]));
    if (del.changes === 0) return sendJson(404, { success: false, error: 'Appointment not found.' });
    return sendJson(200, { success: true });
  }

  return false;
}
