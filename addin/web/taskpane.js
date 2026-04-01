(function () {
  var POLL_INTERVAL_MS = 2500;
  var MAX_SIGNAL_ROWS = 4;
  var DEFAULT_VERSION = "1.0.0";
  var DEFAULT_LEVEL = "Düşük Risk";
  var SAFE_HEADLINE = "Güvendesiniz";
  var SAFE_SIGNAL_LABEL = "Güvenli Gönderi";
  var SAFE_SIGNAL_EXPLANATION = "Şu an dikkat çeken belirgin bir risk işareti görünmüyor.";

  var RULE_LABELS = {
    PHISHING_KEYWORDS: "Şüpheli İfadeler",
    SHORTENER_LINK: "Kısa Bağlantı",
    DOMAIN_LINK_MISMATCH: "Bağlantı Uyuşmazlığı",
    DISPLAY_TARGET_MISMATCH: "Sahte Hedef",
    SUSPICIOUS_ATTACHMENT: "Şüpheli Ek",
    DOUBLE_EXTENSION: "Çift Uzantı",
    IP_LINK: "IP Bağlantısı",
    URGENCY_LANGUAGE: "Zaman Baskısı",
    ACCOUNT_THREAT_LANGUAGE: "Hesap Tehdidi",
    EXTORTION_LANGUAGE: "Dosya Şifreleme Tehdidi",
    UNEXPECTED_ATTACHMENT_REQUEST: "Ek Açma Talebi",
    PAYMENT_REQUEST_LANGUAGE: "Ödeme Talebi",
    BANK_CHANGE_LANGUAGE: "IBAN Değişikliği",
    INVOICE_PRESSURE_LANGUAGE: "Fatura Baskısı",
    SPF_FAIL: "SPF Hatası",
    SPF_SOFTFAIL: "SPF Softfail",
    DKIM_FAIL: "DKIM Hatası",
    DMARC_FAIL: "DMARC Hatası"
  };

  var RULE_EXPLANATIONS = {
    DOMAIN_LINK_MISMATCH: "Bağlantı adresi, mailin geldiği alan adıyla uyuşmuyor.",
    DISPLAY_TARGET_MISMATCH: "Görünen bağlantı ile açılan gerçek adres aynı görünmüyor.",
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
    meta: null,
    activeFingerprint: "",
    refreshInFlight: false,
    watcherHandle: null
  };

  Office.onReady(function () {
    bindStaticEvents();
    startMailboxWatcher();
    loadMeta();
    refreshAnalysis();
  });

  function bindStaticEvents() {
    var refreshButton = document.getElementById("refreshButton");
    var toggleButton = document.getElementById("toggleReasonsButton");

    if (refreshButton) {
      refreshButton.onclick = refreshAnalysis;
    }

    if (toggleButton) {
      toggleButton.onclick = toggleReasonDrawer;
    }
  }

  function loadMeta() {
    requestJson(
      "GET",
      "/api/meta",
      null,
      function (meta) {
        state.meta = meta || {};
        renderMeta(state.meta);
      },
      consoleError
    );
  }

  function refreshAnalysis() {
    if (state.refreshInFlight) {
      return;
    }

    state.refreshInFlight = true;
    state.activeFingerprint = getCurrentItemFingerprint();
    setStatus("Mail okunuyor...");

    collectCurrentMail(
      function (payload) {
        setStatus("Yerel analiz servisine gönderiliyor...");
        requestJson(
          "POST",
          "/api/analyze",
          payload,
          function (result) {
            resolvePreferredResult(payload, result || {}, function (preferredResult) {
              state.refreshInFlight = false;
              renderResult(preferredResult || {});
              setStatus("Analiz güncel.");
            });
          },
          function (error) {
            state.refreshInFlight = false;
            consoleError(error);
            renderError(error);
            setStatus("Analiz şu anda tamamlanamadı.");
          }
        );
      },
      function (error) {
        state.refreshInFlight = false;
        consoleError(error);
        renderError(error);
        setStatus("Analiz şu anda tamamlanamadı.");
      }
    );
  }

  function resolvePreferredResult(currentPayload, liveResult, onResolved) {
    requestJson(
      "GET",
      "/api/outlook/cache",
      null,
      function (cachePayload) {
        var cachedMail = cachePayload && cachePayload.mail ? cachePayload.mail : null;
        var cachedResult = cachePayload && cachePayload.result ? cachePayload.result : null;

        if (isMatchingCachedMail(currentPayload, cachedMail) && isUsableCachedResult(cachedResult)) {
          onResolved(cachedResult);
          return;
        }

        onResolved(liveResult);
      },
      function () {
        onResolved(liveResult);
      }
    );
  }

  function isUsableCachedResult(result) {
    return !!(result && typeof result.score !== "undefined" && typeof result.level !== "undefined");
  }

  function isMatchingCachedMail(currentPayload, cachedMail) {
    var currentSubject;
    var cachedSubject;
    var currentSender;
    var cachedSender;
    var currentBody;
    var cachedBody;

    if (!currentPayload || !cachedMail) {
      return false;
    }

    currentSubject = normalizeCompareText(currentPayload.subject);
    cachedSubject = normalizeCompareText(cachedMail.subject);
    currentSender = normalizeCompareText(currentPayload.sender_email);
    cachedSender = normalizeCompareText(cachedMail.sender_email);
    currentBody = normalizeCompareText(snippetText(currentPayload.body_text));
    cachedBody = normalizeCompareText(snippetText(cachedMail.body_text));

    if (!currentSubject || !cachedSubject || currentSubject !== cachedSubject) {
      return false;
    }

    if (!currentSender || !cachedSender || currentSender !== cachedSender) {
      return false;
    }

    if (!currentBody || !cachedBody) {
      return true;
    }

    return currentBody === cachedBody;
  }

  function snippetText(value) {
    return String(value || "").slice(0, 200);
  }

  function normalizeCompareText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .replace(/^\s+|\s+$/g, "")
      .toLowerCase();
  }

  function startMailboxWatcher() {
    if (state.watcherHandle) {
      window.clearInterval(state.watcherHandle);
    }

    state.activeFingerprint = getCurrentItemFingerprint();
    state.watcherHandle = window.setInterval(function () {
      var nextFingerprint = getCurrentItemFingerprint();

      if (!nextFingerprint || state.refreshInFlight) {
        return;
      }

      if (nextFingerprint !== state.activeFingerprint) {
        state.activeFingerprint = nextFingerprint;
        refreshAnalysis();
      }
    }, POLL_INTERVAL_MS);
  }

  function getCurrentItemFingerprint() {
    var item = Office.context.mailbox && Office.context.mailbox.item;
    var fromInfo;

    if (!item) {
      return "";
    }

    fromInfo = item.from || item.sender || {};

    return [
      item.itemId || "",
      item.subject || "",
      fromInfo.emailAddress || "",
      String(item.dateTimeCreated || "")
    ].join("|");
  }

  function collectCurrentMail(onSuccess, onError) {
    var item = Office.context.mailbox && Office.context.mailbox.item;

    if (!item) {
      onError(new Error("No current Outlook item."));
      return;
    }

    item.body.getAsync(Office.CoercionType.Text, function (textResult) {
      if (textResult.status !== Office.AsyncResultStatus.Succeeded) {
        onError(new Error(extractAsyncError(textResult, "Body text read failed.")));
        return;
      }

      item.body.getAsync(Office.CoercionType.Html, function (htmlResult) {
        var fromInfo;
        var senderEmail;
        var attachments;
        var i;

        if (htmlResult.status !== Office.AsyncResultStatus.Succeeded) {
          onError(new Error(extractAsyncError(htmlResult, "Body HTML read failed.")));
          return;
        }

        fromInfo = item.from || item.sender || {};
        senderEmail = fromInfo.emailAddress || "";
        attachments = [];

        if (item.attachments && item.attachments.length) {
          for (i = 0; i < item.attachments.length; i += 1) {
            attachments.push(item.attachments[i].name);
          }
        }

        onSuccess({
          subject: item.subject || "",
          sender_name: fromInfo.displayName || "",
          sender_email: senderEmail,
          sender_domain: extractDomainFromEmail(senderEmail),
          body_text: textResult.value || "",
          body_html: htmlResult.value || "",
          attachments: attachments
        });
      });
    });
  }

  function extractAsyncError(asyncResult, fallback) {
    return asyncResult && asyncResult.error && asyncResult.error.message
      ? asyncResult.error.message
      : fallback;
  }

  function requestJson(method, url, payload, onSuccess, onError) {
    var xhr = new XMLHttpRequest();

    xhr.open(method, url, true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) {
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          onSuccess(JSON.parse(xhr.responseText));
        } catch (parseError) {
          onError(parseError);
        }
        return;
      }

      try {
        onError(JSON.parse(xhr.responseText));
      } catch (parseFailure) {
        onError(new Error("Analyzer request failed: " + xhr.status));
      }
    };

    xhr.onerror = function () {
      onError(new Error("Analyzer request failed."));
    };

    xhr.send(payload ? JSON.stringify(payload) : null);
  }

  function extractDomainFromEmail(email) {
    var atIndex = email.indexOf("@");
    return atIndex >= 0 ? email.slice(atIndex + 1).toLowerCase() : "";
  }

  function renderResult(result) {
    var level = normalizeLevel(result.level);
    var score = clampScore(result.score);
    var riskClass = score <= 0 ? "safe" : getRiskClass(level);
    var signalRows = buildSignalRows(result);

    applyRiskClasses(riskClass);
    setText("summaryText", buildHeadline(level, score));
    setText("subText", buildHeroCopy(result));
    setText("scoreText", score + " / 100");
    setText("scoreNumber", String(score));
    setText("ruleCountText", String(signalRows.length));
    document.getElementById("scoreBar").style.width = score + "%";

    renderSignalRows(signalRows, riskClass);
  }

  function renderError(error) {
    applyRiskClasses("medium");
    setText("summaryText", "Analiz Bekleniyor");
    setText("subText", "Yerel servis veya Outlook verisi okunamadı.");
    setText("scoreText", "0 / 100");
    setText("scoreNumber", "0");
    setText("ruleCountText", "1");
    document.getElementById("scoreBar").style.width = "0%";

    renderSignalRows([
      {
        label: "Bağlantı Bekleniyor",
        explanation: error && error.message ? error.message : "Şu anda analiz sonucu alınamadı."
      }
    ], "medium");
  }

  function applyRiskClasses(riskClass) {
    setClass("heroCard", "hero-card " + riskClass);
    setClass("refreshButton", "ghost-button " + riskClass);
    setClass("scoreBar", "progress-fill " + riskClass);
    setClass("toggleReasonsButton", "cta-button " + riskClass);
    setClass("statusText", "status " + riskClass);
  }

  function clampScore(score) {
    var numeric = Number(score || 0);

    if (numeric < 0) {
      return 0;
    }
    if (numeric > 100) {
      return 100;
    }
    return Math.round(numeric);
  }

  function normalizeLevel(level) {
    return level || DEFAULT_LEVEL;
  }

  function buildHeadline(level, score) {
    if (score <= 0) {
      return SAFE_HEADLINE;
    }
    return level;
  }

  function buildHeroCopy(result) {
    var summary = result.summary || "";
    var level = normalizeLevel(result.level);
    var riskClass = getRiskClass(level);

    if (summary) {
      return "PhishGuard bu e-postayı taradı. " + summary;
    }
    if (riskClass === "high") {
      return "PhishGuard bu e-postayı taradı ve güçlü risk sinyalleri tespit etti. Bu iletiyle dikkatli ilerleyin.";
    }
    if (riskClass === "medium") {
      return "PhishGuard bu e-postayı taradı ve dikkat gerektiren bazı işaretler buldu. Göndereni doğrulamanız önerilir.";
    }
    return "PhishGuard bu e-postayı taradı ve önemli bir tehdit algılamadı.";
  }

  function getRiskClass(level) {
    var normalized = String(level || "").toLowerCase();

    if (normalized.indexOf("yüksek") >= 0 || normalized.indexOf("yuksek") >= 0 || normalized.indexOf("high") >= 0) {
      return "high";
    }
    if (normalized.indexOf("orta") >= 0 || normalized.indexOf("medium") >= 0) {
      return "medium";
    }
    return "low";
  }

  function renderSignalRows(rows, riskClass) {
    var signalList = document.getElementById("signalList");
    var i;

    clearChildren(signalList);
    for (i = 0; i < rows.length; i += 1) {
      signalList.appendChild(createSignalRow(rows[i], riskClass));
    }
  }

  function buildSignalRows(result) {
    var matchedRules = result.matched_rules || [];
    var chipLabels = state.meta && state.meta.rule_chip_labels ? state.meta.rule_chip_labels : {};
    var displayMeta = state.meta && state.meta.rule_display_meta ? state.meta.rule_display_meta : {};
    var seenLabels = {};
    var rows = [];
    var i;
    var label;

    if (!matchedRules.length) {
      return [{
        label: SAFE_SIGNAL_LABEL,
        explanation: SAFE_SIGNAL_EXPLANATION
      }];
    }

    for (i = 0; i < matchedRules.length; i += 1) {
      label = resolveSignalLabel(matchedRules[i], chipLabels);
      if (seenLabels[label]) {
        continue;
      }

      seenLabels[label] = true;
      rows.push({
        label: label,
        explanation: buildPlainExplanation(matchedRules[i], displayMeta)
      });
    }

    if (!rows.length) {
      rows.push({
        label: "Şüpheli Sinyaller",
        explanation: "Mail içinde dikkat gerektiren bazı işaretler bulundu."
      });
    }

    return rows.slice(0, MAX_SIGNAL_ROWS);
  }

  function createSignalRow(row, riskClass) {
    var wrapper = document.createElement("div");
    var chipWrap = document.createElement("div");
    var triangle = document.createElement("span");
    var chip = document.createElement("span");
    var copy = document.createElement("div");

    wrapper.className = "signal-row";
    chipWrap.className = "signal-chip-wrap";
    triangle.className = "signal-triangle";
    chip.className = "signal-chip " + riskClass;
    copy.className = "signal-copy";

    chip.appendChild(document.createTextNode(row.label));
    copy.appendChild(document.createTextNode(row.explanation));

    chipWrap.appendChild(triangle);
    chipWrap.appendChild(chip);
    wrapper.appendChild(chipWrap);
    wrapper.appendChild(copy);

    return wrapper;
  }

  function buildPlainExplanation(ruleName, displayMeta) {
    var meta = displayMeta && displayMeta[ruleName] ? displayMeta[ruleName] : null;
    var description = meta && meta.panel_description ? String(meta.panel_description).trim() : "";

    if (description && description !== "Yan panelde görünecek açıklama") {
      return description;
    }

    return RULE_EXPLANATIONS[ruleName] || "Bu sinyal, mail içinde dikkat gerektiren bir durum bulunduğunu gösteriyor.";
  }

  function fallbackRuleLabel(ruleName) {
    if (RULE_LABELS[ruleName]) {
      return RULE_LABELS[ruleName];
    }
    return String(ruleName || "").replace(/_/g, " ");
  }

  function resolveSignalLabel(ruleName, chipLabels) {
    var customLabel = chipLabels[ruleName];

    if (!customLabel || customLabel === ruleName || /[ÃÅÄÞ]/.test(customLabel)) {
      return fallbackRuleLabel(ruleName);
    }

    return customLabel;
  }

  function renderMeta(meta) {
    setText("appVersionText", "Uygulama v" + (meta.app_version || DEFAULT_VERSION));
  }

  function toggleReasonDrawer() {
    var drawer = document.getElementById("reasonDrawer");

    if (!drawer) {
      return;
    }

    if (drawer.className.indexOf("hidden") >= 0) {
      drawer.className = "reason-drawer";
      return;
    }

    drawer.className = "reason-drawer hidden";
  }

  function setStatus(text) {
    setText("statusText", text);
  }

  function setText(id, text) {
    var element = document.getElementById(id);
    if (element) {
      element.textContent = text;
    }
  }

  function setClass(id, className) {
    var element = document.getElementById(id);
    if (element) {
      element.className = className;
    }
  }

  function clearChildren(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function consoleError(error) {
    if (window.console && window.console.error) {
      window.console.error(error);
    }
  }
})();
