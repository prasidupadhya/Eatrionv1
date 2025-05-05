import { supabase } from "./supabase.js";

// helpers
const qs   = id => document.getElementById(id);
const greetEl     = qs("greeting");
const logoutBtn   = qs("logout-btn");
const form        = qs("profile-form");
const msgEl       = qs("profile-msg");
const calInput    = qs("calorie-target");
const protInput   = qs("protein-pct");
const carbsInput  = qs("carbs-pct");
const fatInput    = qs("fat-pct");
const protGramIn  = qs("protein-grams");
const carbsGramIn = qs("carbs-grams");
const fatGramIn   = qs("fat-grams");

// normalize macros so sum = 100
function normalize(changed) {
  let p = +protInput.value, c = +carbsInput.value, f = +fatInput.value;
  const vals = { protein:p, carbs:c, fat:f };
  const sumOthers = vals[changed==="protein"?"carbs":"protein"] 
                  + vals[changed==="fat"?"protein":"fat"];
  if (sumOthers === 0) {
    vals.protein = changed==="protein"? vals.protein : (100-vals.protein)/2;
    vals.carbs   = changed==="carbs"  ? vals.carbs   : (100-vals.carbs)/2;
    vals.fat     = changed==="fat"    ? vals.fat     : (100-vals.fat)/2;
  } else {
    const factor = (100 - vals[changed]) / sumOthers;
    for (let k of ["protein","carbs","fat"]) {
      if (k!==changed) vals[k] = Math.round(vals[k] * factor);
    }
  }
  protInput.value  = vals.protein;
  carbsInput.value = vals.carbs;
  fatInput.value   = vals.fat;
  computeGrams(); // Recalculate grams after normalization
}

[protInput, carbsInput, fatInput].forEach((el,i) => {
  const key = i===0?"protein": i===1?"carbs":"fat";
  el.addEventListener("input", () => normalize(key));
});

// compute gram equivalents
function computeGrams() {
  const calories = +calInput.value || 0;
  const pPct = +protInput.value || 0;
  const cPct = +carbsInput.value || 0;
  const fPct = +fatInput.value || 0;

  // cal per gram: protein/carbs = 4, fat = 9
  const pGrams = (pPct / 100) * calories / 4;
  const cGrams = (cPct / 100) * calories / 4;
  const fGrams = (fPct / 100) * calories / 9;

  protGramIn.textContent  = Math.round(pGrams);
  carbsGramIn.textContent = Math.round(cGrams);
  fatGramIn.textContent   = Math.round(fGrams);
}

calInput.addEventListener("input", computeGrams);
[protInput, carbsInput, fatInput].forEach(el => el.addEventListener("input", computeGrams));

logoutBtn.onclick = async () => {
  await supabase.auth.signOut();
  window.location.href = "/index.html";
};

// main
(async () => {
  // session & user
  const { data:{ session }} = await supabase.auth.getSession();
  if (!session) return window.location.href = "/index.html";
  const user = session.user;

  const { firstName="", lastName="" } = user.user_metadata;
  greetEl.textContent = `Hello, ${firstName} ${lastName}`;

  // load profile row
  let { data: profile, error } = await supabase
    .from("profiles")
    .select("calorie_target,protein,carbs,fat")
    .eq("user_id", user.id)
    .single();

  if (error && error.code!=="PGRST116") { 
    console.error(error);
    return; 
  }
  if (profile) {
    calInput.value   = profile.calorie_target;
    protInput.value  = profile.protein;
    carbsInput.value = profile.carbs;
    fatInput.value   = profile.fat;
  } else {
    // defaults
    protInput.value  = 30;
    carbsInput.value = 50;
    fatInput.value   = 20;
  }
  computeGrams(); // Compute grams after setting values
})();

// save form
form.onsubmit = async e => {
  e.preventDefault();
  msgEl.textContent = "";

  const { data:{ session }} = await supabase.auth.getSession();
  if (!session) return window.location.href = "/index.html";
  const user = session.user;

  const payload = {
    user_id:        user.id,
    calorie_target: +calInput.value,
    protein:        +protInput.value,
    carbs:          +carbsInput.value,
    fat:            +fatInput.value
  };

  const { error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    msgEl.textContent = `Error: ${error.message}`;
  } else {
    msgEl.textContent = "Profile saved!";
  }
};