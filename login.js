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
