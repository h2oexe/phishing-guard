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
    "INVOICE_PRESSURE_LANGUAGE"
  ];
  var BUILTIN_RULE_KEYS = RULE_DISPLAY_ORDER.slice();

  var SECTIONS = {
    versionSection: "Sürüm ve eşikler",
    rulesSection: "Kural motoru",
    listsSection: "Alan adları ve anahtar kelimeler",
    labelsSection: "Etiket adları"
  };

  var state = {
    config: null,
    access: null,
    authToken: readStoredToken(),
    pendingLabelRow: null,
    pendingSaveScope: null,
    dirtySections: {},
    advancedListsVisible: false,
    resetPasswordVerified: false,
    historyDateFilter: "all"
  };

  document.addEventListener("DOMContentLoaded", function () {
    bindStaticEvents();
    bindNavigation();
    bootstrapAdmin();
  });

  function bindStaticEvents() {
    document.getElementById("saveButton").onclick = function () {
      requestSaveConfirmation("all");
    };
    document.getElementById("addLabelButton").onclick = addEmptyLabelRow;
    document.getElementById("toggleAdvancedListsButton").onclick = toggleAdvancedLists;
    document.getElementById("confirmDeleteButton").onclick = confirmLabelRemoval;
    document.getElementById("cancelDeleteButton").onclick = closeDeleteModal;
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

    bindOverlayClose("deleteModalOverlay", closeDeleteModal);
    bindOverlayClose("saveModalOverlay", closeSaveModal);
    bindOverlayClose("infoModalOverlay", closeInfoModal);
    bindOverlayClose("resetModalOverlay", closeResetModal);
    bindOverlayClose("changePasswordModalOverlay", closeChangePasswordModal);
    bindOverlayClose("hintModalOverlay", closeHintModal);
    bindOverlayClose("historyModalOverlay", closeHistoryModal);

    bindSectionSaveButtons();
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
      buttons[i].onclick = function () {
        requestSaveConfirmation(this.getAttribute("data-section"));
      };
    }
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
    renderLabelRows(config.rule_chip_labels || {});
    renderCustomPhraseCards(config);
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
    requestJson("PUT", "/api/admin/config", payload, function (savedConfig) {
      finalizeSave(scope, payload, savedConfig);
    }, function (error) {
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
        rule_chip_labels: collectLabelRows()
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
      if (!key || !value) {
        return "Etiket bilgisi girilmedi. Lütfen kontrol ediniz.";
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

  function renderLabelRows(entries) {
    var container = document.getElementById("chipLabelsGrid");
    clearChildren(container);

    var keys = Object.keys(entries).sort();
    var i;
    for (i = 0; i < keys.length; i += 1) {
      appendLabelRow(container, keys[i], entries[keys[i]]);
    }

    if (keys.length === 0) {
      appendLabelRow(container, "", "");
    }
  }

  function appendLabelRow(container, key, value) {
    var row = document.createElement("div");
    row.className = "label-row";

    row.appendChild(createField("Kural Anahtarı", "label-key-input", key || "", "ORNEK_ETIKET", "labelsSection"));
    row.appendChild(createField("Etiket", "label-value-input", value || "", "Etiket Adı", "labelsSection"));

    var actionWrap = document.createElement("div");
    actionWrap.className = "label-row-action";
    var removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "danger-icon-button";
    removeButton.title = "Etiketi kaldır";
    removeButton.setAttribute("aria-label", "Etiketi kaldır");
    var icon = document.createElement("span");
    icon.className = "danger-icon-glyph";
    icon.appendChild(document.createTextNode("×"));
    removeButton.appendChild(icon);
    removeButton.onclick = function () {
      openDeleteModal(row);
    };
    actionWrap.appendChild(removeButton);

    row.appendChild(actionWrap);
    container.appendChild(row);
  }

  function createField(labelText, inputClass, value, placeholder, sectionName) {
    var field = document.createElement("div");
    field.className = "field";

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

  function addEmptyLabelRow() {
    appendLabelRow(document.getElementById("chipLabelsGrid"), "", "");
    markDirty("labelsSection");
  }

  function openDeleteModal(row) {
    state.pendingLabelRow = row;
    document.getElementById("deleteModalOverlay").className = "modal-overlay";
  }

  function closeDeleteModal() {
    state.pendingLabelRow = null;
    document.getElementById("deleteModalOverlay").className = "modal-overlay hidden";
  }

  function confirmLabelRemoval() {
    if (state.pendingLabelRow && state.pendingLabelRow.parentNode) {
      state.pendingLabelRow.parentNode.removeChild(state.pendingLabelRow);
      ensureAtLeastOneLabelRow();
      markDirty("labelsSection");
    }
    closeDeleteModal();
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
      appendLabelRow(container, "", "");
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
    button.textContent = state.advancedListsVisible ? "Tümünü Gizle" : "Tümünü Göster";
  }

  function renderCustomPhraseCards(config) {
    var section = document.getElementById("customRulePhrasesSection");
    var container = document.getElementById("customRulePhrasesGrid");
    var ruleLabels = config.rule_chip_labels || {};
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
        customPhraseMap[customRuleIds[i]] || []
      ));
    }
  }

  function createCustomPhraseCard(ruleId, labelText, values) {
    var card = document.createElement("article");
    var title = document.createElement("div");
    var copy = document.createElement("p");
    var label = document.createElement("label");
    var textarea = document.createElement("textarea");

    card.className = "module-card";

    title.className = "module-title";
    title.appendChild(document.createTextNode(ruleId));

    copy.className = "module-copy";
    copy.appendChild(document.createTextNode("Etiket adÄ±: " + labelText));

    label.setAttribute("for", "customPhrase-" + ruleId);
    label.appendChild(document.createTextNode("Ä°FADE LÄ°STESÄ°"));

    textarea.id = "customPhrase-" + ruleId;
    textarea.className = "custom-phrase-textarea";
    textarea.setAttribute("data-rule-id", ruleId);
    textarea.rows = 8;
    textarea.placeholder = "Bu kuralla ilgili ifadeleri her satÄ±ra ayrÄ± yazÄ±n";
    textarea.value = toLines(values);
    textarea.oninput = createSectionDirtyHandler("listsSection");
    textarea.onchange = createSectionDirtyHandler("listsSection");

    card.appendChild(title);
    card.appendChild(copy);
    card.appendChild(label);
    card.appendChild(textarea);

    return card;
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
    bindSectionInputs("#companyDomains, #shortenerDomains, #suspiciousTlds, #phishingKeywords, #trustedRelatedDomains, #urgencyPhrases, #accountThreatPhrases, #extortionPhrases, #attachmentRequestPhrases, #paymentRequestPhrases, #bankChangePhrases, #invoicePressurePhrases, #suspiciousExtensions, #doubleExtensionBaitExtensions", "listsSection");
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
      saveButtons[i].disabled = !state.dirtySections[targetSection];
    }
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
        var target = document.getElementById(targetId);
        if (target && target.scrollIntoView) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      };
    }
  }

  function setActiveNav(activeButton) {
    var buttons = document.querySelectorAll(".nav-item");
    var i;
    for (i = 0; i < buttons.length; i += 1) {
      buttons[i].className = "nav-item";
    }
    activeButton.className = "nav-item is-active";
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
