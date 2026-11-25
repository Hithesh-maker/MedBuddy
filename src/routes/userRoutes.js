import { hashPassword, verifyPassword } from '../config/database.js';

export function handleUserRoutes({ method, pathname, body, db, sendJson }) {
  if (method === 'POST' && (pathname === '/api/users/register' || pathname === '/register')) {
    const username = String(body.username || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const phone = String(body.phone || '').trim();

    if (!username || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6) {
      return sendJson(400, { success: false, error: 'Valid username, email, and password (min 6 chars) required.' });
    }
    if (phone && !/^\d{10}$/.test(phone)) {
      return sendJson(400, { success: false, error: 'Phone number must be 10 digits.' });
    }
    const exists = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)').get(username, email);
    if (exists) {
      return sendJson(409, { success: false, error: 'Username or email already exists.' });
    }
    db.prepare('INSERT INTO users (username, email, password_hash, phone) VALUES (?, ?, ?, ?)').run(
      username, email, hashPassword(password), phone,
    );
    return sendJson(201, {
      success: true,
      user: { userName: username, emailId: email, phone },
    });
  }

  if (method === 'POST' && (pathname === '/api/users/login' || pathname === '/search')) {
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)').get(username, username);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return sendJson(401, { success: false, error: 'Invalid credentials.' });
    }
    return sendJson(200, {
      success: true,
      user: {
        id: user.id,
        userName: user.username,
        emailId: user.email,
        phone: user.phone,
        address: user.address,
      },
    });
  }

  const profileMatch = pathname.match(/^\/(?:api\/users\/)?profile\/([^/]+)$/);
  if (profileMatch) {
    const email = decodeURIComponent(profileMatch[1]).toLowerCase();
    if (method === 'GET') {
      const user = db.prepare('SELECT username, email, address, phone, notifications, privacy_level, created_at FROM users WHERE LOWER(email) = ?').get(email);
      if (!user) return sendJson(404, { success: false, error: 'User not found.' });
      return sendJson(200, {
        success: true,
        profile: {
          username: user.username,
          email: user.email,
          address: user.address,
          phone: user.phone,
          notifications: user.notifications,
          privacy: user.privacy_level,
          dateAdded: user.created_at,
        },
      });
    }
    if (method === 'PUT') {
      const username = String(body.username || '').trim();
      const address = String(body.address || '').trim();
      const phone = String(body.phone || '').trim();
      if (!username || !address || !/^\d{10}$/.test(phone)) {
        return sendJson(400, { success: false, error: 'Valid username, address, and 10-digit phone required.' });
      }
      const res = db.prepare('UPDATE users SET username = ?, address = ?, phone = ? WHERE LOWER(email) = ?').run(
        username, address, phone, email,
      );
      if (res.changes === 0) return sendJson(404, { success: false, error: 'User not found.' });
      return sendJson(200, { success: true });
    }
  }

  if (method === 'PUT' && pathname === '/api/users/settings') {
    const email = String(body.email || 'demo@medbuddy.local').trim().toLowerCase();
    const notifications = body.notifications === 'Disabled' ? 'Disabled' : 'Enabled';
    const privacy = body.privacy === 'Strict' ? 'Strict' : 'Standard';
    db.prepare('UPDATE users SET notifications = ?, privacy_level = ? WHERE LOWER(email) = ?').run(
      notifications, privacy, email,
    );
    return sendJson(200, { success: true, settings: { notifications, privacy } });
  }

  if (method === 'POST' && (pathname === '/api/payments' || pathname === '/payment')) {
    const email = String(body.emailId || body.email || 'demo@medbuddy.local').trim().toLowerCase();
    const userName = String(body.userName || 'Patient').trim();
    const cardNumber = String(body.cardNumber || '');
    const amount = Number(body.amount || 100);
    if (!/^\d{16}$/.test(cardNumber) || !Number.isFinite(amount) || amount <= 0) {
      return sendJson(400, { success: false, error: 'Valid 16-digit card number and positive amount required.' });
    }
    const res = db.prepare(
      'INSERT INTO payments (user_email, user_name, card_last4, amount) VALUES (?, ?, ?, ?)',
    ).run(email, userName, cardNumber.slice(-4), amount);
    return sendJson(201, { success: true, paymentId: Number(res.lastInsertRowid), last4: cardNumber.slice(-4) });
  }

  return false;
}
