(function () {
  var ADMIN_TOKEN_KEY = "phishguard_admin_token";
  var RULE_DISPLAY_ORDER = [
    "DOMAIN_LINK_MISMATCH",
    "DISPLAY_TARGET_MISMATCH",
    "SUSPICIOUS_TLD",
    "SHORTENER_LINK",
    "SUSPICIOUS_ATTACHMENT",
    "DOUBLE_EXTENSION",
    "PHISHING_KEYWORDS",
    "IP_LINK",
    "URGENCY_LANGUAGE",
    "ACCOUNT_THREAT_LANGUAGE",
    "EXTORTION_LANGUAGE",
    "UNEXPECTED_ATTACHMENT_REQUEST",
    "PAYMENT_REQUEST_LANGUAGE",
    "BANK_CHANGE_LANGUAGE",
    "INVOICE_PRESSURE_LANGUAGE",
    "SPF_FAIL",
    "SPF_SOFTFAIL",
    "DKIM_FAIL",
    "DMARC_FAIL"
  ];
  var BUILTIN_RULE_KEYS = RULE_DISPLAY_ORDER.slice();

  var SECTIONS = {
    versionSection: "Sürüm ve eşikler",
    rulesSection: "Kural motoru",
    listsSection: "Alan adları ve anahtar kelimeler",
    labelsSection: "Etiket adları"
  };

  var BUILTIN_PANEL_DESCRIPTION_FALLBACKS = {
    DOMAIN_LINK_MISMATCH: "Bağlantı adresi, mailin geldiği alan adıyla uyuşmuyor.",
    DISPLAY_TARGET_MISMATCH: "Görünen bağlantı ile açılan gerçek adres aynı görünmüyor.",
    SUSPICIOUS_TLD: "Bağlantı, riskli alan adı uzantısı kullanıyor olabilir.",
    SHORTENER_LINK: "Bağlantı kısa link servisinden geliyor; gerçek adres gizlenmiş olabilir.",
    SUSPICIOUS_ATTACHMENT: "Ek dosya beklenmedik veya riskli bir uzantı taşıyor olabilir.",
    DOUBLE_EXTENSION: "Ek dosya güvenli gibi görünse de gerçek uzantısı farklı olabilir.",
    PHISHING_KEYWORDS: "Mailde acele ettiren veya sizi işlem yapmaya zorlayan ifadeler var.",
    IP_LINK: "Bağlantı alan adı yerine doğrudan bir IP adresine gidiyor.",
    URGENCY_LANGUAGE: "Mail sizden hızlı karar vermenizi istiyor.",
    ACCOUNT_THREAT_LANGUAGE: "Mail, hesap kapanması veya güvenlik tehdidi dili kullanıyor.",
    EXTORTION_LANGUAGE: "Mail, ödeme yapılmazsa dosyalarınızın şifreleneceğini veya erişiminizin kapanacağını söylüyor.",
    UNEXPECTED_ATTACHMENT_REQUEST: "Beklenmedik bir ek dosyayı açmanız isteniyor.",
    PAYMENT_REQUEST_LANGUAGE: "Mail sizi ödeme yapmaya yönlendiriyor.",
    BANK_CHANGE_LANGUAGE: "Mail içinde IBAN veya banka bilgisi değişikliği var.",
    INVOICE_PRESSURE_LANGUAGE: "Mail, ödeme veya fatura işlemi için zaman baskısı kuruyor.",
    SPF_FAIL: "Gönderen sunucu, alan adı adına yetkili görünmüyor.",
    SPF_SOFTFAIL: "Gönderen sunucu için zayıf bir SPF sonucu görüldü.",
    DKIM_FAIL: "Mailin imza doğrulaması başarısız oldu; içerik değiştirilmiş olabilir.",
    DMARC_FAIL: "Alan adı doğrulaması ve hizalaması başarısız görünüyor."
  };

  var state = {
    config: null,
    access: null,
    authToken: readStoredToken(),
    pendingSaveScope: null,
    dirtySections: {},
    advancedListsVisible: false,
    resetPasswordVerified: false,
    historyDateFilter: "all",
    saveButtonTimer: null,
    saveButtonLocked: false,
    saveButtonConfirming: false,
    confirmingDeleteButton: null,
    deleteConfirmTimer: null,
    sectionSaveTimers: {}
  };

  document.addEventListener("DOMContentLoaded", function () {
    normalizeStaticChrome();
    bindStaticEvents();
    bindNavigation();
    bootstrapAdmin();
  });

  function normalizeStaticChrome() {
    var navText = {
      overviewSection: "Genel bakış",
      versionSection: "Sürüm",
      rulesSection: "Kural motoru",
      listsSection: "Kayıtlar",
      labelsSection: "Etiketler",
      securitySection: "Güvenlik"
    };
    var navButtons = document.querySelectorAll(".nav-item");
    var i = 0;
    for (i = 0; i < navButtons.length; i += 1) {
      var target = navButtons[i].getAttribute("data-target");
      if (navText[target]) {
        navButtons[i].textContent = navText[target];
      }
    }

    document.title = "PhishGuard Yönetim Paneli";
    setText(".sidebar-title", "PhishGuard");
    setText(".sidebar-subtitle", "Admin Panel");
    setText(".sidebar-meta-label", "Durum");
    setText(".eyebrow", "Temel Yapılandırma");
    setText(".topbar-copy h1", "Sistem Ayarları");
    setText(".page-intro", "Merkezi güvenlik kurallarını, kayıtları ve görünüm eşlemelerini tek panelden yönetin.");
    setText("#saveButton", "Tümünü Kaydet");
  }

  function setText(selector, value) {
    var element = document.querySelector(selector);
    if (element) {
      element.textContent = value;
    }
  }

  function bindStaticEvents() {
    document.getElementById("saveButton").onclick = function () {
      handleGlobalSaveClick();
    };
    document.getElementById("addLabelButton").onclick = addEmptyLabelRow;
    document.getElementById("toggleAdvancedListsButton").onclick = toggleAdvancedLists;
    document.getElementById("confirmSaveButton").onclick = confirmSave;
    document.getElementById("cancelSaveButton").onclick = closeSaveModal;
    document.getElementById("closeInfoButton").onclick = closeInfoModal;
    document.getElementById("loginButton").onclick = loginAdmin;
    document.getElementById("changePasswordButton").onclick = openChangePasswordModal;
    document.getElementById("historyButton").onclick = openHistoryModal;
    document.getElementById("historyDateFilter").onchange = function () {
      state.historyDateFilter = this.value || "all";
      renderHistoryModal();
    };
    document.getElementById("cancelChangePasswordButton").onclick = closeChangePasswordModal;
    document.getElementById("saveChangePasswordButton").onclick = saveChangedPassword;
    document.getElementById("editHintButton").onclick = openHintModal;
    document.getElementById("cancelHintButton").onclick = closeHintModal;
    document.getElementById("saveHintButton").onclick = saveHint;
    document.getElementById("resetDefaultsButton").onclick = openResetModal;
    document.getElementById("cancelResetButton").onclick = closeResetModal;
    document.getElementById("verifyResetPasswordButton").onclick = verifyResetPassword;
    document.getElementById("confirmResetButton").onclick = confirmFactoryReset;
    document.getElementById("closeHistoryButton").onclick = closeHistoryModal;
    document.getElementById("loginPasswordInput").addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        loginAdmin();
      }
    });
    document.getElementById("loginPasswordInput").addEventListener("input", function () {
      setInlineError("loginPasswordError", "");
    });
    document.getElementById("currentPasswordInput").addEventListener("input", function () {
      setInlineError("currentPasswordError", "");
    });
    document.getElementById("resetPasswordInput").addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        verifyResetPassword();
      }
    });
    document.getElementById("resetPasswordInput").addEventListener("input", function () {
      setInlineError("resetPasswordError", "");
    });
    document.getElementById("resetConfirmationInput").addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        confirmFactoryReset();
      }
    });
    document.getElementById("currentPasswordInput").addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        saveChangedPassword();
      }
    });
    document.getElementById("confirmNewPasswordInput").addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        saveChangedPassword();
      }
    });

    bindOverlayClose("saveModalOverlay", closeSaveModal);
    bindOverlayClose("infoModalOverlay", closeInfoModal);
    bindOverlayClose("resetModalOverlay", closeResetModal);
    bindOverlayClose("changePasswordModalOverlay", closeChangePasswordModal);
    bindOverlayClose("hintModalOverlay", closeHintModal);
    bindOverlayClose("historyModalOverlay", closeHistoryModal);

    bindSectionSaveButtons();

    document.addEventListener("click", function (event) {
      if (!state.confirmingDeleteButton) {
        return;
      }
      if (state.confirmingDeleteButton.contains(event.target)) {
        return;
      }
      clearDeleteConfirmState();
    });
  }

  function bootstrapAdmin() {
    requestJson("GET", "/api/admin/access", null, function (access) {
      state.access = access || {};
      if (state.access.password_enabled) {
        if (state.authToken) {
          loadConfig();
        } else {
          openLoginModal();
        }
        return;
      }

      closeLoginModal();
      loadConfig();
    }, function () {
      showFlash("Yönetim erişimi okunamadı.", "error");
    });
  }

  function openLoginModal() {
    var hint = state.access && state.access.password_hint
      ? "İpucu: " + state.access.password_hint
      : "Bu yönetim paneli parola ile korunuyor.";
    document.getElementById("loginHintText").textContent = hint;
    document.getElementById("loginPasswordInput").value = "";
    setInlineError("loginPasswordError", "");
    document.getElementById("loginModalOverlay").className = "modal-overlay";
  }

  function closeLoginModal() {
    document.getElementById("loginModalOverlay").className = "modal-overlay hidden";
  }

  function openResetModal() {
    if (!(state.access && state.access.password_enabled)) {
      openInfoModal("Fabrika ayarına dönüş için önce yetki korumasında bir parola tanımlanmalıdır.");
      return;
    }

    state.resetPasswordVerified = false;
    document.getElementById("resetPasswordInput").value = "";
    document.getElementById("resetConfirmationInput").value = "";
    setInlineError("resetPasswordError", "");
    document.getElementById("resetConfirmBlock").className = "hidden";
    document.getElementById("confirmResetButton").className = "primary-button danger-button hidden";
    document.getElementById("verifyResetPasswordButton").className = "secondary-button";
    document.getElementById("resetModalOverlay").className = "modal-overlay";
  }

  function closeResetModal() {
    state.resetPasswordVerified = false;
    document.getElementById("resetModalOverlay").className = "modal-overlay hidden";
  }

  function openChangePasswordModal() {
    document.getElementById("currentPasswordInput").value = "";
    document.getElementById("newPasswordInput").value = "";
    document.getElementById("confirmNewPasswordInput").value = "";
    setInlineError("currentPasswordError", "");
    document.getElementById("changePasswordModalOverlay").className = "modal-overlay";
  }

  function closeChangePasswordModal() {
    document.getElementById("changePasswordModalOverlay").className = "modal-overlay hidden";
  }

  function openHintModal() {
    document.getElementById("hintInput").value = state.config && state.config.admin_access ? (state.config.admin_access.password_hint || "") : "";
    document.getElementById("hintModalOverlay").className = "modal-overlay";
  }

  function closeHintModal() {
    document.getElementById("hintModalOverlay").className = "modal-overlay hidden";
  }

  function openHistoryModal() {
    renderHistoryModal();
    document.getElementById("historyModalOverlay").className = "modal-overlay";
  }

  function closeHistoryModal() {
    document.getElementById("historyModalOverlay").className = "modal-overlay hidden";
  }

  function loginAdmin() {
    var password = document.getElementById("loginPasswordInput").value;
    if (!password.trim()) {
      setInlineError("loginPasswordError", "Yönetici parolası girilmedi.");
      return;
    }

    requestAdminLogin(password, function (response) {
      setInlineError("loginPasswordError", "");
      state.authToken = response.token || "";
      storeToken(state.authToken);
      closeLoginModal();
      loadConfig();
      showFlash("Yönetim paneli açıldı.", "success");
    }, function (error) {
      setInlineError("loginPasswordError", "Parola hatalı.");
    });
  }

  function bindOverlayClose(id, onClose) {
    document.getElementById(id).onclick = function (event) {
      if (event.target === this) {
        onClose();
      }
    };
  }

  function verifyResetPassword() {
    var password = document.getElementById("resetPasswordInput").value;
    if (!password.trim()) {
      setInlineError("resetPasswordError", "Yönetici parolası girilmedi.");
      return;
    }

    requestJson("POST", "/api/admin/verify-password", { password: password }, function () {
      setInlineError("resetPasswordError", "");
      state.resetPasswordVerified = true;
      document.getElementById("resetConfirmBlock").className = "";
      document.getElementById("confirmResetButton").className = "primary-button danger-button";
      document.getElementById("verifyResetPasswordButton").className = "secondary-button hidden";
      showFlash("Parola doğrulandı.", "success");
    }, function (error) {
      setInlineError("resetPasswordError", "Parola hatalı.");
    });
  }

  function confirmFactoryReset() {
    var password = document.getElementById("resetPasswordInput").value;
    var confirmation = document.getElementById("resetConfirmationInput").value;

    if (!state.resetPasswordVerified) {
      openInfoModal("Önce yönetici parolasını doğrulayınız.");
      return;
    }

    if (confirmation.trim().toLowerCase() !== "evet") {
      openInfoModal("İşlemi onaylamak için EVET yazmalısınız.");
      return;
    }

    requestJson("POST", "/api/admin/reset", {
      password: password,
      confirmation: confirmation
    }, function (savedConfig) {
      closeResetModal();
      state.config = savedConfig;
      state.access = savedConfig.admin_access || state.access;
      state.dirtySections = {};
      state.advancedListsVisible = false;
      renderConfig(savedConfig);
      updateSaveState();
      showFlash("Fabrika ayarları yüklendi.", "success");
    }, function (error) {
      openInfoModal(readError(error));
    });
  }

  function saveChangedPassword() {
    var currentPassword = document.getElementById("currentPasswordInput").value;
    var newPassword = document.getElementById("newPasswordInput").value;
    var confirmPassword = document.getElementById("confirmNewPasswordInput").value;
    var hasExistingPassword = !!(state.config && state.config.admin_access && state.config.admin_access.password_enabled);

    if (hasExistingPassword && !currentPassword.trim()) {
      setInlineError("currentPasswordError", "Eski parola girilmedi.");
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      openInfoModal("Yeni parola alanları boş bırakılamaz.");
      return;
    }

    if (newPassword !== confirmPassword) {
      openInfoModal("Yeni parola ile parola tekrarı uyuşmuyor.");
      return;
    }

    requestJson("PUT", "/api/admin/config", {
      _audit: {
        actor: "Yönetici",
        section: "Yönetim araçları",
        action: "Parola güncellendi",
        details: ["Yönetici parolası yenilendi."]
      },
      admin_access: {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
        password_enabled: true,
        password_hint: state.config && state.config.admin_access ? (state.config.admin_access.password_hint || "") : ""
      }
    }, function (savedConfig) {
      state.config = savedConfig;
      state.access = savedConfig.admin_access || state.access;
      renderConfig(savedConfig);
      updateSaveState();
      closeChangePasswordModal();
      requestAdminLogin(newPassword, function (response) {
        state.authToken = response.token || "";
        storeToken(state.authToken);
      }, function () {
        return;
      });
      showFlash("Parola güncellendi.", "success");
    }, function (error) {
      if (error && error.status === 400 && readError(error).indexOf("Eski parola") >= 0) {
        setInlineError("currentPasswordError", "Eski parola hatalı.");
        return;
      }
      openInfoModal(readError(error));
    });
  }

  function saveHint() {
    var hint = document.getElementById("hintInput").value.trim();
    requestJson("PUT", "/api/admin/config", {
      _audit: {
        actor: "Yönetici",
        section: "Yönetim araçları",
        action: "İpucu güncellendi",
        details: [hint ? "Yönetim ipucu güncellendi." : "Yönetim ipucu temizlendi."]
      },
      admin_access: {
        password_enabled: state.config && state.config.admin_access ? !!state.config.admin_access.password_enabled : false,
        password_hint: hint
      }
    }, function (savedConfig) {
      state.config = savedConfig;
      state.access = savedConfig.admin_access || state.access;
      renderConfig(savedConfig);
      updateSaveState();
      closeHintModal();
      showFlash("İpucu güncellendi.", "success");
    }, function (error) {
      openInfoModal(readError(error));
    });
  }

  function bindSectionSaveButtons() {
    var buttons = document.querySelectorAll(".section-save-button");
    var i;
    for (i = 0; i < buttons.length; i += 1) {
      buttons[i].setAttribute("data-default-label", buttons[i].textContent);
      buttons[i].onclick = function () {
        handleSectionSaveClick(this, this.getAttribute("data-section"));
      };
    }
  }

  function handleSectionSaveClick(button, sectionName) {
    if (!sectionName) {
      return;
    }

    if (!state.dirtySections[sectionName]) {
      showFlash("Bu bölümde kaydedilecek değişiklik yok.", "success");
      return;
    }

    var validationMessage = validateScope(sectionName);
    if (validationMessage) {
      openInfoModal(validationMessage);
      return;
    }

    if (button.classList.contains("is-confirm")) {
      clearSectionSaveConfirmState(sectionName);
      saveScope(sectionName);
      return;
    }

    activateSectionSaveConfirm(button, sectionName);
  }

  function activateSectionSaveConfirm(button, sectionName) {
    clearAllSectionSaveConfirmStates();
    button.textContent = "Emin misiniz?";
    button.className = "secondary-button section-save-button is-confirm";
    state.sectionSaveTimers[sectionName] = window.setTimeout(function () {
      clearSectionSaveConfirmState(sectionName);
      updateSaveState();
    }, 2200);
  }

  function clearSectionSaveConfirmState(sectionName) {
    var button = document.querySelector('.section-save-button[data-section="' + sectionName + '"]');
    if (state.sectionSaveTimers[sectionName]) {
      window.clearTimeout(state.sectionSaveTimers[sectionName]);
      delete state.sectionSaveTimers[sectionName];
    }
    if (button) {
      button.className = "secondary-button section-save-button";
      button.textContent = button.getAttribute("data-default-label") || "Bölümü Kaydet";
    }
  }

  function clearAllSectionSaveConfirmStates() {
    var key;
    for (key in state.sectionSaveTimers) {
      if (Object.prototype.hasOwnProperty.call(state.sectionSaveTimers, key)) {
        clearSectionSaveConfirmState(key);
      }
    }
  }

  function setSectionSaveButtonVisual(sectionName, kind, text, disabled) {
    var button = document.querySelector('.section-save-button[data-section="' + sectionName + '"]');
    if (!button) {
      return;
    }
    if (state.sectionSaveTimers[sectionName]) {
      window.clearTimeout(state.sectionSaveTimers[sectionName]);
      delete state.sectionSaveTimers[sectionName];
    }
    button.className = "secondary-button section-save-button is-" + kind;
    button.textContent = text;
    button.disabled = !!disabled;
  }

  function pulseSectionSaveButton(sectionName, kind, text) {
    setSectionSaveButtonVisual(sectionName, kind, text, true);
    state.sectionSaveTimers[sectionName] = window.setTimeout(function () {
      clearSectionSaveConfirmState(sectionName);
      updateSaveState();
    }, 1600);
  }

  function loadConfig() {
    requestJson("GET", "/api/admin/config", null, function (config) {
      state.config = config;
      state.dirtySections = {};
      renderConfig(config);
      updateSaveState();
      showFlash("Ayarlar yüklendi.", "success");
    }, function (error) {
      if (error && error.status === 401) {
        clearStoredToken();
        state.authToken = "";
        openLoginModal();
        return;
      }
      showFlash("Ayarlar yüklenemedi.", "error");
    });
  }

  function renderConfig(config) {
    document.getElementById("appVersion").value = config.app_version || "";
    document.getElementById("versionNote").value = config.version_note || "";
    document.getElementById("lowRiskMax").value = config.thresholds.low_risk_max;
    document.getElementById("mediumRiskMax").value = config.thresholds.medium_risk_max;

    document.getElementById("companyDomains").value = toLines(config.domains.company_trusted_domains);
    document.getElementById("shortenerDomains").value = toLines(config.domains.shortener_domains);
    document.getElementById("suspiciousTlds").value = toLines(config.domains.suspicious_tlds);
    document.getElementById("phishingKeywords").value = toLines(config.phrases.phishing_keywords);

    document.getElementById("trustedRelatedDomains").value = toLines(config.domains.trusted_related_domains);
    document.getElementById("trustedIbans").value = toLines(config.domains.trusted_ibans || []);
    document.getElementById("urgencyPhrases").value = toLines(config.phrases.urgency_phrases);
    document.getElementById("accountThreatPhrases").value = toLines(config.phrases.account_threat_phrases);
    document.getElementById("extortionPhrases").value = toLines(config.phrases.extortion_phrases || []);
    document.getElementById("attachmentRequestPhrases").value = toLines(config.phrases.attachment_request_phrases);
    document.getElementById("paymentRequestPhrases").value = toLines(config.phrases.payment_request_phrases);
    document.getElementById("bankChangePhrases").value = toLines(config.phrases.bank_change_phrases);
    document.getElementById("invoicePressurePhrases").value = toLines(config.phrases.invoice_pressure_phrases);
    document.getElementById("suspiciousExtensions").value = toLines(config.attachments.suspicious_extensions);
    document.getElementById("doubleExtensionBaitExtensions").value = toLines(config.attachments.double_extension_bait_extensions);

    var adminAccess = config.admin_access || {};
    document.getElementById("adminPasswordHintText").textContent = adminAccess.password_hint || "İpucu tanımlı değil.";

    document.getElementById("updatedAtText").textContent = config.updated_at ? "Son güncelleme: " + formatTimestamp(config.updated_at) : "Güncelleme bekleniyor";
    document.getElementById("summaryVersion").textContent = config.app_version || "1.0.0";
    document.getElementById("summaryVersionNote").textContent = config.version_note || "Henüz not eklenmedi";
    document.getElementById("summaryUpdatedAt").textContent = config.updated_at ? formatTimestamp(config.updated_at) : "Henüz yok";
    var displayRuleWeights = buildDisplayRuleWeights(config);
    document.getElementById("summaryRuleCount").textContent = String(Object.keys(displayRuleWeights).length);

    renderRuleWeightCards(displayRuleWeights, config.disabled_rules || []);
    renderDisabledRuleToggles(displayRuleWeights, config.disabled_rules || []);
    renderLabelRows(
      config.rule_chip_labels || {},
      config.rule_display_meta || {},
      config.custom_rule_modes || {},
      config.custom_rule_missing_policies || {},
      config.custom_rule_missing_contexts || {}
    );
    renderCustomPhraseCards(config);
    applyBuiltInDisplayMeta(config.rule_display_meta || {});
    normalizeCustomRuleSection();
    bindDirtyTracking();
    renderAdvancedListsState();
  }

  function requestSaveConfirmation(scope) {
    if (scope === "all") {
      if (!hasDirtySections()) {
        showFlash("Kaydedilecek değişiklik yok.", "success");
        return;
      }
    } else if (!state.dirtySections[scope]) {
      showFlash("Bu bölümde kaydedilecek değişiklik yok.", "success");
      return;
    }

    var validationMessage = validateScope(scope);
    if (validationMessage) {
      openInfoModal(validationMessage);
      return;
    }

    state.pendingSaveScope = scope;
    document.getElementById("saveModalTitle").textContent = scope === "all" ? "Tüm değişiklikler kaydedilsin mi?" : SECTIONS[scope] + " kaydedilsin mi?";
    document.getElementById("saveModalMessage").textContent = scope === "all"
      ? "Bekleyen tüm değişiklikler kaydedilecek."
      : "Sadece seçili bölümün değişiklikleri kaydedilecek.";
    document.getElementById("saveModalOverlay").className = "modal-overlay";
  }

  function confirmSave() {
    var scope = state.pendingSaveScope || "all";
    closeSaveModal();
    saveScope(scope);
  }

  function closeSaveModal() {
    state.pendingSaveScope = null;
    document.getElementById("saveModalOverlay").className = "modal-overlay hidden";
  }

  function saveScope(scope) {
    var payload = collectPayloadForScope(scope);
    payload._audit = buildAuditPayload(scope, payload);
    if (scope === "all") {
      clearSaveButtonConfirmState();
      state.saveButtonLocked = true;
      setSaveButtonVisual("saving", "Kaydediliyor...", true);
    } else {
      clearSectionSaveConfirmState(scope);
      setSectionSaveButtonVisual(scope, "saving", "Kaydediliyor...", true);
    }
    requestJson("PUT", "/api/admin/config", payload, function (savedConfig) {
      finalizeSave(scope, payload, savedConfig);
    }, function (error) {
      if (scope === "all") {
        pulseSaveButton("error", "Başarısız");
      } else {
        pulseSectionSaveButton(scope, "error", "Başarısız");
      }
      showFlash(readError(error), "error");
      if (error && error.status === 401) {
        clearStoredToken();
        state.authToken = "";
        openLoginModal();
      }
    });
  }

  function collectPayloadForScope(scope) {
    if (scope === "all") {
      var merged = {};
      var sectionName;
      for (sectionName in state.dirtySections) {
        if (Object.prototype.hasOwnProperty.call(state.dirtySections, sectionName) && state.dirtySections[sectionName]) {
          mergeInto(merged, collectSectionPayload(sectionName));
        }
      }
      return merged;
    }

    return collectSectionPayload(scope);
  }

  function collectSectionPayload(sectionName) {
    if (sectionName === "versionSection") {
      return {
        app_version: document.getElementById("appVersion").value.trim(),
        version_note: document.getElementById("versionNote").value.trim(),
        thresholds: {
          low_risk_max: Number(document.getElementById("lowRiskMax").value || 0),
          medium_risk_max: Number(document.getElementById("mediumRiskMax").value || 0)
        }
      };
    }

    if (sectionName === "rulesSection") {
      return {
        disabled_rules: collectDisabledRules(),
        rule_weights: collectKeyValueInputs("weight-")
      };
    }

      if (sectionName === "listsSection") {
        return {
          domains: {
            trusted_related_domains: fromLines(document.getElementById("trustedRelatedDomains").value),
            company_trusted_domains: fromLines(document.getElementById("companyDomains").value),
            trusted_ibans: fromLines(document.getElementById("trustedIbans").value),
            shortener_domains: fromLines(document.getElementById("shortenerDomains").value),
            suspicious_tlds: fromLines(document.getElementById("suspiciousTlds").value)
          },
        attachments: {
          suspicious_extensions: fromLines(document.getElementById("suspiciousExtensions").value),
          double_extension_bait_extensions: fromLines(document.getElementById("doubleExtensionBaitExtensions").value)
        },
        phrases: {
          phishing_keywords: fromLines(document.getElementById("phishingKeywords").value),
          urgency_phrases: fromLines(document.getElementById("urgencyPhrases").value),
          account_threat_phrases: fromLines(document.getElementById("accountThreatPhrases").value),
          extortion_phrases: fromLines(document.getElementById("extortionPhrases").value),
          attachment_request_phrases: fromLines(document.getElementById("attachmentRequestPhrases").value),
          payment_request_phrases: fromLines(document.getElementById("paymentRequestPhrases").value),
          bank_change_phrases: fromLines(document.getElementById("bankChangePhrases").value),
          invoice_pressure_phrases: fromLines(document.getElementById("invoicePressurePhrases").value),
          custom_rule_phrases: collectCustomPhraseRows()
        }
      };
    }

      if (sectionName === "labelsSection") {
        return {
          rule_chip_labels: collectLabelRows(),
          rule_display_meta: collectDisplayMetaRows(),
          custom_rule_modes: collectLabelModes(),
          custom_rule_missing_policies: collectLabelMissingPolicies(),
          custom_rule_missing_contexts: collectLabelMissingContexts()
        };
      }

    return {};
  }

  function validateScope(scope) {
    if (scope === "all") {
      var sectionName;
      for (sectionName in state.dirtySections) {
        if (Object.prototype.hasOwnProperty.call(state.dirtySections, sectionName) && state.dirtySections[sectionName]) {
          var sectionError = validateSection(sectionName);
          if (sectionError) {
            return sectionError;
          }
        }
      }
      return "";
    }

    return validateSection(scope);
  }

  function validateSection(sectionName) {
    if (sectionName === "versionSection") {
      return validateVersionSection();
    }
    if (sectionName === "listsSection") {
      return validateListsSection();
    }
    if (sectionName === "labelsSection") {
      return validateLabelRows();
    }
    return "";
  }

  function validateVersionSection() {
    var currentVersion = state.config ? String(state.config.app_version || "").trim() : "";
    var nextVersion = document.getElementById("appVersion").value.trim();
    var versionNote = document.getElementById("versionNote").value.trim();

    if (!nextVersion) {
      return "Uygulama sürümü boş bırakılamaz.";
    }

    if (nextVersion !== currentVersion && !versionNote) {
      return "Sürüm değişikliği için bir sürüm notu giriniz.";
    }

    return "";
  }

  function validateLabelRows() {
    var rows = document.querySelectorAll("#chipLabelsGrid .label-row");
    var seenKeys = {};
    var i;

    for (i = 0; i < rows.length; i += 1) {
      var key = rows[i].querySelector(".label-key-input").value.trim();
      var value = rows[i].querySelector(".label-value-input").value.trim();
      var isPrivileged = rows[i].querySelector(".label-mode-input").checked;
      var missingInput = rows[i].querySelector(".label-safe-missing-input");
      var contextInput = rows[i].querySelector(".label-safe-context-input");
      if (!key || !value) {
        return "Etiket bilgisi girilmedi. Lütfen kontrol ediniz.";
      }
      if (
        key &&
        BUILTIN_RULE_KEYS.indexOf(key) < 0 &&
        isPrivileged &&
        missingInput &&
        missingInput.checked &&
        contextInput &&
        !fromLines(contextInput.value).length
      ) {
        return "Güvenli kurallarda 'mailde geçmiyorsa riski artır' açıksa bağlam ifadeleri girilmelidir.";
      }
      var normalizedKey = key.toLowerCase();
      if (seenKeys[normalizedKey]) {
        return "Aynı kural anahtarı birden fazla kez girildi. Lütfen etiketleri kontrol ediniz.";
      }
      seenKeys[normalizedKey] = true;
    }

    return "";
  }

  function validateListsSection() {
    var message = "";

    message = validateListField("companyDomains", "Şirket alan adları", "domain");
    if (message) {
      return message;
    }
    message = validateListField("shortenerDomains", "Kısa link servisleri", "domain");
    if (message) {
      return message;
    }
    message = validateListField("trustedRelatedDomains", "İlişkili güvenilir alan adları", "domain");
    if (message) {
      return message;
    }
    message = validateListField("trustedIbans", "Güvenli IBAN listesi", "iban");
    if (message) {
      return message;
    }
    message = validateListField("suspiciousTlds", "Şüpheli TLD listesi", "tld");
    if (message) {
      return message;
    }
    message = validateListField("suspiciousExtensions", "Şüpheli ek uzantıları", "extension");
    if (message) {
      return message;
    }
    message = validateListField("doubleExtensionBaitExtensions", "Çift uzantı yem dosyaları", "extension");
    if (message) {
      return message;
    }

    var phraseFields = [
      ["phishingKeywords", "Phishing anahtar kelimeleri"],
      ["urgencyPhrases", "Aciliyet ifadeleri"],
      ["accountThreatPhrases", "Hesap tehdidi ifadeleri"],
      ["extortionPhrases", "Şantaj ve şifreleme ifadeleri"],
      ["attachmentRequestPhrases", "Ek açma ifadeleri"],
      ["paymentRequestPhrases", "Ödeme talebi ifadeleri"],
      ["bankChangePhrases", "Banka değişikliği ifadeleri"],
      ["invoicePressurePhrases", "Fatura baskısı ifadeleri"]
    ];
    var i;
    for (i = 0; i < phraseFields.length; i += 1) {
      message = validateListField(phraseFields[i][0], phraseFields[i][1], "phrase");
      if (message) {
        return message;
      }
    }

    message = validateCustomPhraseRows();
    if (message) {
      return message;
    }

    return "";
  }

  function renderRuleWeightCards(entries, disabledRules) {
    renderKeyValueInputs("ruleWeightsGrid", entries, "weight-", "rulesSection", disabledRules || []);
  }

  function renderLabelRows(entries, displayMeta, modes, missingPolicies, missingContexts) {
    var container = document.getElementById("chipLabelsGrid");
    clearChildren(container);
    displayMeta = displayMeta || {};
    modes = modes || {};
    missingPolicies = missingPolicies || {};
    missingContexts = missingContexts || {};

    var keys = Object.keys(entries).sort();
    var i;
    for (i = 0; i < keys.length; i += 1) {
      appendLabelRow(
        container,
        keys[i],
        entries[keys[i]],
        displayMeta[keys[i]] || {},
        modes[keys[i]] || "signal",
        !!missingPolicies[keys[i]],
        missingContexts[keys[i]] || []
      );
    }

    if (keys.length === 0) {
      appendLabelRow(container, "", "", {}, "signal", false, []);
    }
  }

  function handleGlobalSaveClick() {
    if (state.saveButtonLocked) {
      return;
    }

    if (!hasDirtySections()) {
      showFlash("Kaydedilecek değişiklik yok.", "success");
      return;
    }

    var validationMessage = validateScope("all");
    if (validationMessage) {
      openInfoModal(validationMessage);
      return;
    }

    if (state.saveButtonConfirming) {
      clearSaveButtonConfirmState();
      saveScope("all");
      return;
    }

    state.saveButtonConfirming = true;
    window.clearTimeout(state.saveButtonTimer);
    setSaveButtonVisual("confirm", "Emin misiniz?", false);
    state.saveButtonTimer = window.setTimeout(function () {
      clearSaveButtonConfirmState();
      syncGlobalSaveButton();
    }, 2200);
  }

  function appendLabelRow(container, key, value, meta, mode, missingPolicyEnabled, missingContexts) {
    var row = document.createElement("div");
    var grid = document.createElement("div");
    var actionWrap = document.createElement("div");
    var removeButton = document.createElement("button");
    var icon = document.createElement("span");

    row.className = "label-row";
    grid.className = "label-row-grid";
    meta = meta || {};

    grid.appendChild(createField("Kural Anahtar\u0131", "label-key-input", key || "", "ORNEK_ETIKET", "labelsSection"));
    grid.appendChild(createField("Etiket", "label-value-input", value || "", "Etiket Ad\u0131", "labelsSection"));
    grid.appendChild(createField("Ba\u015fl\u0131k", "label-title-input", meta.title || "", "Kart Ba\u015fl\u0131\u011f\u0131", "labelsSection"));
    grid.appendChild(createField("A\u00e7\u0131klama", "label-description-input", meta.description || "", "K\u0131sa a\u00e7\u0131klama", "labelsSection"));
    grid.appendChild(createField("Panel A\u00e7\u0131klamas\u0131", "label-panel-description-input", getPanelDescriptionValue(key, meta), "Yan panelde g\u00f6r\u00fcnecek a\u00e7\u0131klama", "labelsSection", "is-wide"));
    grid.appendChild(createModeSwitchField(mode || "signal", !!missingPolicyEnabled, missingContexts || [], "labelsSection", key || ""));
    row.appendChild(grid);

    actionWrap.className = "label-row-action";
    removeButton.type = "button";
    removeButton.className = "danger-icon-button";
    removeButton.title = "Etiketi kald\u0131r";
    removeButton.setAttribute("aria-label", "Etiketi kald\u0131r");
    icon.className = "danger-icon-glyph";
    icon.appendChild(document.createTextNode("\u00d7"));
    removeButton.appendChild(icon);
    removeButton.appendChild(createDeleteButtonText("Kald\u0131r", "danger-icon-label"));
    removeButton.appendChild(createDeleteButtonText("Emin misiniz?", "danger-icon-confirm"));
    removeButton.onclick = function (event) {
      event.stopPropagation();
      handleInlineLabelRemoval(row, removeButton);
    };
    actionWrap.appendChild(removeButton);

    row.appendChild(actionWrap);
    container.appendChild(row);
  }

  function createField(labelText, inputClass, value, placeholder, sectionName, extraClass) {
    var field = document.createElement("div");
    field.className = "field";
    if (extraClass) {
      field.className += " " + extraClass;
    }

    var label = document.createElement("label");
    label.appendChild(document.createTextNode(labelText));

    var input = document.createElement("input");
    input.type = "text";
    input.className = inputClass;
    input.value = value;
    input.placeholder = placeholder;
    input.oninput = createSectionDirtyHandler(sectionName);
    input.onchange = createSectionDirtyHandler(sectionName);

    field.appendChild(label);
    field.appendChild(input);
    return field;
  }

  function createDeleteButtonText(text, className) {
    var span = document.createElement("span");
    span.className = className;
    span.appendChild(document.createTextNode(text));
    return span;
  }

  function createModeSwitchField(mode, missingPolicyEnabled, missingContexts, sectionName, ruleId) {
    var field = document.createElement("div");
    var label = document.createElement("label");
    var switchWrap = document.createElement("label");
    var input = document.createElement("input");
    var slider = document.createElement("span");
    var caption = document.createElement("span");
    var missingWrap = document.createElement("div");
    var missingLabel = document.createElement("span");
    var missingSwitch = document.createElement("label");
    var missingInput = document.createElement("input");
    var missingSlider = document.createElement("span");
    var missingCaption = document.createElement("span");
    var contextWrap = document.createElement("div");
    var contextLabel = document.createElement("span");
    var contextInput = document.createElement("textarea");
    var isBuiltInRule = BUILTIN_RULE_KEYS.indexOf(String(ruleId || "").trim()) >= 0;

    field.className = "field mode-switch-field is-wide";

    label.appendChild(document.createTextNode("Kural Türü"));

    switchWrap.className = "mode-switch";
    input.type = "checkbox";
    input.className = "label-mode-input";
    input.checked = mode === "privileged";
    input.oninput = createSectionDirtyHandler(sectionName);
    input.onchange = function () {
      createSectionDirtyHandler(sectionName)();
      updateModeSwitchCaption(field, input.checked);
    };

    slider.className = "mode-switch-slider";
    switchWrap.appendChild(input);
    switchWrap.appendChild(slider);

    caption.className = "mode-switch-caption";
    field.appendChild(label);
    field.appendChild(switchWrap);
    field.appendChild(caption);
    missingWrap.className = "field mode-subswitch" + (input.checked ? "" : " hidden");
    missingLabel.className = "mode-subswitch-label";
    missingLabel.appendChild(document.createTextNode("Mailde geçmiyorsa riski artır"));
    missingSwitch.className = "mode-switch mode-switch-secondary";
    missingInput.type = "checkbox";
    missingInput.className = "label-safe-missing-input";
    missingInput.checked = !!missingPolicyEnabled;
    missingInput.oninput = createSectionDirtyHandler(sectionName);
    missingInput.onchange = function () {
      createSectionDirtyHandler(sectionName)();
      updateMissingSwitchCaption(missingWrap, missingInput.checked);
    };
    missingSlider.className = "mode-switch-slider";
    missingSwitch.appendChild(missingInput);
    missingSwitch.appendChild(missingSlider);
    missingCaption.className = "mode-switch-caption";
    missingWrap.appendChild(missingLabel);
    missingWrap.appendChild(missingSwitch);
    missingWrap.appendChild(missingCaption);
    field.appendChild(missingWrap);
    contextWrap.className = "field mode-context-field is-wide" + (input.checked && missingInput.checked && !isBuiltInRule ? "" : " hidden");
    contextLabel.appendChild(document.createTextNode("Bağlam İfadeleri"));
    contextInput.className = "label-safe-context-input";
    contextInput.placeholder = "Örnek: ödeme\niban\nbanka\nhesap bilgisi";
    contextInput.value = toLines(missingContexts || []);
    contextInput.oninput = createSectionDirtyHandler(sectionName);
    contextInput.onchange = createSectionDirtyHandler(sectionName);
    contextWrap.appendChild(contextLabel);
    contextWrap.appendChild(contextInput);
    field.appendChild(contextWrap);
    updateModeSwitchCaption(field, input.checked);
    updateMissingSwitchCaption(missingWrap, missingInput.checked);
    input.onchange = function () {
      createSectionDirtyHandler(sectionName)();
      updateModeSwitchCaption(field, input.checked);
      missingWrap.className = input.checked ? "field mode-subswitch" : "field mode-subswitch hidden";
      contextWrap.className = input.checked && missingInput.checked && !isBuiltInRule ? "field mode-context-field is-wide" : "field mode-context-field is-wide hidden";
    };
    missingInput.onchange = function () {
      createSectionDirtyHandler(sectionName)();
      updateMissingSwitchCaption(missingWrap, missingInput.checked);
      contextWrap.className = input.checked && missingInput.checked && !isBuiltInRule ? "field mode-context-field is-wide" : "field mode-context-field is-wide hidden";
    };
    return field;
  }

  function updateModeSwitchCaption(field, isPrivileged) {
    var caption = field.querySelector(".mode-switch-caption");
    if (!caption) {
      return;
    }
    caption.textContent = isPrivileged ? "Güvenli" : "Şüpheli";
    caption.className = isPrivileged ? "mode-switch-caption is-safe" : "mode-switch-caption is-signal";
  }

  function updateMissingSwitchCaption(field, isEnabled) {
    var caption = field.querySelector(".mode-switch-caption");
    if (!caption) {
      return;
    }
    caption.textContent = isEnabled ? "Yükseltsin" : "Yükseltmesin";
    caption.className = isEnabled ? "mode-switch-caption is-signal" : "mode-switch-caption is-safe";
  }

  function createSelectField(labelText, inputClass, value, sectionName, options) {
    var field = document.createElement("div");
    field.className = "field";

    var label = document.createElement("label");
    label.appendChild(document.createTextNode(labelText));

    var select = document.createElement("select");
    select.className = inputClass;
    select.oninput = createSectionDirtyHandler(sectionName);
    select.onchange = createSectionDirtyHandler(sectionName);

    var i;
    var option;
    for (i = 0; i < options.length; i += 1) {
      option = document.createElement("option");
      option.value = options[i].value;
      option.textContent = options[i].label;
      if (options[i].value === value) {
        option.selected = true;
      }
      select.appendChild(option);
    }

    field.appendChild(label);
    field.appendChild(select);
    return field;
  }

  function getPanelDescriptionValue(ruleId, meta) {
    var value = meta && meta.panel_description ? String(meta.panel_description).trim() : "";

    if (value) {
      return value;
    }

    return BUILTIN_PANEL_DESCRIPTION_FALLBACKS[ruleId] || "";
  }

  function addEmptyLabelRow() {
    appendLabelRow(document.getElementById("chipLabelsGrid"), "", "", {}, "signal", false, []);
    markDirty("labelsSection");
  }

  function handleInlineLabelRemoval(row, button) {
    if (state.confirmingDeleteButton === button && button.classList.contains("is-confirming")) {
      clearDeleteConfirmState();
      if (row && row.parentNode) {
        row.parentNode.removeChild(row);
        ensureAtLeastOneLabelRow();
        markDirty("labelsSection");
      }
      return;
    }

    activateDeleteConfirm(button);
  }

  function activateDeleteConfirm(button) {
    clearDeleteConfirmState();
    state.confirmingDeleteButton = button;
    button.classList.add("is-confirming");
    button.setAttribute("aria-label", "Silme onayı");
    window.clearTimeout(state.deleteConfirmTimer);
    state.deleteConfirmTimer = window.setTimeout(function () {
      clearDeleteConfirmState();
    }, 2400);
  }

  function clearDeleteConfirmState() {
    window.clearTimeout(state.deleteConfirmTimer);
    state.deleteConfirmTimer = null;
    if (state.confirmingDeleteButton) {
      state.confirmingDeleteButton.classList.remove("is-confirming");
      state.confirmingDeleteButton.setAttribute("aria-label", "Etiketi kaldır");
      if (document.activeElement === state.confirmingDeleteButton) {
        state.confirmingDeleteButton.blur();
      }
    }
    state.confirmingDeleteButton = null;
  }

  function openInfoModal(message) {
    document.getElementById("infoModalMessage").textContent = message;
    document.getElementById("infoModalOverlay").className = "modal-overlay";
  }

  function closeInfoModal() {
    document.getElementById("infoModalOverlay").className = "modal-overlay hidden";
  }

  function ensureAtLeastOneLabelRow() {
    var container = document.getElementById("chipLabelsGrid");
    if (!container.children.length) {
      appendLabelRow(container, "", "", {}, "signal", false, []);
    }
  }

  function collectLabelRows() {
    var rows = document.querySelectorAll("#chipLabelsGrid .label-row");
    var values = {};
    var i;

    for (i = 0; i < rows.length; i += 1) {
      var key = rows[i].querySelector(".label-key-input").value.trim();
      var value = rows[i].querySelector(".label-value-input").value.trim();
      if (key && value) {
        values[key] = value;
      }
    }
    return values;
  }

  function collectDisplayMetaRows() {
    var rows = document.querySelectorAll("#chipLabelsGrid .label-row");
    var values = {};
    var i;

    for (i = 0; i < rows.length; i += 1) {
      var key = rows[i].querySelector(".label-key-input").value.trim();
      var title = rows[i].querySelector(".label-title-input").value.trim();
      var description = rows[i].querySelector(".label-description-input").value.trim();
      var panelDescription = rows[i].querySelector(".label-panel-description-input").value.trim();
      if (key) {
        values[key] = {
          title: title,
          description: description,
          panel_description: panelDescription
        };
      }
    }

    return values;
  }

  function collectLabelModes() {
    var rows = document.querySelectorAll("#chipLabelsGrid .label-row");
    var values = {};
    var i;

    for (i = 0; i < rows.length; i += 1) {
      var key = rows[i].querySelector(".label-key-input").value.trim();
      var mode = rows[i].querySelector(".label-mode-input").checked ? "privileged" : "signal";
      if (key && BUILTIN_RULE_KEYS.indexOf(key) < 0) {
        values[key] = mode === "privileged" ? "privileged" : "signal";
      }
    }

    return values;
  }

  function collectLabelMissingPolicies() {
    var rows = document.querySelectorAll("#chipLabelsGrid .label-row");
    var values = {};
    var i;

    for (i = 0; i < rows.length; i += 1) {
      var key = rows[i].querySelector(".label-key-input").value.trim();
      var isPrivileged = rows[i].querySelector(".label-mode-input").checked;
      var missingInput = rows[i].querySelector(".label-safe-missing-input");
      if (key && isPrivileged && missingInput) {
        values[key] = !!missingInput.checked;
      }
    }

    return values;
  }

  function collectLabelMissingContexts() {
    var rows = document.querySelectorAll("#chipLabelsGrid .label-row");
    var values = {};
    var i;

    for (i = 0; i < rows.length; i += 1) {
      var key = rows[i].querySelector(".label-key-input").value.trim();
      var isPrivileged = rows[i].querySelector(".label-mode-input").checked;
      var missingInput = rows[i].querySelector(".label-safe-missing-input");
      var contextInput = rows[i].querySelector(".label-safe-context-input");

      if (
        key &&
        BUILTIN_RULE_KEYS.indexOf(key) < 0 &&
        isPrivileged &&
        missingInput &&
        missingInput.checked &&
        contextInput
      ) {
        values[key] = fromLines(contextInput.value);
      }
    }

    return values;
  }

  function collectCustomPhraseRows() {
    var rows = document.querySelectorAll(".custom-phrase-textarea");
    var values = {};
    var i;

    for (i = 0; i < rows.length; i += 1) {
      values[rows[i].getAttribute("data-rule-id")] = fromLines(rows[i].value);
    }

    return values;
  }

  function toggleAdvancedLists() {
    state.advancedListsVisible = !state.advancedListsVisible;
    renderAdvancedListsState();
  }

  function renderAdvancedListsState() {
    var panel = document.getElementById("advancedListsPanel");
    var button = document.getElementById("toggleAdvancedListsButton");
    panel.className = state.advancedListsVisible ? "advanced-lists-panel" : "advanced-lists-panel hidden";
    button.textContent = state.advancedListsVisible ? "T\u00fcm\u00fcn\u00fc Gizle" : "T\u00fcm\u00fcn\u00fc G\u00f6ster";
  }

  function renderCustomPhraseCards(config) {
    var section = document.getElementById("customRulePhrasesSection");
    var container = document.getElementById("customRulePhrasesGrid");
    var ruleLabels = config.rule_chip_labels || {};
    var displayMeta = config.rule_display_meta || {};
    var customPhraseMap = (config.phrases && config.phrases.custom_rule_phrases) || {};
    var customRuleIds = getCustomRuleIds(config);
    var i;

    clearChildren(container);

    if (!customRuleIds.length) {
      section.className = "custom-rule-phrases hidden";
      return;
    }

    section.className = "custom-rule-phrases";

    for (i = 0; i < customRuleIds.length; i += 1) {
      container.appendChild(createCustomPhraseCard(
        customRuleIds[i],
        ruleLabels[customRuleIds[i]] || customRuleIds[i],
        displayMeta[customRuleIds[i]] || {},
        customPhraseMap[customRuleIds[i]] || []
      ));
    }
  }

  function normalizeCustomRuleSection() {
    var section = document.getElementById("customRulePhrasesSection");
    var advancedPanel = document.getElementById("advancedListsPanel");
    var kicker;
    var title;

    if (!section || !advancedPanel || !advancedPanel.parentNode) {
      return;
    }

    if (section.previousElementSibling !== advancedPanel) {
      advancedPanel.parentNode.insertBefore(section, advancedPanel.nextSibling);
    }

    kicker = section.querySelector(".section-kicker");
    title = section.querySelector("h2");

    if (kicker) {
      kicker.textContent = "\u00d6ZEL KAYITLAR";
    }
    if (title) {
      title.textContent = "\u00d6ZEL KURAL \u0130FADELER\u0130";
    }
  }

  function createCustomPhraseCard(ruleId, labelText, displayMeta, values) {
    var card = document.createElement("article");
    var title = document.createElement("div");
    var copy = document.createElement("p");
    var label = document.createElement("label");
    var textarea = document.createElement("textarea");

    card.className = "module-card";
    displayMeta = displayMeta || {};

    title.className = "module-title";
    title.appendChild(document.createTextNode(displayMeta.title || ruleId));

    copy.className = "module-copy";
    copy.appendChild(document.createTextNode(displayMeta.description || ("Etiket ad\u0131: " + labelText)));

    label.setAttribute("for", "customPhrase-" + ruleId);
    label.appendChild(document.createTextNode("\u0130FADE L\u0130STES\u0130"));

    textarea.id = "customPhrase-" + ruleId;
    textarea.className = "custom-phrase-textarea";
    textarea.setAttribute("data-rule-id", ruleId);
    textarea.rows = 8;
    textarea.placeholder = "Bu kuralla ilgili ifadeleri her sat\u0131ra ayr\u0131 yaz\u0131n";
    textarea.value = toLines(values);
    textarea.oninput = createSectionDirtyHandler("listsSection");
    textarea.onchange = createSectionDirtyHandler("listsSection");

    card.appendChild(title);
    card.appendChild(copy);
    card.appendChild(label);
    card.appendChild(textarea);

    return card;
  }

  function applyBuiltInDisplayMeta(displayMeta) {
    var meta = displayMeta || {};
    var fieldMap = {
      phishingKeywords: "PHISHING_KEYWORDS",
      urgencyPhrases: "URGENCY_LANGUAGE",
      accountThreatPhrases: "ACCOUNT_THREAT_LANGUAGE",
      extortionPhrases: "EXTORTION_LANGUAGE",
      attachmentRequestPhrases: "UNEXPECTED_ATTACHMENT_REQUEST",
      paymentRequestPhrases: "PAYMENT_REQUEST_LANGUAGE",
      bankChangePhrases: "BANK_CHANGE_LANGUAGE",
      invoicePressurePhrases: "INVOICE_PRESSURE_LANGUAGE"
    };
    var fieldId;

    for (fieldId in fieldMap) {
      if (Object.prototype.hasOwnProperty.call(fieldMap, fieldId)) {
        applyDisplayMetaToFieldCard(fieldId, meta[fieldMap[fieldId]] || {});
      }
    }
  }

  function applyDisplayMetaToFieldCard(fieldId, meta) {
    var field = document.getElementById(fieldId);
    var card;
    var title;
    var copy;

    if (!field) {
      return;
    }

    card = findParentByClass(field, "module-card");
    if (!card) {
      return;
    }

    title = card.querySelector(".module-title");
    copy = card.querySelector(".module-copy");

    if (title && meta.title) {
      title.textContent = meta.title;
    }

    if (copy) {
      copy.textContent = meta.description || buildDefaultModuleDescription(fieldId);
    }
  }

  function buildDefaultModuleDescription(fieldId) {
    var defaults = {
      phishingKeywords: "Metin tabanl\u0131 sinyalleri etkiler.",
      urgencyPhrases: "Zaman bask\u0131s\u0131 olu\u015fturan metinleri y\u00f6netir.",
      accountThreatPhrases: "Hesap kapanmas\u0131 veya ask\u0131ya alma s\u00f6ylemlerini y\u00f6netir.",
      extortionPhrases: "Dosya \u015fifreleme, veri s\u0131zd\u0131rma veya eri\u015fim kayb\u0131 tehdidi i\u00e7eren metinleri y\u00f6netir.",
      attachmentRequestPhrases: "Ek dosya a\u00e7maya y\u00f6nlendiren c\u00fcmleleri tutar.",
      paymentRequestPhrases: "\u00d6deme ve dekont \u00e7a\u011fr\u0131lar\u0131n\u0131 y\u00f6netir.",
      bankChangePhrases: "IBAN veya banka hesab\u0131 de\u011fi\u015fikli\u011fi sinyallerini y\u00f6netir.",
      invoicePressurePhrases: "S\u00fcre bask\u0131s\u0131 ve fatura takibi s\u00f6ylemlerini y\u00f6netir."
    };

    return defaults[fieldId] || "";
  }

  function findParentByClass(node, className) {
    var current = node ? node.parentNode : null;

    while (current) {
      if (current.classList && current.classList.contains(className)) {
        return current;
      }
      current = current.parentNode;
    }

    return null;
  }

  function renderKeyValueInputs(containerId, entries, prefix, sectionName, disabledRules) {
    var container = document.getElementById(containerId);
    clearChildren(container);
    var disabledSet = {};
    var normalizationBase;
    var d;

    disabledRules = disabledRules || [];
    for (d = 0; d < disabledRules.length; d += 1) {
      disabledSet[disabledRules[d]] = true;
    }
    normalizationBase = computeRuleNormalizationBase(entries, disabledRules);

    var keys = orderRuleKeys(entries);
    var i;
    for (i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      var wrapper = document.createElement("div");
      wrapper.className = "rule-card";

      var head = document.createElement("div");
      head.className = "rule-card-head";

      var titleWrap = document.createElement("div");
      var title = document.createElement("div");
      title.className = "rule-card-title";
      title.appendChild(document.createTextNode(key));

      var input = document.createElement("input");
      input.id = prefix + key;
      input.value = entries[key];
      input.type = "number";
      input.oninput = function () {
        markDirty(sectionName);
        updateRuleWeightPreviewMeta();
      };
      input.onchange = function () {
        markDirty(sectionName);
        updateRuleWeightPreviewMeta();
      };

      titleWrap.appendChild(title);
      head.appendChild(titleWrap);
      wrapper.appendChild(head);
      wrapper.appendChild(input);

      var preview = document.createElement("div");
      preview.className = "rule-card-sub";
      preview.id = "weight-preview-" + key;
      preview.appendChild(document.createTextNode(formatRuleWeightPreview(Number(entries[key] || 0), normalizationBase, !!disabledSet[key])));
      wrapper.appendChild(preview);
      container.appendChild(wrapper);
    }
    updateRuleWeightMeta(normalizationBase);
  }

  function renderDisabledRuleToggles(ruleWeights, disabledRules) {
    var container = document.getElementById("disabledRulesGrid");
    clearChildren(container);

    var disabledSet = {};
    var i;
    for (i = 0; i < disabledRules.length; i += 1) {
      disabledSet[disabledRules[i]] = true;
    }

    var keys = orderRuleKeys(ruleWeights);
    for (i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      var card = document.createElement("label");
      card.className = "toggle-card";

      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = "disabled-" + key;
      checkbox.checked = !!disabledSet[key];
      checkbox.onchange = function () {
        markDirty("rulesSection");
        var labelSpan = this.parentNode.querySelector(".toggle-label span");
        if (labelSpan) {
          labelSpan.textContent = this.checked ? "Devre dışı" : "Aktif";
        }
        updateRuleWeightPreviewMeta();
      };

      var textWrap = document.createElement("span");
      textWrap.className = "toggle-label";

      var strong = document.createElement("strong");
      strong.appendChild(document.createTextNode(key));

      var sub = document.createElement("span");
      sub.appendChild(document.createTextNode(disabledSet[key] ? "Devre dışı" : "Aktif"));

      textWrap.appendChild(strong);
      textWrap.appendChild(sub);
      card.appendChild(checkbox);
      card.appendChild(textWrap);
      container.appendChild(card);
    }
  }

  function collectKeyValueInputs(prefix) {
    var values = {};
    var inputs = document.querySelectorAll("input[id^='" + prefix + "']");
    var i;
    for (i = 0; i < inputs.length; i += 1) {
      var key = inputs[i].id.slice(prefix.length);
      values[key] = Number(inputs[i].value || 0);
    }
    return values;
  }

  function collectDisabledRules() {
    var disabled = [];
    var inputs = document.querySelectorAll("input[id^='disabled-']");
    var i;
    for (i = 0; i < inputs.length; i += 1) {
      if (inputs[i].checked) {
        disabled.push(inputs[i].id.slice("disabled-".length));
      }
    }
    return disabled;
  }

  function computeRuleNormalizationBase(weights, disabledRules) {
    var disabledSet = {};
    var list = [];
    var key;
    var i;

    for (i = 0; i < disabledRules.length; i += 1) {
      disabledSet[disabledRules[i]] = true;
    }

    for (key in weights) {
      if (Object.prototype.hasOwnProperty.call(weights, key) && !disabledSet[key]) {
        list.push(Number(weights[key] || 0));
      }
    }

    list.sort(function (a, b) {
      return b - a;
    });

    var topSignalBudget = 0;
    for (i = 0; i < list.length && i < 5; i += 1) {
      topSignalBudget += list[i];
    }

    return Math.max(100, topSignalBudget || 0);
  }

  function orderRuleKeys(entries) {
    var existing = {};
    var ordered = [];
    var i;
    var keys = Object.keys(entries);

    for (i = 0; i < keys.length; i += 1) {
      existing[keys[i]] = true;
    }

    for (i = 0; i < RULE_DISPLAY_ORDER.length; i += 1) {
      if (existing[RULE_DISPLAY_ORDER[i]]) {
        ordered.push(RULE_DISPLAY_ORDER[i]);
        delete existing[RULE_DISPLAY_ORDER[i]];
      }
    }

    keys = Object.keys(existing).sort();
    for (i = 0; i < keys.length; i += 1) {
      ordered.push(keys[i]);
    }

    return ordered;
  }

  function buildDisplayRuleWeights(config) {
    var weights = {};
    var sourceWeights = config.rule_weights || {};
    var labels = config.rule_chip_labels || {};
    var key;

    for (key in sourceWeights) {
      if (Object.prototype.hasOwnProperty.call(sourceWeights, key)) {
        weights[key] = Number(sourceWeights[key] || 0);
      }
    }

    for (key in labels) {
      if (Object.prototype.hasOwnProperty.call(labels, key) && !Object.prototype.hasOwnProperty.call(weights, key)) {
        weights[key] = 0;
      }
    }

    return weights;
  }

  function getCustomRuleIds(config) {
    var labels = config.rule_chip_labels || {};
    var customPhraseMap = (config.phrases && config.phrases.custom_rule_phrases) || {};
    var ids = {};
    var key;

    for (key in labels) {
      if (Object.prototype.hasOwnProperty.call(labels, key) && BUILTIN_RULE_KEYS.indexOf(key) < 0) {
        ids[key] = true;
      }
    }

    for (key in customPhraseMap) {
      if (Object.prototype.hasOwnProperty.call(customPhraseMap, key) && BUILTIN_RULE_KEYS.indexOf(key) < 0) {
        ids[key] = true;
      }
    }

    return Object.keys(ids).sort();
  }

  function formatRuleWeightPreview(weight, normalizationBase, isDisabled) {
    if (isDisabled) {
      return "Devre dışı. Skora katkı vermez.";
    }
    if (!normalizationBase) {
      return "Normalize katkı: 0/100";
    }
    return "Normalize katkı: " + String(Math.min(Math.round((weight / normalizationBase) * 100), 100)) + "/100";
  }

  function updateRuleWeightMeta(normalizationBase) {
    var meta = document.getElementById("ruleWeightsMeta");
    if (!meta) {
      return;
    }
    meta.textContent = "Ham ağırlıklar düzenlenir. Normalize baz: " + String(normalizationBase) + " • Kartlardaki katkılar 0-100 ölçeğinde önizlenir.";
  }

  function updateRuleWeightPreviewMeta() {
    var weights = collectKeyValueInputs("weight-");
    var disabledRules = collectDisabledRules();
    var normalizationBase = computeRuleNormalizationBase(weights, disabledRules);
    var disabledSet = {};
    var i;
    var key;

    for (i = 0; i < disabledRules.length; i += 1) {
      disabledSet[disabledRules[i]] = true;
    }

    updateRuleWeightMeta(normalizationBase);

    for (key in weights) {
      if (!Object.prototype.hasOwnProperty.call(weights, key)) {
        continue;
      }
      var preview = document.getElementById("weight-preview-" + key);
      if (preview) {
        preview.textContent = formatRuleWeightPreview(Number(weights[key] || 0), normalizationBase, !!disabledSet[key]);
      }
    }
  }

  function buildAuditPayload(scope, payload) {
    return {
      actor: "Yönetici",
      section: scope === "all" ? "Tüm bölümler" : (SECTIONS[scope] || "Genel"),
      action: scope === "all" ? "Tüm ayarlar kaydedildi" : "Bölüm kaydedildi",
      details: collectAuditDetails(scope, payload)
    };
  }

  function collectAuditDetails(scope, payload) {
    var details = [];

    if (scope === "all") {
      var sectionName;
      for (sectionName in state.dirtySections) {
        if (Object.prototype.hasOwnProperty.call(state.dirtySections, sectionName) && state.dirtySections[sectionName]) {
          details = details.concat(collectAuditDetails(sectionName, collectSectionPayload(sectionName)));
        }
      }
      return details.length ? details : ["Genel ayarlar güncellendi."];
    }

    if (scope === "versionSection") {
      details.push("Uygulama sürümü: " + (payload.app_version || "-"));
      details.push("Düşük risk üst sınırı: " + String(payload.thresholds.low_risk_max));
      details.push("Orta risk üst sınırı: " + String(payload.thresholds.medium_risk_max));
      if (payload.version_note) {
        details.push("Sürüm notu eklendi.");
      }
      return details;
    }

    if (scope === "rulesSection") {
      details.push(String(Object.keys(payload.rule_weights || {}).length) + " kural ağırlığı kaydedildi.");
      details.push(String((payload.disabled_rules || []).length) + " kural devre dışı bırakıldı.");
      return details;
    }

    if (scope === "listsSection") {
      details.push("Alan adı ve anahtar kelime listeleri güncellendi.");
      details.push(String((payload.domains.company_trusted_domains || []).length) + " şirket alan adı kaydedildi.");
      details.push(String((payload.phrases.phishing_keywords || []).length) + " phishing anahtar kelimesi kaydedildi.");
      return details;
    }

    if (scope === "labelsSection") {
      details.push(String(Object.keys(payload.rule_chip_labels || {}).length) + " etiket kaydı kaydedildi.");
      return details;
    }

    return ["Ayarlar güncellendi."];
  }

  function renderHistoryModal() {
    var container = document.getElementById("historyList");
    var items = state.config && state.config.change_history ? state.config.change_history : [];
    items = filterHistoryItemsByDate(items, state.historyDateFilter);
    clearChildren(container);

    if (!items.length) {
      var empty = document.createElement("div");
      empty.className = "history-empty";
      empty.appendChild(document.createTextNode("Henüz kayıtlı bir değişiklik geçmişi bulunmuyor."));
      container.appendChild(empty);
      return;
    }

    var i;
    for (i = 0; i < items.length; i += 1) {
      container.appendChild(createHistoryItem(items[i]));
    }
  }

  function createHistoryItem(item) {
    var wrapper = document.createElement("div");
    wrapper.className = "history-item";

    var section = document.createElement("div");
    section.className = "history-item-section";
    section.appendChild(document.createTextNode(item.section || "Genel"));

    var head = document.createElement("div");
    head.className = "history-item-head";

    var title = document.createElement("div");
    title.className = "history-item-title";
    title.appendChild(document.createTextNode(item.action || "Ayar güncellendi"));

    var meta = document.createElement("div");
    meta.className = "history-item-meta";
    meta.appendChild(document.createTextNode((item.actor || "Yönetici") + " • " + formatTimestamp(item.timestamp || "")));

    head.appendChild(title);
    head.appendChild(meta);

    wrapper.appendChild(section);
    wrapper.appendChild(head);

    if (item.details && item.details.length) {
      var list = document.createElement("ul");
      list.className = "history-details";
      var j;
      for (j = 0; j < item.details.length; j += 1) {
        var li = document.createElement("li");
        li.appendChild(document.createTextNode(String(item.details[j])));
        list.appendChild(li);
      }
      wrapper.appendChild(list);
    }

    return wrapper;
  }

  function filterHistoryItemsByDate(items, filterValue) {
    var now = new Date();
    var result = [];
    var i;
    var itemDate;

    if (!items || !items.length || !filterValue || filterValue === "all") {
      return items || [];
    }

    for (i = 0; i < items.length; i += 1) {
      itemDate = new Date(items[i].timestamp || "");
      if (String(itemDate) === "Invalid Date") {
        continue;
      }

      if (filterValue === "today") {
        if (
          itemDate.getFullYear() === now.getFullYear() &&
          itemDate.getMonth() === now.getMonth() &&
          itemDate.getDate() === now.getDate()
        ) {
          result.push(items[i]);
        }
        continue;
      }

      if (filterValue === "7days") {
        if (now.getTime() - itemDate.getTime() <= 7 * 24 * 60 * 60 * 1000) {
          result.push(items[i]);
        }
        continue;
      }

      if (filterValue === "30days") {
        if (now.getTime() - itemDate.getTime() <= 30 * 24 * 60 * 60 * 1000) {
          result.push(items[i]);
        }
      }
    }

    return result;
  }

  function validateListField(elementId, label, kind) {
    var element = document.getElementById(elementId);
    var text = element ? String(element.value || "") : "";
    var lines = text.replace(/\r/g, "").split("\n");
    var seen = {};
    var i;

    for (i = 0; i < lines.length; i += 1) {
      var raw = lines[i];
      var trimmed = raw.trim();

      if (!trimmed) {
        if (text.trim()) {
          return label + " alanında boş satırlar bulunuyor. Lütfen temizleyiniz.";
        }
        continue;
      }

      if (!isValidListValue(trimmed, kind)) {
        return label + " alanında geçersiz bir değer var: " + trimmed;
      }

      var normalized = trimmed.toLowerCase();
      if (seen[normalized]) {
        return label + " alanında aynı değer birden fazla kez girildi: " + trimmed;
      }
      seen[normalized] = true;
    }

    return "";
  }

  function isValidListValue(value, kind) {
    if (kind === "domain") {
      return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(value);
    }
    if (kind === "iban") {
      return /^TR\d{2}(?:\s?\d{4}){5}\s?\d{2}$/i.test(value);
    }
    if (kind === "tld") {
      return /^\.[a-z0-9-]{2,}$/i.test(value);
    }
    if (kind === "extension") {
      return /^\.[a-z0-9]{1,12}$/i.test(value);
    }
    return value.length > 0;
  }

  function validateCustomPhraseRows() {
    var rows = document.querySelectorAll(".custom-phrase-textarea");
    var i;
    var ruleId;
    var message;

    for (i = 0; i < rows.length; i += 1) {
      ruleId = rows[i].getAttribute("data-rule-id");
      message = validateListField(rows[i].id, "Özel kural ifadeleri (" + ruleId + ")", "phrase");
      if (message) {
        return message;
      }
    }

    return "";
  }

  function requestJson(method, url, payload, onSuccess, onError) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    if (url.indexOf("/api/admin/") === 0 && state.authToken && url !== "/api/admin/login" && url !== "/api/admin/access") {
      xhr.setRequestHeader("X-PhishGuard-Admin-Token", state.authToken);
    }

    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) {
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          onSuccess(JSON.parse(xhr.responseText));
        } catch (parseError) {
          onError({ error: parseError.message || "Yanıt çözümlenemedi.", status: xhr.status });
        }
        return;
      }

      try {
        var errorPayload = JSON.parse(xhr.responseText);
        errorPayload.status = xhr.status;
        onError(errorPayload);
      } catch (error) {
        onError({ error: "Bilinmeyen hata", status: xhr.status });
      }
    };

    xhr.onerror = function () {
      onError({ error: "Bağlantı kurulamadı", status: 0 });
    };

    xhr.send(payload ? JSON.stringify(payload) : null);
  }

  function requestAdminLogin(password, onSuccess, onError) {
    requestJson("POST", "/api/admin/login", { password: password }, onSuccess, onError);
  }

  function toLines(values) {
    return (values || []).join("\n");
  }

  function fromLines(text) {
    var parts = text.split(/\r?\n/);
    var items = [];
    var i;
    for (i = 0; i < parts.length; i += 1) {
      var value = parts[i].trim();
      if (value) {
        items.push(value);
      }
    }
    return items;
  }

  function formatTimestamp(value) {
    var date = new Date(value);
    if (isNaN(date.getTime())) {
      return value;
    }

    try {
      return new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(date);
    } catch (error) {
      return value;
    }
  }

  function bindDirtyTracking() {
    bindSectionInputs("#appVersion, #versionNote, #lowRiskMax, #mediumRiskMax", "versionSection");
    bindSectionInputs("#companyDomains, #shortenerDomains, #suspiciousTlds, #phishingKeywords, #trustedRelatedDomains, #trustedIbans, #urgencyPhrases, #accountThreatPhrases, #extortionPhrases, #attachmentRequestPhrases, #paymentRequestPhrases, #bankChangePhrases, #invoicePressurePhrases, #suspiciousExtensions, #doubleExtensionBaitExtensions", "listsSection");
  }

  function bindSectionInputs(selector, sectionName) {
    var fields = document.querySelectorAll(selector);
    var i;
    for (i = 0; i < fields.length; i += 1) {
      fields[i].oninput = createSectionDirtyHandler(sectionName);
      fields[i].onchange = createSectionDirtyHandler(sectionName);
    }
  }

  function createSectionDirtyHandler(sectionName) {
    return function () {
      markDirty(sectionName);
    };
  }

  function markDirty(sectionName) {
    state.dirtySections[sectionName] = true;
    updateSaveState();
  }

  function clearDirtyScope(scope) {
    if (scope === "all") {
      state.dirtySections = {};
      return;
    }

    delete state.dirtySections[scope];
  }

  function hasDirtySections() {
    var key;
    for (key in state.dirtySections) {
      if (Object.prototype.hasOwnProperty.call(state.dirtySections, key) && state.dirtySections[key]) {
        return true;
      }
    }
    return false;
  }

  function updateSaveState() {
    var elements = document.querySelectorAll(".save-state-text");
    var i;
    for (i = 0; i < elements.length; i += 1) {
      var sectionName = elements[i].getAttribute("data-section");
      var sectionDirty = !!state.dirtySections[sectionName];
      elements[i].textContent = sectionDirty ? "Kaydetme gerekiyor" : "Güncel";
      elements[i].className = sectionDirty ? "save-state-text is-dirty" : "save-state-text";
    }

    var sidebarStatus = document.getElementById("sidebarStatus");
    sidebarStatus.textContent = hasDirtySections() ? "KAYDETME GEREKİYOR" : "GÜNCEL";
    sidebarStatus.className = hasDirtySections() ? "sidebar-status is-dirty" : "sidebar-status";

    var saveButtons = document.querySelectorAll(".section-save-button");
    for (i = 0; i < saveButtons.length; i += 1) {
      var targetSection = saveButtons[i].getAttribute("data-section");
      if (
        saveButtons[i].classList.contains("is-confirm")
        || saveButtons[i].classList.contains("is-saving")
        || saveButtons[i].classList.contains("is-success")
        || saveButtons[i].classList.contains("is-error")
      ) {
        continue;
      }
      saveButtons[i].disabled = !state.dirtySections[targetSection];
    }

    syncGlobalSaveButton();
  }

  function syncGlobalSaveButton() {
    var saveButton = document.getElementById("saveButton");
    if (!saveButton || state.saveButtonLocked || state.saveButtonConfirming) {
      return;
    }

    saveButton.disabled = !hasDirtySections();
    saveButton.textContent = "Tümünü Kaydet";
    saveButton.className = "primary-button";
  }

  function setSaveButtonVisual(kind, text, disabled) {
    var saveButton = document.getElementById("saveButton");
    if (!saveButton) {
      return;
    }

    saveButton.disabled = !!disabled;
    saveButton.textContent = text;
    saveButton.className = "primary-button is-" + kind;
  }

  function clearSaveButtonConfirmState() {
    state.saveButtonConfirming = false;
    window.clearTimeout(state.saveButtonTimer);
  }

  function pulseSaveButton(kind, text) {
    clearSaveButtonConfirmState();
    state.saveButtonLocked = true;
    window.clearTimeout(state.saveButtonTimer);
    setSaveButtonVisual(kind, text, true);
    state.saveButtonTimer = window.setTimeout(function () {
      state.saveButtonLocked = false;
      syncGlobalSaveButton();
    }, 1600);
  }

  function showFlash(text, type) {
    var flash = document.getElementById("flashMessage");
    flash.textContent = text;
    flash.className = "flash-message " + type;

    window.clearTimeout(flash._hideTimer);
    flash._hideTimer = window.setTimeout(function () {
      flash.className = "flash-message hidden";
    }, 2200);
  }

  function readError(error) {
    return error && error.error ? error.error : "Bilinmeyen hata";
  }

  function bindNavigation() {
    var buttons = document.querySelectorAll(".nav-item");
    var i;
    for (i = 0; i < buttons.length; i += 1) {
      buttons[i].onclick = function () {
        setActiveNav(this);
        var targetId = this.getAttribute("data-target");
        if (targetId === "overviewSection") {
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
        var target = document.getElementById(targetId);
        if (target && target.scrollIntoView) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      };
    }

    window.addEventListener("scroll", syncActiveNavToScroll, { passive: true });
    syncActiveNavToScroll();
  }

  function setActiveNav(activeButton) {
    var buttons = document.querySelectorAll(".nav-item");
    var i;
    for (i = 0; i < buttons.length; i += 1) {
      buttons[i].className = "nav-item";
    }
    activeButton.className = "nav-item is-active";
  }

  function syncActiveNavToScroll() {
    var buttons = document.querySelectorAll(".nav-item");
    var activeButton = null;
    var i;

    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 40) {
      activeButton = buttons.length ? buttons[buttons.length - 1] : null;
    } else {
      for (i = 0; i < buttons.length; i += 1) {
        var targetId = buttons[i].getAttribute("data-target");
        var target = document.getElementById(targetId);
        if (target && target.getBoundingClientRect().top <= 180) {
          activeButton = buttons[i];
        }
      }
    }

    if (!activeButton && buttons.length) {
      activeButton = buttons[0];
    }

    if (activeButton) {
      setActiveNav(activeButton);
    }
  }

  function mergeInto(target, source) {
    var key;
    for (key in source) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) {
        continue;
      }
      if (isPlainObject(target[key]) && isPlainObject(source[key])) {
        mergeInto(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  function isPlainObject(value) {
    return Object.prototype.toString.call(value) === "[object Object]";
  }

  function clearChildren(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function readStoredToken() {
    try {
      return window.sessionStorage.getItem(ADMIN_TOKEN_KEY) || "";
    } catch (error) {
      return "";
    }
  }

  function storeToken(token) {
    try {
      window.sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    } catch (error) {
      return;
    }
  }

  function clearStoredToken() {
    try {
      window.sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    } catch (error) {
      return;
    }
  }

  function setInlineError(id, text) {
    var element = document.getElementById(id);
    if (!element) {
      return;
    }

    if (!text) {
      element.textContent = "";
      element.className = "inline-helper danger-helper hidden";
      return;
    }

    element.textContent = text;
    element.className = "inline-helper danger-helper";
  }

  function finalizeSave(scope, payload, savedConfig) {
    var finalize = function () {
      state.config = savedConfig;
      state.access = savedConfig.admin_access || state.access;
      clearDirtyScope(scope);
      renderConfig(savedConfig);
      updateSaveState();
      if (scope === "all") {
        pulseSaveButton("success", "Başarılı");
      } else {
        pulseSectionSaveButton(scope, "success", "Başarılı");
      }
      showFlash(scope === "all" ? "Tüm değişiklikler kaydedildi." : SECTIONS[scope] + " kaydedildi.", "success");
    };

    var securityPayload = payload.admin_access;
    if (securityPayload && securityPayload.password_enabled && securityPayload.new_password) {
      requestAdminLogin(securityPayload.new_password, function (response) {
        state.authToken = response.token || "";
        storeToken(state.authToken);
        finalize();
      }, function () {
        finalize();
      });
      return;
    }

    finalize();
  }
})();
