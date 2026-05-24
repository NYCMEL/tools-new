/* mtk-mina.js — vanilla JS class, self-initializing.
 * Waits for <mtk-mina class="mtk-mina"> to appear in the DOM
 * (so <wc-include> can inject the HTML asynchronously).
 */
(function () {
  "use strict";

  // ---------- Minimal `wc` shim (publish/subscribe/log) ----------
  // If a host app already defines window.wc, we respect it.
  if (!window.wc) {
    const bus = new EventTarget();
    window.wc = {
      log:  (...args) => console.log("[wc]", ...args),
      publish: (name, detail) => {
        bus.dispatchEvent(new CustomEvent(name, { detail }));
      },
      subscribe: (name, handler) => {
        const fn = (e) => handler(e.detail, e);
        bus.addEventListener(name, fn);
        return () => bus.removeEventListener(name, fn);
      }
    };
  }

  // ---------- Minimal <wc-include> for local demos ----------
  // Allows index.html to use <wc-include href="..." /> without inline JavaScript.
  if (!customElements.get("wc-include")) {
    customElements.define("wc-include", class WcInclude extends HTMLElement {
      connectedCallback() {
        const href = this.getAttribute("href");
        if (!href || this.dataset.loaded === "true") return;
        this.dataset.loaded = "true";
        fetch(href)
          .then((res) => {
            if (!res.ok) throw new Error(`Could not include ${href}`);
            return res.text();
          })
          .then((html) => { this.innerHTML = html; })
          .catch((err) => window.wc.log("include error", err));
      }
    });
  }


  class MtkMina {
    constructor(root, config) {
      this.root = root;
      this.cfg = config;
      this.items = [];
      this.activeItem = null;
      this.lastFocus = null;

      this.els = {
        title:      root.querySelector('[data-mtk-mina="title"]'),
        subtitle:   root.querySelector('[data-mtk-mina="subtitle"]'),
        grid:       root.querySelector('[data-mtk-mina="grid"]'),
        overlay:    root.querySelector('[data-mtk-mina="overlay"]'),
        detail:     root.querySelector('[data-mtk-mina="detail"]'),
        detailBody: root.querySelector('[data-mtk-mina="detail-body"]'),
        closeBtn:   root.querySelector('[data-mtk-mina="close"]'),
        toast:      root.querySelector('[data-mtk-mina="toast"]')
      };

      this._bindStatic();
      this._subscribeAll();
      this._hydrateHeader();
      this._loadItems();
    }

    // ---------- Pub/Sub ----------
    _publish(name, payload) {
      window.wc.log("publish ->", name, payload);
      window.wc.publish(name, payload);
    }

    _subscribeAll() {
      const topics = this.cfg.events.subscribe || [];
      this._unsubs = topics.map((t) => window.wc.subscribe(t, (data, evt) => this.onMessage(t, data, evt)));
    }

    onMessage(topic, data /*, evt */) {
      window.wc.log("subscribe <-", topic, data);
      switch (topic) {
        case "mtk-mina:refresh":
          this._loadItems();
          break;
        case "mtk-mina:offer-reply":
          this._toast(`Reply on your offer: ${data && data.status ? data.status : "received"}`);
          break;
        case "mtk-mina:order-status":
          this._toast(`Order ${data && data.id ? "#" + data.id : ""}: ${data && data.status ? data.status : "updated"}`);
          break;
        case "mtk-mina:admin-update":
          this._loadItems();
          break;
        default:
          break;
      }
    }

    // ---------- Data ----------
    async _loadItems() {
      const fallbackItems = Array.isArray(this.cfg.items) ? this.cfg.items : [];

      if (!this.cfg.api || this.cfg.api.enabled === false) {
        this.items = fallbackItems;
        this._renderGrid();
        return;
      }

      try {
        const res = await fetch(`${this.cfg.api.baseUrl}/items`, { credentials: "same-origin" });
        if (!res.ok) throw new Error(`API returned ${res.status}`);

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("API did not return JSON");
        }

        const data = await res.json();
        this.items = Array.isArray(data) ? data : fallbackItems;
        this._renderGrid();
      } catch (err) {
        window.wc.log("load error", err);
        this.items = fallbackItems;
        this._renderGrid();
      }
    }

    // ---------- Rendering ----------
    _hydrateHeader() {
      if (this.els.title)    this.els.title.textContent = this.cfg.title;
      if (this.els.subtitle) this.els.subtitle.textContent = this.cfg.subtitle;
    }

    _money(n) {
      try { return new Intl.NumberFormat(undefined, { style: "currency", currency: this.cfg.currency }).format(n); }
      catch (e) { return `$${Number(n).toFixed(2)}`; }
    }

    _renderGrid() {
      const L = this.cfg.ui.labels;
      this.els.grid.innerHTML = "";
      if (!this.items.length) {
        this.els.grid.innerHTML = '<p>No paintings available right now.</p>';
        return;
      }
      const frag = document.createDocumentFragment();
      this.items.forEach((it) => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "mtk-mina__card";
        card.setAttribute("aria-label", `${it.title}. ${L.detail}.`);
        card.dataset.id = it.id;

        const badge = it.available ? "" :
          `<span class="mtk-mina__badge">${this.cfg.ui.showSoldBadge ? L.sold : L.unavailable}</span>`;

        card.innerHTML = `
          <div class="mtk-mina__media">
            ${badge}
            <img src="${it.image}" alt="${this._esc(it.title)}" loading="lazy" />
          </div>
          <div class="mtk-mina__card-body">
            <h3 class="mtk-mina__card-title">${this._esc(it.title)}</h3>
            <span class="mtk-mina__card-meta">${this._esc(it.medium || "Hand painting")}${it.size ? " · " + this._esc(it.size) : ""}</span>
            <span class="mtk-mina__price">${this._money(it.price)}</span>
          </div>
        `;
        card.addEventListener("click", () => this._openDetail(it));
        card.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this._openDetail(it); }
        });
        frag.appendChild(card);
      });
      this.els.grid.appendChild(frag);
    }

    // ---------- Detail view ----------
    _openDetail(item) {
      this.activeItem = item;
      this.lastFocus = document.activeElement;
      const L = this.cfg.ui.labels;

      const buyBtn = item.available
        ? `<button class="mtk-mina__btn mtk-mina__btn--primary" data-action="buy">
             <span class="material-icons" aria-hidden="true">shopping_bag</span>${L.buy}
           </button>
           <button class="mtk-mina__btn mtk-mina__btn--secondary" data-action="counter">
             <span class="material-icons" aria-hidden="true">price_change</span>${L.counter}
           </button>`
        : `<button class="mtk-mina__btn mtk-mina__btn--primary" data-action="similar">
             <span class="material-icons" aria-hidden="true">brush</span>${L.similar}
           </button>`;

      this.els.detailBody.innerHTML = `
        <div class="mtk-mina__detail-media">
          <img src="${item.image}" alt="${this._esc(item.title)}" />
        </div>
        <div class="mtk-mina__detail-info">
          <h2 id="mtk-mina-detail-title">${this._esc(item.title)}</h2>
          <div class="mtk-mina__detail-price">${this._money(item.price)}</div>
          <p>${this._esc(item.description || "Original hand-painted artwork.")}</p>
          <dl class="mtk-mina__specs">
            ${item.medium ? `<div><dt>Medium</dt><dd>${this._esc(item.medium)}</dd></div>` : ""}
            ${item.size   ? `<div><dt>Size</dt><dd>${this._esc(item.size)}</dd></div>` : ""}
            ${item.year   ? `<div><dt>Year</dt><dd>${this._esc(item.year)}</dd></div>` : ""}
          </dl>
          <div class="mtk-mina__actions">${buyBtn}</div>
          <form class="mtk-mina__form" data-form="counter" hidden>
            <div class="mtk-mina__field">
              <label for="mtk-mina-email">${L.yourEmail}</label>
              <input id="mtk-mina-email" name="email" type="email" required />
            </div>
            <div class="mtk-mina__field">
              <label for="mtk-mina-offer">${L.yourOffer}</label>
              <input id="mtk-mina-offer" name="offer" type="number" min="1" step="0.01" required />
            </div>
            <div class="mtk-mina__field">
              <label for="mtk-mina-msg">${L.message}</label>
              <textarea id="mtk-mina-msg" name="message"></textarea>
            </div>
            <button type="submit" class="mtk-mina__btn mtk-mina__btn--primary">${L.submit}</button>
          </form>
          <form class="mtk-mina__form" data-form="similar" hidden>
            <div class="mtk-mina__field">
              <label for="mtk-mina-email2">${L.yourEmail}</label>
              <input id="mtk-mina-email2" name="email" type="email" required />
            </div>
            <div class="mtk-mina__field">
              <label for="mtk-mina-msg2">${L.message}</label>
              <textarea id="mtk-mina-msg2" name="message" placeholder="Describe size, palette, mood…"></textarea>
            </div>
            <button type="submit" class="mtk-mina__btn mtk-mina__btn--primary">${L.submit}</button>
          </form>
        </div>
      `;
      this.els.overlay.hidden = false;
      this.els.detail.focus();
      document.addEventListener("keydown", this._escClose);
      this._bindDetailActions();
    }

    _closeDetail = () => {
      if (this.els.overlay.hidden) return;
      this.els.overlay.hidden = true;
      this.els.detailBody.innerHTML = "";
      document.removeEventListener("keydown", this._escClose);
      this._publish(this.cfg.events.publish.close, { id: this.activeItem && this.activeItem.id });
      this.activeItem = null;
      if (this.lastFocus && this.lastFocus.focus) this.lastFocus.focus();
    };

    _escClose = (e) => { if (e.key === "Escape") this._closeDetail(); };

    _bindStatic() {
      this.els.closeBtn.addEventListener("click", this._closeDetail);
      this.els.overlay.addEventListener("click", (e) => {
        if (e.target === this.els.overlay) this._closeDetail();
      });
    }

    _bindDetailActions() {
      const body = this.els.detailBody;
      const counterForm = body.querySelector('[data-form="counter"]');
      const similarForm = body.querySelector('[data-form="similar"]');

      body.querySelectorAll("[data-action]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const action = btn.dataset.action;
          if (action === "buy") {
            this._publish(this.cfg.events.publish.buy, { item: this.activeItem });
            this._startPaypal(this.activeItem);
          } else if (action === "counter") {
            counterForm.hidden = false;
            counterForm.querySelector("input").focus();
          } else if (action === "similar") {
            similarForm.hidden = false;
            similarForm.querySelector("input").focus();
          }
        });
      });

      if (counterForm) {
        counterForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          const fd = new FormData(counterForm);
          const payload = {
            itemId: this.activeItem.id,
            email: fd.get("email"),
            offer: Number(fd.get("offer")),
            message: fd.get("message") || ""
          };
          this._publish(this.cfg.events.publish.counter, payload);
          try {
            await this._postJson("/offers", payload);
            this._toast("Offer sent. We'll reply by email.");
            counterForm.reset();
            counterForm.hidden = true;
          } catch (err) { this._toast("Could not send offer."); }
        });
      }

      if (similarForm) {
        similarForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          const fd = new FormData(similarForm);
          const payload = {
            itemId: this.activeItem.id,
            email: fd.get("email"),
            message: fd.get("message") || ""
          };
          this._publish(this.cfg.events.publish.similar, payload);
          try {
            await this._postJson("/similar-requests", payload);
            this._toast("Request sent. We'll be in touch.");
            similarForm.reset();
            similarForm.hidden = true;
          } catch (err) { this._toast("Could not send request."); }
        });
      }
    }


    async _postJson(path, payload) {
      if (!this.cfg.api || this.cfg.api.enabled === false) {
        const key = `mtk-mina:${path.replace(/^\//, "")}`;
        const current = JSON.parse(localStorage.getItem(key) || "[]");
        const record = { ...payload, id: Date.now(), createdAt: new Date().toISOString() };
        current.push(record);
        localStorage.setItem(key, JSON.stringify(current));
        return record;
      }

      const res = await fetch(`${this.cfg.api.baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      return res.json();
    }

    // ---------- PayPal ----------
    _startPaypal(item) {
      const ensureSdk = () => new Promise((resolve, reject) => {
        if (window.paypal) return resolve(window.paypal);
        const s = document.createElement("script");
        s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(this.cfg.paypal.clientId)}&currency=${encodeURIComponent(this.cfg.currency)}`;
        s.onload = () => resolve(window.paypal);
        s.onerror = reject;
        document.head.appendChild(s);
      });

      ensureSdk().then((paypal) => {
        const container = document.createElement("div");
        container.className = "mtk-mina__paypal";
        const actions = this.els.detailBody.querySelector(".mtk-mina__actions");
        actions.innerHTML = "";
        actions.appendChild(container);
        paypal.Buttons({
          createOrder: (data, actions2) => actions2.order.create({
            purchase_units: [{ description: item.title, amount: { value: Number(item.price).toFixed(2) } }]
          }),
          onApprove: async (data, actions2) => {
            const order = await actions2.order.capture();
            this._publish("mtk-mina:order-status", { id: order.id, status: "paid", itemId: item.id });
            try {
              await this._postJson("/orders", { itemId: item.id, orderId: order.id, amount: item.price });
            } catch (e) {}
            this._toast("Thank you! Payment received.");
            this._closeDetail();
          },
          onError: () => this._toast("Payment failed. Please try again.")
        }).render(container);
      }).catch(() => this._toast("Could not load PayPal."));
    }

    // ---------- Utils ----------
    _toast(msg) {
      const t = this.els.toast;
      t.textContent = msg;
      t.hidden = false;
      clearTimeout(this._toastT);
      this._toastT = setTimeout(() => { t.hidden = true; }, 3200);
    }

    _esc(s) {
      return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[c]));
    }
  }

  // ---------- Init: wait for the element ----------
  function init() {
    const cfg = window.mtkMinaConfig;
    if (!cfg) { console.warn("[mtk-mina] mtkMinaConfig missing"); return; }

    const tryMount = () => {
      const nodes = document.querySelectorAll("mtk-mina.mtk-mina:not([data-mtk-mina-ready])");
      nodes.forEach((n) => {
        // require the inner markup to also be present (data-mtk-mina="grid")
        if (!n.querySelector('[data-mtk-mina="grid"]')) return;
        n.setAttribute("data-mtk-mina-ready", "true");
        new MtkMina(n, cfg);
      });
    };

    tryMount();
    const mo = new MutationObserver(tryMount);
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // expose for testing
  window.MtkMina = MtkMina;
})();
