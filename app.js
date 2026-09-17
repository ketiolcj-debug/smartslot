const API_BASE =
  "https://smartslot-api.ketiolcj.workers.dev";

/* ------------------------------------------------ */
/* TELEGRAM                                         */
/* ------------------------------------------------ */

const tg =
  window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}

const initData =
  tg?.initData || "";

/* ------------------------------------------------ */
/* GAME CONFIG                                      */
/* ------------------------------------------------ */

const BETS = [
  5,
  10,
  25,
  50,
  100,
  250
];

const MULTIPLIERS = [
  1,
  2,
  3,
  4,
  5
];

const SYMBOL_ALIASES = {
  "7️⃣": "7️⃣",
  "7": "7️⃣",
  "$": "💲",
  "💲": "💲",
  "🔔": "🔔",
  "🍉": "🍉",
  "🍇": "🍇",
  "🟣": "🟣",
  "🍊": "🍊",
  "🍋": "🍋",
  "🍒": "🍒"
};

let selectedBet = 5;
let selectedMultiplier = 1;
let spinning = false;

/* ------------------------------------------------ */
/* DOM                                              */
/* ------------------------------------------------ */

const balanceEl =
  document.querySelector(
    "#balance"
  );

const screenEl =
  document.querySelector(
    ".screen"
  );

const spinBtn =
  document.querySelector(
    "#spinBtn"
  );

const betButtons =
  document.querySelectorAll(
    "[data-bet]"
  );

const multiplierButtons =
  document.querySelectorAll(
    "[data-multiplier]"
  );

const tabs =
  document.querySelectorAll(
    ".tab"
  );

/* ------------------------------------------------ */
/* API                                              */
/* ------------------------------------------------ */

async function api(
  path,
  options = {}
) {
  const headers = {
    "Content-Type":
      "application/json"
  };

  if (initData) {
    headers[
      "X-Telegram-Init-Data"
    ] = initData;
  }

  const response =
    await fetch(
      API_BASE + path,
      {
        ...options,
        headers: {
          ...headers,
          ...(options.headers || {})
        }
      }
    );

  let data;

  try {
    data =
      await response.json();
  } catch {
    throw new Error(
      "Invalid server response."
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
/* PROFILE                                          */
/* ------------------------------------------------ */

async function loadProfile() {
  try {
    const data =
      await api(
        "/api/me"
      );

    updateBalance(
      data.player.balance
    );

    updateProfile(
      data.player
    );

  } catch (error) {
    console.error(
      "Profile:",
      error
    );

    showMessage(
      error.message
    );
  }
}

function updateBalance(
  value
) {
  const amount =
    Number(value || 0)
      .toFixed(2);

  if (balanceEl) {
    balanceEl.textContent =
      `${amount} ETB`;
  }

  document
    .querySelectorAll(
      "[data-balance]"
    )
    .forEach(el => {
      el.textContent =
        `${amount} ETB`;
    });
}

function updateProfile(
  player
) {
  document
    .querySelectorAll(
      "[data-profile-name]"
    )
    .forEach(el => {
      el.textContent =
        player.first_name ||
        player.username ||
        "Player";
    });

  document
    .querySelectorAll(
      "[data-profile-username]"
    )
    .forEach(el => {
      el.textContent =
        player.username
          ? `@${player.username}`
          : "";
    });
}

/* ------------------------------------------------ */
/* BET SELECTION                                    */
/* ------------------------------------------------ */

function selectBet(
  bet
) {
  bet =
    Number(bet);

  if (
    !Number.isInteger(bet) ||
    !BETS.includes(bet)
  ) {
    return;
  }

  selectedBet =
    bet;

  betButtons
    .forEach(button => {
      const value =
        Number(
          button.dataset.bet
        );

      button.classList.toggle(
        "active",
        value === selectedBet
      );
    });
}

/* ------------------------------------------------ */
/* MULTIPLIER                                      */
/* ------------------------------------------------ */

function selectMultiplier(
  multiplier
) {
  multiplier =
    Number(multiplier);

  if (
    !Number.isInteger(
      multiplier
    ) ||
    !MULTIPLIERS.includes(
      multiplier
    )
  ) {
    return;
  }

  selectedMultiplier =
    multiplier;

  multiplierButtons
    .forEach(button => {
      const value =
        Number(
          button.dataset.multiplier
        );

      button.classList.toggle(
        "active",
        value ===
          selectedMultiplier
      );
    });
}

/* ------------------------------------------------ */
/* SPIN                                             */
/* ------------------------------------------------ */

async function spin() {
  if (spinning) {
    return;
  }

  if (!initData) {
    showMessage(
      "Open SmartSlot from Telegram."
    );

    return;
  }

  spinning = true;

  if (spinBtn) {
    spinBtn.disabled =
      true;

    spinBtn.textContent =
      "SPINNING...";
  }

  clearResult();

  try {
    /*
     * IMPORTANT:
     *
     * The browser sends only:
     * bet
     * multiplier
     *
     * The Worker determines:
     * balance
     * random result
     * winning lines
     * payout
     */

    const data =
      await api(
        "/api/spin",
        {
          method: "POST",
          body:
            JSON.stringify({
              bet:
                selectedBet,
              multiplier:
                selectedMultiplier
            })
        }
      );

    renderGrid(
      data.grid
    );

    showWin(
      data.win,
      data.winningLines
    );

    updateBalance(
      data.balance
    );

    if (
      data.win > 0
    ) {
      playWinSound();
    } else {
      playSpinSound();
    }

  } catch (error) {
    showMessage(
      error.message
    );

  } finally {
    spinning = false;

    if (spinBtn) {
      spinBtn.disabled =
        false;

      spinBtn.textContent =
        "SPIN";
    }
  }
}

/* ------------------------------------------------ */
/* GRID                                             */
/* ------------------------------------------------ */

function renderGrid(
  grid
) {
  if (!Array.isArray(grid)) {
    return;
  }

  const cells =
    document.querySelectorAll(
      ".reel .symbol, .reel .cell, .reel-value, .symbol"
    );

  const flat =
    grid.flat();

  /*
   * Try common 3x3 layouts first.
   */

  const reelElements =
    document.querySelectorAll(
      ".reel"
    );

  if (
    reelElements.length === 3
  ) {
    reelElements.forEach(
      (reel, column) => {
        const values =
          reel.querySelectorAll(
            ".symbol, .cell, .reel-value"
          );

        values.forEach(
          (element, row) => {
            if (
              grid[row] &&
              grid[row][column]
            ) {
              element.textContent =
                getSymbolIcon(
                  grid[row][column]
                );
            }
          }
        );
      }
    );

    return;
  }

  cells.forEach(
    (element, index) => {
      if (
        flat[index]
      ) {
        element.textContent =
          getSymbolIcon(
            flat[index]
          );
      }
    }
  );
}

function getSymbolIcon(
  symbol
) {
  if (!symbol) {
    return "";
  }

  const icon =
    typeof symbol === "string"
      ? symbol
      : symbol.icon;

  return (
    SYMBOL_ALIASES[icon] ||
    icon ||
    ""
  );
}

/* ------------------------------------------------ */
/* WIN DISPLAY                                      */
/* ------------------------------------------------ */

function showWin(
  win,
  winningLines
) {
  const amount =
    Number(win || 0)
      .toFixed(2);

  document
    .querySelectorAll(
      "[data-win]"
    )
    .forEach(el => {
      el.textContent =
        `${amount} ETB`;
    });

  document
    .querySelectorAll(
      ".win-message, #winMessage"
    )
    .forEach(el => {
      el.textContent =
        Number(win) > 0
          ? `WIN +${amount} ETB`
          : "No win";
    });

  highlightLines(
    winningLines || []
  );
}

function highlightLines(
  lines
) {
  document
    .querySelectorAll(
      ".payline"
    )
    .forEach(
      line =>
        line.classList.remove(
          "winning"
        )
    );

  lines.forEach(
    lineIndex => {
      const element =
        document.querySelector(
          `[data-line="${lineIndex}"]`
        );

      element?.classList.add(
        "winning"
      );
    }
  );
}

function clearResult() {
  document
    .querySelectorAll(
      ".win-message, #winMessage"
    )
    .forEach(el => {
      el.textContent =
        "";
    });

  document
    .querySelectorAll(
      "[data-win]"
    )
    .forEach(el => {
      el.textContent =
        "0.00 ETB";
    });

  document
    .querySelectorAll(
      ".payline"
    )
    .forEach(
      line =>
        line.classList.remove(
          "winning"
        )
    );
}

/* ------------------------------------------------ */
/* DEPOSIT                                          */
/* ------------------------------------------------ */

async function submitDeposit(
  amount,
  transactionId
) {
  amount =
    Number(amount);

  transactionId =
    String(
      transactionId || ""
    ).trim();

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    showMessage(
      "Enter a valid deposit amount."
    );

    return;
  }

  if (!transactionId) {
    showMessage(
      "Enter your transaction ID."
    );

    return;
  }

  try {
    const data =
      await api(
        "/api/deposit",
        {
          method: "POST",
          body:
            JSON.stringify({
              amount,
              transaction_id:
                transactionId
            })
        }
      );

    showMessage(
      data.message
    );

  } catch (error) {
    showMessage(
      error.message
    );
  }
}

/* ------------------------------------------------ */
/* WITHDRAW                                         */
/* ------------------------------------------------ */

async function submitWithdraw(
  amount,
  phone
) {
  amount =
    Number(amount);

  phone =
    String(
      phone || ""
    ).trim();

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    showMessage(
      "Enter a valid withdrawal amount."
    );

    return;
  }

  if (!phone) {
    showMessage(
      "Enter your Telebirr phone number."
    );

    return;
  }

  try {
    const data =
      await api(
        "/api/withdraw",
        {
          method: "POST",
          body:
            JSON.stringify({
              amount,
              phone
            })
        }
      );

    showMessage(
      data.message
    );

    await loadProfile();

  } catch (error) {
    showMessage(
      error.message
    );
  }
}

/* ------------------------------------------------ */
/* HISTORY                                          */
/* ------------------------------------------------ */

async function loadHistory() {
  try {
    const data =
      await api(
        "/api/history"
      );

    renderHistory(
      data.history || []
    );

  } catch (error) {
    console.error(
      "History:",
      error
    );
  }
}

function renderHistory(
  items
) {
  const container =
    document.querySelector(
      "#historyList, .history-list"
    );

  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (!items.length) {
    const empty =
      document.createElement(
        "div"
      );

    empty.className =
      "empty";

    empty.textContent =
      "No games yet.";

    container.appendChild(
      empty
    );

    return;
  }

  for (const item of items) {
    const row =
      document.createElement(
        "div"
      );

    row.className =
      "history-item";

    const result =
      document.createElement(
        "div"
      );

    result.textContent =
      `Bet: ${item.bet} ETB`;

    const win =
      document.createElement(
        "div"
      );

    win.textContent =
      `Win: ${Number(
        item.win || 0
      ).toFixed(2)} ETB`;

    row.append(
      result,
      win
    );

    container.appendChild(
      row
    );
  }
}

/* ------------------------------------------------ */
/* WALLET HISTORY                                   */
/* ------------------------------------------------ */

async function loadWalletHistory() {
  try {
    const data =
      await api(
        "/api/wallet/history"
      );

    renderWalletHistory(
      data.transactions || []
    );

  } catch (error) {
    console.error(
      "Wallet history:",
      error
    );
  }
}

function renderWalletHistory(
  items
) {
  const container =
    document.querySelector(
      "#walletHistory, .wallet-history"
    );

  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (!items.length) {
    const empty =
      document.createElement(
        "div"
      );

    empty.className =
      "empty";

    empty.textContent =
      "No wallet transactions.";

    container.appendChild(
      empty
    );

    return;
  }

  for (const item of items) {
    const row =
      document.createElement(
        "div"
      );

    row.className =
      "wallet-item";

    const description =
      document.createElement(
        "div"
      );

    description.textContent =
      item.description ||
      item.type ||
      "Transaction";

    const amount =
      document.createElement(
        "div"
      );

    amount.textContent =
      `${Number(
        item.amount || 0
      ).toFixed(2)} ETB`;

    const status =
      document.createElement(
        "div"
      );

    status.textContent =
      item.status || "";

    row.append(
      description,
      amount,
      status
    );

    container.appendChild(
      row
    );
  }
}

/* ------------------------------------------------ */
/* TABS                                             */
/* ------------------------------------------------ */

function switchTab(
  tabName
) {
  document
    .querySelectorAll(
      "[data-panel]"
    )
    .forEach(panel => {
      panel.classList.toggle(
        "active",
        panel.dataset.panel ===
          tabName
      );
    });

  tabs.forEach(tab => {
    tab.classList.toggle(
      "active",
      tab.dataset.tab ===
        tabName
    );
  });

  if (
    tabName ===
    "history"
  ) {
    loadHistory();
  }

  if (
    tabName ===
    "wallet"
  ) {
    loadWalletHistory();
  }
}

/* ------------------------------------------------ */
/* MESSAGE                                          */
/* ------------------------------------------------ */

function showMessage(
  message
) {
  const element =
    document.querySelector(
      "#message, .message"
    );

  if (element) {
    element.textContent =
      String(message);
  } else {
    console.log(
      message
    );
  }
}

/* ------------------------------------------------ */
/* SOUND                                            */
/* ------------------------------------------------ */

function playSpinSound() {
  try {
    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContext) {
      return;
    }

    const audio =
      new AudioContext();

    const oscillator =
      audio.createOscillator();

    const gain =
      audio.createGain();

    oscillator.frequency.value =
      180;

    gain.gain.value =
      0.04;

    oscillator.connect(
      gain
    );

    gain.connect(
      audio.destination
    );

    oscillator.start();

    oscillator.stop(
      audio.currentTime +
        0.12
    );

  } catch {}
}

function playWinSound() {
  try {
    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContext) {
      return;
    }

    const audio =
      new AudioContext();

    const oscillator =
      audio.createOscillator();

    const gain =
      audio.createGain();

    oscillator.frequency.value =
      700;

    gain.gain.value =
      0.05;

    oscillator.connect(
      gain
    );

    gain.connect(
      audio.destination
    );

    oscillator.start();

    oscillator.stop(
      audio.currentTime +
        0.25
    );

  } catch {}
}

/* ------------------------------------------------ */
/* EVENTS                                           */
/* ------------------------------------------------ */

betButtons.forEach(
  button => {
    button.addEventListener(
      "click",
      () =>
        selectBet(
          button.dataset.bet
        )
    );
  }
);

multiplierButtons.forEach(
  button => {
    button.addEventListener(
      "click",
      () =>
        selectMultiplier(
          button.dataset.multiplier
        )
    );
  }
);

spinBtn?.addEventListener(
  "click",
  spin
);

tabs.forEach(
  tab => {
    tab.addEventListener(
      "click",
      () =>
        switchTab(
          tab.dataset.tab
        )
    );
  }
);

/* ------------------------------------------------ */
/* INITIALIZE                                       */
/* ------------------------------------------------ */

selectBet(
  selectedBet
);

selectMultiplier(
  selectedMultiplier
);

loadProfile();
