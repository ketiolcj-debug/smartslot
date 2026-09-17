const API_BASE = "https://smartslot-api.ketiolcj.workers.dev";

const loginScreen = document.getElementById("loginScreen");
const adminScreen = document.getElementById("adminScreen");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const refreshBtn = document.getElementById("refreshBtn");
const playersBtn = document.getElementById("playersBtn");

const passwordInput = document.getElementById("adminPassword");
const loginError = document.getElementById("loginError");

const depositList = document.getElementById("depositList");
const withdrawList = document.getElementById("withdrawList");
const playerList = document.getElementById("playerList");

const depositCount = document.getElementById("depositCount");
const withdrawCount = document.getElementById("withdrawCount");

let adminToken = localStorage.getItem("smartslot_admin_token");


async function api(path, options = {}) {

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (adminToken) {
    headers["Authorization"] = `Bearer ${adminToken}`;
  }

  const response = await fetch(API_BASE + path, {
    ...options,
    headers
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error("Server returned an invalid response.");
  }

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}


function showAdmin() {

  loginScreen.classList.add("hidden");
  adminScreen.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");

}


function showLogin() {

  loginScreen.classList.remove("hidden");
  adminScreen.classList.add("hidden");
  logoutBtn.classList.add("hidden");

}


async function login() {

  const password = passwordInput.value.trim();

  if (!password) {
    loginError.textContent = "Enter your admin password.";
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "Logging in...";
  loginError.textContent = "";

  try {

    const data = await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        password
      })
    });

    adminToken = data.token;

    localStorage.setItem(
      "smartslot_admin_token",
      adminToken
    );

    passwordInput.value = "";

    showAdmin();

    await loadTransactions();

  } catch (error) {

    loginError.textContent = error.message;

  } finally {

    loginBtn.disabled = false;
    loginBtn.textContent = "Login";

  }
}


function logout() {

  adminToken = null;

  localStorage.removeItem(
    "smartslot_admin_token"
  );

  showLogin();

}


async function loadTransactions() {

  depositList.innerHTML = `<div class="empty">Loading...</div>`;
  withdrawList.innerHTML = `<div class="empty">Loading...</div>`;

  try {

    const [deposits, withdrawals] = await Promise.all([
      api("/api/admin/deposits"),
      api("/api/admin/withdrawals")
    ]);

    renderDeposits(deposits.deposits || []);
    renderWithdrawals(withdrawals.withdrawals || []);

  } catch (error) {

    if (
      error.message.toLowerCase().includes("admin") ||
      error.message.toLowerCase().includes("unauthorized")
    ) {
      logout();
      return;
    }

    depositList.innerHTML =
      `<div class="empty">${escapeHtml(error.message)}</div>`;

    withdrawList.innerHTML =
      `<div class="empty">${escapeHtml(error.message)}</div>`;
  }
}


function renderDeposits(items) {

  depositCount.textContent = items.length;

  if (!items.length) {
    depositList.innerHTML =
      `<div class="empty">No pending deposits.</div>`;
    return;
  }

  depositList.innerHTML = items.map(item => {

    return `
      <div class="item">

        <div class="item-row">
          <span class="label">Player</span>
          <span class="value">${escapeHtml(item.telegram_id)}</span>
        </div>

        <div class="item-row">
          <span class="label">Amount</span>
          <span class="value">${escapeHtml(item.amount)} ETB</span>
        </div>

        <div class="item-row">
          <span class="label">Transaction</span>
          <span class="value">${escapeHtml(item.transaction_id || "-")}</span>
        </div>

        <div class="item-row">
          <span class="label">Created</span>
          <span class="value">${escapeHtml(item.created_at || "-")}</span>
        </div>

        <div class="actions">

          <button
            class="approve"
            onclick="approveDeposit(${Number(item.id)})">
            ✅ Approve
          </button>

          <button
            class="reject"
            onclick="rejectDeposit(${Number(item.id)})">
            ❌ Reject
          </button>

        </div>

      </div>
    `;

  }).join("");
}


function renderWithdrawals(items) {

  withdrawCount.textContent = items.length;

  if (!items.length) {
    withdrawList.innerHTML =
      `<div class="empty">No pending withdrawals.</div>`;
    return;
  }

  withdrawList.innerHTML = items.map(item => {

    return `
      <div class="item">

        <div class="item-row">
          <span class="label">Player</span>
          <span class="value">${escapeHtml(item.telegram_id)}</span>
        </div>

        <div class="item-row">
          <span class="label">Amount</span>
          <span class="value">${escapeHtml(item.amount)} ETB</span>
        </div>

        <div class="item-row">
          <span class="label">Address</span>
          <span class="value">${escapeHtml(item.wallet_address || "-")}</span>
        </div>

        <div class="item-row">
          <span class="label">Created</span>
          <span class="value">${escapeHtml(item.created_at || "-")}</span>
        </div>

        <div class="actions">

          <button
            class="approve"
            onclick="approveWithdrawal(${Number(item.id)})">
            ✅ Approve
          </button>

          <button
            class="reject"
            onclick="rejectWithdrawal(${Number(item.id)})">
            ❌ Reject
          </button>

        </div>

      </div>
    `;

  }).join("");
}


async function approveDeposit(id) {

  if (!confirm("Approve this deposit?")) return;

  try {

    await api("/api/admin/deposit/approve", {
      method: "POST",
      body: JSON.stringify({ id })
    });

    await loadTransactions();

  } catch (error) {

    alert(error.message);

  }
}


async function rejectDeposit(id) {

  if (!confirm("Reject this deposit?")) return;

  try {

    await api("/api/admin/deposit/reject", {
      method: "POST",
      body: JSON.stringify({ id })
    });

    await loadTransactions();

  } catch (error) {

    alert(error.message);

  }
}


async function approveWithdrawal(id) {

  if (!confirm("Approve this withdrawal?")) return;

  try {

    await api("/api/admin/withdraw/approve", {
      method: "POST",
      body: JSON.stringify({ id })
    });

    await loadTransactions();

  } catch (error) {

    alert(error.message);

  }
}


async function rejectWithdrawal(id) {

  if (!confirm("Reject this withdrawal?")) return;

  try {

    await api("/api/admin/withdraw/reject", {
      method: "POST",
      body: JSON.stringify({ id })
    });

    await loadTransactions();

  } catch (error) {

    alert(error.message);

  }
}


async function loadPlayers() {

  playerList.innerHTML =
    `<div class="empty">Loading players...</div>`;

  try {

    const data = await api("/api/admin/players");

    const players = data.players || [];

    if (!players.length) {

      playerList.innerHTML =
        `<div class="empty">No players found.</div>`;

      return;
    }

    playerList.innerHTML = players.map(player => {

      return `
        <div class="player">

          <div class="player-name">
            ${escapeHtml(
              player.first_name ||
              player.username ||
              player.telegram_id
            )}
          </div>

          <div class="player-info">
            Telegram ID: ${escapeHtml(player.telegram_id)}
          </div>

          <div class="player-info">
            Username: ${escapeHtml(player.username || "-")}
          </div>

          <div class="player-info">
            Balance: ${escapeHtml(player.balance)} ETB
          </div>

        </div>
      `;

    }).join("");

  } catch (error) {

    playerList.innerHTML =
      `<div class="empty">${escapeHtml(error.message)}</div>`;

  }
}


function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


loginBtn.addEventListener("click", login);

passwordInput.addEventListener("keydown", event => {

  if (event.key === "Enter") {
    login();
  }

});

logoutBtn.addEventListener("click", logout);

refreshBtn.addEventListener("click", loadTransactions);

playersBtn.addEventListener("click", loadPlayers);


if (adminToken) {

  showAdmin();

  loadTransactions().catch(() => {
    logout();
  });

} else {

  showLogin();

}
