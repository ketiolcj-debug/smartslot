const tg = window.Telegram?.WebApp;

const API_BASE =
  "https://smartslot-api.ketiolcj.workers.dev";


/* =========================================================
   HELPERS
   ========================================================= */

const $ = id =>
  document.getElementById(id);


function money(value) {

  return Number(value || 0)
    .toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

}


function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/* =========================================================
   STATUS
   ========================================================= */

function setStatus(text, type = "") {

  const e = $("status");

  if (!e) return;

  e.textContent = text;

  e.className = "status";

  if (type) {
    e.classList.add(type);
  }

}


/* =========================================================
   API
   ========================================================= */

async function api(
  path,
  method = "GET",
  data = null
) {

  if (!tg?.initData) {

    throw new Error(
      "Please open the admin panel from Telegram."
    );

  }


  const options = {

    method,

    headers: {

      "Content-Type":
        "application/json",

      "X-Telegram-Init-Data":
        tg.initData

    }

  };


  if (data !== null) {

    options.body =
      JSON.stringify(data);

  }


  const response =
    await fetch(
      API_BASE + path,
      options
    );


  let result;

  try {

    result =
      await response.json();

  } catch {

    throw new Error(
      "Invalid server response."
    );

  }


  if (
    !response.ok ||
    result.ok === false
  ) {

    throw new Error(
      result.error ||
      "Request failed."
    );

  }


  return result;

}


/* =========================================================
   LOAD DEPOSITS
   ========================================================= */

async function loadDeposits() {

  const container =
    $("deposits");

  container.innerHTML =
    `<div class="loading">
       Loading deposits...
     </div>`;


  try {

    const data =
      await api(
        "/api/admin/deposits"
      );


    const deposits =
      data.deposits || [];


    $("depositCount")
      .textContent =
      deposits.length;


    if (!deposits.length) {

      container.innerHTML =
        `<div class="empty">
          No pending deposits.
        </div>`;

      return;

    }


    container.innerHTML =
      deposits
        .map(depositCard)
        .join("");

  } catch (error) {

    container.innerHTML =
      `<div class="empty">
        ${escapeHtml(error.message)}
      </div>`;

    throw error;

  }

}


/* =========================================================
   DEPOSIT CARD
   ========================================================= */

function depositCard(d) {

  const id =
    Number(d.id);

  const amount =
    money(d.amount);


  return `

    <div class="request">

      <div class="request-top">

        <div>

          <div class="request-id">
            Deposit #${id}
          </div>

          <div class="request-amount">
            ${amount} ETB
          </div>

        </div>

        <div class="request-id">
          PENDING
        </div>

      </div>


      <div class="request-info">

        <div class="info-row">

          <span class="info-label">
            Telegram ID
          </span>

          <span class="info-value">
            ${escapeHtml(
              d.telegram_id
            )}
          </span>

        </div>


        <div class="info-row">

          <span class="info-label">
            Transaction ID
          </span>

          <span class="info-value">
            ${escapeHtml(
              d.transaction_id
            )}
          </span>

        </div>


        <div class="info-row">

          <span class="info-label">
            Submitted
          </span>

          <span class="info-value">
            ${escapeHtml(
              d.created_at || ""
            )}
          </span>

        </div>

      </div>


      <div class="actions">

        <button
          class="btn approve"
          onclick="approveDeposit(${id})"
        >
          ✓ Approve
        </button>

        <button
          class="btn reject"
          onclick="rejectDeposit(${id})"
        >
          ✕ Reject
        </button>

      </div>

    </div>

  `;

}


/* =========================================================
   LOAD WITHDRAWALS
   ========================================================= */

async function loadWithdrawals() {

  const container =
    $("withdrawals");

  container.innerHTML =
    `<div class="loading">
       Loading withdrawals...
     </div>`;


  try {

    const data =
      await api(
        "/api/admin/withdrawals"
      );


    const withdrawals =
      data.withdrawals || [];


    $("withdrawCount")
      .textContent =
      withdrawals.length;


    if (!withdrawals.length) {

      container.innerHTML =
        `<div class="empty">
          No pending withdrawals.
        </div>`;

      return;

    }


    container.innerHTML =
      withdrawals
        .map(withdrawalCard)
        .join("");

  } catch (error) {

    container.innerHTML =
      `<div class="empty">
        ${escapeHtml(error.message)}
      </div>`;

    throw error;

  }

}


/* =========================================================
   WITHDRAWAL CARD
   ========================================================= */

function withdrawalCard(w) {

  const id =
    Number(w.id);

  const amount =
    money(w.amount);


  return `

    <div class="request">

      <div class="request-top">

        <div>

          <div class="request-id">
            Withdrawal #${id}
          </div>

          <div class="request-amount">
            ${amount} ETB
          </div>

        </div>

        <div class="request-id">
          PENDING
        </div>

      </div>


      <div class="request-info">

        <div class="info-row">

          <span class="info-label">
            Telegram ID
          </span>

          <span class="info-value">
            ${escapeHtml(
              w.telegram_id
            )}
          </span>

        </div>


        <div class="info-row">

          <span class="info-label">
            Telebirr
          </span>

          <span class="info-value">
            ${escapeHtml(
              w.phone
            )}
          </span>

        </div>


        <div class="info-row">

          <span class="info-label">
            Submitted
          </span>

          <span class="info-value">
            ${escapeHtml(
              w.created_at || ""
            )}
          </span>

        </div>

      </div>


      <div class="actions">

        <button
          class="btn approve"
          onclick="approveWithdrawal(${id})"
        >
          ✓ Approve
        </button>

        <button
          class="btn reject"
          onclick="rejectWithdrawal(${id})"
        >
          ✕ Reject
        </button>

      </div>

    </div>

  `;

}


/* =========================================================
   REFRESH ALL
   ========================================================= */

async function refreshAll() {

  setStatus(
    "Refreshing..."
  );


  try {

    await Promise.all([
      loadDeposits(),
      loadWithdrawals()
    ]);


    setStatus(
      "Admin panel updated.",
      "success"
    );

  } catch (error) {

    setStatus(
      error.message,
      "error"
    );

  }

}


/* =========================================================
   APPROVE DEPOSIT
   ========================================================= */

async function approveDeposit(id) {

  if (
    !confirm(
      "Approve this deposit?\n\n" +
      "The player's balance will be credited."
    )
  ) {

    return;

  }


  setStatus(
    "Approving deposit..."
  );


  try {

    await api(
      "/api/admin/deposit/approve",
      "POST",
      { id }
    );


    setStatus(
      "Deposit approved successfully.",
      "success"
    );


    await refreshAll();

  } catch (error) {

    setStatus(
      error.message,
      "error"
    );

  }

}


/* =========================================================
   REJECT DEPOSIT
   ========================================================= */

async function rejectDeposit(id) {

  if (
    !confirm(
      "Reject this deposit?"
    )
  ) {

    return;

  }


  setStatus(
    "Rejecting deposit..."
  );


  try {

    await api(
      "/api/admin/deposit/reject",
      "POST",
      { id }
    );


    setStatus(
      "Deposit rejected.",
      "success"
    );


    await refreshAll();

  } catch (error) {

    setStatus(
      error.message,
      "error"
    );

  }

}


/* =========================================================
   APPROVE WITHDRAWAL
   ========================================================= */

async function approveWithdrawal(id) {

  if (
    !confirm(
      "Approve this withdrawal?\n\n" +
      "Confirm that you have sent the money to the player's Telebirr number."
    )
  ) {

    return;

  }


  setStatus(
    "Approving withdrawal..."
  );


  try {

    await api(
      "/api/admin/withdraw/approve",
      "POST",
      { id }
    );


    setStatus(
      "Withdrawal approved.",
      "success"
    );


    await refreshAll();

  } catch (error) {

    setStatus(
      error.message,
      "error"
    );

  }

}


/* =========================================================
   REJECT WITHDRAWAL
   ========================================================= */

async function rejectWithdrawal(id) {

  if (
    !confirm(
      "Reject this withdrawal?\n\n" +
      "The reserved balance will be returned to the player."
    )
  ) {

    return;

  }


  setStatus(
    "Rejecting withdrawal..."
  );


  try {

    await api(
      "/api/admin/withdraw/reject",
      "POST",
      { id }
    );


    setStatus(
      "Withdrawal rejected and balance returned.",
      "success"
    );


    await refreshAll();

  } catch (error) {

    setStatus(
      error.message,
      "error"
    );

  }

}


/* =========================================================
   REFRESH BUTTON
   ========================================================= */

$("refreshBtn").onclick =
  refreshAll;


/* =========================================================
   TELEGRAM INITIALIZATION
   ========================================================= */

function initialize() {

  if (tg) {

    tg.ready();
    tg.expand();

  }


  refreshAll();

}


initialize();
