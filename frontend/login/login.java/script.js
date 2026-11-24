const passwordInput = document.querySelector("#password");
const passwordToggle = document.querySelector(".password-toggle");
const loginForm = document.querySelector(".login-form");
const submitButton = document.querySelector(".submit-button");

passwordToggle.addEventListener("click", () => {
  const isVisible = passwordInput.type === "text";
  passwordInput.type = isVisible ? "password" : "text";
  passwordToggle.setAttribute("aria-pressed", String(!isVisible));
  passwordToggle.setAttribute(
    "aria-label",
    isVisible ? "Tampilkan kata sandi" : "Sembunyikan kata sandi",
  );
});

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  const errorNode = document.querySelector("#loginError");
  errorNode.hidden = true;
  submitButton.disabled = true;
  submitButton.querySelector("span").textContent = "Memproses...";
  const originalLabel = "Masuk ke Dashboard";
  try {
    const response = await fetch(`${window.CIPTA_API_BASE || ""}/api/admin/login`, {
      method: "POST",
      credentials: "same-origin",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        username: loginForm.elements.username.value.trim(),
        password: loginForm.elements.password.value
      })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "Login gagal. Periksa username dan kata sandi.");
    window.location.assign("../dashboard/dashboard.html");
  } catch (error) {
    errorNode.textContent = error.message || "Server tidak dapat dihubungi. Coba lagi.";
    errorNode.hidden = false;
    submitButton.disabled = false;
    submitButton.querySelector("span").textContent = originalLabel;
  }
});
