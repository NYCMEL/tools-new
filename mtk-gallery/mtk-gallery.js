(function () {
  "use strict";

  const SELECTOR = "mtk-gallery.mtk-gallery";
  const EVENT_NAME = "4-mtk-gallery";

  class MTKGallery {
    constructor(element, config) {
      this.el = element;
      this.config = config;
      this.state = {
        paintings: this.loadPaintings(),
        selectedId: null,
        adminOpen: false,
        adminAuthed: this.getAdminSession(),
        editingId: null
      };
      this.onMessage = this.onMessage.bind(this);
      this.handleClick = this.handleClick.bind(this);
      this.handleSubmit = this.handleSubmit.bind(this);
      this.handleKeydown = this.handleKeydown.bind(this);
      wc.subscribe(EVENT_NAME, this.onMessage);
      this.el.addEventListener("click", this.handleClick);
      this.el.addEventListener("submit", this.handleSubmit);
      this.el.addEventListener("keydown", this.handleKeydown);
      this.render();
      this.publish("ready", { paintings: this.state.paintings.length });
    }

    loadPaintings() {
      const key = this.config.app.storageKey;
      try {
        const stored = localStorage.getItem(key);
        if (stored) { return JSON.parse(stored); }
      } catch (error) {
        wc.warn(error);
      }
      return JSON.parse(JSON.stringify(this.config.paintings || []));
    }

    savePaintings() {
      localStorage.setItem(this.config.app.storageKey, JSON.stringify(this.state.paintings));
    }

    getAdminSession() {
      return sessionStorage.getItem(this.config.app.adminSessionKey) === "true";
    }

    setAdminSession(value) {
      if (value) {
        sessionStorage.setItem(this.config.app.adminSessionKey, "true");
      } else {
        sessionStorage.removeItem(this.config.app.adminSessionKey);
      }
    }

    publish(type, payload) {
      const data = Object.assign({ app: "mtk-gallery", type: type, timestamp: new Date().toISOString() }, payload || {});
      wc.log(data);
      wc.publish("mtk-gallery", data);
    }

    onMessage(event) {
      const message = event.detail || {};
      if (!message || !message.action) { return; }
      if (message.action === "refresh") {
        this.state.paintings = this.loadPaintings();
        this.render();
      }
      if (message.action === "open" && message.id) {
        this.openDetail(message.id);
      }
    }

    money(value) {
      return new Intl.NumberFormat(this.config.app.locale, {
        style: "currency",
        currency: this.config.app.currency
      }).format(Number(value || 0));
    }

    escape(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    byId(id) {
      return this.state.paintings.find((painting) => painting.id === id);
    }

    render() {
      this.el.innerHTML = [
        '<section class="mtk-gallery__shell" aria-labelledby="mtk-gallery-title">',
          '<header class="mtk-gallery__header">',
            '<p class="mtk-gallery__eyebrow">Original hand-painted artwork</p>',
            '<h1 class="mtk-gallery__title" id="mtk-gallery-title">' + this.escape(this.config.app.title) + '</h1>',
            '<p class="mtk-gallery__subtitle">' + this.escape(this.config.app.subtitle) + '</p>',
          '</header>',
          '<div class="mtk-gallery__toolbar">',
            '<button class="mtk-gallery__admin-toggle" type="button" data-action="toggle-admin" aria-expanded="' + String(this.state.adminOpen) + '">Manage artwork</button>',
          '</div>',
          this.renderAdmin(),
          this.renderGrid(),
        '</section>',
        this.renderDetail()
      ].join("");
    }

    renderGrid() {
      if (!this.state.paintings.length) {
        return '<p class="mtk-gallery__empty">No paintings are currently listed.</p>';
      }
      return '<section class="mtk-gallery__grid" aria-label="Paintings">' + this.state.paintings.map((painting) => {
        const available = painting.availability === "available" ? "Available" : "Unavailable";
        return [
          '<article class="mtk-gallery__card" tabindex="0" role="button" aria-label="Open ' + this.escape(painting.title) + ' details" data-action="open-detail" data-id="' + this.escape(painting.id) + '">',
            '<div class="mtk-gallery__card-media"><img src="' + this.escape(painting.image) + '" alt="' + this.escape(painting.title) + '"></div>',
            '<div class="mtk-gallery__card-body">',
              '<h2 class="mtk-gallery__card-title">' + this.escape(painting.title) + '</h2>',
              '<p class="mtk-gallery__meta"><span>' + this.money(painting.price) + '</span><span aria-hidden="true">•</span><span>' + this.escape(painting.category) + '</span></p>',
              '<span class="mtk-gallery__chip">' + available + '</span>',
            '</div>',
          '</article>'
        ].join("");
      }).join("") + '</section>';
    }

    renderDetail() {
      const painting = this.byId(this.state.selectedId);
      if (!painting) {
        return '<section class="mtk-gallery__detail" hidden></section>';
      }
      const available = painting.availability === "available";
      return [
        '<section class="mtk-gallery__detail" role="dialog" aria-modal="true" aria-labelledby="mtk-gallery-detail-title">',
          '<div class="mtk-gallery__detail-shell">',
            '<div class="mtk-gallery__detail-media"><img src="' + this.escape(painting.image) + '" alt="' + this.escape(painting.title) + '"></div>',
            '<div class="mtk-gallery__detail-copy">',
              '<button class="mtk-gallery__close" type="button" data-action="close-detail" aria-label="Close detail view">X</button>',
              '<span class="mtk-gallery__chip">' + (available ? "Available" : "Unavailable") + '</span>',
              '<h2 class="mtk-gallery__detail-title" id="mtk-gallery-detail-title">' + this.escape(painting.title) + '</h2>',
              '<p class="mtk-gallery__description">' + this.escape(painting.description) + '</p>',
              '<dl class="mtk-gallery__facts">',
                this.fact("Price", this.money(painting.price)),
                this.fact("Availability", available ? "Available" : "Unavailable"),
                this.fact("Dimensions", painting.dimensions),
                this.fact("Medium", painting.medium),
                this.fact("Category", painting.category),
              '</dl>',
              '<div class="mtk-gallery__actions">',
                available ? this.renderAvailableActions(painting) : this.renderUnavailableActions(painting),
              '</div>',
            '</div>',
          '</div>',
        '</section>'
      ].join("");
    }

    fact(label, value) {
      return '<div class="mtk-gallery__fact"><dt>' + this.escape(label) + '</dt><dd>' + this.escape(value) + '</dd></div>';
    }

    renderAvailableActions(painting) {
      return [
        '<form class="mtk-gallery__paypal-form" action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_blank">',
          '<input type="hidden" name="cmd" value="_xclick">',
          '<input type="hidden" name="business" value="' + this.escape(this.config.app.paypalSellerEmail) + '">',
          '<input type="hidden" name="item_name" value="' + this.escape((painting.paypal && painting.paypal.itemName) || painting.title) + '">',
          '<input type="hidden" name="item_number" value="' + this.escape((painting.paypal && painting.paypal.sku) || painting.id) + '">',
          '<input type="hidden" name="amount" value="' + this.escape(painting.price) + '">',
          '<input type="hidden" name="currency_code" value="' + this.escape(this.config.app.currency) + '">',
          '<button class="mtk-gallery__button mtk-gallery__button--full" type="submit" data-action="buy-paypal" data-id="' + this.escape(painting.id) + '">Buy with PayPal</button>',
        '</form>',
        '<button class="mtk-gallery__link-button" type="button" data-action="toggle-offer">Make a counter offer</button>',
        '<div class="mtk-gallery__panel" data-panel="offer" hidden>',
          '<h3>Make a counter offer</h3>',
          this.renderOfferForm(painting),
        '</div>'
      ].join("");
    }

    renderUnavailableActions(painting) {
      return [
        '<button class="mtk-gallery__link-button" type="button" data-action="toggle-request">Request a similar painting</button>',
        '<div class="mtk-gallery__panel" data-panel="request" hidden>',
          '<h3>Request a similar painting</h3>',
          this.renderRequestForm(painting),
        '</div>'
      ].join("");
    }

    field(name, label, type, value, required) {
      const tag = type === "textarea" ? "textarea" : "input";
      const requiredText = required ? " required" : "";
      const safeValue = this.escape(value || "");
      if (tag === "textarea") {
        return '<div class="mtk-gallery__field"><textarea name="' + name + '" placeholder=" "' + requiredText + '>' + safeValue + '</textarea><label>' + label + '</label></div>';
      }
      return '<div class="mtk-gallery__field"><input name="' + name + '" type="' + type + '" value="' + safeValue + '" placeholder=" "' + requiredText + '><label>' + label + '</label></div>';
    }

    select(name, label, value) {
      return '<div class="mtk-gallery__field"><select name="' + name + '" required><option value="available"' + (value === "available" ? " selected" : "") + '>Available</option><option value="unavailable"' + (value === "unavailable" ? " selected" : "") + '>Unavailable</option></select><label>' + label + '</label></div>';
    }

    renderOfferForm(painting) {
      return [
        '<form class="mtk-gallery__form" data-form="offer" data-id="' + this.escape(painting.id) + '">',
          this.field("name", "Name", "text", "", true),
          this.field("email", "Email", "email", "", true),
          this.field("offer", "Offer amount", "number", "", true),
          this.field("message", "Message", "textarea", "", false),
          '<button class="mtk-gallery__button" type="submit">Submit offer</button>',
          '<p class="mtk-gallery__status" role="status"></p>',
        '</form>'
      ].join("");
    }

    renderRequestForm(painting) {
      return [
        '<form class="mtk-gallery__form" data-form="request" data-id="' + this.escape(painting.id) + '">',
          this.field("name", "Name", "text", "", true),
          this.field("email", "Email", "email", "", true),
          this.field("budget", "Budget", "number", "", false),
          this.field("message", "Request details", "textarea", "", true),
          '<button class="mtk-gallery__button" type="submit">Submit request</button>',
          '<p class="mtk-gallery__status" role="status"></p>',
        '</form>'
      ].join("");
    }

    renderAdmin() {
      if (!this.state.adminOpen) { return '<section class="mtk-gallery__admin" hidden></section>'; }
      if (!this.state.adminAuthed) {
        return [
          '<section class="mtk-gallery__admin">',
            '<div class="mtk-gallery__panel">',
              '<h2>Admin login</h2>',
              '<form class="mtk-gallery__form" data-form="login">',
                this.field("username", "Username", "text", "", true),
                this.field("password", "Password", "password", "", true),
                '<button class="mtk-gallery__button" type="submit">Login</button>',
                '<p class="mtk-gallery__status" role="status"></p>',
              '</form>',
            '</div>',
          '</section>'
        ].join("");
      }
      return [
        '<section class="mtk-gallery__admin">',
          '<div class="mtk-gallery__admin-grid">',
            '<div class="mtk-gallery__panel">',
              '<h2>Paintings</h2>',
              '<div class="mtk-gallery__admin-list">',
                this.state.paintings.map((painting) => [
                  '<div class="mtk-gallery__admin-row">',
                    '<span><strong>' + this.escape(painting.title) + '</strong><small>' + this.money(painting.price) + '</small></span>',
                    '<span>',
                      '<button class="mtk-gallery__icon-button" type="button" data-action="edit-painting" data-id="' + this.escape(painting.id) + '" aria-label="Edit ' + this.escape(painting.title) + '">✎</button> ',
                      '<button class="mtk-gallery__icon-button" type="button" data-action="remove-painting" data-id="' + this.escape(painting.id) + '" aria-label="Remove ' + this.escape(painting.title) + '">×</button>',
                    '</span>',
                  '</div>'
                ].join("")).join(""),
              '</div>',
              '<button class="mtk-gallery__button mtk-gallery__button--secondary" type="button" data-action="new-painting">Add painting</button>',
              '<button class="mtk-gallery__button mtk-gallery__button--danger" type="button" data-action="logout">Logout</button>',
            '</div>',
            '<div class="mtk-gallery__panel">',
              '<h2>' + (this.state.editingId ? "Edit painting" : "Add painting") + '</h2>',
              this.renderAdminForm(),
            '</div>',
          '</div>',
        '</section>'
      ].join("");
    }

    renderAdminForm() {
      const painting = this.byId(this.state.editingId) || { id: "", title: "", description: "", image: "", price: "", availability: "available", dimensions: "", medium: "", category: "", paypal: { itemName: "", sku: "", shipping: 0 } };
      return [
        '<form class="mtk-gallery__form" data-form="admin-painting">',
          this.field("title", "Title", "text", painting.title, true),
          this.field("description", "Description", "textarea", painting.description, true),
          this.field("image", "Image URL or data URI", "text", painting.image, true),
          this.field("price", "Price", "number", painting.price, true),
          this.select("availability", "Availability", painting.availability),
          this.field("dimensions", "Dimensions", "text", painting.dimensions, true),
          this.field("medium", "Medium", "text", painting.medium, true),
          this.field("category", "Category", "text", painting.category, true),
          this.field("sku", "PayPal SKU", "text", painting.paypal && painting.paypal.sku, false),
          '<button class="mtk-gallery__button" type="submit">Save painting</button>',
          '<p class="mtk-gallery__status" role="status"></p>',
        '</form>'
      ].join("");
    }

    handleClick(event) {
      const target = event.target.closest("[data-action]");
      if (!target || !this.el.contains(target)) { return; }
      const action = target.dataset.action;
      const id = target.dataset.id;
      if (action === "open-detail") { this.openDetail(id); }
      if (action === "close-detail") { this.closeDetail(); }
      if (action === "toggle-offer") { this.togglePanel("offer"); }
      if (action === "toggle-request") { this.togglePanel("request"); }
      if (action === "toggle-admin") { this.state.adminOpen = !this.state.adminOpen; this.render(); }
      if (action === "edit-painting") { this.state.editingId = id; this.render(); }
      if (action === "new-painting") { this.state.editingId = null; this.render(); }
      if (action === "remove-painting") { this.removePainting(id); }
      if (action === "logout") { this.state.adminAuthed = false; this.setAdminSession(false); this.render(); }
      if (action === "buy-paypal") { this.publish("paypal-click", { id: id }); }
    }

    handleKeydown(event) {
      if ((event.key === "Enter" || event.key === " ") && event.target.matches(".mtk-gallery__card")) {
        event.preventDefault();
        this.openDetail(event.target.dataset.id);
      }
      if (event.key === "Escape" && this.state.selectedId) {
        this.closeDetail();
      }
    }

    handleSubmit(event) {
      const form = event.target.closest("form[data-form]");
      if (!form || !this.el.contains(form)) { return; }
      event.preventDefault();
      const type = form.dataset.form;
      if (type === "login") { this.login(form); }
      if (type === "offer") { this.submitFlow(form, "offers", "Offer submitted."); }
      if (type === "request") { this.submitFlow(form, "requests", "Request submitted."); }
      if (type === "admin-painting") { this.savePainting(form); }
    }

    formObject(form) {
      const data = new FormData(form);
      const object = {};
      data.forEach((value, key) => { object[key] = value; });
      return object;
    }

    login(form) {
      const data = this.formObject(form);
      const status = form.querySelector(".mtk-gallery__status");
      if (data.username === this.config.admin.username && data.password === this.config.admin.password) {
        this.state.adminAuthed = true;
        this.setAdminSession(true);
        this.publish("admin-login", { endpoint: this.config.api.endpoints.paintings });
        this.render();
      } else {
        status.textContent = "Invalid login.";
      }
    }

    submitFlow(form, endpointKey, message) {
      const data = this.formObject(form);
      data.paintingId = form.dataset.id;
      data.createdAt = new Date().toISOString();
      const key = "mtk-gallery." + endpointKey + ".v1";
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      existing.push(data);
      localStorage.setItem(key, JSON.stringify(existing));
      form.querySelector(".mtk-gallery__status").textContent = message;
      form.reset();
      this.publish(endpointKey + "-create", { endpoint: this.config.api.endpoints[endpointKey], payload: data });
    }

    savePainting(form) {
      const data = this.formObject(form);
      const id = this.state.editingId || "mina-" + Date.now();
      const painting = {
        id: id,
        title: data.title,
        description: data.description,
        image: data.image,
        price: Number(data.price),
        availability: data.availability,
        dimensions: data.dimensions,
        medium: data.medium,
        category: data.category,
        paypal: {
          itemName: data.title,
          sku: data.sku || id,
          shipping: 0
        }
      };
      const index = this.state.paintings.findIndex((item) => item.id === id);
      if (index >= 0) {
        this.state.paintings[index] = painting;
      } else {
        this.state.paintings.push(painting);
      }
      this.savePaintings();
      this.state.editingId = id;
      this.publish("painting-save", { endpoint: this.config.api.endpoints.paintings, payload: painting });
      this.render();
    }

    removePainting(id) {
      this.state.paintings = this.state.paintings.filter((painting) => painting.id !== id);
      if (this.state.selectedId === id) { this.state.selectedId = null; }
      if (this.state.editingId === id) { this.state.editingId = null; }
      this.savePaintings();
      this.publish("painting-remove", { endpoint: this.config.api.endpoints.paintings, id: id });
      this.render();
    }

    openDetail(id) {
      this.state.selectedId = id;
      this.publish("detail-open", { id: id });
      this.render();
      const close = this.el.querySelector(".mtk-gallery__close");
      if (close) { close.focus(); }
    }

    closeDetail() {
      const id = this.state.selectedId;
      this.state.selectedId = null;
      this.publish("detail-close", { id: id });
      this.render();
    }

    togglePanel(name) {
      const panel = this.el.querySelector('[data-panel="' + name + '"]');
      if (!panel) { return; }
      panel.hidden = !panel.hidden;
      this.publish("panel-toggle", { panel: name, open: !panel.hidden, id: this.state.selectedId });
    }
  }

  function boot() {
    const config = window.mtkGalleryConfig;
    const element = document.querySelector(SELECTOR);
    if (!config || !element) { return false; }
    if (!element.__mtkGallery) {
      element.__mtkGallery = new MTKGallery(element, config);
    }
    return true;
  }

  function waitForElement() {
    if (boot()) { return; }
    const observer = new MutationObserver(() => {
      if (boot()) { observer.disconnect(); }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForElement);
  } else {
    waitForElement();
  }
}());
