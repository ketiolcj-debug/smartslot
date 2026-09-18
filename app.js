const tg = window.Telegram?.WebApp;

const API_BASE = "https://smartslot-api.ketiolcj.workers.dev";

/* =========================================================
   SMARTSLOT 5 SYMBOLS
   These symbols are also expected from the Cloudflare Worker.
   ========================================================= */

const symbols = [
  ["7",  "Lucky Seven", 150, 2],
  ["$",  "Dollar",       100, 3],
  ["🔔", "Golden Bell",   50, 5],
  ["🍉", "Watermelon",    40, 7],
  ["🍇", "Grapes",        40, 7],
  ["🍎", "Apple",         30, 8],
  ["🟣", "Plum",          25, 9],
  ["🍊", "Orange",        20, 11],
  ["🍋", "Lemon",         20, 11],
  ["🍒", "Cherries",      20, 14]
].map(x => ({
  icon: x[0],
  name: x[1],
  value: x[2],
  weight: x[3]
}));

/* =========================================================
   BETS / MULTIPLIERS
   ========================================================= */

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

/* =========================================================
   HELPERS
   ========================================================= */

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

/* =========================================================
   TELEGRAM PLAYER
   ========================================================= */

function setPlayer() {
  const u = tg?.initDataUnsafe?.user;

  const name = u?.first_name || "Player";

  if ($("playerName")) {
    $("playerName").textContent = name;
  }

  if ($("profileName")) {
    $("profileName").textContent = name;
  }

  if ($("profileUsername")) {
    $("profileUsername").textContent =
      u?.username ? "@" + u.username : "Telegram player";
  }

  const avatarLetter =
    name[0]?.toUpperCase() || "S";

  if ($("avatar")) {
    $("avatar").textContent = avatarLetter;
  }

  if ($("profileAvatar")) {
    $("profileAvatar").textContent = avatarLetter;
  }
}

/* =========================================================
   RENDER PLAYER DATA
   ========================================================= */

function render() {
  const b = bets[s.bet];

  if ($("balance")) {
    $("balance").textContent = money(s.balance);
  }

  if ($("gameBalance")) {
    $("gameBalance").textContent = money(s.balance);
  }

  if ($("walletBalance")) {
    $("walletBalance").textContent =
      money(s.balance) + " ETB";
  }

  if ($("lastWin")) {
    $("lastWin").textContent = money(s.win);
  }

  if ($("betInfo")) {
    $("betInfo").textContent = money(b);
  }

  if ($("spinBtn")) {
    const small = $("spinBtn").querySelector("small");

    if (small) {
      small.textContent =
        money(b) + " ETB";
    }
  }

  if ($("betPrev")) {
    $("betPrev").textContent =
      bets[Math.max(0, s.bet - 1)] + " ETB";
  }

  if ($("betNext")) {
    $("betNext").textContent =
      bets[Math.min(bets.length - 1, s.bet + 1)] +
      " ETB";
  }

  if ($("games")) {
    $("games").textContent = s.games;
  }

  if ($("totalWon")) {
    $("totalWon").textContent =
      money(s.total) + " ETB";
  }

  renderHistory();
}

/* =========================================================
   API
   ========================================================= */

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

  if (
    !response.ok ||
    data.ok === false
  ) {
    throw new Error(
      data.error || "Request failed."
    );
  }

  return data;
}

/* =========================================================
   LOAD PLAYER
   ========================================================= */

async function loadPlayer() {

  try {

    const d = await api("/api/me");

    if (!d.player) {
      return;
    }

    s.balance =
      Number(d.player.balance || 0);

    s.games =
      Number(d.player.games_played || 0);

    s.total =
      Number(d.player.total_won || 0);

    if (
      $("playerName") &&
      d.player.first_name
    ) {
      $("playerName").textContent =
        d.player.first_name;
    }

    if (
      $("profileName") &&
      d.player.first_name
    ) {
      $("profileName").textContent =
        d.player.first_name;
    }

    if ($("profileUsername")) {

      $("profileUsername").textContent =
        d.player.username
          ? "@" + d.player.username
          : "Telegram player";
    }

    const avatarLetter =
      (d.player.first_name || "Player")
        [0]
        ?.toUpperCase() || "S";

    if ($("avatar")) {
      $("avatar").textContent =
        avatarLetter;
    }

    if ($("profileAvatar")) {
      $("profileAvatar").textContent =
        avatarLetter;
    }

    render();

  } catch (e) {

    console.error(e);

    status(
      e.message ||
      "Unable to load player.",
      true
    );
  }
}

/* =========================================================
   HISTORY
   ========================================================= */

async function loadHistory() {

  try {

    const d =
      await api("/api/history");

    s.history =
      (d.history || []).map(x => ({
        type:
          Number(x.win || 0) > 0
            ? "Game win"
            : "Game",

        amount:
          Number(x.win || 0),

        date:
          x.created_at
            ? new Date(
                x.created_at
                  .replace(" ", "T") + "Z"
              ).toLocaleString()
            : ""
      }));

    renderHistory();

  } catch (e) {

    console.error(e);
  }
}

function renderHistory() {

  const e = $("history");

  if (!e) {
    return;
  }

  if (!s.history.length) {

    e.innerHTML =
      '<div class="empty">No transactions yet.</div>';

    return;
  }

  e.innerHTML =
    s.history.map(x => `
      <div class="history-item">

        <div>
          <b>${x.type}</b>
          <small>${x.date}</small>
        </div>

        <strong>
          ${x.amount >= 0 ? "+" : ""}
          ${money(x.amount)}
          ETB
        </strong>

      </div>
    `).join("");
}

/* =========================================================
   SCREEN NAVIGATION
   ========================================================= */

function screen(name) {

  document
    .querySelectorAll(".screen")
    .forEach(x =>
      x.classList.remove("active")
    );

  const target =
    $("screen-" + name);

  if (target) {
    target.classList.add("active");
  }

  document
    .querySelectorAll(".tab")
    .forEach(x =>
      x.classList.toggle(
        "active",
        x.dataset.screen === name
      )
    );

  if (name === "history") {
    loadHistory();
  }

  if (
    name === "wallet" ||
    name === "profile"
  ) {
    loadPlayer();
  }
}

/* =========================================================
   MULTIPLIERS
   ========================================================= */

function renderMultipliers() {

  const box = $("mults");

  if (!box) {
    return;
  }

  box.innerHTML =
    mults.map(x => `
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
    `).join("");

  box
    .querySelectorAll(".mult")
    .forEach(element => {

      element.onclick = () => {

        if (s.spin) {
          return;
        }

        selectedMultiplier =
          Number(element.dataset.mult);

        renderMultipliers();
      };

    });
}

/* =========================================================
   SYMBOL NORMALIZER
   ========================================================= */

function normalizeSymbol(x) {

  if (
    x &&
    typeof x === "object"
  ) {

    return (
      x.icon ||
      x.symbol ||
      x.name ||
      "❔"
    );
  }

  const map = {

    seven: "7",
    "7": "7",
    "7️⃣": "7",

    dollar: "$",
    "$": "$",
    "💲": "$",

    bell: "🔔",

    watermelon: "🍉",
    grapes: "🍇",
    plum: "🟣",
    apple: "🍎",
    orange: "🍊",
    lemon: "🍋",
    cherry: "🍒",
    cherries: "🍒"
  };

  const key =
    String(x || "")
      .trim()
      .toLowerCase();

  return (
    map[key] ||
    String(x || "❔")
  );
}

/* =========================================================
   BUILD REEL
   ========================================================= */

function build(el, arr) {

  if (!el) {
    return;
  }

  el.innerHTML = "";

  const values =
    arr.map(normalizeSymbol);

  /*
   * Repeat the symbols so the reel
   * has enough content for the animation.
   */

  const repeated = [
    ...values,
    ...values,
    ...values,
    ...values,
    ...values
  ];

  repeated.forEach(icon => {

    const d =
      document.createElement("div");

    d.className = "sym";

    d.textContent = icon;

    el.appendChild(d);
  });
}

/* =========================================================
   REEL ANIMATION
   ========================================================= */

function spinReel(el, duration) {

  return new Promise(resolve => {

    if (!el) {
      resolve();
      return;
    }

    const parent =
      el.parentElement;

    const height =
      parent.clientHeight / 3;

    el.style.transition = "none";

    el.style.transform =
      `translateY(${height * 2}px)`;

    requestAnimationFrame(() => {

      requestAnimationFrame(() => {

        el.style.transition =
          `transform ${duration}ms cubic-bezier(.12,.86,.2,1)`;

        el.style.transform =
          `translateY(${-height * 3}px)`;

        setTimeout(
          resolve,
          duration + 30
        );
      });

    });
  });
}

/* =========================================================
   WINNING LINES
   ========================================================= */

function linesWin(winningLines) {

  const e = $("lines");

  if (!e) {
    return;
  }

  e.innerHTML = "";

  (winningLines || [])
    .forEach(i => {

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

      e.appendChild(d);
    });
}

/* =========================================================
   STATUS MESSAGE
   ========================================================= */

function status(text, bad = false) {

  const e = $("status");

  if (!e) {
    return;
  }

  e.textContent = text;

  e.classList.toggle(
    "lose",
    !!bad
  );
}

/* =========================================================
   MAIN SPIN
   ========================================================= */

async function spin() {

  if (s.spin) {
    return;
  }

  const betAmount =
    bets[s.bet];

  if (
    s.balance < betAmount
  ) {

    status(
      "Insufficient balance — deposit first.",
      true
    );

    return;
  }

  s.spin = true;

  if ($("spinBtn")) {
    $("spinBtn").disabled = true;
  }

  if ($("lines")) {
    $("lines").innerHTML = "";
  }

  status("Spinning...");

  try {

    /*
     * IMPORTANT:
     * The Cloudflare Worker decides
     * the actual result.
     */

    const d =
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
      d.grid || [];

    const winningLines =
      d.winningLines || [];

    const win =
      Number(d.win || 0);

    const multiplier =
      Number(
        d.multiplier ||
        selectedMultiplier
      );

    /*
     * Display the server result.
     */

    reels.forEach((reel, column) => {

      build(
        reel,
        grid[column] || []
      );

    });

    /*
     * Animate each reel.
     */

    await Promise.all(
      reels.map(
        (reel, column) =>
          spinReel(
            reel,
            700 + column * 250
          )
      )
    );

    /*
     * Update wallet using
     * the server's balance.
     */

    s.balance =
      Number(d.balance || 0);

    s.win = win;

    if (win > 0) {

      s.pending = win;

      status(
        `WIN ${money(win)} ETB` +
        (
          multiplier > 1
            ? ` · ${multiplier}× MULTIPLIER`
            : ""
        ) +
        "!"
      );

      linesWin(winningLines);

      if ($("gambleBtn")) {
        $("gambleBtn")
          .classList
          .remove("disabled");
      }

      if ($("collectBtn")) {
        $("collectBtn")
          .classList
          .remove("disabled");
      }

    } else {

      s.pending = 0;

      status(
        "No win — spin again.",
        true
      );
    }

    /*
     * The server already records
     * the game, so this is only
     * for the local display count.
     */

    s.games++;

    render();

    /*
     * Auto-spin.
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

    console.error(e);

    status(
      e.message ||
      "Spin failed.",
      true
    );

    await loadPlayer();

  } finally {

    s.spin = false;

    if ($("spinBtn")) {
      $("spinBtn").disabled = false;
    }
  }
}

/* =========================================================
   BET CONTROL
   ========================================================= */

function bet(index) {

  if (s.spin) {
    return;
  }

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

/* =========================================================
   PAYTABLE
   ========================================================= */

function buildPaytable() {

  const e = $("payRows");

  if (!e) {
    return;
  }

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

/* =========================================================
   DEPOSIT
   ========================================================= */

async function submitDeposit() {

  const amount =
    Number(
      $("depositAmount")?.value
    );

  const transactionId =
    $("depositTx")
      ?.value
      .trim();

  if (
    !amount ||
    amount <= 0
  ) {

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

    if ($("depositAmount")) {
      $("depositAmount").value = "";
    }

    if ($("depositTx")) {
      $("depositTx").value = "";
    }

    await loadHistory();

  } catch (e) {

    $("depositMsg").textContent =
      e.message;
  }
}

/* =========================================================
   WITHDRAW
   ========================================================= */

async function submitWithdraw() {

  const amount =
    Number(
      $("withdrawAmount")?.value
    );

  const phone =
    $("withdrawPhone")
      ?.value
      .trim();

  if (
    !amount ||
    amount <= 0
  ) {

    $("withdrawMsg").textContent =
      "Enter a valid amount.";

    return;
  }

  if (!phone) {

    $("withdrawMsg").textContent =
      "Enter your Telebirr phone.";

    return;
  }

  if (
    amount > s.balance
  ) {

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

    if ($("withdrawAmount")) {
      $("withdrawAmount").value = "";
    }

    await loadPlayer();
    await loadHistory();

  } catch (e) {

    $("withdrawMsg").textContent =
      e.message;
  }
}

/* =========================================================
   INITIALIZE
   ========================================================= */

function initialize() {

  if (tg) {
    tg.ready();
    tg.expand();
  }

  setPlayer();

  buildPaytable();

  renderMultipliers();

  render();

  loadPlayer();

  loadHistory();
}

/* =========================================================
   NAVIGATION EVENTS
   ========================================================= */

document
  .querySelectorAll(".tab")
  .forEach(button => {

    button.onclick = () =>
      screen(
        button.dataset.screen
      );
  });

/* =========================================================
   SPIN BUTTON
   ========================================================= */

if ($("spinBtn")) {
  $("spinBtn").onclick = spin;
}

/* =========================================================
   BET BUTTONS
   ========================================================= */

if ($("betDown")) {
  $("betDown").onclick =
    () => bet(s.bet - 1);
}

if ($("betUp")) {
  $("betUp").onclick =
    () => bet(s.bet + 1);
}

if ($("betPrev")) {
  $("betPrev").onclick =
    () => bet(s.bet - 1);
}

if ($("betNext")) {
  $("betNext").onclick =
    () => bet(s.bet + 1);
}

/* =========================================================
   AUTO SPIN
   ========================================================= */

if ($("autoBtn")) {

  $("autoBtn").onclick = () => {

    s.auto = !s.auto;

    $("autoBtn")
      .classList
      .toggle(
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

/* =========================================================
   PAYTABLE MODAL
   ========================================================= */

if ($("payBtn")) {

  $("payBtn").onclick = () => {

    $("payModal")
      ?.classList
      .add("open");
  };
}

/* =========================================================
   CLOSE MODALS
   ========================================================= */

document
  .querySelectorAll("[data-close]")
  .forEach(element => {

    element.onclick = () => {

      const target =
        $(element.dataset.close);

      target
        ?.classList
        .remove("open");
    };

  });

/* =========================================================
   DEPOSIT / WITHDRAW
   ========================================================= */

if ($("depositSubmit")) {
  $("depositSubmit").onclick =
    submitDeposit;
}

if ($("withdrawSubmit")) {
  $("withdrawSubmit").onclick =
    submitWithdraw;
}

/* =========================================================
   GAMBLE
   ========================================================= */

if ($("gambleBtn")) {

  $("gambleBtn").onclick = () => {

    if (s.pending) {

      $("gambleModal")
        ?.classList
        .add("open");
    }
  };
}

/* =========================================================
   TAKE WIN
   ========================================================= */

if ($("takeWin")) {

  $("takeWin").onclick = () => {

    $("gambleModal")
      ?.classList
      .remove("open");
  };
}

/* =========================================================
   COLLECT WIN
   ========================================================= */

if ($("collectBtn")) {

  $("collectBtn").onclick = () => {

    s.pending = 0;

    $("gambleBtn")
      ?.classList
      .add("disabled");

    $("collectBtn")
      ?.classList
      .add("disabled");

    status("Win collected.");

    render();
  };
}

/* =========================================================
   CONTACT
   ========================================================= */

if ($("contactBtn")) {

  $("contactBtn").onclick = () => {

    const message =
      "Use the Telegram bot's contact-sharing button to verify your phone number.";

    if (tg?.showAlert) {

      tg.showAlert(message);

    } else if ($("contactState")) {

      $("contactState")
        .textContent = message;
    }
  };
}

/* =========================================================
   START
   ========================================================= */

initialize();
