import { supabase, requireConfigured, requireMatchingSupabaseProject, renderConfigWarning } from "./app.js";

document.body.insertAdjacentHTML("afterbegin", renderConfigWarning());

const form = document.querySelector("form");
const message = document.querySelector("[data-message]");
const mode = document.body.dataset.authMode;

function setMessage(text, type = "info") {
  message.textContent = text;
  message.className = `form-message ${type}`;
}

function friendlyAuthError(error) {
  if (error?.message === "Failed to fetch") {
    return "Cannot connect to Supabase. Check that assets/config.js has the exact Project URL from Supabase Project Settings > API, and confirm your internet connection is active.";
  }
  return error?.message || "Something went wrong. Try again.";
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireConfigured()) return;
  if (!requireMatchingSupabaseProject()) {
    setMessage("Supabase URL and anon key are from different projects. Copy the anon public key from the same project as your Project URL.", "error");
    return;
  }
  const formData = new FormData(form);
  const email = formData.get("email");
  const password = formData.get("password");
  const fullName = formData.get("full_name");

  try {
    if (mode === "register") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });
      if (error) throw error;
      if (data.user) {
        setMessage("Registration completed. Login with the same email id and password.", "success");
        setTimeout(() => { window.location.href = "login.html"; }, 900);
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    window.location.href = "insurance.html";
  } catch (error) {
    setMessage(friendlyAuthError(error), "error");
  }
});

document.querySelector("[data-reset]")?.addEventListener("click", async () => {
  if (!requireConfigured()) return;
  const email = form.email.value;
  if (!email) {
    setMessage("Enter your email id first.", "error");
    return;
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login.html`
  });
  setMessage(error ? friendlyAuthError(error) : "Password recovery link sent to your email id.", error ? "error" : "success");
});
