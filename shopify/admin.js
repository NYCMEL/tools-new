(() => {
  "use strict";

  class MtkMinaAdmin {
    constructor(config) {
      this.config = config || window.mtkMinaConfig || {};
      this.admin = (this.config.app || {}).admin || {};
      this.sessionKey = this.admin.sessionKey || "mtk-mina-admin-session";
      this.paintingsKey = "mtk-mina-paintings";
      this.paintings = this.loadPaintings();
      this.cache();
      this.bind();
      this.renderState();
    }

    cache() {
      this.els = {
        loginPanel: document.querySelector("[data-admin-login-panel]"),
        dashboard: document.querySelector("[data-admin-dashboard]"),
        listPanel: document.querySelector("[data-admin-list-panel]"),
        loginForm: document.querySelector("[data-admin-login-form]"),
        username: document.querySelector("[data-admin-username]"),
        password: document.querySelector("[data-admin-password]"),
        notice: document.querySelector("[data-admin-login-notice]"),
        logout: document.querySelector("[data-admin-logout]"),
        form: document.querySelector("[data-admin-item-form]"),
        list: document.querySelector("[data-admin-items]"),
        title: document.querySelector("[data-item-title]"),
        image: document.querySelector("[data-item-image]"),
        price: document.querySelector("[data-item-price]"),
        status: document.querySelector("[data-item-status]"),
        medium: document.querySelector("[data-item-medium]"),
        size: document.querySelector("[data-item-size]"),
        description: document.querySelector("[data-item-description]")
      };
    }

    bind() {
      this.els.loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const goodUser = this.els.username.value === (this.admin.username || "admin");
        const goodPass = this.els.password.value === (this.admin.password || "test");

        if (!goodUser || !goodPass) {
          this.els.notice.textContent = "Invalid login.";
          return;
        }

        sessionStorage.setItem(this.sessionKey, "true");
        this.renderState();
      });

      this.els.logout.addEventListener("click", () => {
        sessionStorage.removeItem(this.sessionKey);
        this.renderState();
      });

      this.els.form.addEventListener("submit", (event) => {
        event.preventDefault();
        const item = {
          id: "mina-" + Date.now(),
          title: this.els.title.value.trim(),
          artist: "Madam Mina",
          image: this.els.image.value.trim(),
          price: Number(this.els.price.value),
          currency: "USD",
          status: this.els.status.value,
          medium: this.els.medium.value.trim(),
          size: this.els.size.value.trim(),
          year: new Date().getFullYear(),
          collection: "Admin Added",
          description: this.els.description.value.trim(),
          details: ["Admin added item", "PayPal checkout enabled"],
          similarOrderEnabled: this.els.status.value !== "available",
          tags: ["hand painting", "madam mina"]
        };

        this.paintings.push(item);
        this.savePaintings();
        this.els.form.reset();
        this.els.image.value = "images/painting-01.svg";
        this.els.medium.value = "Acrylic on canvas";
        this.els.size.value = "18 x 24 in";
        this.els.description.value = "Original hand painting by Madam Mina.";
        this.renderList();
      });

      this.els.list.addEventListener("click", (event) => {
        const button = event.target.closest("[data-remove-id]");
        if (!button) return;
        this.paintings = this.paintings.filter((item) => item.id !== button.dataset.removeId);
        this.savePaintings();
        this.renderList();
      });
    }

    renderState() {
      const loggedIn = sessionStorage.getItem(this.sessionKey) === "true";
      this.els.loginPanel.hidden = loggedIn;
      this.els.dashboard.hidden = !loggedIn;
      this.els.listPanel.hidden = !loggedIn;
      if (loggedIn) this.renderList();
    }

    renderList() {
      this.els.list.innerHTML = this.paintings.map((item) => `
        <article class="mtk-mina-admin__item">
          <img src="${this.escape(item.image)}" alt="">
          <div>
            <div class="mtk-mina-admin__item-title">${this.escape(item.title)}</div>
            <div class="mtk-mina-admin__item-meta">${this.money(item.price)} · ${this.escape(item.status)} · ${this.escape(item.medium || "")}</div>
          </div>
          <button class="mtk-mina-admin__button mtk-mina-admin__button--ghost" type="button" data-remove-id="${this.escape(item.id)}">Remove</button>
        </article>
      `).join("");
    }

    loadPaintings() {
      try {
        const stored = localStorage.getItem(this.paintingsKey);
        if (stored) return JSON.parse(stored);
      } catch (ignore) {}
      return this.config.paintings || [];
    }

    savePaintings() {
      localStorage.setItem(this.paintingsKey, JSON.stringify(this.paintings));
    }

    money(value) {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
    }

    escape(value) {
      return String(value || "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[char]));
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => new MtkMinaAdmin(window.mtkMinaConfig), { once: true });
  } else {
    new MtkMinaAdmin(window.mtkMinaConfig);
  }
})();
