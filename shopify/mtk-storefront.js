class MtkStorefront {
  constructor(root, config) {
    this.root = root;
    this.config = config;
    this.paintings = [...(config.paintings || [])];
    this.store = config.store || {};
    this.activePainting = null;
    this.isAdmin = false;
    this.onMessage = this.onMessage.bind(this);
    this.init();
  }

  init() {
    this.cache();
    this.bind();
    this.render();
    if (window.wc && typeof window.wc.subscribe === "function") {
      window.wc.subscribe("4-mtk-storefront", this.onMessage);
    }
  }

  cache() {
    this.titleEl = this.root.querySelector(".mtk-storefront__title");
    this.taglineEl = this.root.querySelector(".mtk-storefront__tagline");
    this.gridEl = this.root.querySelector(".mtk-storefront__grid");
    this.detailEl = this.root.querySelector(".mtk-storefront__detail");
    this.detailMediaEl = this.root.querySelector(".mtk-storefront__detail-media");
    this.detailContentEl = this.root.querySelector(".mtk-storefront__detail-content");
    this.closeBtn = this.root.querySelector(".mtk-storefront__close");
    this.adminOpen = this.root.querySelector(".mtk-storefront__admin-open");
    this.adminLogin = this.root.querySelector(".mtk-storefront__admin-login");
    this.loginForm = this.root.querySelector(".mtk-storefront__login-form");
    this.loginMessage = this.root.querySelector(".mtk-storefront__login-message");
    this.adminPanel = this.root.querySelector(".mtk-storefront__admin-panel");
    this.adminForm = this.root.querySelector(".mtk-storefront__admin-form");
    this.adminList = this.root.querySelector(".mtk-storefront__admin-list");
    this.adminReset = this.root.querySelector(".mtk-storefront__admin-reset");
  }

  bind() {
    this.gridEl.addEventListener("click", (event) => {
      const card = event.target.closest("[data-painting-id]");
      if (!card) return;
      this.openDetail(Number(card.dataset.paintingId));
    });

    this.gridEl.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const card = event.target.closest("[data-painting-id]");
      if (!card) return;
      event.preventDefault();
      this.openDetail(Number(card.dataset.paintingId));
    });

    this.closeBtn.addEventListener("click", () => this.closeDetail());

    this.detailEl.addEventListener("click", (event) => {
      if (event.target === this.detailEl) this.closeDetail();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.detailEl.getAttribute("aria-hidden") === "false") {
        this.closeDetail();
      }
    });

    this.detailEl.addEventListener("submit", (event) => this.handleDetailSubmit(event));

    this.detailEl.addEventListener("click", (event) => {
      const offerLink = event.target.closest(".mtk-storefront__offer-link");
      if (!offerLink) return;

      const wrapper = offerLink.closest(".mtk-storefront__offer-wrapper");
      const form = wrapper ? wrapper.querySelector(".mtk-storefront__offer-form") : null;

      if (!form) return;

      form.hidden = false;
      offerLink.hidden = true;

      const firstInput = form.querySelector("input");
      if (firstInput) firstInput.focus();

      this.publish("offer-form-open", {
        paintingId: this.activePainting ? this.activePainting.id : null
      });
    });
    this.adminOpen.addEventListener("click", () => this.openAdminLogin());
    this.loginForm.addEventListener("submit", (event) => this.handleLogin(event));
    this.adminForm.addEventListener("submit", (event) => this.handleAdminSave(event));
    this.adminReset.addEventListener("click", () => this.adminForm.reset());

    this.adminList.addEventListener("click", (event) => {
      const edit = event.target.closest("[data-admin-edit]");
      const remove = event.target.closest("[data-admin-remove]");
      if (edit) this.populateAdminForm(Number(edit.dataset.adminEdit));
      if (remove) this.removePainting(Number(remove.dataset.adminRemove));
    });
  }

  publish(type, detail) {
    const payload = { type, detail, source: "mtk-storefront" };
    if (window.wc && typeof window.wc.log === "function") {
      window.wc.log("mtk-storefront publish", payload);
    } else {
      console.log("mtk-storefront publish", payload);
    }
    if (window.wc && typeof window.wc.publish === "function") {
      window.wc.publish("mtk-storefront", payload);
    } else {
      this.root.dispatchEvent(new CustomEvent("mtk-storefront", { bubbles: true, detail: payload }));
    }
  }

  onMessage(message) {
    if (!message) return;
    if (message.type === "refresh") this.loadFromApi();
    if (message.type === "close-detail") this.closeDetail();
  }

  render() {
    this.titleEl.textContent = this.store.name || "MTK Storefront";
    this.taglineEl.textContent = this.store.tagline || "";
    this.gridEl.innerHTML = this.paintings.map((painting) => this.cardTemplate(painting)).join("");
    this.renderAdminList();
  }

  cardTemplate(painting) {
    const statusClass = painting.availability === "available" ? "available" : "unavailable";
    return `
      <article class="mtk-storefront__card" data-painting-id="${painting.id}" tabindex="0" aria-label="Open details for ${this.escape(painting.title)}">
        <img class="mtk-storefront__image" src="${this.escape(painting.image)}" alt="${this.escape(painting.title)}">
        <div class="mtk-storefront__card-body">
          <h2 class="mtk-storefront__card-title">${this.escape(painting.title)}</h2>
          <p class="mtk-storefront__meta">
            <span>$${Number(painting.price).toLocaleString()}</span>
            <span class="mtk-storefront__badge mtk-storefront__badge--${statusClass}">${this.escape(painting.availability)}</span>
          </p>
        </div>
      </article>
    `;
  }

  openDetail(id) {
    const painting = this.paintings.find((item) => Number(item.id) === id);
    if (!painting) return;
    this.activePainting = painting;
    this.detailMediaEl.innerHTML = `<img src="${this.escape(painting.image)}" alt="${this.escape(painting.title)}">`;
    this.detailContentEl.innerHTML = this.detailTemplate(painting);
    this.detailEl.setAttribute("aria-hidden", "false");
    this.detailEl.focus();
    this.publish("detail-open", { id });
  }

  closeDetail() {
    this.detailEl.setAttribute("aria-hidden", "true");
    this.publish("detail-close", { id: this.activePainting ? this.activePainting.id : null });
    this.activePainting = null;
  }

  detailTemplate(painting) {
    const isAvailable = painting.availability === "available";
    const paypalUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(this.store.paypalBusinessEmail || "")}&item_name=${encodeURIComponent(painting.paypalItemName || painting.title)}&amount=${encodeURIComponent(painting.price)}&currency_code=${encodeURIComponent(this.store.paypalCurrency || "USD")}`;
    return `
      <h2 id="mtk-storefront-detail-title" class="mtk-storefront__detail-title">${this.escape(painting.title)}</h2>
      <p class="mtk-storefront__detail-description">${this.escape(painting.description)}</p>
      <p><strong>Medium:</strong> ${this.escape(painting.medium || "")}</p>
      <p><strong>Dimensions:</strong> ${this.escape(painting.dimensions || "")}</p>
      <p><strong>Price:</strong> $${Number(painting.price).toLocaleString()} ${this.escape(painting.currency || "USD")}</p>
      <p><span class="mtk-storefront__badge mtk-storefront__badge--${isAvailable ? "available" : "unavailable"}">${isAvailable ? this.escape(this.store.messages?.available || "Available") : this.escape(this.store.messages?.unavailable || "Unavailable")}</span></p>
      <div class="mtk-storefront__actions">
        ${isAvailable ? `<a href="${paypalUrl}" target="_blank" rel="noopener">Buy with PayPal</a>` : ""}
      </div>
      <div class="mtk-storefront__offer-wrapper">
        <button type="button" class="mtk-storefront__offer-link">
          ${isAvailable 
            ? this.escape(this.store.messages?.offer || "Make a counter offer")
            : this.escape(this.store.messages?.orderSimilar || "Request a similar painting")}
        </button>

        <form class="mtk-storefront__offer-form" data-form-type="${isAvailable ? "offer" : "request"}" hidden>
          <h3>${isAvailable ? "Make a counter offer" : "Request a similar painting"}</h3>

          <label class="mtk-storefront__field">
            <input name="name" placeholder=" " required>
            <span>Your Name</span>
          </label>

          <label class="mtk-storefront__field">
            <input type="email" name="email" placeholder=" " required>
            <span>Email</span>
          </label>

          ${isAvailable ? `
          <label class="mtk-storefront__field">
            <input type="number" min="1" name="amount" placeholder=" " required>
            <span>Offer Amount</span>
          </label>
          ` : ""}

          <label class="mtk-storefront__field mtk-storefront__field--textarea">
            <textarea name="message" rows="3" placeholder=" " required></textarea>
            <span>${isAvailable ? "Message" : "Describe the painting you want"}</span>
          </label>

          <button type="submit">
            ${isAvailable ? "Send Offer" : "Send Request"}
          </button>
        </form>
      </div>
      <p class="mtk-storefront__detail-status" role="status"></p>
    `;
  }

  async handleDetailSubmit(event) {
    const form = event.target.closest("form");
    if (!form || !this.activePainting) return;
    event.preventDefault();

    const formData = Object.fromEntries(new FormData(form).entries());
    const type = form.dataset.formType;
    const body = { ...formData, paintingId: this.activePainting.id, type };
    const status = this.detailContentEl.querySelector(".mtk-storefront__detail-status");

    try {
      const endpoint = type === "request" ? "/requests" : "/offers";
      await this.api(endpoint, "POST", body);

      status.textContent = type === "request"
        ? "Request sent. Please wait for a reply."
        : "Offer sent. Please wait for a reply.";

      form.reset();

      this.publish(
        type === "request" ? "request-submit" : "offer-submit",
        body
      );
    } catch (error) {
      status.textContent = "Saved locally for demo. Connect the Node server to persist this submission.";
      this.publish("submit-fallback", body);
    }
  }

  openAdminLogin() {
    this.adminLogin.hidden = false;
    this.adminOpen.hidden = true;
    const username = this.loginForm.querySelector("[name='username']");
    if (username) username.focus();
    this.publish("admin-login-open", {});
  }

  handleLogin(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(this.loginForm).entries());
    if (data.username === "admin" && data.password === "test") {
      this.isAdmin = true;
      this.adminLogin.hidden = true;
      this.adminPanel.hidden = false;
      this.loginMessage.textContent = "Logged in.";
      this.publish("admin-login", { username: data.username });
      return;
    }
    this.loginMessage.textContent = "Invalid login.";
  }

  async handleAdminSave(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(this.adminForm).entries());
    const item = {
      id: data.id ? Number(data.id) : Date.now(),
      sku: data.id ? `MTK-PNT-${String(data.id).padStart(4, "0")}` : `MTK-PNT-${Date.now()}`,
      title: data.title,
      price: Number(data.price),
      availability: data.availability,
      image: data.image,
      description: data.description,
      medium: "Acrylic on canvas",
      dimensions: "Custom",
      currency: "USD",
      category: "Original",
      paypalItemName: data.title,
      tags: ["hand painting"]
    };

    const index = this.paintings.findIndex((painting) => Number(painting.id) === Number(item.id));
    if (index >= 0) this.paintings[index] = { ...this.paintings[index], ...item };
    else this.paintings.push(item);

    await this.api("/paintings", "POST", item).catch(() => null);
    this.adminForm.reset();
    this.render();
    this.publish("admin-save", { id: item.id });
  }

  populateAdminForm(id) {
    const painting = this.paintings.find((item) => Number(item.id) === id);
    if (!painting) return;
    Object.entries(painting).forEach(([key, value]) => {
      if (this.adminForm.elements[key]) this.adminForm.elements[key].value = value;
    });
  }

  async removePainting(id) {
    this.paintings = this.paintings.filter((item) => Number(item.id) !== id);
    await this.api(`/paintings/${id}`, "DELETE").catch(() => null);
    this.render();
    this.publish("admin-remove", { id });
  }

  renderAdminList() {
    if (!this.adminList) return;
    this.adminList.innerHTML = this.paintings.map((painting) => `
      <div class="mtk-storefront__admin-item">
        <span>${this.escape(painting.title)} • $${Number(painting.price).toLocaleString()} • ${this.escape(painting.availability)}</span>
        <button type="button" data-admin-edit="${painting.id}">Edit</button>
        <button type="button" data-admin-remove="${painting.id}">Remove</button>
      </div>
    `).join("");
  }

  async loadFromApi() {
    const data = await this.api("/paintings", "GET").catch(() => null);
    if (Array.isArray(data)) {
      this.paintings = data;
      this.render();
    }
  }

  async api(path, method = "GET", body) {
    const response = await fetch(`${this.store.apiBaseUrl || "/api"}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!response.ok) throw new Error("Request failed");
    return response.json();
  }

  escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }
}

(function bootMtkStorefront() {
  function ready() {
    const root = document.querySelector("mtk-storefront.mtk-storefront");
    const config = window.mtkStorefrontConfig;
    if (!root || !config) {
      window.requestAnimationFrame(ready);
      return;
    }
    if (root.dataset.mtkStorefrontReady === "true") return;
    root.dataset.mtkStorefrontReady = "true";
    new MtkStorefront(root, config);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ready);
  } else {
    ready();
  }
})();
