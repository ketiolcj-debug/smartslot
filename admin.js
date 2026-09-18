const API_BASE =
  "https://smartslot-api.ketiolcj.workers.dev";

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

let loggedIn = false;

/* ------------------------------------------------ */
/* API                                              */
/* ------------------------------------------------ */

async function api(
  path,
  options = {}
) {
  const response =
    await fetch(
      API_BASE + path,
      {
        ...options,
        credentials: "include",
        headers: {
          "Content-Type":
            "application/json",
          ...(options.headers || {})
        }
      }
    );

  let data = null;

  try {
    data =
      await response.json();
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

/* ------------------------------------------------ */
/* UI                                               */
/* ------------------------------------------------ */

function showAdmin() {
  loggedIn = true;

  loginScreen
    ?.classList
    .add("hidden");

  adminScreen
    ?.classList
    .remove("hidden");

  logoutBtn
    ?.classList
    .remove("hidden");
}

function showLogin() {
  loggedIn = false;

  loginScreen
    ?.classList
    .remove("hidden");

  adminScreen
    ?.classList
    .add("hidden");

  logoutBtn
    ?.classList
    .add("hidden");
}

/* ------------------------------------------------ */
/* LOGIN                                            */
/* ------------------------------------------------ */

async function login() {
  const password =
    passwordInput
      ?.value
      .trim();

  if (!password) {
    if (loginError) {
      loginError.textContent =
        "Enter your admin password.";
    }

    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent =
    "Logging in...";

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
    loginBtn.disabled = false;
    loginBtn.textContent =
      "Login";
  }
}

/* ------------------------------------------------ */
/* LOGOUT                                           */
/* ------------------------------------------------ */

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
      "Logout failed:",
      error
    );
  }

  showLogin();
}

/* ------------------------------------------------ */
/* SESSION                                          */
/* ------------------------------------------------ */

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

  } catch {
    showLogin();
  }
}

/* ------------------------------------------------ */
/* TRANSACTIONS                                     */
/* ------------------------------------------------ */

async function loadTransactions() {
  if (depositList) {
    depositList.innerHTML =
      "";
  }

  if (withdrawList) {
    withdrawList.innerHTML =
      "";
  }

  try {
    const [
      deposits,
      withdrawals
    ] =
      await Promise.all([
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
      error.message
        .toLowerCase()
        .includes("session")
    ) {
      showLogin();
      return;
    }

    showError(
      depositList,
      error.message
    );

    showError(
      withdrawList,
      error.message
    );
  }
}

/* ------------------------------------------------ */
/* DEPOSITS                                         */
/* ------------------------------------------------ */

function renderDeposits(items) {
  if (depositCount) {
    depositCount.textContent =
      String(items.length);
  }

  if (!items.length) {
    showEmpty(
      depositList,
      "No pending deposits."
    );

    return;
  }

  depositList.innerHTML = "";

  for (const item of items) {
    const box =
      document.createElement(
        "div"
      );

    box.className = "item";

    addRow(
      box,
      "Player",
      item.telegram_id
    );

    addRow(
      box,
      "Amount",
      `${item.amount} ETB`
    );

    addRow(
      box,
      "Transaction",
      item.transaction_id || "-"
    );

    addRow(
      box,
      "Created",
      item.created_at || "-"
    );

    const actions =
      document.createElement(
        "div"
      );

    actions.className =
      "actions";

    const approve =
      createButton(
        "✅ Approve",
        "approve"
      );

    approve.addEventListener(
      "click",
      () =>
        approveDeposit(
          Number(item.id)
        )
    );

    const reject =
      createButton(
        "❌ Reject",
        "reject"
      );

    reject.addEventListener(
      "click",
      () =>
        rejectDeposit(
          Number(item.id)
        )
    );

    actions.append(
      approve,
      reject
    );

    box.appendChild(
      actions
    );

    depositList.appendChild(
      box
    );
  }
}

/* ------------------------------------------------ */
/* WITHDRAWALS                                      */
/* ------------------------------------------------ */

function renderWithdrawals(items) {
  if (withdrawCount) {
    withdrawCount.textContent =
      String(items.length);
  }

  if (!items.length) {
    showEmpty(
      withdrawList,
      "No pending withdrawals."
    );

    return;
  }

  withdrawList.innerHTML = "";

  for (const item of items) {
    const box =
      document.createElement(
        "div"
      );

    box.className = "item";

    addRow(
      box,
      "Player",
      item.telegram_id
    );

    addRow(
      box,
      "Amount",
      `${item.amount} ETB`
    );

    addRow(
      box,
      "Telebirr",
      item.phone ||
        item.wallet_address ||
        "-"
    );

    addRow(
      box,
      "Created",
      item.created_at || "-"
    );

    const actions =
      document.createElement(
        "div"
      );

    actions.className =
      "actions";

    const approve =
      createButton(
        "✅ Approve",
        "approve"
      );

    approve.addEventListener(
      "click",
      () =>
        approveWithdrawal(
          Number(item.id)
        )
    );

    const reject =
      createButton(
        "❌ Reject",
        "reject"
      );

    reject.addEventListener(
      "click",
      () =>
        rejectWithdrawal(
          Number(item.id)
        )
    );

    actions.append(
      approve,
      reject
    );

    box.appendChild(
      actions
    );

    withdrawList.appendChild(
      box
    );
  }
}

/* ------------------------------------------------ */
/* PLAYER LIST                                      */
/* ------------------------------------------------ */

async function loadPlayers() {
  showEmpty(
    playerList,
    "Loading players..."
  );

  try {
    const data =
      await api(
        "/api/admin/players"
      );

    const players =
      data.players || [];

    if (!players.length) {
      showEmpty(
        playerList,
        "No players found."
      );

      return;
    }

    playerList.innerHTML = "";

    for (const player of players) {
      const box =
        document.createElement(
          "div"
        );

      box.className =
        "player";

      const name =
        document.createElement(
          "div"
        );

      name.className =
        "player-name";

      name.textContent =
        player.first_name ||
        player.username ||
        player.telegram_id;

      const telegram =
        document.createElement(
          "div"
        );

      telegram.className =
        "player-info";

      telegram.textContent =
        `Telegram ID: ${player.telegram_id}`;

      const username =
        document.createElement(
          "div"
        );

      username.className =
        "player-info";

      username.textContent =
        `Username: ${player.username || "-"}`;

      const balance =
        document.createElement(
          "div"
        );

      balance.className =
        "player-info";

      balance.textContent =
        `Balance: ${player.balance || 0} ETB`;

      box.append(
        name,
        telegram,
        username,
        balance
      );

      playerList.appendChild(
        box
      );
    }

  } catch (error) {
    showError(
      playerList,
      error.message
    );
  }
}

/* ------------------------------------------------ */
/* ACTIONS                                          */
/* ------------------------------------------------ */

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

async function transactionAction(
  path,
  id
) {
  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    alert(
      "Invalid transaction ID."
    );

    return;
  }

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
      error.message
        .toLowerCase()
        .includes("session")
    ) {
      showLogin();
      return;
    }

    alert(
      error.message
    );
  }
}

/* ------------------------------------------------ */
/* HELPERS                                          */
/* ------------------------------------------------ */

function addRow(
  parent,
  label,
  value
) {
  const row =
    document.createElement(
      "div"
    );

  row.className =
    "item-row";

  const labelEl =
    document.createElement(
      "span"
    );

  labelEl.className =
    "label";

  labelEl.textContent =
    label;

  const valueEl =
    document.createElement(
      "span"
    );

  valueEl.className =
    "value";

  valueEl.textContent =
    String(value ?? "-");

  row.append(
    labelEl,
    valueEl
  );

  parent.appendChild(
    row
  );
}

function createButton(
  text,
  type
) {
  const button =
    document.createElement(
      "button"
    );

  button.type = "button";
  button.textContent = text;

  if (type === "approve") {
    button.className =
      "approve";
  } else {
    button.className =
      "reject";
  }

  return button;
}

function showEmpty(
  element,
  message
) {
  if (!element) return;

  element.innerHTML = "";

  const div =
    document.createElement(
      "div"
    );

  div.className =
    "empty";

  div.textContent =
    message;

  element.appendChild(div);
}

function showError(
  element,
  message
) {
  showEmpty(
    element,
    message
  );
}

/* ------------------------------------------------ */
/* EVENTS                                           */
/* ------------------------------------------------ */

loginBtn?.addEventListener(
  "click",
  login
);

passwordInput?.addEventListener(
  "keydown",
  event => {
    if (
      event.key === "Enter"
    ) {
      login();
    }
  }
);

logoutBtn?.addEventListener(
  "click",
  logout
);

refreshBtn?.addEventListener(
  "click",
  loadTransactions
);

playersBtn?.addEventListener(
  "click",
  loadPlayers
);

/* START */

showLogin();
checkSession();
