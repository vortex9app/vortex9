(function () {
  var activePolicy = null;
  var style = document.createElement("style");
  style.textContent = document.getElementById("mampi-legal-css") ? "" : window.__MAMPI_LEGAL_CSS || "";
  if (window.__MAMPI_LEGAL_CSS) {
    style.textContent = window.__MAMPI_LEGAL_CSS;
    document.head.appendChild(style);
  }
  var DOCS = {
    terms: {
      title: "Terms of Service",
      html:
        '<p class="legal-updated">Mampi Technologies Ltd · 30 September 2026</p>' +
        '<p>These Terms of Service are the end user licence between you and Mampi Technologies Ltd, company number 17484970, registered in England and Wales, with its registered office at 9 Lodge Hill Road, Ossett, WF5 9RU, United Kingdom. They cover Decoy9, Phreak9, Vortex9, and, when it is released, Aura9. Installing or running the software means you accept this licence and the <button type="button" data-policy="aup" class="legal-text">Acceptable Use Policy</button>.</p>' +
        '<h2>Licence</h2>' +
        '<p>The company grants you a personal, non-exclusive, non-transferable licence to install and run the software on devices you control, for the tier you are entitled to use. A paid term applies only to the account that completed checkout, and only while that term is active. The software is licensed, not sold. The company keeps all intellectual property in the program, its name, and its design.</p>' +
        '<h2>What you may not do</h2>' +
        '<p>You may not copy the software for distribution, rent it, sell it, or share a paid unlock with another person. You may not reverse engineer, decompile, or disassemble the software, except for the narrow right UK law gives to decompile for interoperability where that right cannot be waived. You may not remove a copyright or licence notice, or present a modified copy as an official build.</p>' +
        '<h2>As-is and as-available software</h2>' +
        '<p>The software is provided “as is” and “as available”. To the maximum extent permitted by the law of England and Wales, and by any other law that applies and cannot be disapplied, the company excludes all warranties, conditions, and representations, whether express, implied, or statutory. That includes any warranty of merchantability, satisfactory quality, fitness for a particular purpose, title, quiet enjoyment, accuracy, and non-infringement, and any warranty that the software will be uninterrupted, timely, secure, or error-free.</p>' +
        '<p>Decoy9 does not promise that a peer will be reachable, that a message will be delivered, or that a device, operating system, or network outside the client will behave. The Windows setup is the published desktop installer. Windows MSI, macOS, and Android remain in pre-deployment until a download is offered without a “Coming Soon” label. A description of a platform is not a promise that an installer exists today. Aura9 is not yet released.</p>' +
        '<h2>You are responsible for encrypted transmissions</h2>' +
        '<p>Decoy9 seals messages from the sender to the recipient. The company is not a party to the conversation, does not hold the message contents, and cannot read them. You are solely responsible for every transmission you create, send, receive, store, forward, or delete, including its lawfulness, its accuracy, and the people you choose to peer with. You are solely responsible for safeguarding the device, the local identity, and any copy of the vault. The company is not responsible for a message that you sealed, for a peer you accepted, or for a consequence of end-to-end encryption, including the company’s inability to recover or inspect a conversation.</p>' +
        '<h2>Limitation of liability</h2>' +
        '<p>To the maximum extent permitted under the law of England and Wales and under international law, the company and its directors, officers, and contractors are not liable for any loss or damage arising out of the software or these terms. That exclusion covers direct, indirect, incidental, special, consequential, exemplary, and punitive loss, loss of profit, revenue, goodwill, data, messages, or privacy, business interruption, the cost of substitute software, and any loss caused by a third party, a network, a device, or an encrypted transmission, whether the claim is in contract, tort (including negligence), breach of statutory duty, or otherwise, and whether or not the company was advised that the loss was possible.</p>' +
        '<p>Nothing in these terms limits or excludes liability for death or personal injury caused by negligence, for fraud or fraudulent misrepresentation, or for any other liability that the law of England and Wales, or a mandatory rule of another country that applies to you, does not allow a contract to exclude or limit. Where a liability cannot be excluded, it is limited to the smallest amount the law allows.</p>' +
        '<p>Subject to the previous paragraph, the company’s total aggregate liability arising out of the software and these terms, whether in one claim or in a series of claims, is limited to the amount you paid the company for that software during the twelve months before the claim arose. If you paid nothing, that cap is zero. Decoy9 Pro and Phreak9 Pro fees paid to Stripe count as amounts paid for the software. The free core, for which the price is zero, remains inside the zero cap.</p>' +
        '<h2>Privacy of the software</h2>' +
        '<p>The <button type="button" data-policy="privacy" class="legal-text">Privacy Policy</button> describes the data the company handles. Decoy9 does not send server-side telemetry. The vault stays encrypted on the device. Card payments are taken by Stripe, not by the client.</p>' +
        '<h2>Ending the licence</h2>' +
        '<p>You may stop using the software and remove it at any time. The company may end this licence if you break it. When it ends, you will stop using the software and delete the copies you hold. Sections on intellectual property, liability, and governing law continue to apply.</p>' +
        '<h2>Law</h2>' +
        '<p>This licence is governed by the law of England and Wales. Questions about it go to <a href="mailto:support@mampitech.com">support@mampitech.com</a>.</p>'
    },
    aup: {
      title: "Acceptable Use Policy",
      html:
        '<p class="legal-updated">Mampi Technologies Ltd · 30 September 2026</p>' +
        '<p>This Acceptable Use Policy is part of the <button type="button" data-policy="terms" class="legal-text">Terms of Service</button> for Decoy9 and Phreak9. It binds every person who downloads, installs, or runs either client. Both are published by Mampi Technologies Ltd, company number 17484970, registered in England and Wales, at 9 Lodge Hill Road, Ossett, WF5 9RU, United Kingdom.</p>' +
        '<h2>Phreak9</h2>' +
        '<p>You must be 18 or older. Phreak9 is a local defence tool for a computer you control. Community use covers local vulnerability scanning and manual threat alerts. Pro covers automated firewall defence, local patch actions, and heuristic threat feeds on that same device. You will use Phreak9 only on devices, networks, and services you are allowed to defend. You will not aim it at a system you do not control.</p>' +
        '<h2>Who may use Decoy9</h2>' +
        '<p>You must be 18 or older. The download gate asks you to confirm that age, and installing the client repeats that confirmation. You will not create a peer relationship with a child, and you will not use Decoy9 to contact a minor.</p>' +
        '<h2>Zero tolerance</h2>' +
        '<p>The following are forbidden. A single act is enough. There is no warning tier for them.</p>' +
        '<ul>' +
        '<li>Any illegal act, including fraud, extortion, trafficking, and the distribution of illegal material.</li>' +
        '<li>Harassment, threats, stalking, hate-based abuse, or coercion of another person.</li>' +
        '<li>Grooming, sexual exploitation, or any harm to a minor, including an attempt, a request, or the sharing of sexual material involving a child.</li>' +
        '<li>Malware, credential theft, or any use of the channel to break into a system you do not control.</li>' +
        '</ul>' +
        '<p>If you see conduct of that kind, stop the peer on your device and write to <a href="mailto:support@mampitech.com">support@mampitech.com</a>. Where the law requires a report to the police or another authority, make that report. The company will co-operate with a lawful request that it is actually able to answer.</p>' +
        '<h2>Client-side isolation and connection gating</h2>' +
        '<p>Decoy9 does not place a company server in the message path, and it does not scan message contents. Safety controls run on the device.</p>' +
        '<ul>' +
        '<li>An unknown public key waits in Pending Requests. Until you accept it, inbound text, links, and media from that key are not shown.</li>' +
        '<li>Decline blocks that key on this device.</li>' +
        '<li>After you accept a peer, remote addresses in their messages stay replaced with a held-link mark until you choose to inspect them. The client does not open the address for you.</li>' +
        '<li>Those decisions stay on the device. They are not uploaded into a moderation queue.</li>' +
        '</ul>' +
        '<p>Because the channel is end-to-end encrypted, the company cannot read a conversation in order to police it. You are the person who accepts a peer, and you are the person who must refuse one.</p>' +
        '<h2>Your transmissions</h2>' +
        '<p>You alone choose what you seal and who you peer with. You will not use Decoy9 to infringe another person’s rights, to impersonate Mampi Technologies Ltd, or to interfere with the client. The Terms of Service state that responsibility for an encrypted transmission sits with you.</p>' +
        '<h2>If this policy is broken</h2>' +
        '<p>The company may refuse support, end the licence, and, where a payment record exists, ask Stripe to close the related subscription. The company may also keep the limited account data the <button type="button" data-policy="privacy" class="legal-text">Privacy Policy</button> describes where the law requires it. Ending the licence does not require the company to have read your messages.</p>'
    },
    privacy: {
      title: "Privacy Policy",
      html:
        '<p class="legal-updated">Mampi Technologies Ltd · 30 September 2026</p>' +
        '<p>Mampi Technologies Ltd (company number 17484970), registered in England and Wales, is the data controller for mampitech.com, mystic9.net, Vortex9, Aura9, Decoy9, and Phreak9. The registered office is 9 Lodge Hill Road, Ossett, WF5 9RU, United Kingdom. Privacy requests go to <a href="mailto:support@mampitech.com">support@mampitech.com</a> or <a href="tel:+447435935395">+44 7435 935395</a>.</p>' +
        '<h2>What this notice covers</h2>' +
        '<p>This notice explains the small set of personal data the company actually handles. It follows the UK GDPR and the Data Protection Act 2018. The sites do not run advertising or analytics cookies. The <button type="button" data-policy="terms" class="legal-text">Terms of Service</button> are the licence for Vortex9, Aura9, Decoy9, and Phreak9. Conduct on Decoy9 is also covered by the <button type="button" data-policy="aup" class="legal-text">Acceptable Use Policy</button>.</p>' +
        '<h2>Data collection is kept small</h2>' +
        '<p>The company asks only for what a request or an account needs.</p>' +
        '<ul>' +
        '<li>Contact and support forms: the name, email address, and message you type, so the company can reply.</li>' +
        '<li>Sanctuary accounts on mystic9.net: the email address and sign-in details needed to keep your session and any membership or course access you buy.</li>' +
        '<li>Vortex9 activation: the account email, and a receipt reference only if you type one, so the app can confirm whether a subscription is active.</li>' +
        '<li>Aura9 interest: an email you choose to send. Aura9 is not yet available to install, and this page does not store an interest list.</li>' +
        '<li>Decoy9 Pro: Stripe takes the card payment. The company does not receive or store the card number. If you paste a licence key into Decoy9, that key is checked on the device and is not sent to a company server.</li>' +
        '<li>Phreak9 Pro: Stripe takes the card payment at £4.44 a month or £44.44 a year. The company does not receive or store the card number. Scans and packet decisions stay on the device.</li>' +
        '</ul>' +
        '<p>The company does not buy contact lists, and it does not sell personal data.</p>' +
        '<h2>Zero-telemetry and zero-harvesting commitment</h2>' +
        '<p>The architecture is absolute data minimisation: zero tracking cookies, zero third-party analytics pixels, and zero data harvesting. Vortex9, Aura9, Decoy9, and Phreak9 are built so the device stays with the person using it. Device state, scans, household rules, messages, and personal telemetry are not tracked, stored for a profile, or monetised.</p>' +
        '<h2>Decoy9</h2>' +
        '<p>Decoy9 sends no server-side telemetry. There is no analytics client, no usage phone-home, and no company server that stores the contents of a conversation. Identity is a local key. Message records stay in an encrypted vault on the device. The company cannot read that vault.</p>' +
        '<p>No phone number is required. The Windows setup is the published installer. Windows MSI, macOS, and Android are still in pre-deployment. Choosing Pro opens Stripe Checkout. Stripe processes the payment. The company does not store card details. Cancel at Stripe and the free core stays on the device.</p>' +
        '<h2>Phreak9</h2>' +
        '<p>Phreak9 keeps scans, packet decisions, and hardening advice on the device. It does not send a telemetry feed of your traffic to a company server. The Windows control on the product page is a GitHub placeholder until a release artifact is attached. macOS, Linux, and Android are in pre-deployment. Choosing Pro opens Stripe Checkout at £4.44 a month or £44.44 a year. Stripe processes the payment. The company does not store card details.</p>' +
        '<h2>Why the data is used</h2>' +
        '<ul>' +
        '<li>To answer a message you send, and to run an account or subscription you ask for.</li>' +
        '<li>To keep the sites and the apps secure.</li>' +
        '<li>To meet a legal duty, such as a tax or company-record obligation.</li>' +
        '</ul>' +
        '<h2>Your rights</h2>' +
        '<p>Under the UK GDPR you can ask to access the personal data the company holds about you, correct data that is wrong, and have data erased where the law allows erasure. Write to <a href="mailto:support@mampitech.com">support@mampitech.com</a>. You can also complain to the Information Commissioner’s Office at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk</a>.</p>' +
        '<h2>Cookies and on-device preferences</h2>' +
        '<p>mampitech.com uses zero tracking cookies, zero third-party analytics pixels, and zero data harvesting. Closing the cookie notice stores that single preference in local storage on your device. That preference is not a tracking cookie and it is not sent to an advertising network.</p>'
    }
  };

  var ORDER = ["terms", "aup", "privacy"];
  var activeModal = null;
  var modal = document.createElement("div");
  modal.className = "legal-modal";
  modal.id = "legal-modal";
  modal.hidden = true;
  modal.innerHTML =
    '<div class="legal-modal-card" role="dialog" aria-modal="true" aria-labelledby="legal-modal-title">' +
      '<div class="legal-modal-bar">' +
        '<p class="legal-modal-kicker" id="legal-modal-title">Legal</p>' +
        '<button type="button" class="legal-modal-close" style="cursor:pointer;background:#e4d0a0;color:#111111;text-decoration:none;border:none;border-radius:999px;min-height:40px;padding:0 18px;font:inherit;font-weight:700;">Close</button>' +
      '</div>' +
      '<div class="legal-tabs" role="tablist" aria-label="Legal documents">' +
        '<button type="button" role="tab" id="legal-tab-terms" data-policy="terms">Terms of Service</button>' +
        '<button type="button" role="tab" id="legal-tab-aup" data-policy="aup">Acceptable Use Policy</button>' +
        '<button type="button" role="tab" id="legal-tab-privacy" data-policy="privacy">Privacy Policy</button>' +
      '</div>' +
      '<div class="legal-modal-body" id="legal-modal-panel" role="tabpanel" tabindex="0"></div>' +
    '</div>';
  document.body.appendChild(modal);

  var panel = modal.querySelector("#legal-modal-panel");
  var title = modal.querySelector("#legal-modal-title");
  var tabs = Array.prototype.slice.call(modal.querySelectorAll("[role='tab']"));
  var lastFocus = null;

  function normalize(value) {
    var key = String(value || "").replace(/^#/, "").toLowerCase();
    if (key === "eula" || key === "tos") return "terms";
    return DOCS[key] ? key : "";
  }

  function keyFromHref(href) {
    if (!href || href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0) return "";
    if (href.charAt(0) === "#") return normalize(href);
    try {
      var url = new URL(href, window.location.href);
      if (url.hash) {
        var hashed = normalize(url.hash);
        if (hashed) return hashed;
      }
      var path = url.pathname.replace(/\/+$/, "") || "/";
      if (path === "/privacy" || path === "/privacy/index.html") return "privacy";
      if (path === "/eula" || path === "/terms" || path === "/eula/index.html") return "terms";
      if (path === "/aup" || path === "/aup/index.html") return "aup";
    } catch (err) {
      return "";
    }
    return "";
  }

  function show(key) {
    var doc = DOCS[key];
    title.textContent = doc.title;
    panel.innerHTML = doc.html;
    panel.scrollTop = 0;
    tabs.forEach(function (tab) {
      var on = tab.getAttribute("data-policy") === key;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
      tab.style.color = on ? "#e4d0a0" : "#e8eaed";
      tab.style.borderColor = on ? "#e4d0a0" : "rgba(228,208,160,.45)";
    });
    panel.setAttribute("aria-labelledby", "legal-tab-" + key);
  }

  function setActivePolicy(value, from) {
    var next = value == null || value === "" ? null : normalize(value);
    if (value != null && value !== "" && !next) return;
    activePolicy = next;
    activeModal = activePolicy;
    window.activePolicy = activePolicy;
    window.activeModal = activePolicy;
    if (!activeModal) {
      if (modal.hidden) return;
      modal.hidden = true;
      var gate = document.getElementById("gate");
      if (!gate || gate.hidden) document.body.style.overflow = "";
      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
      return;
    }
    if (from) lastFocus = from;
    show(activeModal);
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    var active = modal.querySelector("#legal-tab-" + activeModal);
    if (active) active.focus();
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function (event) {
      event.preventDefault();
      setActivePolicy(tab.getAttribute("data-policy"));
    });
    tab.addEventListener("keydown", function (event) {
      var index = ORDER.indexOf(tab.getAttribute("data-policy"));
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      var step = event.key === "ArrowRight" ? 1 : -1;
      var next = ORDER[(index + step + ORDER.length) % ORDER.length];
      setActivePolicy(next, tab);
    });
  });

  modal.querySelector(".legal-modal-close").addEventListener("click", function () {
    setActivePolicy(null);
  });
  modal.addEventListener("click", function (event) {
    if (event.target === modal) setActivePolicy(null);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape" || modal.hidden) return;
    event.preventDefault();
    event.stopPropagation();
    setActivePolicy(null);
  }, true);

  document.addEventListener("click", function (event) {
    var opener = event.target.closest("[data-policy]");
    if (!opener || opener.getAttribute("role") === "tab") return;
    var key = normalize(opener.getAttribute("data-policy"));
    if (!key) return;
    event.preventDefault();
    setActivePolicy(key, opener);
  });

  window.setActivePolicy = setActivePolicy;
  window.setActiveModal = setActivePolicy;
  window.openLegalModal = function (key) { setActivePolicy(key); };
  window.closeLegalModal = function () { setActivePolicy(null); };
  window.MampiLegal = { open: setActivePolicy, close: function () { setActivePolicy(null); } };
})();
