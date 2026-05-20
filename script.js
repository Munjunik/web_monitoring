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
let currentLevel = 320;
let currentTemp = 24.0;
let currentPh = 6.8;
let currentTds = 640;

// 그래프용 데이터
const labels = [];
const levelData = [];
const tempData = [];
const phData = [];
const tdsData = [];

for (let i = MAX_POINTS - 1; i >= 0; i--) {
  const time = new Date(Date.now() - i * 1000);
  labels.push(formatTime(time));
  levelData.push(currentLevel);
  tempData.push(currentTemp);
  phData.push(currentPh);
  tdsData.push(currentTds);
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
          borderWidth: 2
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function nextLevelValue(prev) {
  const drift = (Math.random() - 0.5) * 8;
  return clamp(prev + drift, 260, 470);
}

function nextTempValue(prev) {
  const drift = (Math.random() - 0.5) * 0.5;
  return clamp(prev + drift, 20.0, 34.0);
}

function nextPhValue(prev) {
  const drift = (Math.random() - 0.5) * 0.06;
  return clamp(prev + drift, 5.8, 8.8);
}

function nextTdsValue(prev) {
  const drift = (Math.random() - 0.5) * 10;
  return clamp(prev + drift, 500, 900);
}

function updateSummary() {
  document.getElementById("levelValue").textContent = currentLevel.toFixed(0);
  document.getElementById("tempValue").textContent = currentTemp.toFixed(1);
  document.getElementById("phValue").textContent = currentPh.toFixed(2);
  document.getElementById("tdsValue").textContent = currentTds.toFixed(0);
}

function pushRealtimeData() {
  const now = new Date();

  currentLevel = nextLevelValue(currentLevel);
  currentTemp = nextTempValue(currentTemp);
  currentPh = nextPhValue(currentPh);
  currentTds = nextTdsValue(currentTds);

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

  updateSummary();

  levelChart.update("none");
  tempChart.update("none");
  phChart.update("none");
  tdsChart.update("none");
}

// ---------- Event Log ----------
const eventLog = document.getElementById("eventLog");
const clearLogBtn = document.getElementById("clearLogBtn");

// 정상 범위
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
    `센서 주기 기록 | 수위: ${currentLevel.toFixed(0)}mm / 수온: ${currentTemp.toFixed(1)}°C / pH: ${currentPh.toFixed(2)} / TDS: ${currentTds.toFixed(0)}ppm`,
    "sensor"
  );
}

function checkAbnormalEvents() {
  if (currentLevel < NORMAL_RANGE.level.min || currentLevel > NORMAL_RANGE.level.max) {
    addLog(
      `수위센서 정상 범위에서 벗어남 (현재 ${currentLevel.toFixed(0)}mm, 정상 ${NORMAL_RANGE.level.min}~${NORMAL_RANGE.level.max}mm)`,
      "alert"
    );
  }

  if (currentTemp < NORMAL_RANGE.temp.min || currentTemp > NORMAL_RANGE.temp.max) {
    addLog(
      `수온센서 정상 범위에서 벗어남 (현재 ${currentTemp.toFixed(1)}°C, 정상 ${NORMAL_RANGE.temp.min}~${NORMAL_RANGE.temp.max}°C)`,
      "alert"
    );
  }

  if (currentPh < NORMAL_RANGE.ph.min || currentPh > NORMAL_RANGE.ph.max) {
    addLog(
      `pH센서 정상 범위에서 벗어남 (현재 ${currentPh.toFixed(2)}, 정상 ${NORMAL_RANGE.ph.min}~${NORMAL_RANGE.ph.max})`,
      "alert"
    );
  }

  if (currentTds < NORMAL_RANGE.tds.min || currentTds > NORMAL_RANGE.tds.max) {
    addLog(
      `TDS센서 정상 범위에서 벗어남 (현재 ${currentTds.toFixed(0)}ppm, 정상 ${NORMAL_RANGE.tds.min}~${NORMAL_RANGE.tds.max}ppm)`,
      "alert"
    );
  }
}

clearLogBtn.addEventListener("click", () => {
  eventLog.innerHTML = "";
  addLog("이벤트 로그가 초기화되었습니다.", "system");
});

// 초기 로그
addLog("시스템이 시작되었습니다.", "system");
addLog("센서 모니터링이 활성화되었습니다.", "system");
addPeriodicSensorLog();

// 그래프는 1초마다 업데이트
setInterval(() => {
  pushRealtimeData();
  checkAbnormalEvents();
}, 1000);

// 센서 기록 로그는 1분마다 추가
setInterval(() => {
  addPeriodicSensorLog();
}, 60000);

updateSummary();