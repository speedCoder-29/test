const users = [
  { username: "admin", password: "admin123", role: "admin" },
  { username: "user", password: "user123", role: "user" }
];

// Login page logic
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  const errorMsg = document.getElementById("errorMsg");
  const successMsg = document.getElementById("successMsg");

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    errorMsg.style.display = "none";
    successMsg.style.display = "none";

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
      errorMsg.textContent = "Please fill in all fields";
      errorMsg.style.display = "block";
      return;
    }

    const found = users.find(u => u.username === username && u.password === password);

    if (!found) {
      errorMsg.textContent = "Invalid username or password";
      errorMsg.style.display = "block";
      return;
    }

    sessionStorage.setItem("loggedInUser", JSON.stringify(found));
    successMsg.textContent = "Login successful! Redirecting...";
    successMsg.style.display = "block";

    setTimeout(() => {
      window.location.href = found.role === "admin" ? "admin.html" : "user.html";
    }, 1000);
  });
}

// Tab switching
function showTab(tab) {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const loginTab = document.getElementById("loginTab");
  const registerTab = document.getElementById("registerTab");
  const errorMsg = document.getElementById("errorMsg");
  const successMsg = document.getElementById("successMsg");

  errorMsg.style.display = "none";
  successMsg.style.display = "none";

  if (tab === "login") {
    loginForm.style.display = "block";
    registerForm.style.display = "none";
    loginTab.classList.add("active");
    registerTab.classList.remove("active");
  } else {
    loginForm.style.display = "none";
    registerForm.style.display = "block";
    loginTab.classList.remove("active");
    registerTab.classList.add("active");
  }
}

// Registration logic
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const errorMsg = document.getElementById("errorMsg");
    const successMsg = document.getElementById("successMsg");
    errorMsg.style.display = "none";
    successMsg.style.display = "none";

    const username = document.getElementById("regUsername").value.trim();
    const password = document.getElementById("regPassword").value.trim();
    const confirm = document.getElementById("regConfirm").value.trim();

    if (!username || !password || !confirm) {
      errorMsg.textContent = "Please fill in all fields";
      errorMsg.style.display = "block";
      return;
    }

    if (password !== confirm) {
      errorMsg.textContent = "Passwords do not match";
      errorMsg.style.display = "block";
      return;
    }

    if (users.find(u => u.username === username)) {
      errorMsg.textContent = "Username already taken";
      errorMsg.style.display = "block";
      return;
    }

    users.push({ username, password, role: "user" });
    successMsg.textContent = "Account created! You can now sign in.";
    successMsg.style.display = "block";
    registerForm.reset();

    setTimeout(() => showTab("login"), 1500);
  });
}

// Dashboard auth guard
function checkAuth(requiredRole) {
  const data = sessionStorage.getItem("loggedInUser");
  if (!data) {
    window.location.href = "login.html";
    return null;
  }
  const user = JSON.parse(data);
  if (requiredRole && user.role !== requiredRole) {
    window.location.href = "login.html";
    return null;
  }
  return user;
}

function logout() {
  sessionStorage.removeItem("loggedInUser");
  window.location.href = "login.html";
}
