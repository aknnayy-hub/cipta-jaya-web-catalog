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

loginForm.addEventListener("submit", () => {
  submitButton.disabled = true;
  submitButton.querySelector("span").textContent = "Memproses...";
});
