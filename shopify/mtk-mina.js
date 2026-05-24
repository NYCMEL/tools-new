(() => {
  "use strict";

  class MtkMina {
    constructor(root, config) {
      this.root = root;
      this.config = config || window.mtkMinaConfig || {};
      this.paintings = this.config.paintings || [];
      this.activeFilter = "all";
      this.activePainting = null;
      this.lastFocused = null;
      this.els = {};
      this.onMessage = this.onMessage.bind(this);
      this.init();
    }

    init() {
      this.cache();
      this.renderShell();
      this.renderFilters();
      this.renderGallery();
      this.bindEvents();
      this.subscribe();
      this.publish("mtk-mina-ready", { count: this.paintings.length });
    }

    cache() {
      this.els = {
        title: this.root.querySelector("[data-mina-title]"),
        subtitle: this.root.querySelector("[data-mina-subtitle]"),
        total: this.root.querySelector("[data-mina-count-total]"),
        available: this.root.querySelector("[data-mina-count-available]"),
        custom: this.root.querySelector("[data-mina-count-custom]"),
        filters: this.root.querySelector("[data-mina-filters]"),
        gallery: this.root.querySelector("[data-mina-gallery]"),
        detail: this.root.querySelector("[data-mina-detail]"),
        close: this.root.querySelector("[data-mina-close]"),
        detailImage: this.root.querySelector("[data-mina-detail-image]"),
        detailCaption: this.root.querySelector("[data-mina-detail-caption]"),
        detailStatus: this.root.querySelector("[data-mina-detail-status]"),
        detailTitle: this.root.querySelector("[data-mina-detail-title]"),
        detailDescription: this.root.querySelector("[data-mina-detail-description]"),
        detailPrice: this.root.querySelector("[data-mina-detail-price]"),
        detailMeta: this.root.querySelector("[data-mina-detail-meta]"),
        detailList: this.root.querySelector("[data-mina-detail-list]"),
        detailActions: this.root.querySelector("[data-mina-detail-actions]"),
        offerForm: this.root.querySelector("[data-mina-offer-form]"),
        similarForm: this.root.querySelector("[data-mina-similar-form]"),
        notice: this.root.querySelector("[data-mina-notice]"),
        offerAmount: this.root.querySelector("[data-mina-offer-amount]"),
        offerMessage: this.root.querySelector("[data-mina-offer-message]"),
        similarMessage: this.root.querySelector("[data-mina-similar-message]")
      };
    }

    renderShell() {
      const app = this.config.app || {};
      this.els.title.textContent = app.name || "Mina Hand Paintings";
      this.els.subtitle.textContent = app.subtitle || "";
      this.els.total.textContent = String(this.paintings.length);
      this.els.available.textContent = String(this.paintings.filter((item) => item.status === "available").length);
      this.els.custom.textContent = String(this.paintings.filter((item) => item.similarOrderEnabled).length);
    }

    renderFilters() {
      const filters = ((this.config.app || {}).filters || ["all", "available", "sold", "reserved", "unavailable"]);
      this.els.filters.innerHTML = filters.map((filter) => {
        const label = filter.charAt(0).toUpperCase() + filter.slice(1);
        return `<button class="mtk-mina__filter" type="button" data-filter="${filter}" aria-pressed="${filter === this.activeFilter}">${label}</button>`;
      }).join("");
    }

    renderGallery() {
      const items = this.paintings.filter((painting) => this.activeFilter === "all" || painting.status === this.activeFilter);
      this.els.gallery.innerHTML = items.map((painting) => `
        <button class="mtk-mina__card" type="button" data-painting-id="${painting.id}" aria-label="Open details for ${this.escape(painting.title)}">
          <span class="mtk-mina__card-media">
            <img class="mtk-mina__card-image" src="${this.escape(painting.image)}" alt="${this.escape(painting.title)}">
            <span class="mtk-mina__status-chip">${this.escape(painting.status)}</span>
          </span>
          <span class="mtk-mina__card-body">
            <span class="mtk-mina__card-title">${this.escape(painting.title)}</span>
            <span class="mtk-mina__card-meta">${this.escape(painting.medium)} · ${this.escape(painting.size)}</span>
            <span class="mtk-mina__card-price">${this.money(painting.price)}</span>
            <span class="mtk-mina__tap-hint">Open details <span aria-hidden="true">›</span></span>
          </span>
        </button>
      `).join("");
    }

    bindEvents() {
      this.els.filters.addEventListener("click", (event) => {
        const button = event.target.closest("[data-filter]");
        if (!button) return;
        this.activeFilter = button.dataset.filter;
        this.renderFilters();
        this.renderGallery();
        this.publish("mtk-mina-filter", { filter: this.activeFilter });
      });

      this.els.gallery.addEventListener("click", (event) => {
        const card = event.target.closest("[data-painting-id]");
        if (!card) return;
        const painting = this.paintings.find((item) => item.id === card.dataset.paintingId);
        if (painting) this.openDetail(painting, card);
      });

      this.els.close.addEventListener("click", () => this.closeDetail());

      this.els.detail.addEventListener("click", (event) => {
        if (event.target === this.els.detail) this.closeDetail();
        const action = event.target.closest("[data-action]");
        if (action && this.activePainting) this.handleAction(action.dataset.action, this.activePainting);
      });

      this.els.offerForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!this.activePainting) return;
        this.publish("mtk-mina-counter-offer", {
          paintingId: this.activePainting.id,
          amount: this.els.offerAmount.value,
          message: this.els.offerMessage.value
        });
        this.showNotice("Counter offer sent. Please wait for Mina’s reply.");
      });

      this.els.similarForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!this.activePainting) return;
        this.publish("mtk-mina-similar-order", {
          paintingId: this.activePainting.id,
          message: this.els.similarMessage.value
        });
        this.showNotice("Similar painting request sent.");
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && this.els.detail.classList.contains("is-open")) this.closeDetail();
      });
    }

    openDetail(painting, trigger) {
      this.activePainting = painting;
      this.lastFocused = trigger || document.activeElement;
      this.els.detailImage.src = painting.image;
      this.els.detailImage.alt = painting.title;
      this.els.detailCaption.textContent = `${painting.title} by ${painting.artist || "Mina"}`;
      this.els.detailStatus.textContent = painting.status;
      this.els.detailTitle.textContent = painting.title;
      this.els.detailDescription.textContent = painting.description;
      this.els.detailPrice.textContent = this.money(painting.price);
      this.els.detailMeta.innerHTML = [
        ["Medium", painting.medium],
        ["Size", painting.size],
        ["Year", painting.year],
        ["Collection", painting.collection]
      ].map(([label, value]) => `<div><dt>${this.escape(label)}</dt><dd>${this.escape(String(value))}</dd></div>`).join("");
      this.els.detailList.innerHTML = (painting.details || []).map((item) => `<li>${this.escape(item)}</li>`).join("");

      const available = painting.status === "available";
      this.els.detailActions.innerHTML = `
        ${available ? `<button class="mtk-mina__button" type="button" data-action="buy">Buy Now</button>` : ""}
        <button class="mtk-mina__button mtk-mina__button--secondary" type="button" data-action="offer">Make Counter Offer</button>
        ${!available || painting.similarOrderEnabled ? `<button class="mtk-mina__button mtk-mina__button--ghost" type="button" data-action="similar">Request Similar Painting</button>` : ""}
      `;

      this.els.offerForm.hidden = true;
      this.els.similarForm.hidden = true;
      this.els.notice.textContent = "";
      this.els.detail.classList.add("is-open");
      this.els.detail.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      this.els.close.focus();
      this.publish("mtk-mina-open-detail", { paintingId: painting.id });
    }

    closeDetail() {
      this.els.detail.classList.remove("is-open");
      this.els.detail.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      this.publish("mtk-mina-close-detail", { paintingId: this.activePainting ? this.activePainting.id : null });
      if (this.lastFocused && this.lastFocused.focus) this.lastFocused.focus();
      this.activePainting = null;
    }

    handleAction(action, painting) {
      if (action === "buy") {
        this.publish("mtk-mina-buy-now", { paintingId: painting.id });
        this.showNotice("Buy request started.");
      }

      if (action === "offer") {
        this.els.offerForm.hidden = false;
        this.els.offerAmount.focus();
        this.publish("mtk-mina-offer-open", { paintingId: painting.id });
      }

      if (action === "similar") {
        this.els.similarForm.hidden = false;
        this.els.similarMessage.focus();
        this.publish("mtk-mina-similar-open", { paintingId: painting.id });
      }
    }

    showNotice(message) {
      this.els.notice.textContent = message;
    }

    subscribe() {
      if (window.wc && typeof window.wc.subscribe === "function") {
        window.wc.subscribe("4-mtk-mina", this.onMessage);
      }
    }

    onMessage(message, data) {
      const payload = data || message || {};
      this.publish("mtk-mina-message-received", { message: payload });
      if (payload.filter) {
        this.activeFilter = payload.filter;
        this.renderFilters();
        this.renderGallery();
      }
    }

    publish(name, detail) {
      if (window.wc && typeof window.wc.log === "function") window.wc.log(name, detail);
      else console.log(name, detail);

      if (window.wc && typeof window.wc.publish === "function") window.wc.publish(name, detail);
      else this.root.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
    }

    money(value) {
      return new Intl.NumberFormat((this.config.app || {}).currencyLocale || "en-US", {
        style: "currency",
        currency: "USD"
      }).format(Number(value || 0));
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

    static boot() {
      const start = () => {
        const tryInit = () => {
          const element = document.querySelector("mtk-mina.mtk-mina");
          if (!element || element.dataset.mtkMinaReady === "true") return false;
          element.dataset.mtkMinaReady = "true";
          new MtkMina(element, window.mtkMinaConfig);
          return true;
        };

        if (tryInit()) return;

        const observer = new MutationObserver(() => {
          if (tryInit()) observer.disconnect();
        });

        observer.observe(document.documentElement, { childList: true, subtree: true });
      };

      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
      else start();
    }
  }

  window.MtkMina = MtkMina;
  MtkMina.boot();
})();
