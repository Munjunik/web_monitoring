function updateClock() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  document.getElementById("currentTime").textContent =
    `${year}-${month}-${date} ${hours}:${minutes}:${seconds}`;
}

setInterval(updateClock, 1000);
updateClock();

function formatTime(date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

const MAX_POINTS = 20;

// 현재 센서값
let currentLevel = null;
let currentTemp = null;
let currentPh = null;
let currentTds = null;

// 그래프용 데이터
const labels = [];
const levelData = [];
const tempData = [];
const phData = [];
const tdsData = [];

for (let i = MAX_POINTS - 1; i >= 0; i--) {
  const time = new Date(Date.now() - i * 1000);
  labels.push(formatTime(time));
  levelData.push(null);
  tempData.push(null);
  phData.push(null);
  tdsData.push(null);
}

function createRealtimeChart(canvasId, label, data, borderColor, bgColor, yMin, yMax) {
  const ctx = document.getElementById(canvasId).getContext("2d");

  return new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: label,
          data: data,
          borderColor: borderColor,
          backgroundColor: bgColor,
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 3,
          borderWidth: 2,
          spanGaps: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      normalized: true,
      interaction: {
        intersect: false,
        mode: "index"
      },
      plugins: {
        legend: {
          labels: {
            color: "#e5e7eb"
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#94a3b8",
            maxTicksLimit: 6
          },
          grid: {
            color: "#1e293b"
          }
        },
        y: {
          min: yMin,
          max: yMax,
          ticks: {
            color: "#94a3b8"
          },
          grid: {
            color: "#1e293b"
          }
        }
      }
    }
  });
}

const levelChart = createRealtimeChart(
  "levelChart",
  "수위",
  levelData,
  "#38bdf8",
  "rgba(56, 189, 248, 0.12)",
  0,
  500
);

const tempChart = createRealtimeChart(
  "tempChart",
  "수온",
  tempData,
  "#f59e0b",
  "rgba(245, 158, 11, 0.12)",
  0,
  40
);

const phChart = createRealtimeChart(
  "phChart",
  "pH",
  phData,
  "#a78bfa",
  "rgba(167, 139, 250, 0.12)",
  0,
  14
);

const tdsChart = createRealtimeChart(
  "tdsChart",
  "TDS",
  tdsData,
  "#34d399",
  "rgba(52, 211, 153, 0.12)",
  0,
  1000
);

function valueText(value, digit = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  return Number(value).toFixed(digit);
}

function updateSummary() {
  document.getElementById("levelValue").textContent =
    currentLevel !== null ? Number(currentLevel).toFixed(0) : "-";

  document.getElementById("tempValue").textContent =
    currentTemp !== null ? Number(currentTemp).toFixed(1) : "-";

  document.getElementById("phValue").textContent =
    currentPh !== null ? Number(currentPh).toFixed(2) : "-";

  document.getElementById("tdsValue").textContent =
    currentTds !== null ? Number(currentTds).toFixed(0) : "-";
}

function pushChartData() {
  const now = new Date();

  labels.push(formatTime(now));
  levelData.push(currentLevel);
  tempData.push(currentTemp);
  phData.push(currentPh);
  tdsData.push(currentTds);

  if (labels.length > MAX_POINTS) {
    labels.shift();
    levelData.shift();
    tempData.shift();
    phData.shift();
    tdsData.shift();
  }

  levelChart.update("none");
  tempChart.update("none");
  phChart.update("none");
  tdsChart.update("none");
}

// ---------- Event Log ----------
const eventLog = document.getElementById("eventLog");
const clearLogBtn = document.getElementById("clearLogBtn");

const NORMAL_RANGE = {
  level: { min: 280, max: 380 },
  temp: { min: 22.0, max: 28.0 },
  ph: { min: 6.4, max: 7.4 },
  tds: { min: 580, max: 780 }
};

function addLog(message, type = "sensor") {
  const item = document.createElement("div");
  item.className = `log-item ${type}`;
  item.innerHTML = `<span class="log-time">[${formatTime(new Date())}]</span>${message}`;

  eventLog.prepend(item);

  const maxLogs = 150;
  while (eventLog.children.length > maxLogs) {
    eventLog.removeChild(eventLog.lastChild);
  }
}

function addPeriodicSensorLog() {
  addLog(
    `센서 주기 기록 | 수위: ${valueText(currentLevel, 0)}mm / 수온: ${valueText(currentTemp, 1)}°C / pH: ${valueText(currentPh, 2)} / TDS: ${valueText(currentTds, 0)}ppm`,
    "sensor"
  );
}

let lastAlertTime = {
  level: 0,
  temp: 0,
  ph: 0,
  tds: 0
};

const ALERT_COOLDOWN_MS = 10000;

function canAlert(key) {
  const now = Date.now();

  if (now - lastAlertTime[key] > ALERT_COOLDOWN_MS) {
    lastAlertTime[key] = now;
    return true;
  }

  return false;
}

function checkAbnormalEvents() {
  if (
    currentLevel !== null &&
    (currentLevel < NORMAL_RANGE.level.min || currentLevel > NORMAL_RANGE.level.max) &&
    canAlert("level")
  ) {
    addLog(
      `수위센서 정상 범위에서 벗어남 (현재 ${currentLevel.toFixed(0)}mm, 정상 ${NORMAL_RANGE.level.min}~${NORMAL_RANGE.level.max}mm)`,
      "alert"
    );
  }

  if (
    currentTemp !== null &&
    (currentTemp < NORMAL_RANGE.temp.min || currentTemp > NORMAL_RANGE.temp.max) &&
    canAlert("temp")
  ) {
    addLog(
      `수온센서 정상 범위에서 벗어남 (현재 ${currentTemp.toFixed(1)}°C, 정상 ${NORMAL_RANGE.temp.min}~${NORMAL_RANGE.temp.max}°C)`,
      "alert"
    );
  }

  if (
    currentPh !== null &&
    (currentPh < NORMAL_RANGE.ph.min || currentPh > NORMAL_RANGE.ph.max) &&
    canAlert("ph")
  ) {
    addLog(
      `pH센서 정상 범위에서 벗어남 (현재 ${currentPh.toFixed(2)}, 정상 ${NORMAL_RANGE.ph.min}~${NORMAL_RANGE.ph.max})`,
      "alert"
    );
  }

  if (
    currentTds !== null &&
    (currentTds < NORMAL_RANGE.tds.min || currentTds > NORMAL_RANGE.tds.max) &&
    canAlert("tds")
  ) {
    addLog(
      `TDS센서 정상 범위에서 벗어남 (현재 ${currentTds.toFixed(0)}ppm, 정상 ${NORMAL_RANGE.tds.min}~${NORMAL_RANGE.tds.max}ppm)`,
      "alert"
    );
  }
}

async function fetchSensorData() {
  try {
    const response = await fetch("/api/sensors");

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    currentLevel = data.level;
    currentTemp = data.water_temp;
    currentPh = data.ph;
    currentTds = data.tds;

    updateSummary();
    pushChartData();
    checkAbnormalEvents();

  } catch (error) {
    console.error("sensor fetch error:", error);

    if (canAlert("fetch")) {
      addLog(`센서 API 연결 실패: ${error.message}`, "alert");
    }
  }
}

clearLogBtn.addEventListener("click", () => {
  eventLog.innerHTML = "";
  addLog("이벤트 로그가 초기화되었습니다.", "system");
});

addLog("시스템이 시작되었습니다.", "system");
addLog("센서 모니터링이 활성화되었습니다.", "system");

// 실제 센서값 1초마다 갱신
setInterval(fetchSensorData, 1000);

// 센서 기록 로그는 1분마다 추가
setInterval(addPeriodicSensorLog, 60000);

updateSummary();
fetchSensorData();