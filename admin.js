const API_BASE =
  "https://smartslot-api.ketiolcj.workers.dev";

/* =========================================================
   ELEMENTS
========================================================= */

const loginScreen =
  document.getElementById("loginScreen");

const adminScreen =
  document.getElementById("adminScreen");

const loginBtn =
  document.getElementById("loginBtn");

const logoutBtn =
  document.getElementById("logoutBtn");

const refreshBtn =
  document.getElementById("refreshBtn");

const playersBtn =
  document.getElementById("playersBtn");

const passwordInput =
  document.getElementById("adminPassword");

const loginError =
  document.getElementById("loginError");

const depositList =
  document.getElementById("depositList");

const withdrawList =
  document.getElementById("withdrawList");

const playerList =
  document.getElementById("playerList");

const depositCount =
  document.getElementById("depositCount");

const withdrawCount =
  document.getElementById("withdrawCount");


/* =========================================================
   STATE
========================================================= */

let loggedIn = false;
let loading = false;


/* =========================================================
   API
========================================================= */

async function api(path, options = {}) {
  const requestOptions = {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body
        ? {
            "Content-Type":
              "application/json"
          }
        : {}),
      ...(options.headers || {})
    }
  };

  const response = await fetch(
    API_BASE + path,
    requestOptions
  );

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "Server returned an invalid response."
    );
  }

  if (
    !response.ok ||
    data.ok === false
  ) {
    throw new Error(
      data.error ||
      "Request failed."
    );
  }

  return data;
}


/* =========================================================
   SCREEN CONTROL
========================================================= */

function showAdmin() {
  loggedIn = true;

  if (loginScreen) {
    loginScreen.classList.add(
      "hidden"
    );
  }

  if (adminScreen) {
    adminScreen.classList.remove(
      "hidden"
    );
  }

  if (logoutBtn) {
    logoutBtn.classList.remove(
      "hidden"
    );
  }
}


function showLogin() {
  loggedIn = false;

  if (loginScreen) {
    loginScreen.classList.remove(
      "hidden"
    );
  }

  if (adminScreen) {
    adminScreen.classList.add(
      "hidden"
    );
  }

  if (logoutBtn) {
    logoutBtn.classList.add(
      "hidden"
    );
  }
}


/* =========================================================
   ERROR HELPERS
========================================================= */

function isUnauthorized(error) {
  const message =
    String(
      error?.message || ""
    ).toLowerCase();

  return (
    message.includes(
      "authentication"
    ) ||
    message.includes(
      "unauthorized"
    ) ||
    message.includes(
      "admin"
    ) ||
    message.includes(
      "session"
    )
  );
}


function escapeHtml(value) {
  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}


function safeId(value) {
  const id =
    Number(value);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return "";
  }

  return String(id);
}


/* =========================================================
   LOGIN
========================================================= */

async function login() {
  if (!passwordInput) {
    return;
  }

  const password =
    passwordInput.value.trim();

  if (!password) {
    if (loginError) {
      loginError.textContent =
        "Enter your admin password.";
    }

    return;
  }

  if (loginBtn) {
    loginBtn.disabled = true;
    loginBtn.textContent =
      "Logging in...";
  }

  if (loginError) {
    loginError.textContent = "";
  }

  try {
    await api(
      "/api/admin/login",
      {
        method: "POST",
        body: JSON.stringify({
          password
        })
      }
    );

    passwordInput.value = "";

    showAdmin();

    await loadTransactions();

  } catch (error) {

    if (loginError) {
      loginError.textContent =
        error.message;
    }

    showLogin();

  } finally {

    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent =
        "Login";
    }
  }
}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {
  try {

    await api(
      "/api/admin/logout",
      {
        method: "POST"
      }
    );

  } catch (error) {

    console.warn(
      "Logout request failed:",
      error
    );

  } finally {

    showLogin();
  }
}


/* =========================================================
   CHECK EXISTING SESSION
========================================================= */

async function checkSession() {
  try {

    const data =
      await api(
        "/api/admin/session"
      );

    if (
      data.authenticated
    ) {
      showAdmin();

      await loadTransactions();

    } else {
      showLogin();
    }

  } catch (error) {

    showLogin();
  }
}


/* =========================================================
   LOAD DEPOSITS + WITHDRAWALS
========================================================= */

async function loadTransactions() {
  if (loading) {
    return;
  }

  loading = true;

  if (depositList) {
    depositList.innerHTML =
      `<div class="empty">
        Loading deposits...
      </div>`;
  }

  if (withdrawList) {
    withdrawList.innerHTML =
      `<div class="empty">
        Loading withdrawals...
      </div>`;
  }

  try {

    const [
      deposits,
      withdrawals
    ] = await Promise.all([
      api(
        "/api/admin/deposits"
      ),
      api(
        "/api/admin/withdrawals"
      )
    ]);

    renderDeposits(
      deposits.deposits || []
    );

    renderWithdrawals(
      withdrawals.withdrawals || []
    );

  } catch (error) {

    if (
      isUnauthorized(error)
    ) {
      showLogin();
      return;
    }

    if (depositList) {
      depositList.innerHTML =
        `<div class="empty">
          ${escapeHtml(
            error.message
          )}
        </div>`;
    }

    if (withdrawList) {
      withdrawList.innerHTML =
        `<div class="empty">
          ${escapeHtml(
            error.message
          )}
        </div>`;
    }

  } finally {

    loading = false;
  }
}


/* =========================================================
   RENDER DEPOSITS
========================================================= */

function renderDeposits(items) {
  if (depositCount) {
    depositCount.textContent =
      items.length;
  }

  if (!depositList) {
    return;
  }

  if (!items.length) {
    depositList.innerHTML =
      `<div class="empty">
        No pending deposits.
      </div>`;

    return;
  }

  depositList.innerHTML =
    items.map(item => {

      const id =
        safeId(item.id);

      return `
        <div class="item">

          <div class="item-row">
            <span class="label">
              Player
            </span>

            <span class="value">
              ${escapeHtml(
                item.telegram_id
              )}
            </span>
          </div>

          <div class="item-row">
            <span class="label">
              Amount
            </span>

            <span class="value">
              ${escapeHtml(
                item.amount
              )} ETB
            </span>
          </div>

          <div class="item-row">
            <span class="label">
              Transaction
            </span>

            <span class="value">
              ${escapeHtml(
                item.transaction_id ||
                "-"
              )}
            </span>
          </div>

          <div class="item-row">
            <span class="label">
              Created
            </span>

            <span class="value">
              ${escapeHtml(
                item.created_at ||
                "-"
              )}
            </span>
          </div>

          <div class="actions">

            <button
              class="approve"
              type="button"
              data-action="approve-deposit"
              data-id="${id}">
              ✅ Approve
            </button>

            <button
              class="reject"
              type="button"
              data-action="reject-deposit"
              data-id="${id}">
              ❌ Reject
            </button>

          </div>

        </div>
      `;
    }).join("");

  bindTransactionActions();
}


/* =========================================================
   RENDER WITHDRAWALS
========================================================= */

function renderWithdrawals(items) {
  if (withdrawCount) {
    withdrawCount.textContent =
      items.length;
  }

  if (!withdrawList) {
    return;
  }

  if (!items.length) {
    withdrawList.innerHTML =
      `<div class="empty">
        No pending withdrawals.
      </div>`;

    return;
  }

  withdrawList.innerHTML =
    items.map(item => {

      const id =
        safeId(item.id);

      const phone =
        item.phone ||
        item.wallet_address ||
        "-";

      return `
        <div class="item">

          <div class="item-row">
            <span class="label">
              Player
            </span>

            <span class="value">
              ${escapeHtml(
                item.telegram_id
              )}
            </span>
          </div>

          <div class="item-row">
            <span class="label">
              Amount
            </span>

            <span class="value">
              ${escapeHtml(
                item.amount
              )} ETB
            </span>
          </div>

          <div class="item-row">
            <span class="label">
              Telebirr
            </span>

            <span class="value">
              ${escapeHtml(
                phone
              )}
            </span>
          </div>

          <div class="item-row">
            <span class="label">
              Created
            </span>

            <span class="value">
              ${escapeHtml(
                item.created_at ||
                "-"
              )}
            </span>
          </div>

          <div class="actions">

            <button
              class="approve"
              type="button"
              data-action="approve-withdrawal"
              data-id="${id}">
              ✅ Approve
            </button>

            <button
              class="reject"
              type="button"
              data-action="reject-withdrawal"
              data-id="${id}">
              ❌ Reject
            </button>

          </div>

        </div>
      `;
    }).join("");

  bindTransactionActions();
}


/* =========================================================
   TRANSACTION BUTTONS
========================================================= */

function bindTransactionActions() {
  document
    .querySelectorAll(
      "[data-action]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const action =
            button.dataset.action;

          const id =
            Number(
              button.dataset.id
            );

          if (
            !Number.isInteger(id) ||
            id <= 0
          ) {
            alert(
              "Invalid transaction ID."
            );

            return;
          }

          button.disabled = true;

          try {

            if (
              action ===
              "approve-deposit"
            ) {

              await approveDeposit(
                id
              );

            } else if (
              action ===
              "reject-deposit"
            ) {

              await rejectDeposit(
                id
              );

            } else if (
              action ===
              "approve-withdrawal"
            ) {

              await approveWithdrawal(
                id
              );

            } else if (
              action ===
              "reject-withdrawal"
            ) {

              await rejectWithdrawal(
                id
              );
            }

          } finally {

            button.disabled = false;
          }
        }
      );
    });
}


/* =========================================================
   DEPOSIT ACTIONS
========================================================= */

async function approveDeposit(id) {
  if (
    !confirm(
      "Approve this deposit?"
    )
  ) {
    return;
  }

  await transactionAction(
    "/api/admin/deposit/approve",
    id
  );
}


async function rejectDeposit(id) {
  if (
    !confirm(
      "Reject this deposit?"
    )
  ) {
    return;
  }

  await transactionAction(
    "/api/admin/deposit/reject",
    id
  );
}


/* =========================================================
   WITHDRAWAL ACTIONS
========================================================= */

async function approveWithdrawal(id) {
  if (
    !confirm(
      "Approve this withdrawal?"
    )
  ) {
    return;
  }

  await transactionAction(
    "/api/admin/withdraw/approve",
    id
  );
}


async function rejectWithdrawal(id) {
  if (
    !confirm(
      "Reject this withdrawal?"
    )
  ) {
    return;
  }

  await transactionAction(
    "/api/admin/withdraw/reject",
    id
  );
}


/* =========================================================
   TRANSACTION ACTION REQUEST
========================================================= */

async function transactionAction(
  path,
  id
) {
  try {

    await api(
      path,
      {
        method: "POST",
        body: JSON.stringify({
          id
        })
      }
    );

    await loadTransactions();

  } catch (error) {

    if (
      isUnauthorized(error)
    ) {
      showLogin();
      return;
    }

    alert(
      error.message
    );
  }
}


/* =========================================================
   PLAYERS
========================================================= */

async function loadPlayers() {
  if (!playerList) {
    return;
  }

  playerList.innerHTML =
    `<div class="empty">
      Loading players...
    </div>`;

  try {

    const data =
      await api(
        "/api/admin/players"
      );

    const players =
      data.players || [];

    if (!players.length) {

      playerList.innerHTML =
        `<div class="empty">
          No players found.
        </div>`;

      return;
    }

    playerList.innerHTML =
      players.map(player => {

        const displayName =
          player.first_name ||
          player.username ||
          player.telegram_id ||
          "Unknown player";

        return `
          <div class="player">

            <div class="player-name">
              ${escapeHtml(
                displayName
              )}
            </div>

            <div class="player-info">
              Telegram ID:
              ${escapeHtml(
                player.telegram_id
              )}
            </div>

            <div class="player-info">
              Username:
              ${escapeHtml(
                player.username ||
                "-"
              )}
            </div>

            <div class="player-info">
              Balance:
              ${escapeHtml(
                player.balance ??
                0
              )} ETB
            </div>

            <div class="player-info">
              Games:
              ${escapeHtml(
                player.games_played ??
                0
              )}
            </div>

            <div class="player-info">
              Total Won:
              ${escapeHtml(
                player.total_won ??
                0
              )} ETB
            </div>

          </div>
        `;
      }).join("");

  } catch (error) {

    if (
      isUnauthorized(error)
    ) {
      showLogin();
      return;
    }

    playerList.innerHTML =
      `<div class="empty">
        ${escapeHtml(
          error.message
        )}
      </div>`;
  }
}


/* =========================================================
   REFRESH
========================================================= */

async function refreshAll() {
  if (!loggedIn) {
    return;
  }

  await loadTransactions();

  if (
    playerList &&
    !playerList.classList.contains(
      "hidden"
    )
  ) {
    await loadPlayers();
  }
}


/* =========================================================
   BUTTON EVENTS
========================================================= */

if (loginBtn) {
  loginBtn.addEventListener(
    "click",
    login
  );
}


if (passwordInput) {
  passwordInput.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Enter"
      ) {
        login();
      }
    }
  );
}


if (logoutBtn) {
  logoutBtn.addEventListener(
    "click",
    logout
  );
}


if (refreshBtn) {
  refreshBtn.addEventListener(
    "click",
    refreshAll
  );
}


if (playersBtn) {
  playersBtn.addEventListener(
    "click",
    loadPlayers
  );
}


/* =========================================================
   START
========================================================= */

showLogin();

checkSession();
