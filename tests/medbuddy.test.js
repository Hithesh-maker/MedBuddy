import assert from 'node:assert/strict';
import test from 'node:test';
import { createMedBuddyServer } from '../src/server.js';

async function startServer() {
  const { server, db } = createMedBuddyServer({ dbPath: ':memory:' });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(() => { db.close(); resolve(); })),
  };
}

test('MedBuddy full-stack user auth, profile, appointments, medications, symptoms, payments, and insights', async () => {
  const srv = await startServer();
  try {
    const health = await fetch(`${srv.baseUrl}/api/health`).then((r) => r.json());
    assert.equal(health.success, true);

    // Register & login (including legacy /search route used by login.html)
    const reg = await fetch(`${srv.baseUrl}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'alice',
        email: 'alice@example.com',
        password: 'password123',
        phone: '9123456789',
      }),
    });
    assert.equal(reg.status, 201);

    const login = await fetch(`${srv.baseUrl}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'alice', password: 'password123' }),
    });
    assert.equal(login.status, 200);
    const loginData = await login.json();
    assert.equal(loginData.user.emailId, 'alice@example.com');

    // Profile GET & PUT
    const profPut = await fetch(`${srv.baseUrl}/profile/alice@example.com`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'alice', address: 'Chennai, IN', phone: '9123456789' }),
    });
    assert.equal(profPut.status, 200);
    const profGet = await fetch(`${srv.baseUrl}/profile/alice@example.com`).then((r) => r.json());
    assert.equal(profGet.profile.address, 'Chennai, IN');

    // Appointments CRUD
    const apptRes = await fetch(`${srv.baseUrl}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice@example.com',
        doctorName: 'Dr. Kavitha',
        department: 'Neurology',
        apptDate: '2026-12-10',
        apptTime: '09:30',
      }),
    });
    assert.equal(apptRes.status, 201);
    const apptList = await fetch(`${srv.baseUrl}/api/appointments?email=alice@example.com`).then((r) => r.json());
    assert.equal(apptList.appointments.length, 1);

    // Medications CRUD
    const medRes = await fetch(`${srv.baseUrl}/api/medications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@example.com', name: 'Aspirin 75mg', dosage: 'Daily morning' }),
    });
    assert.equal(medRes.status, 201);
    const medJson = await medRes.json();
    const medPatch = await fetch(`${srv.baseUrl}/api/medications/${medJson.medication.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    assert.equal(medPatch.status, 200);

    // Symptoms & Insights
    const sympRes = await fetch(`${srv.baseUrl}/api/symptoms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@example.com', symptom: 'Headache', notes: 'After work', severity: 'mild' }),
    });
    assert.equal(sympRes.status, 201);

    const insRes = await fetch(`${srv.baseUrl}/api/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concern: 'headache' }),
    }).then((r) => r.json());
    assert.match(insRes.insight, /Hydrate/i);

    // Payment (legacy /payment route)
    const payRes = await fetch(`${srv.baseUrl}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userName: 'alice',
        emailId: 'alice@example.com',
        cardNumber: '1234567812345678',
        amount: 100,
      }),
    });
    assert.equal(payRes.status, 201);
    assert.equal((await payRes.json()).last4, '5678');

    // Static page check
    const apptPage = await fetch(`${srv.baseUrl}/appointments.html`);
    assert.equal(apptPage.status, 200);
    const apptHtml = await apptPage.text();
    assert.equal(apptHtml.includes('medications.html'), false);
  } finally {
    await srv.close();
  }
});
