// /public/sms-consent/sms-consent.js
(() => {
  const $ = (id) => document.getElementById(id);

  const state = {
    token: null,
    orgName: "your organization",
    phoneE164: null,
    codeSent: false,
    verified: false,
    busy: false,
    consentStatus: "Unknown",
  };

  // Elements
  const tokenError = $("tokenError");

  const verifyForm = $("verifyForm");
  const sendCodeBtn = $("sendCodeBtn");
  const phoneInput = $("phone");

  const codeForm = $("codeForm");
  const codeFieldset = $("codeFieldset");
  const codeLockedNote = $("codeLockedNote");
  const codeInput = $("code");
  const resendBtn = $("resendBtn");
  const verifyCodeBtn = $("verifyCodeBtn");
  const changeNumberBtn = $("changeNumberBtn");

  const verifyStatus = $("verifyStatus");

  const stepConsent = $("stepConsent");
  const consentFieldset = $("consentFieldset");
  const step2LockedNote = $("step2LockedNote");

  const orgNameEl = $("orgName");
  const orgNameEl2 = $("orgName2");

  const consentBadge = $("consentBadge");
  const consentStatusEl = $("consentStatus");
  const optInBtn = $("optInBtn");
  const optOutBtn = $("optOutBtn");

  // Utilities
  const setHidden = (el, hidden) => {
    if (!el) return;
    el.classList.toggle("hidden", !!hidden);
  };

  const setAlert = (el, kind, message) => {
    if (!el) return;
    el.classList.remove("alert-success", "alert-warning", "alert-error");
    if (kind) el.classList.add(kind);
    el.textContent = message || "";
    setHidden(el, !message);
  };

  const setConsentBadge = (status) => {
    const s = (status || "Unknown").toLowerCase();
    consentBadge.textContent = status || "Unknown";

    consentBadge.classList.remove("badge-active", "badge-inactive", "badge-unknown");
    if (s === "active" || s === "enabled") consentBadge.classList.add("badge-active");
    else if (s === "inactive" || s === "optedout" || s === "opted out" || s === "disabled") consentBadge.classList.add("badge-inactive");
    else consentBadge.classList.add("badge-unknown");
  };

  const setOrgName = (name) => {
    state.orgName = name || "your organization";
    if (orgNameEl) orgNameEl.textContent = state.orgName;
    if (orgNameEl2) orgNameEl2.textContent = state.orgName;
  };

  const setBusy = (busy) => {
    state.busy = !!busy;
    syncUi();
  };

  const syncUi = () => {
    // Step 1: phone input / send button
    if (phoneInput) phoneInput.disabled = state.busy || state.codeSent || state.verified;
    if (sendCodeBtn) sendCodeBtn.disabled = state.busy || state.codeSent || state.verified;

    // Step 1b: code entry
    if (codeFieldset) codeFieldset.disabled = state.busy || !state.codeSent || state.verified;
    setHidden(codeLockedNote, state.codeSent || state.verified);

    // Step 2: consent controls
    if (consentFieldset) consentFieldset.disabled = state.busy || !state.verified;
    if (stepConsent) stepConsent.classList.toggle("locked", !state.verified);
    setHidden(step2LockedNote, state.verified);

    // Buttons outside fieldsets (defensive)
    if (optInBtn) optInBtn.disabled = state.busy || !state.verified;
    if (optOutBtn) optOutBtn.disabled = state.busy || !state.verified;
  };

  const getTokenFromUrl = () => {
    const url = new URL(window.location.href);
    return url.searchParams.get("t") || url.searchParams.get("token");
  };

  // Basic US-focused normalization
  const normalizePhoneToE164 = (raw) => {
    const input = (raw || "").trim();
    if (!input) {
      return { ok: false, error: "Please enter your mobile phone number." };
    }

    if (input.startsWith("+")) {
      const digits = input.replace(/[^0-9+]/g, "");
      if (!/^\+[0-9]{10,15}$/.test(digits)) {
        return { ok: false, error: "Please enter a valid phone number in international format (e.g., +15551234567)." };
      }
      return { ok: true, e164: digits };
    }

    const digitsOnly = input.replace(/\D/g, "");
    if (digitsOnly.length === 10) {
      return { ok: true, e164: `+1${digitsOnly}` };
    }

    if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
      return { ok: true, e164: `+${digitsOnly}` };
    }

    return { ok: false, error: "Please enter a valid US mobile number (10 digits), or include the country code (e.g., +15551234567)." };
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // ---------------------------------------------------------------------------
  // Placeholder API layer
  // Replace these with real fetch calls after DB/API updates.
  // ---------------------------------------------------------------------------
  const api = {
    async resolveToken(token) {
      await sleep(150);
      return {
        ok: true,
        orgName: "your organization",
      };
    },

    async sendOtp({ token, phoneE164 }) {
      await sleep(250);
      return { ok: true };
    },

    async verifyOtp({ token, phoneE164, code }) {
      await sleep(250);
      return {
        ok: true,
        consentStatus: "Unknown",
      };
    },

    async setConsent({ token, phoneE164, action }) {
      await sleep(250);
      if (action === "optin") return { ok: true, consentStatus: "Active" };
      if (action === "optout") return { ok: true, consentStatus: "Inactive" };
      return { ok: false, error: "Unknown action." };
    },
  };

  // ---------------------------------------------------------------------------
  // UI behavior
  // ---------------------------------------------------------------------------
  async function init() {
    state.token = getTokenFromUrl();

    // Token is optional.
    // With it, org name can be shown (and later tenant enrollment can be completed).
    // Without it, user can still manage global SMS status after verification.
    setOrgName("your organization");

    if (!state.token) {
      setHidden(tokenError, false);
      setConsentBadge("Unknown");
      syncUi();
      return;
    }

    try {
      const resolved = await api.resolveToken(state.token);
      if (!resolved || !resolved.ok) {
        state.token = null;
        setHidden(tokenError, false);
        setConsentBadge("Unknown");
        syncUi();
        return;
      }

      setOrgName(resolved.orgName || state.orgName);
      setHidden(tokenError, true);
      setConsentBadge("Unknown");
      syncUi();
    } catch (e) {
      state.token = null;
      setHidden(tokenError, false);
      setConsentBadge("Unknown");
      syncUi();
    }
  }

  async function onSendCode(evt) {
    evt.preventDefault();
    setAlert(verifyStatus, null, "");
    setAlert(consentStatusEl, null, "");

    const normalized = normalizePhoneToE164(phoneInput.value);
    if (!normalized.ok) {
      setAlert(verifyStatus, "alert-error", normalized.error);
      return;
    }

    state.phoneE164 = normalized.e164;

    try {
      setBusy(true);
      setAlert(verifyStatus, "alert-warning", "Starting verification...");
      const result = await api.sendOtp({ token: state.token, phoneE164: state.phoneE164 });

      if (!result || !result.ok) {
        setAlert(verifyStatus, "alert-error", result?.error || "Unable to start verification. Please try again.");
        return;
      }

      state.codeSent = true;

      // No promise that an SMS was delivered (important while TFV is pending)
      setAlert(
        verifyStatus,
        "alert-success",
        "Verification step started. If SMS delivery is available, you’ll receive a one-time code shortly. Enter the code below to continue."
      );

      syncUi();
      setTimeout(() => codeInput?.focus(), 0);
    } catch (e) {
      setAlert(verifyStatus, "alert-error", "Unable to start verification. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onResendCode() {
    setAlert(verifyStatus, null, "");

    if (!state.phoneE164) {
      setAlert(verifyStatus, "alert-error", "Please enter your phone number first.");
      return;
    }

    try {
      setBusy(true);
      setAlert(verifyStatus, "alert-warning", "Retrying verification code send...");
      const result = await api.sendOtp({ token: state.token, phoneE164: state.phoneE164 });

      if (!result || !result.ok) {
        setAlert(verifyStatus, "alert-error", result?.error || "Unable to resend the code. Please try again.");
        return;
      }

      setAlert(
        verifyStatus,
        "alert-success",
        "Verification step updated. If SMS delivery is available, a new code will arrive shortly."
      );

      setTimeout(() => codeInput?.focus(), 0);
    } catch (e) {
      setAlert(verifyStatus, "alert-error", "Unable to resend the code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function onChangeNumber() {
    setAlert(verifyStatus, null, "");
    setAlert(consentStatusEl, null, "");

    state.phoneE164 = null;
    state.codeSent = false;
    state.verified = false;
    state.consentStatus = "Unknown";

    if (phoneInput) phoneInput.value = "";
    if (codeInput) codeInput.value = "";

    setConsentBadge("Unknown");
    syncUi();

    setTimeout(() => phoneInput?.focus(), 0);
  }

  async function onVerifyCode(evt) {
    evt.preventDefault();
    setAlert(verifyStatus, null, "");
    setAlert(consentStatusEl, null, "");

    const code = (codeInput.value || "").trim();
    if (!code) {
      setAlert(verifyStatus, "alert-error", "Please enter the verification code.");
      return;
    }

    if (!state.phoneE164) {
      setAlert(verifyStatus, "alert-error", "Please request a verification code first.");
      return;
    }

    try {
      setBusy(true);
      setAlert(verifyStatus, "alert-warning", "Verifying...");
      const result = await api.verifyOtp({ token: state.token, phoneE164: state.phoneE164, code });

      if (!result || !result.ok) {
        setAlert(verifyStatus, "alert-error", result?.error || "Verification failed. Please try again.");
        return;
      }

      state.verified = true;
      state.consentStatus = result.consentStatus || "Unknown";

      setAlert(verifyStatus, "alert-success", "Verified. You can now manage SMS delivery.");
      setConsentBadge(state.consentStatus);

      syncUi();
    } catch (e) {
      setAlert(verifyStatus, "alert-error", "Verification failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onSetConsent(action) {
    setAlert(consentStatusEl, null, "");

    if (!state.verified || !state.phoneE164) {
      setAlert(consentStatusEl, "alert-error", "Please verify your phone number first.");
      return;
    }

    try {
      setBusy(true);
      const msg = action === "optin" ? "Enabling SMS alerts..." : "Stopping SMS alerts...";
      setAlert(consentStatusEl, "alert-warning", msg);

      const result = await api.setConsent({ token: state.token, phoneE164: state.phoneE164, action });
      if (!result || !result.ok) {
        setAlert(consentStatusEl, "alert-error", result?.error || "Unable to update your SMS status. Please try again.");
        return;
      }

      state.consentStatus = result.consentStatus || (action === "optin" ? "Active" : "Inactive");
      setConsentBadge(state.consentStatus);

      if (action === "optin") {
        setAlert(consentStatusEl, "alert-success", "SMS delivery is enabled for your phone number.");
      } else {
        setAlert(consentStatusEl, "alert-success", "SMS delivery is stopped for your phone number.");
      }
    } catch (e) {
      setAlert(consentStatusEl, "alert-error", "Unable to update your SMS status. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // Wire up handlers
  verifyForm?.addEventListener("submit", onSendCode);
  resendBtn?.addEventListener("click", onResendCode);
  changeNumberBtn?.addEventListener("click", onChangeNumber);
  codeForm?.addEventListener("submit", onVerifyCode);

  // Allow only digits in the code field.
  codeInput?.addEventListener("input", () => {
    codeInput.value = (codeInput.value || "").replace(/\D/g, "");
  });

  optInBtn?.addEventListener("click", () => onSetConsent("optin"));
  optOutBtn?.addEventListener("click", () => onSetConsent("optout"));

  // Start
  init();
})();
