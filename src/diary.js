import { supabase } from "./supabase.js"; 

let selectedDate = new Date();

const dateDisplay = document.getElementById("date-display");
const prevBtn     = document.getElementById("prev-day");
const nextBtn     = document.getElementById("next-day");
const logoutBtn   = document.getElementById("logout-btn");
const foodListEl  = document.getElementById("food-list");
const ctx         = document.getElementById("daily-summary-chart").getContext("2d");

let summaryChart;

document.addEventListener("DOMContentLoaded", () => {
  prevBtn.addEventListener("click", () => changeDay(-1));
  nextBtn.addEventListener("click", () => changeDay(1));
  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    location.href = "/index.html";
  });
  renderForDate(selectedDate);
});

function changeDay(offset) {
  selectedDate.setDate(selectedDate.getDate() + offset);
  renderForDate(selectedDate);
}

async function renderForDate(date) {

  dateDisplay.textContent = date.toLocaleDateString(undefined, {
    weekday:"long", year:"numeric", month:"long", day:"numeric"
  });

  // Get session
  const { data:{ session } } = await supabase.auth.getSession();
  if (!session) return location.href = "/index.html";
  const userId = session.user.id;

// fetching user’s targets from `profiles`
    const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("calorie_target,protein,carbs,fat")
    .eq("user_id", userId)
    .single();
    console.log("Fetched profile data:", prof, "Error:", profErr);

    let targets = { calorie_target: 0, protein: 0, carbs: 0, fat: 0 };
    if (prof) {
    const calories = prof.calorie_target || 0;
    const pPct = prof.protein || 0;
    const cPct = prof.carbs || 0;
    const fPct = prof.fat || 0;
// compute gram targets: calories * percentage / (4 for protein/carbs, 9 for fat)
  targets = {
    calorie_target: calories,
    protein: (pPct / 100) * calories / 4,
    carbs: (cPct / 100) * calories / 4,
    fat: (fPct / 100) * calories / 9
  };
  } else if (profErr) {
  console.error("Error fetching profile:", profErr);
  dateDisplay.textContent = "Error loading profile data. Please check your profile setup.";
  } else {
  console.warn("No profile data found for user:", userId);
  dateDisplay.textContent = "No profile data found. Please set up your targets in the Profile section.";
  }

  // fetch that day’s foods
  const start = new Date(date); start.setHours(0,0,0,0);
  const end   = new Date(date); end.setHours(23,59,59,999);

  const { data: foods, error: foodErr } = await supabase
    .from("consumed_foods")
    .select("food_name,serving_grams,calories,protein,carbs,fat,consumed_at")
    .eq("user_id", userId)
    .gte("consumed_at", start.toISOString())
    .lte("consumed_at", end.toISOString())
    .order("consumed_at", { ascending: true });

  if (foodErr) console.error(foodErr);

  //sum up macros & calories
  const sums = foods.reduce((acc, f) => {
    acc.calories += Number(f.calories);
    acc.protein  += Number(f.protein);
    acc.carbs    += Number(f.carbs);
    acc.fat      += Number(f.fat);
    return acc;
  }, { calories:0, protein:0, carbs:0, fat:0 });

  // chart draw or update
  drawSummaryChart(sums, targets);

  // render
  foodListEl.innerHTML = foods.map(f => {
    const time = new Date(f.consumed_at).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
    return `
      <div class="list-group-item">
        <strong>${f.food_name}</strong> 
        <small class="text-muted">(${time})</small>
        <div>
          Cal: ${f.calories} kcal | P: ${f.protein} g | C: ${f.carbs} g | F: ${f.fat} g
        </div>
      </div>
    `;
  }).join("");
}

function drawSummaryChart(sums, targets) {
  const labels = ["Calories","Carbs","Protein","Fat"];
  const dataConsumed = [ sums.calories, sums.carbs, sums.protein, sums.fat ];
  const dataTargets  = [ targets.calorie_target, targets.carbs, targets.protein, targets.fat ];

  const cfg = {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label:"Consumed", data: dataConsumed, backgroundColor:"rgba(11, 181, 42, 0.7)" },
        { label:"Target",   data: dataTargets,  backgroundColor:"rgba(200,200,200,0.3)" }
      ]
    },
    options: {
      indexAxis: "y",
      scales: { x: { beginAtZero:true } },
      responsive: true,
      plugins: { legend: { position:"bottom" } }
    }
  };

  if (summaryChart) {
    summaryChart.data = cfg.data;
    summaryChart.options = cfg.options;
    summaryChart.update();
  } else {
    summaryChart = new Chart(ctx, cfg);
  }
}
