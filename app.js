const tg = window.Telegram?.WebApp;

const API_BASE = "https://smartslot-api.ketiolcj.workers.dev";

const symbols = [
  ["7️⃣", "Lucky Seven", 150, 2],
  ["💲", "Dollar", 100, 3],
  ["🔔", "Golden Bell", 50, 5],
  ["🍉", "Watermelon", 40, 7],
  ["🍇", "Grapes", 40, 7],
  ["🟣", "Plum", 25, 9],
  ["🍊", "Orange", 20, 11],
  ["🍋", "Lemon", 20, 11],
  ["🍒", "Cherries", 20, 14]
].map(x => ({
  icon: x[0],
  name: x[1],
  value: x[2],
  weight: x[3]
}));

const bets = [5, 10, 25, 50, 100, 250];
const mults = [1, 2, 3, 4, 5];

let selectedMultiplier = 1;

let s = {
  balance: 0,
  bet: 1,
  spin: false,
  auto: false,
  win: 0,
  pending: 0,
  games: 0,
  total: 0,
  history: []
};

const $ = id => document.getElementById(id);

const reels = [
  ...document.querySelectorAll(".reel .strip")
];

function money(n) {
  return Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/* ---------------- TELEGRAM ---------------- */

function setPlayer() {
  const u = tg?.initDataUnsafe?.user;

  const name = u?.first_name || "Player";

  if ($("playerName"))
    $("playerName").textContent = name;

  if ($("profileName"))
    $("profileName").textContent = name;

  if ($("profileUsername")) {
    $("profileUsername").textContent =
      u?.username
        ? "@" + u.username
        : "Telegram player";
  }

  const avatar =
    name[0]?.toUpperCase() || "S";

  if ($("avatar"))
    $("avatar").textContent = avatar;

  if ($("profileAvatar"))
    $("profileAvatar").textContent = avatar;
}

/* ---------------- RENDER ---------------- */

function render() {
  const b = bets[s.bet];

  if ($("balance"))
    $("balance").textContent = money(s.balance);

  if ($("gameBalance"))
    $("gameBalance").textContent = money(s.balance);

  if ($("walletBalance"))
    $("walletBalance").textContent =
      money(s.balance) + " ETB";

  if ($("lastWin"))
    $("lastWin").textContent = money(s.win);

  if ($("betInfo"))
    $("betInfo").textContent = money(b);

  if ($("spinBtn")) {
    const small =
      $("spinBtn").querySelector("small");

    if (small)
      small.textContent = money(b) + " ETB";
  }

  if ($("betPrev"))
    $("betPrev").textContent =
      bets[Math.max(0, s.bet - 1)] + " ETB";

  if ($("betNext"))
    $("betNext").textContent =
      bets[Math.min(
        bets.length - 1,
        s.bet + 1
      )] + " ETB";

  if ($("games"))
    $("games").textContent = s.games;

  if ($("totalWon"))
    $("totalWon").textContent =
      money(s.total) + " ETB";

  renderHistory();
}

/* ---------------- API ---------------- */

async function api(path, method = "GET", body = null) {
  if (!tg?.initData) {
    throw new Error(
      "Please open the game from Telegram."
    );
  }

  const headers = {
    "Content-Type": "application/json",
    "X-Telegram-Init-Data": tg.initData
  };

  const options = {
    method,
    headers
  };

  if (body !== null) {
    options.body = JSON.stringify(body);
  }

  const response =
    await fetch(API_BASE + path, options);

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "Server returned an invalid response."
    );
  }

  if (!response.ok || data.ok === false) {
    throw new Error(
      data.error || "Request failed."
    );
  }

  return data;
}

/* ---------------- LOAD PLAYER ---------------- */

async function loadPlayer() {
  try {
    const data =
      await api("/api/me", "GET");

    if (!data.player)
      return;

    s.balance =
      Number(data.player.balance || 0);

    s.games =
      Number(data.player.games_played || 0);

    s.total =
      Number(data.player.total_won || 0);

    if ($("playerName") &&
        data.player.first_name) {
      $("playerName").textContent =
        data.player.first_name;
    }

    if ($("profileName") &&
        data.player.first_name) {
      $("profileName").textContent =
        data.player.first_name;
    }

    if ($("profileUsername")) {
      $("profileUsername").textContent =
        data.player.username
          ? "@" + data.player.username
          : "Telegram player";
    }

    const name =
      data.player.first_name || "Player";

    const avatar =
      name[0]?.toUpperCase() || "S";

    if ($("avatar"))
      $("avatar").textContent = avatar;

    if ($("profileAvatar"))
      $("profileAvatar").textContent = avatar;

    render();

  } catch (e) {
    console.error("Player loading error:", e);

    status(
      e.message ||
      "Unable to load player.",
      true
    );
  }
}

/* ---------------- HISTORY ---------------- */

async function loadHistory() {
  try {
    const data =
      await api("/api/history", "GET");

    s.history =
      (data.history || []).map(x => ({
        type:
          Number(x.win || 0) > 0
            ? "Game win"
            : "Game",
        amount:
          Number(x.win || 0),
        date:
          x.created_at
            ? new Date(
                x.created_at.replace(" ", "T") + "Z"
              ).toLocaleString()
            : ""
      }));

    renderHistory();

  } catch (e) {
    console.error(
      "History loading error:",
      e
    );
  }
}

function renderHistory() {
  const e = $("history");

  if (!e) return;

  if (!s.history.length) {
    e.innerHTML =
      '<div class="empty">No transactions yet.</div>';
    return;
  }

  e.innerHTML = s.history
    .map(x => `
      <div class="history-item">
        <div>
          <b>${x.type}</b>
          <small>${x.date}</small>
        </div>
        <strong>
          ${
            x.amount >= 0 ? "+" : ""
          }${money(x.amount)} ETB
        </strong>
      </div>
    `)
    .join("");
}

/* ---------------- SCREEN ---------------- */

function screen(n) {
  document
    .querySelectorAll(".screen")
    .forEach(x =>
      x.classList.remove("active")
    );

  const target =
    $("screen-" + n);

  if (target)
    target.classList.add("active");

  document
    .querySelectorAll(".tab")
    .forEach(x =>
      x.classList.toggle(
        "active",
        x.dataset.screen === n
      )
    );

  if (n === "history") {
    loadHistory();
  }

  if (n === "wallet") {
    loadPlayer();
  }

  if (n === "profile") {
    loadPlayer();
  }
}

/* ---------------- MULTIPLIER ---------------- */

function renderMultipliers() {
  const box = $("mults");

  if (!box) return;

  box.innerHTML = mults
    .map(x => `
      <div
        class="mult ${
          x === selectedMultiplier
            ? "active"
            : ""
        }"
        data-mult="${x}"
      >
        ${x}×
      </div>
    `)
    .join("");

  box
    .querySelectorAll(".mult")
    .forEach(el => {
      el.onclick = () => {
        if (s.spin) return;

        selectedMultiplier =
          Number(el.dataset.mult);

        renderMultipliers();
      };
    });
}

/* ---------------- REELS ---------------- */

function build(el, arr) {
  if (!el) return;

  el.innerHTML = "";

  [
    ...arr,
    ...arr,
    ...arr,
    ...arr
  ].forEach(x => {
    const d =
      document.createElement("div");

    d.className = "sym";
    d.textContent = x.icon;

    el.appendChild(d);
  });
}

function spinReel(el, duration) {
  return new Promise(resolve => {
    if (!el) {
      resolve();
      return;
    }

    const parent =
      el.parentElement;

    const h =
      parent.clientHeight / 3;

    el.style.transition = "none";

    el.style.transform =
      `translateY(${h * 2}px)`;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {

        el.style.transition =
          `transform ${duration}ms cubic-bezier(.12,.86,.2,1)`;

        el.style.transform =
          `translateY(${-h * 3}px)`;

        setTimeout(
          resolve,
          duration + 30
        );
      });
    });
  });
}

/* ---------------- WIN LINES ---------------- */

function linesWin(winningLines) {
  const box = $("lines");

  if (!box) return;

  box.innerHTML = "";

  winningLines.forEach(i => {
    const d =
      document.createElement("div");

    d.className =
      "winline " +
      (
        i === 3
          ? "diag1"
          : i === 4
            ? "diag2"
            : ""
      );

    if (i < 3) {
      d.style.top =
        (16 + i * 34) + "%";
    }

    box.appendChild(d);
  });
}

/* ---------------- STATUS ---------------- */

function status(text, bad = false) {
  const e = $("status");

  if (!e) return;

  e.textContent = text;

  e.classList.toggle(
    "lose",
    !!bad
  );
}

/* ---------------- SERVER SPIN ---------------- */

async function spin() {
  if (s.spin) return;

  const betAmount =
    bets[s.bet];

  if (s.balance < betAmount) {
    status(
      "Insufficient balance — deposit first.",
      true
    );
    return;
  }

  s.spin = true;

  if ($("spinBtn"))
    $("spinBtn").disabled = true;

  if ($("lines"))
    $("lines").innerHTML = "";

  status("Spinning...");

  try {

    /*
     * The server controls:
     * - bet validation
     * - balance deduction
     * - random result
     * - winnings
     * - D1 game record
     */

    const data =
      await api(
        "/api/spin",
        "POST",
        {
          bet: betAmount,
          multiplier:
            selectedMultiplier
        }
      );

    const grid =
      data.grid || [];

    const winningLines =
      data.winningLines || [];

    const win =
      Number(data.win || 0);

    const multiplier =
      Number(
        data.multiplier ||
        selectedMultiplier
      );

    renderMultipliers();

    /* Display server result */

    reels.forEach((reel, column) => {
      build(
        reel,
        grid[column] || []
      );
    });

    await Promise.all(
      reels.map(
        (reel, column) =>
          spinReel(
            reel,
            700 + column * 250
          )
      )
    );

    s.balance =
      Number(data.balance || 0);

    s.win = win;

    if (win > 0) {
      s.pending = win;

      status(
        `WIN ${money(win)} ETB${
          multiplier > 1
            ? " · " +
              multiplier +
              "× MULTIPLIER"
            : ""
        }!`
      );

      linesWin(winningLines);

      if ($("gambleBtn"))
        $("gambleBtn")
          .classList.remove("disabled");

      if ($("collectBtn"))
        $("collectBtn")
          .classList.remove("disabled");

    } else {

      s.pending = 0;

      status(
        "No win — spin again.",
        true
      );
    }

    s.games++;

    render();

    /*
     * The server has already credited a win.
     * "Collect" below is only a UI action.
     */

    if (
      s.auto &&
      s.balance >= bets[s.bet]
    ) {
      setTimeout(
        spin,
        700
      );
    }

  } catch (e) {

    console.error(
      "Spin error:",
      e
    );

    status(
      e.message ||
      "Spin failed.",
      true
    );

    /*
     * Reload the real server balance
     * after an error.
     */

    await loadPlayer();

  } finally {

    s.spin = false;

    if ($("spinBtn"))
      $("spinBtn").disabled = false;
  }
}

/* ---------------- BET ---------------- */

function bet(index) {
  if (s.spin) return;

  s.bet =
    Math.max(
      0,
      Math.min(
        bets.length - 1,
        index
      )
    );

  render();
}

/* ---------------- PAYTABLE ---------------- */

function buildPaytable() {
  const e = $("payRows");

  if (!e) return;

  e.innerHTML =
    symbols
      .slice()
      .sort(
        (a, b) =>
          b.value - a.value
      )
      .map(x => `
        <div class="payrow">
          <div class="payicon">
            ${x.icon}
          </div>
          <span>
            3 × ${x.name}
          </span>
          <b>
            ${x.value}×
          </b>
        </div>
      `)
      .join("");
}

/* ---------------- DEPOSIT ---------------- */

async function submitDeposit() {
  const amount =
    Number(
      $("depositAmount")?.value
    );

  const transactionId =
    $("depositTx")?.value.trim();

  if (!amount || amount <= 0) {
    $("depositMsg").textContent =
      "Enter a valid amount.";

    return;
  }

  if (!transactionId) {
    $("depositMsg").textContent =
      "Enter your transaction ID.";

    return;
  }

  $("depositMsg").textContent =
    "Submitting...";

  try {

    await api(
      "/api/deposit",
      "POST",
      {
        amount,
        transaction_id:
          transactionId
      }
    );

    $("depositMsg").textContent =
      "Deposit submitted. Waiting for admin approval.";

    if ($("depositAmount"))
      $("depositAmount").value = "";

    if ($("depositTx"))
      $("depositTx").value = "";

    await loadHistory();

  } catch (e) {

    $("depositMsg").textContent =
      e.message;
  }
}

/* ---------------- WITHDRAW ---------------- */

async function submitWithdraw() {
  const amount =
    Number(
      $("withdrawAmount")?.value
    );

  const phone =
    $("withdrawPhone")?.value.trim();

  if (!amount || amount <= 0) {
    $("withdrawMsg").textContent =
      "Enter a valid amount.";

    return;
  }

  if (!phone) {
    $("withdrawMsg").textContent =
      "Enter your Telebirr phone.";

    return;
  }

  if (amount > s.balance) {
    $("withdrawMsg").textContent =
      "Insufficient balance.";

    return;
  }

  $("withdrawMsg").textContent =
    "Submitting...";

  try {

    await api(
      "/api/withdraw",
      "POST",
      {
        amount,
        phone
      }
    );

    $("withdrawMsg").textContent =
      "Withdrawal submitted for admin approval.";

    if ($("withdrawAmount"))
      $("withdrawAmount").value = "";

    await loadPlayer();
    await loadHistory();

  } catch (e) {

    $("withdrawMsg").textContent =
      e.message;
  }
}

/* ---------------- INITIALIZE ---------------- */

function initialize() {

  if (tg) {
    tg.ready();
    tg.expand();
  }

  setPlayer();

  buildPaytable();

  renderMultipliers();

  render();

  /*
   * Load the real account from D1.
   */

  loadPlayer();

  loadHistory();
}

/* ---------------- BUTTONS ---------------- */

document
  .querySelectorAll(".tab")
  .forEach(button => {
    button.onclick = () =>
      screen(
        button.dataset.screen
      );
  });

if ($("spinBtn"))
  $("spinBtn").onclick = spin;

if ($("betDown"))
  $("betDown").onclick =
    () => bet(s.bet - 1);

if ($("betUp"))
  $("betUp").onclick =
    () => bet(s.bet + 1);

if ($("betPrev"))
  $("betPrev").onclick =
    () => bet(s.bet - 1);

if ($("betNext"))
  $("betNext").onclick =
    () => bet(s.bet + 1);

/* AUTO */

if ($("autoBtn")) {
  $("autoBtn").onclick = () => {

    s.auto = !s.auto;

    $("autoBtn")
      .classList.toggle(
        "on",
        s.auto
      );

    if (
      s.auto &&
      !s.spin
    ) {
      spin();
    }
  };
}

/* PAYTABLE */

if ($("payBtn")) {
  $("payBtn").onclick = () => {

    if ($("payModal"))
      $("payModal")
        .classList.add("open");
  };
}

/* CLOSE MODALS */

document
  .querySelectorAll("[data-close]")
  .forEach(x => {

    x.onclick = () => {

      const target =
        $(x.dataset.close);

      if (target)
        target.classList.remove("open");
    };
  });

/* DEPOSIT */

if ($("depositSubmit")) {
  $("depositSubmit").onclick =
    submitDeposit;
}

/* WITHDRAW */

if ($("withdrawSubmit")) {
  $("withdrawSubmit").onclick =
    submitWithdraw;
}

/* GAMBLE */

if ($("gambleBtn")) {
  $("gambleBtn").onclick = () => {

    if (s.pending) {

      if ($("gambleModal"))
        $("gambleModal")
          .classList.add("open");
    }
  };
}

/*
 * Win is already credited by the server.
 * This only closes the UI.
 */

if ($("takeWin")) {
  $("takeWin").onclick = () => {

    if ($("gambleModal"))
      $("gambleModal")
        .classList.remove("open");
  };
}

/* COLLECT */

if ($("collectBtn")) {
  $("collectBtn").onclick = () => {

    s.pending = 0;

    $("gambleBtn")
      ?.classList.add("disabled");

    $("collectBtn")
      ?.classList.add("disabled");

    status("Win collected.");

    render();
  };
}

/* CONTACT */

if ($("contactBtn")) {
  $("contactBtn").onclick = () => {

    const message =
      "Use the Telegram bot's contact-sharing button to verify your phone number.";

    if (tg?.showAlert) {
      tg.showAlert(message);
    } else if ($("contactState")) {
      $("contactState").textContent =
        message;
    }
  };
}

/* START */

initialize();
