// Shared MedBuddy client controller for medications, symptoms, appointments, settings, and insights
(() => {
  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('currentUser') || 'null');
    } catch {
      return null;
    }
  }

  function getUserEmail() {
    return getCurrentUser()?.emailId || 'demo@medbuddy.local';
  }

  async function api(url, options = {}) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Wire registration form to backend API when available
    const regForm = document.getElementById('registrationForm');
    if (regForm) {
      regForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        const alertBox = document.getElementById('alertBox');
        const username = document.getElementById('username')?.value.trim();
        const email = document.getElementById('email')?.value.trim();
        const password = document.getElementById('password')?.value.trim();
        const confirmPassword = document.getElementById('confirmPassword')?.value.trim();
        const phone = document.getElementById('phone')?.value.trim();

        const showAlert = (msg, type) => {
          if (alertBox) alertBox.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
        };

        if (password !== confirmPassword) return showAlert('Passwords do not match.', 'danger');
        try {
          await api('/api/users/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password, phone }),
          });
          showAlert('Registration successful! Redirecting to login...', 'success');
          setTimeout(() => { window.location.href = 'login.html'; }, 1000);
        } catch (err) {
          showAlert(err.message, 'danger');
        }
      }, true);
    }

    // Wire symptom tracker form
    const symptomForm = document.getElementById('symptomForm');
    if (symptomForm) {
      symptomForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        const symptom = document.getElementById('symptom')?.value.trim();
        const notes = document.getElementById('notes')?.value.trim();
        if (!symptom) return;
        try {
          await api('/api/symptoms', {
            method: 'POST',
            body: JSON.stringify({ email: getUserEmail(), symptom, notes }),
          });
          symptomForm.reset();
          alert('Symptom logged!');
        } catch (err) {
          alert(err.message);
        }
      }, true);
    }

    // Wire settings form
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
      settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        const notifications = document.getElementById('notifications')?.value || 'Enabled';
        const privacy = document.getElementById('privacy')?.value || 'Standard';
        try {
          await api('/api/users/settings', {
            method: 'PUT',
            body: JSON.stringify({ email: getUserEmail(), notifications, privacy }),
          });
          alert('Settings saved!');
        } catch (err) {
          alert(err.message);
        }
      }, true);
    }

    // Wire medication form & history
    const medForm = document.getElementById('medicationForm');
    if (medForm) {
      medForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        const name = document.getElementById('medication')?.value.trim();
        const dosage = document.getElementById('dosage')?.value.trim();
        if (!name || !dosage) return;
        try {
          const data = await api('/api/medications', {
            method: 'POST',
            body: JSON.stringify({ email: getUserEmail(), name, dosage }),
          });
          const history = document.querySelector('.med-history');
          if (history && data.medication) {
            const row = document.createElement('div');
            row.className = 'med-item';
            row.innerHTML = `<span>${data.medication.name} - ${data.medication.dosage}</span><span class="status active">Active</span>`;
            history.appendChild(row);
          }
          medForm.reset();
        } catch (err) {
          alert(err.message);
        }
      }, true);
    }

    // Wire appointment form
    const apptForm = document.getElementById('appointmentForm');
    if (apptForm) {
      apptForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const doctorName = document.getElementById('doctorName')?.value.trim();
        const department = document.getElementById('department')?.value;
        const apptDate = document.getElementById('apptDate')?.value;
        const apptTime = document.getElementById('apptTime')?.value;
        try {
          const data = await api('/api/appointments', {
            method: 'POST',
            body: JSON.stringify({ email: getUserEmail(), doctorName, department, apptDate, apptTime }),
          });
          const tbody = document.getElementById('upcomingAppointmentsBody');
          if (tbody && data.appointment) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${data.appointment.doctor_name}</td><td>${data.appointment.department}</td><td>${data.appointment.appt_date}</td><td>${data.appointment.appt_time}</td><td><span class="badge bg-success">${data.appointment.status}</span></td>`;
            tbody.prepend(tr);
          }
          apptForm.reset();
        } catch (err) {
          alert(err.message);
        }
      });
    }
  });
})();
