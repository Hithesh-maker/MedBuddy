// =======================
// ✅ Registration Validation
// =======================
const regForm = document.getElementById('registrationForm');
if (regForm) {
  regForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !email || !password) {
      alert('⚠️ All fields are required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('⚠️ Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      alert('⚠️ Password must be at least 6 characters long.');
      return;
    }

    // ✅ Get existing users or empty array
    const users = JSON.parse(localStorage.getItem('users')) || [];

    // ✅ Check if username or email already exists
    const userExists = users.some(u => u.username === username || u.email === email);
    if (userExists) {
      alert('❌ Username or email already exists.');
      return;
    }

    // ✅ Save new user
    const newUser = { username, email, password };
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));

    alert('✅ Registration successful!');
    window.location.href = "login.html"; // redirect to login
  });
}

// =======================
// ✅ Login Validation
// =======================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!username || !password) {
      alert('⚠️ All fields are required.');
      return;
    }

    // ✅ Get all users
    const users = JSON.parse(localStorage.getItem('users')) || [];

    // ✅ Check credentials
    const foundUser = users.find(u => u.username === username && u.password === password);

    if (foundUser) {
      // ✅ Save current logged-in user
      localStorage.setItem('currentUser', JSON.stringify(foundUser));

      alert(`✅ Login successful! Welcome ${foundUser.username} 🚀`);
      window.location.href = "index.html"; // redirect to homepage
    } else {
      alert('❌ Incorrect username or password.');
    }
  });
}

// =======================
// ✅ Profile Validation
// =======================
const profileForm = document.getElementById('profileForm');
if (profileForm) {
  profileForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const fullName = document.getElementById('fullName').value.trim();
    const address = document.getElementById('address').value.trim();
    const phone = document.getElementById('phone').value.trim();

    if (!fullName || !address || !phone) {
      alert('⚠️ All fields are required.');
      return;
    }
    if (!/^[0-9]{10}$/.test(phone)) {
      alert('⚠️ Phone number must be 10 digits.');
      return;
    }

    alert('✅ Profile updated successfully!');
  });
}

// =======================
// ✅ Logout Function
// =======================
function logout() {
  localStorage.removeItem('currentUser');
  alert("You have logged out ✅");
  window.location.href = "login.html";
}
