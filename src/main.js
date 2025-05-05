import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const qs   = id => document.getElementById(id);
const show = el => el.style.display = "block";
const hide = el => el.style.display = "none";

const loginForm     = qs("login-form");
const signupForm    = qs("signup-form");

const loginEmail    = qs("login-email");
const loginPassword = qs("login-password");
const loginBtn      = qs("login-btn");
const loginError    = qs("login-error");
const togglePwLogin = qs("toggle-pw-login");
const showSignup    = qs("show-signup");

const signupFirst   = qs("signup-first-name");
const signupLast    = qs("signup-last-name");
const signupEmail   = qs("signup-email");
const signupPw      = qs("signup-password");
const signupBtn     = qs("signup-btn");
const signupError   = qs("signup-error");
const togglePwSignup= qs("toggle-pw-signup");
const showLogin     = qs("show-login");

showSignup.addEventListener("click", e => {
  e.preventDefault();
  hide(loginForm);
  show(signupForm);
});
showLogin.addEventListener("click", e => {
  e.preventDefault();
  hide(signupForm);
  show(loginForm);
});

togglePwLogin.addEventListener("click", e => {
  e.preventDefault();
  loginPassword.type = loginPassword.type === "password" ? "text" : "password";
  togglePwLogin.textContent = loginPassword.type === "password" ? "Show" : "Hide";
});
togglePwSignup.addEventListener("click", e => {
  e.preventDefault();
  signupPw.type = signupPw.type === "password" ? "text" : "password";
  togglePwSignup.textContent = signupPw.type === "password" ? "Show" : "Hide";
});

// if already logged in, go to diary (skip auth page)
;(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) window.location.href = "/diary.html";
})();

signupForm.addEventListener("submit", async e => {
  e.preventDefault();
  signupError.textContent = "";

  const firstName = signupFirst.value.trim();
  const lastName  = signupLast.value.trim();
  const email     = signupEmail.value.trim();
  const password  = signupPw.value;

  if (!firstName || !lastName) {
    signupError.textContent = "First & last name required.";
    return;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { firstName, lastName }
    }
  });

  if (error) {
    signupError.textContent = error.message;
  } else {
    hide(signupForm);
    show(loginForm);
    loginError.textContent = "Check your email for a confirmation link.";
  }
});

loginForm.addEventListener("submit", async e => {
  e.preventDefault();
  loginError.textContent = "";

  const email    = loginEmail.value.trim();
  const password = loginPassword.value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    loginError.textContent = error.message;
  } else {
    // success → profile
    window.location.href = "/diary.html";
  }
});
