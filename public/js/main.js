// Global navigation & session helpers for MedBuddy
(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const currentUser = (() => {
      try { return JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { return null; }
    })();
    const welcome = document.getElementById('welcomeUser');
    if (welcome && currentUser?.userName) {
      welcome.textContent = `Welcome back, ${currentUser.userName}`;
    }
  });
})();
