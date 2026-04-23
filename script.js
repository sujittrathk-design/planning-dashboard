// ==========================================
// scripts.js - Shared JavaScript Utilities
// ==========================================

// Base URL helper
function getBaseUrl() {
  return window.location.href.split("?")[0];
}

// Format number with commas
function formatNumber(n, dec = 2) {
  if (n === null || n === undefined || n === "") return "-";
  const num = parseFloat(n);
  if (isNaN(num)) return "-";
  return num.toLocaleString("th-TH", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function formatInt(n) {
  if (n === null || n === undefined || n === "") return "-";
  const num = parseInt(n);
  if (isNaN(num)) return "-";
  return num.toLocaleString("th-TH");
}

// Format date Thai
function formatDateTH(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const months = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  } catch(e) { return dateStr; }
}

// Current date/time
function updateClock() {
  const el = document.getElementById("currentTime");
  if (!el) return;
  const now = new Date();
  const months = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  const weekdays = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];
  const time = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  const date = `${weekdays[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear() + 543}`;
  el.innerHTML = `<span>🕐 ${time}</span> <span style="opacity:0.7">${date}</span>`;
}

// Show/hide loading overlay
function showLoading(msg = "กำลังโหลด...") {
  let el = document.getElementById("loadingOverlay");
  if (!el) {
    el = document.createElement("div");
    el.id = "loadingOverlay";
    el.className = "loading-overlay";
    el.innerHTML = `<div class="spinner"></div><div class="loading-text">${msg}</div>`;
    document.body.appendChild(el);
  } else {
    el.querySelector(".loading-text").textContent = msg;
    el.style.display = "flex";
  }
}

function hideLoading() {
  const el = document.getElementById("loadingOverlay");
  if (el) el.style.display = "none";
}

// Toast notification (using SweetAlert2)
function toastSuccess(msg) {
  if (typeof Swal === "undefined") { alert("✅ " + msg); return; }
  Swal.fire({ icon: "success", title: msg, toast: true, position: "top-end", showConfirmButton: false, timer: 2500, timerProgressBar: true, customClass: { popup: "swal-toast" } });
}

function toastError(msg) {
  if (typeof Swal === "undefined") { alert("❌ " + msg); return; }
  Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: msg, toast: true, position: "top-end", showConfirmButton: false, timer: 4000, timerProgressBar: true });
}

function toastWarning(msg) {
  if (typeof Swal === "undefined") { alert("⚠️ " + msg); return; }
  Swal.fire({ icon: "warning", title: msg, toast: true, position: "top-end", showConfirmButton: false, timer: 3000, timerProgressBar: true });
}

// Initialize common features
document.addEventListener("DOMContentLoaded", function() {
  updateClock();
  setInterval(updateClock, 30000);
});

// Dashboard Specific Logic (Moved from index.html)
let exportData  = [];
let waitingData = [];
let chartDaily  = null;
let chartDonut  = null;

function getFilters() {
  return {
    startDate: document.getElementById('f-start')?.value || '',
    endDate:   document.getElementById('f-end')?.value || '',
    month:     document.getElementById('f-month')?.value || '',
    year:      document.getElementById('f-year')?.value || ''
  };
}

function parseDate(str) {
  if (!str) return null;
  const s = String(str).substring(0, 10);
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

async function loadData() {
  const filters = getFilters();
  showLoading('กำลังโหลดข้อมูล Dashboard...');

  google.script.run
    .withSuccessHandler(res => {
      try {
        const summaryRes = JSON.parse(res);
        if (summaryRes.success) {
          renderDashboardContent(summaryRes.summary);
        } else {
          toastError(summaryRes.error);
        }
      } catch(e) {
        console.error('Parse summary failed:', e);
      }
      
      // Load waiting table separately if needed or if part of summary
      google.script.run
        .withSuccessHandler(res2 => {
          try {
            waitingData = JSON.parse(res2);
            renderWaitingTable();
          } catch(e) {
            console.error('Parse waiting data failed:', e);
          }
          hideLoading();
        })
        .withFailureHandler(err => {
          hideLoading();
          toastError('โหลดข้อมูลรอโหลดไม่สำเร็จ');
        })
        .getWaitingData(filters);
    })
    .withFailureHandler(err => {
      hideLoading();
      toastError('โหลดข้อมูลสรุปไม่สำเร็จ');
    })
    .getExportSummary(filters);
}

function renderDashboardContent(summary) {
  document.getElementById('s-tons').textContent = formatNumber(summary.totalTonsMonth, 1);
  document.getElementById('s-containers').textContent = formatInt(summary.totalContainersMonth);
  document.getElementById('s-waiting').textContent = formatInt(summary.waitingAll);
  document.getElementById('s-planned').textContent = formatInt(summary.waitingPlanned);

  // Render Warehouse Grid
  const whGrid = document.getElementById('wh-grid');
  if (whGrid) {
    const whCols = [
      { key: 'ระยอง', color: '#1a4f7a' },
      { key: 'WH32', color: '#2e7d32' },
      { key: 'ศรีราชา', color: '#f57c00' }
    ];
    let totalWh = 0;
    whGrid.innerHTML = whCols.map(w => {
      const val = summary.warehouseMap[w.key] || 0;
      totalWh += val;
      return `
        <div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:12px;border-left:4px solid ${w.color};">
          <div style="font-size:11px;color:#64748b;font-weight:700;">${w.key}</div>
          <div style="font-size:20px;font-weight:800;color:${w.color};">${formatInt(val)}</div>
        </div>`;
    }).join('');
    document.getElementById('whTotalBadge').textContent = `รวม ${formatInt(totalWh)} ตู้`;
  }

  // Render Charts
  renderDailyChart(summary.dailyChart);
  renderDonutChart(summary.warehouseMap);
}

function renderDailyChart(chartData) {
  const ctx = document.getElementById('chart-daily');
  if (!ctx) return;
  if (chartDaily) chartDaily.destroy();

  chartDaily = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartData.map(d => d.date.substring(8, 10)),
      datasets: [
        {
          label: 'ตัน',
          data: chartData.map(d => d.tons),
          backgroundColor: '#1a4f7a80',
          borderColor: '#1a4f7a',
          borderWidth: 1,
          yAxisID: 'y'
        },
        {
          label: 'ตู้',
          data: chartData.map(d => d.containers),
          type: 'line',
          borderColor: '#f57c00',
          backgroundColor: '#f57c00',
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { type: 'linear', position: 'left', title: { display: true, text: 'ตัน' } },
        y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'ตู้' } }
      }
    }
  });
}

function renderDonutChart(warehouseMap) {
  const ctx = document.getElementById('donutChart');
  if (!ctx) return;
  if (chartDonut) chartDonut.destroy();

  const labels = Object.keys(warehouseMap);
  const data = Object.values(warehouseMap);
  const colors = ['#1a4f7a', '#2e7d32', '#f57c00'];

  chartDonut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{ data: data, backgroundColor: colors }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

function renderWaitingTable() {
  const tbody = document.getElementById('waiting-tbody');
  if (!tbody) return;

  if (!waitingData.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="table-empty">📭 ไม่มีรายการรอโหลด</td></tr>';
    return;
  }

  tbody.innerHTML = waitingData.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${r['ETL'] || '-'}</td>
      <td>${r['PCG'] || '-'}</td>
      <td><span class="badge badge-info">${r['SKU'] || '-'}</span></td>
      <td style="text-align:right;">${formatNumber(r['ปริมาณ Order'], 0)}</td>
      <td style="text-align:right;">${formatNumber(r['ปริมาณรอผลิต'], 0)}</td>
      <td>${r['เครื่อง'] || '-'}</td>
      <td><span class="badge badge-muted">${r['หน่วยงาน'] || '-'}</span></td>
      <td style="max-width:150px;white-space:normal;">${r['Remark'] || '-'}</td>
    </tr>`).join('');
  
  document.getElementById('waiting-count').textContent = `${waitingData.length} รายการ`;
}

function filterWaitingTable() {
  const kw = document.getElementById('waitingSearch').value.toLowerCase();
  const rows = document.querySelectorAll('#waiting-tbody tr');
  let visible = 0;
  rows.forEach(row => {
    const show = row.textContent.toLowerCase().includes(kw);
    row.style.display = show ? '' : 'none';
    if (show) visible++;
  });
  document.getElementById('waiting-count').textContent = `${visible} รายการ`;
}

function clearFilters() {
  document.getElementById('f-start').value = '';
  document.getElementById('f-end').value = '';
  loadData();
}

// Check if we are on index.html and load data
if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
  document.addEventListener('DOMContentLoaded', loadData);
}
