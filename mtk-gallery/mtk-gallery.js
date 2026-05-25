(function () {
  'use strict';

  class MTKGallery {
    constructor(root, config) {
      this.root = root;
      this.config = config || {};
      this.storageKey = 'mtk-gallery-paintings';
      this.paintings = this.loadPaintings();
      this.activePainting = null;
      this.isAdmin = false;
      this.onMessage = this.onMessage.bind(this);
      this.subscribe();
      this.renderHome();
      this.publish('ready', { count: this.paintings.length });
    }

    loadPaintings() {
      try {
        const saved = window.localStorage.getItem(this.storageKey);
        if (saved) return JSON.parse(saved);
      } catch (error) {
        wc.error('Unable to read gallery storage', error);
      }
      return Array.isArray(this.config.paintings) ? JSON.parse(JSON.stringify(this.config.paintings)) : [];
    }

    savePaintings() {
      window.localStorage.setItem(this.storageKey, JSON.stringify(this.paintings));
      this.publish('paintings.saved', { count: this.paintings.length, endpoint: this.config.api && this.config.api.endpoints && this.config.api.endpoints.paintings });
    }

    subscribe() {
      if (window.wc && typeof wc.subscribe === 'function') wc.subscribe('4-mtk-gallery', this.onMessage);
    }

    onMessage(message, payload) {
      wc.log('mtk-gallery onMessage', message, payload);
      if (!payload || !payload.action) return;
      if (payload.action === 'open' && payload.id) this.openDetail(payload.id);
      if (payload.action === 'close') this.closeDetail();
      if (payload.action === 'render') this.renderHome();
    }

    publish(action, payload) {
      const data = Object.assign({ component: 'mtk-gallery', action: action, date: new Date().toISOString() }, payload || {});
      wc.log('mtk-gallery publish', data);
      wc.publish('mtk-gallery.' + action, data);
    }

    money(value, currency) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(Number(value || 0));
    }

    escape(value) {
      return String(value == null ? '' : value).replace(/[&<>'"]/g, function (char) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char];
      });
    }

    renderHome() {
      const title = this.config.store && this.config.store.title ? this.config.store.title : "Madam Mina's Artwork";
      this.root.innerHTML = `
        <div class="mtk-gallery__shell">
          <header class="mtk-gallery__topbar">
            <h1 class="mtk-gallery__title">${this.escape(title)}</h1>
            <button class="mtk-gallery__admin-link" type="button" data-action="admin-toggle">Manage artwork</button>
          </header>
          <main aria-label="Artwork gallery">
            <div class="mtk-gallery__grid">
              ${this.paintings.map((item) => this.cardTemplate(item)).join('')}
            </div>
          </main>
          <section class="mtk-gallery__admin is-hidden" aria-label="Admin artwork management"></section>
        </div>`;
      this.bindHome();
    }

    cardTemplate(item) {
      return `
        <article>
          <button class="mtk-gallery__card" type="button" data-action="open" data-id="${this.escape(item.id)}" aria-label="Open details for ${this.escape(item.title)}">
            <img class="mtk-gallery__card-image" src="${this.escape(item.image)}" alt="${this.escape(item.title)}">
            <span class="mtk-gallery__card-body">
              <strong class="mtk-gallery__card-title">${this.escape(item.title)}</strong>
              <span class="mtk-gallery__meta">${this.escape(item.category)} • ${this.escape(item.medium)}</span>
              <span class="mtk-gallery__price">${this.money(item.price, item.paypal && item.paypal.currency)}</span>
            </span>
          </button>
        </article>`;
    }

    bindHome() {
      this.root.querySelectorAll('[data-action="open"]').forEach((button) => {
        button.addEventListener('click', () => this.openDetail(button.getAttribute('data-id')));
      });
      const adminToggle = this.root.querySelector('[data-action="admin-toggle"]');
      adminToggle.addEventListener('click', () => this.renderAdmin());
    }

    getPainting(id) {
      return this.paintings.find((item) => item.id === id);
    }

    openDetail(id) {
      const item = this.getPainting(id);
      if (!item) return;
      this.activePainting = item;
      const available = item.availability === 'available';
      const detail = document.createElement('section');
      detail.className = 'mtk-gallery__detail';
      detail.setAttribute('role', 'dialog');
      detail.setAttribute('aria-modal', 'true');
      detail.setAttribute('aria-label', item.title);
      detail.innerHTML = `
        <button class="mtk-gallery__close" type="button" data-action="close" aria-label="Close artwork details">X</button>
        <div class="mtk-gallery__detail-shell">
          <img class="mtk-gallery__detail-image" src="${this.escape(item.image)}" alt="${this.escape(item.title)}">
          <div class="mtk-gallery__panel">
            <h2 class="mtk-gallery__detail-title">${this.escape(item.title)}</h2>
            <p class="mtk-gallery__description">${this.escape(item.description)}</p>
            <div class="mtk-gallery__facts">
              <div class="mtk-gallery__fact"><strong>Price</strong><span>${this.money(item.price, item.paypal && item.paypal.currency)}</span></div>
              <div class="mtk-gallery__fact"><strong>Availability</strong><span>${this.escape(item.availability)}</span></div>
              <div class="mtk-gallery__fact"><strong>Dimensions</strong><span>${this.escape(item.dimensions)}</span></div>
              <div class="mtk-gallery__fact"><strong>Medium</strong><span>${this.escape(item.medium)}</span></div>
              <div class="mtk-gallery__fact"><strong>Category</strong><span>${this.escape(item.category)}</span></div>
            </div>
            <div class="mtk-gallery__actions">
              ${available ? this.availableActions(item) : this.unavailableActions(item)}
            </div>
          </div>
        </div>`;
      this.root.appendChild(detail);
      detail.querySelector('[data-action="close"]').addEventListener('click', () => this.closeDetail());
      detail.addEventListener('keydown', (event) => { if (event.key === 'Escape') this.closeDetail(); });
      detail.querySelectorAll('[data-action="toggle-form"]').forEach((link) => {
        link.addEventListener('click', () => detail.querySelector(link.getAttribute('data-target')).classList.toggle('is-hidden'));
      });
      detail.querySelectorAll('form').forEach((form) => form.addEventListener('submit', (event) => this.submitForm(event, item)));
      detail.querySelector('[data-action="close"]').focus();
      this.publish('detail.opened', { id: item.id });
    }

    availableActions(item) {
      const seller = this.config.store && this.config.store.paypalSellerEmail ? this.config.store.paypalSellerEmail : '';
      const paypalUrl = 'https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=' + encodeURIComponent(seller) + '&item_name=' + encodeURIComponent(item.paypal && item.paypal.itemName || item.title) + '&amount=' + encodeURIComponent(item.price) + '&currency_code=' + encodeURIComponent(item.paypal && item.paypal.currency || 'USD') + '&item_number=' + encodeURIComponent(item.paypal && item.paypal.sku || item.id);
      return `
        <a class="mtk-gallery__button" href="${paypalUrl}" target="_blank" rel="noopener">Buy with PayPal</a>
        <button class="mtk-gallery__text-link" type="button" data-action="toggle-form" data-target="#offer-form">Make a counter offer</button>
        ${this.offerForm()}`;
    }

    unavailableActions() {
      return `
        <button class="mtk-gallery__text-link" type="button" data-action="toggle-form" data-target="#request-form">Request a similar painting</button>
        ${this.requestForm()}`;
    }

    field(name, label, type, required) {
      return `<label class="mtk-gallery__field"><span class="mtk-gallery__label">${label}</span><input class="mtk-gallery__input" name="${name}" type="${type || 'text'}" ${required ? 'required' : ''}></label>`;
    }

    textarea(name, label, required) {
      return `<label class="mtk-gallery__field"><span class="mtk-gallery__label">${label}</span><textarea class="mtk-gallery__textarea" name="${name}" ${required ? 'required' : ''}></textarea></label>`;
    }

    offerForm() {
      return `<form id="offer-form" class="mtk-gallery__form is-hidden" data-kind="offer">
        ${this.field('name', 'Name', 'text', true)}
        ${this.field('email', 'Email', 'email', true)}
        ${this.field('amount', 'Offer amount', 'number', true)}
        ${this.textarea('message', 'Message', false)}
        <button class="mtk-gallery__button" type="submit">Send offer</button>
      </form>`;
    }

    requestForm() {
      return `<form id="request-form" class="mtk-gallery__form is-hidden" data-kind="request">
        ${this.field('name', 'Name', 'text', true)}
        ${this.field('email', 'Email', 'email', true)}
        ${this.textarea('message', 'What would you like?', true)}
        <button class="mtk-gallery__button" type="submit">Send request</button>
      </form>`;
    }

    submitForm(event, item) {
      event.preventDefault();
      const form = event.currentTarget;
      const payload = Object.fromEntries(new FormData(form).entries());
      payload.paintingId = item.id;
      payload.endpoint = this.config.api && this.config.api.endpoints ? this.config.api.endpoints[form.dataset.kind + 's'] : form.dataset.kind;
      this.publish(form.dataset.kind + '.submitted', payload);
      form.innerHTML = '<p class="mtk-gallery__notice" role="status">Thank you. Your message has been captured for the store owner.</p>';
    }

    closeDetail() {
      const detail = this.root.querySelector('.mtk-gallery__detail');
      if (detail) detail.remove();
      this.publish('detail.closed', {});
    }

    renderAdmin() {
      const panel = this.root.querySelector('.mtk-gallery__admin');
      panel.classList.toggle('is-hidden');
      if (panel.classList.contains('is-hidden')) return;
      if (!this.isAdmin) {
        panel.innerHTML = `<h2>Admin login</h2><form class="mtk-gallery__form" data-admin-login>
          ${this.field('username', 'Username', 'text', true)}
          ${this.field('password', 'Password', 'password', true)}
          <button class="mtk-gallery__button" type="submit">Login</button>
        </form>`;
        panel.querySelector('form').addEventListener('submit', (event) => {
          event.preventDefault();
          const data = Object.fromEntries(new FormData(event.currentTarget).entries());
          if (data.username === this.config.admin.username && data.password === this.config.admin.password) {
            this.isAdmin = true;
            this.renderAdminEditor(panel);
            this.publish('admin.login', { success: true });
          } else {
            this.publish('admin.login', { success: false });
            event.currentTarget.insertAdjacentHTML('beforeend', '<p class="mtk-gallery__notice" role="alert">Invalid login.</p>');
          }
        });
      } else {
        this.renderAdminEditor(panel);
      }
    }

    renderAdminEditor(panel) {
      panel.innerHTML = `<h2>Manage paintings</h2><form class="mtk-gallery__form" data-admin-form>
        <div class="mtk-gallery__admin-grid">
          ${this.field('title', 'Title', 'text', true)}
          ${this.field('price', 'Price', 'number', true)}
          ${this.field('availability', 'Availability', 'text', true)}
          ${this.field('dimensions', 'Dimensions', 'text', true)}
          ${this.field('medium', 'Medium', 'text', true)}
          ${this.field('category', 'Category', 'text', true)}
          ${this.field('image', 'Image URL', 'url', true)}
        </div>
        ${this.textarea('description', 'Description', true)}
        <button class="mtk-gallery__button" type="submit">Add painting</button>
      </form>
      <div class="mtk-gallery__facts">${this.paintings.map((item) => `<div class="mtk-gallery__fact"><span>${this.escape(item.title)}</span><button class="mtk-gallery__text-link" type="button" data-remove="${this.escape(item.id)}">Remove</button></div>`).join('')}</div>`;
      panel.querySelector('[data-admin-form]').addEventListener('submit', (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget).entries());
        data.id = 'painting-' + Date.now();
        data.paypal = { itemName: data.title, sku: data.id, currency: 'USD' };
        this.paintings.push(data);
        this.savePaintings();
        this.renderHome();
      });
      panel.querySelectorAll('[data-remove]').forEach((button) => button.addEventListener('click', () => {
        this.paintings = this.paintings.filter((item) => item.id !== button.getAttribute('data-remove'));
        this.savePaintings();
        this.renderHome();
      }));
    }
  }

  function init() {
    const element = document.querySelector('mtk-gallery.mtk-gallery');
    if (!element || element.__mtkGallery) return Boolean(element);
    element.__mtkGallery = new MTKGallery(element, window.mtkGalleryConfig || {});
    return true;
  }

  function waitForElement() {
    if (init()) return;
    const observer = new MutationObserver(function () {
      if (init()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', waitForElement);
  else waitForElement();
}());
