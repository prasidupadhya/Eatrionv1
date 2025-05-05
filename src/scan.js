import * as tf from "@tensorflow/tfjs";
import { supabase } from "./supabase.js";

let model, labels, imageSize;
const USDA_KEY = import.meta.env.VITE_USDA_API_KEY;

// state for “Add to Diary”
window.currentFood = null;
window.currentNutrition = { calories:0, protein:0, carbs:0, fat:0 };

// load model & metadata
async function init() {
  console.log("Loading model and metadata…");
  const meta = await fetch("/model/metadata.json").then(r => r.json());
  labels = meta.labels;
  imageSize = meta.imageSize;
  model = await tf.loadLayersModel("/model/model.json");
  console.log(`Model loaded with ${labels.length} classes.`);
}

document.addEventListener("DOMContentLoaded", () => {
  const fileInput    = document.getElementById("file-input");
  const gramsInput   = document.getElementById("serving-size");
  const gramsDisplay = document.getElementById("serving-value");
  const logoutBtn    = document.getElementById("logout-btn");

  // logout
  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "/index.html";
  });

  fileInput.disabled = true;
  init().then(() => (fileInput.disabled = false));

  // handle image selection
  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file || !model) return;

    document.getElementById("prediction").textContent = "";
    document.getElementById("nutrition-info").innerHTML = "";

    // preview the image
    const imgEl = document.getElementById("preview");
    imgEl.src = URL.createObjectURL(file);
    await imgEl.decode();

    // serving grams 100 by defaut
    const grams = parseFloat(gramsInput.value) || 100;
    gramsDisplay.textContent = `${grams} g`;

    await classifyAndFetch(imgEl, grams);
    fileInput.value = ""; // allow same file re-upload
  });

  // re-fetch on grams change
  gramsInput.addEventListener("input", async () => {
    const grams = parseFloat(gramsInput.value) || 100;
    gramsDisplay.textContent = `${grams} g`;
    const food = window.currentFood;
    if (food) await fetchNutrition(food, grams);
  });
});

// classify image and fetch nutrition
async function classifyAndFetch(imgEl, grams) {
  const tensor = tf.browser
    .fromPixels(imgEl)
    .resizeBilinear([imageSize, imageSize])
    .expandDims(0)
    .toFloat()
    .div(127.5)
    .sub(1);

  const preds = model.predict(tensor);
  const data  = await preds.data();
  tensor.dispose();

  const sorted = Array.from(data.entries())
    .map(([i, v]) => ({ i, v }))
    .sort((a, b) => b.v - a.v);

  const threshold = 0.52;
  const predEl = document.getElementById("prediction");
  let chosenFood;

  if (sorted[0].v >= threshold) {
    chosenFood = labels[sorted[0].i];
    predEl.textContent = chosenFood;
  } else {
    const options = sorted.slice(0,3).map(o => labels[o.i]);
    predEl.innerHTML = "Maybe: " +
      options.map(opt =>
        `<button type="button" class="btn btn-link suggestion-option" data-food="${opt}">${opt}</button>`
      ).join(", ");
    chosenFood = options[0];
    predEl.querySelectorAll(".suggestion-option").forEach(btn => {
      btn.addEventListener("click", async () => {
        predEl.textContent = btn.dataset.food;
        await fetchNutrition(btn.dataset.food, grams);
      });
    });
  }

  window.currentFood = chosenFood;
  await fetchNutrition(chosenFood, grams);
}


// usda => fetch nutrition info 
async function fetchNutrition(foodName, grams) {
  const infoEl = document.getElementById("nutrition-info");
  infoEl.innerHTML = `<p>Loading nutrition for <em>${foodName}</em>…</p>`;

  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("query", foodName);
  url.searchParams.set("pageSize", "1");
  url.searchParams.set("api_key", USDA_KEY);

  try {
    const res  = await fetch(url);
    if (!res.ok) throw new Error(res.statusText);
    const json = await res.json();
    const foods = json.foods;
    if (!foods?.length) {
      infoEl.innerHTML = `<p>No data for <em>${foodName}</em>.</p>`;
      return;
    }

    const nuts   = foods[0].foodNutrients;
    const factor = grams / 100;
    const nutObj = {};

    // capture macros
    [
      ["Energy","calories"],
      ["Total lipid (fat)","fat"],
      ["Protein","protein"],
      ["Carbohydrate, by difference","carbs"]
    ].forEach(([key, prop]) => {
      const nut = nuts.find(n => n.nutrientName === key);
      nutObj[prop] = nut ? +(nut.value * factor).toFixed(1) : 0;
    });
    window.currentNutrition = nutObj;

    // render full list
    const mapping = [
      { key:"Energy",                       label:"Calories",         unit:"kcal"   },
      { key:"Total lipid (fat)",            label:"Fat",              unit:"g"      },
      { key:"Protein",                      label:"Protein",          unit:"g"      },
      { key:"Carbohydrate, by difference",  label:"Carbs",            unit:"g"      },
      { key:"Vitamin A, RAE",               label:"Vitamin A",        unit:"µg RAE" },
      { key:"Vitamin C, total ascorbic acid",label:"Vitamin C",       unit:"mg"     },
      { key:"Calcium, Ca",                  label:"Calcium",          unit:"mg"     },
      { key:"Iron, Fe",                     label:"Iron",             unit:"mg"     },
      { key:"Potassium, K",                 label:"Potassium",        unit:"mg"     },
    ];

    const list = mapping.map(m => {
      const it = nuts.find(n => n.nutrientName === m.key);
      if (!it) return `<li>${m.label}: N/A</li>`;
      const val = (it.value * factor).toFixed(1);
      return `<li>${m.label}: ${val} ${m.unit}</li>`;
    }).join("");

    infoEl.innerHTML = `
      <h5>Nutrition for ${grams} g of ${foodName}</h5>
      <ul>${list}</ul>
    `;

    // append Add to Diary
    let btn = document.getElementById("add-btn");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "add-btn";
      btn.textContent = "Add to Diary";
      btn.className = "btn btn-success mt-2";
      infoEl.append(btn);
      btn.addEventListener("click", saveToDiary);
    }
  }
  catch(err) {
    console.error(err);
    infoEl.innerHTML = `<p>Error fetching nutrition.</p>`;
  }
}


// saving to supabase diary
async function saveToDiary() {
  // get session
  const { data: { session }, error: sessErr } = await supabase.auth.getSession();
  if (sessErr || !session) {
    return alert("Please log in to save your food.");
  }
  const userId = session.user.id;

  // build payload
  const { calories, protein, carbs, fat } = window.currentNutrition;
  const food_name      = window.currentFood;
  const serving_grams  = +document.getElementById("serving-size").value || 100;

  // insert
  const { error } = await supabase
    .from("consumed_foods")
    .insert({
      user_id:      userId,
      food_name,
      serving_grams,
      calories,
      protein,
      carbs,
      fat,
      consumed_at:  new Date().toISOString()
    });

  if (error) {
    console.error("Diary save error:", error);
    return alert("Failed to save to diary:\n" + error.message);
  }

  alert("Saved to diary!");
}
