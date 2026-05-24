(function () {
  'use strict';

  class MtkMina {
    constructor(element, config) {
      this.element = element;
      this.config = config || window.mtkMinaConfig || {};
      this.paintings = Array.isArray(this.config.paintings) ? this.config.paintings : [];
      this.currentFilter = 'all';
      this.dialog = this.element.querySelector('.mtk-mina__dialog');
      this.dialogBody = this.element.querySelector('.mtk-mina__dialog-body');
      this.onMessage = this.onMessage.bind(this);
      this.init();
    }

    init() {
      this.renderHeader();
      this.renderFilters();
      this.renderStats();
      this.renderPaintings();
      this.bindEvents();

      if (window.wc && typeof window.wc.subscribe === 'function') {
        window.wc.subscribe('4-mtk-mina', this.onMessage);
      }

      this.publish('ready', { count: this.paintings.length });
    }

    onMessage(message) {
      const data = message && message.detail ? message.detail : message;
      if (!data || !data.action) return;

      switch (data.action) {
        case 'filter':
          this.setFilter(data.value || 'all');
          break;
        case 'refresh':
          this.paintings = Array.isArray(data.paintings) ? data.paintings : this.paintings;
          this.renderStats();
          this.renderPaintings();
          break;
        case 'open':
          this.openDetails(data.id);
          break;
        default:
          this.publish('unknown-message', data);
      }
    }

    bindEvents() {
      this.element.addEventListener('click', (event) => {
        const button = event.target.closest('[data-mina-action]');
        if (!button || !this.element.contains(button)) return;

        const action = button.getAttribute('data-mina-action');
        const id = button.getAttribute('data-mina-id');

        switch (action) {
          case 'filter':
            this.setFilter(button.getAttribute('data-mina-value'));
            break;
          case 'details':
            this.openDetails(id);
            break;
          case 'buy':
            this.openRequest(id, 'buy');
            break;
          case 'offer':
            this.openRequest(id, 'offer');
            break;
          case 'similar':
            this.openRequest(id, 'similar');
            break;
          case 'submit-request':
            this.handleRequestSubmit(button.closest('form'));
            break;
          default:
            this.publish('click', { action, id });
        }
      });
    }

    renderHeader() {
      const eyebrow = this.element.querySelector('[data-mina-field="eyebrow"]');
      const title = this.element.querySelector('[data-mina-field="title"]');
      const subtitle = this.element.querySelector('[data-mina-field="subtitle"]');

      if (eyebrow) eyebrow.textContent = this.config.settings?.eyebrow || 'Original art shop';
      if (title) title.textContent = this.config.settings?.title || 'Mina Hand Paintings';
      if (subtitle) subtitle.textContent = this.config.settings?.subtitle || '';
    }

    renderStats() {
      const node = this.element.querySelector('.mtk-mina__stats');
      if (!node) return;

      const available = this.paintings.filter((item) => item.status === 'available').length;
      const custom = this.paintings.filter((item) => item.allowSimilarOrder).length;

      node.innerHTML =
        this.statMarkup(this.paintings.length, 'Paintings') +
        this.statMarkup(available, 'Available') +
        this.statMarkup(custom, 'Custom options') +
        this.statMarkup(this.config.settings?.dbPath || 'SQLite', 'Storage');
    }

    statMarkup(value, label) {
      return '<div class="mtk-mina__stat"><strong>' + this.escape(value) + '</strong><span>' + this.escape(label) + '</span></div>';
    }

    renderFilters() {
      const node = this.element.querySelector('.mtk-mina__filters');
      if (!node) return;

      const filters = Array.isArray(this.config.filters) ? this.config.filters : [{ label: 'All', value: 'all' }];
      node.innerHTML = filters.map((filter) => {
        return '<button class="mtk-mina__filter" type="button" data-mina-action="filter" data-mina-value="' + this.escape(filter.value) + '" aria-pressed="' + String(filter.value === this.currentFilter) + '">' + this.escape(filter.label) + '</button>';
      }).join('');
    }

    renderPaintings() {
      const grid = this.element.querySelector('.mtk-mina__grid');
      const empty = this.element.querySelector('.mtk-mina__empty');
      if (!grid) return;

      const visible = this.currentFilter === 'all'
        ? this.paintings
        : this.paintings.filter((item) => item.status === this.currentFilter);

      grid.innerHTML = visible.map((item) => this.cardMarkup(item)).join('');

      if (empty) {
        empty.hidden = visible.length > 0;
        empty.textContent = this.config.settings?.emptyMessage || 'No paintings match your filters.';
      }

      this.updateFilterState();
    }

    cardMarkup(item) {
      const isAvailable = item.status === 'available';
      const price = this.formatPrice(item.price, item.currency);
      const similarButton = !isAvailable || item.allowSimilarOrder;

      return '<article class="mtk-mina__card">' +
        '<div class="mtk-mina__image-wrap"><img class="mtk-mina__image" src="' + this.escape(item.image) + '" alt="' + this.escape(item.title) + ' painting" loading="lazy"><span class="mtk-mina__badge mtk-mina__badge--' + this.escape(item.status) + '">' + this.escape(item.status) + '</span></div>' +
        '<div class="mtk-mina__body"><h2 class="mtk-mina__name">' + this.escape(item.title) + '</h2><p class="mtk-mina__meta">' + this.escape(item.medium) + ' · ' + this.escape(item.size) + '</p><div class="mtk-mina__price">' + this.escape(price) + '</div>' +
        '<div class="mtk-mina__actions">' +
        '<button class="mtk-mina__button mtk-mina__button--ghost" type="button" data-mina-action="details" data-mina-id="' + this.escape(item.id) + '">' + this.escape(this.config.actions?.details || 'View Details') + '</button>' +
        (isAvailable ? '<button class="mtk-mina__button" type="button" data-mina-action="buy" data-mina-id="' + this.escape(item.id) + '">' + this.escape(this.config.actions?.buy || 'Buy Now') + '</button>' : '') +
        (item.allowCounterOffer ? '<button class="mtk-mina__button mtk-mina__button--secondary" type="button" data-mina-action="offer" data-mina-id="' + this.escape(item.id) + '">' + this.escape(this.config.actions?.offer || 'Make Counter Offer') + '</button>' : '') +
        (similarButton ? '<button class="mtk-mina__button" type="button" data-mina-action="similar" data-mina-id="' + this.escape(item.id) + '">' + this.escape(this.config.actions?.similar || 'Request Similar Painting') + '</button>' : '') +
        '</div></div></article>';
    }

    setFilter(value) {
      this.currentFilter = value || 'all';
      this.renderPaintings();
      this.publish('filter', { value: this.currentFilter });
    }

    updateFilterState() {
      this.element.querySelectorAll('[data-mina-action="filter"]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.getAttribute('data-mina-value') === this.currentFilter));
      });
    }

    openDetails(id) {
      const item = this.findPainting(id);
      if (!item) return;

      this.dialogBody.innerHTML =
        '<h2 id="mtk-mina-dialog-title">' + this.escape(item.title) + '</h2>' +
        '<p>' + this.escape(item.description) + '</p>' +
        '<p><strong>Price:</strong> ' + this.escape(this.formatPrice(item.price, item.currency)) + '</p>' +
        '<p><strong>Status:</strong> ' + this.escape(item.status) + '</p>' +
        '<p><strong>Storage:</strong> ' + this.escape(this.config.settings?.dbPath || 'SQLite database') + '</p>';

      this.showDialog();
      this.publish('details', { id: item.id });
    }

    openRequest(id, type) {
      const item = this.findPainting(id);
      if (!item) return;

      const title = type === 'offer' ? 'Make Counter Offer' : type === 'similar' ? 'Request Similar Painting' : 'Purchase Request';
      const amount = type === 'offer' ? item.price : '';

      this.dialogBody.innerHTML =
        '<h2 id="mtk-mina-dialog-title">' + this.escape(title) + '</h2>' +
        '<p>' + this.escape(item.title) + ' · ' + this.escape(this.formatPrice(item.price, item.currency)) + '</p>' +
        '<div class="mtk-mina__field"><label for="mina-name">Name</label><input id="mina-name" name="name" autocomplete="name" required></div>' +
        '<div class="mtk-mina__field"><label for="mina-email">Email</label><input id="mina-email" name="email" type="email" autocomplete="email" required></div>' +
        '<div class="mtk-mina__field"><label for="mina-offer">Offer or budget</label><input id="mina-offer" name="amount" inputmode="decimal" value="' + this.escape(amount) + '"></div>' +
        '<div class="mtk-mina__field"><label for="mina-note">Message</label><textarea id="mina-note" name="note">' + (type === 'similar' ? 'I am interested in a similar or same painting.' : '') + '</textarea></div>' +
        '<input type="hidden" name="id" value="' + this.escape(item.id) + '"><input type="hidden" name="type" value="' + this.escape(type) + '">' +
        '<button class="mtk-mina__button" type="button" data-mina-action="submit-request">Send Request</button>';

      this.showDialog();
      this.publish('request-open', { id: item.id, type });
    }

    handleRequestSubmit(form) {
      if (!form || !form.reportValidity()) return;

      const payload = Object.fromEntries(new FormData(form).entries());
      payload.createdAt = new Date().toISOString();
      payload.status = 'pending-owner-reply';

      this.publish('request-submit', payload);
      this.dialogBody.innerHTML = '<h2 id="mtk-mina-dialog-title">Request Sent</h2><p>Your request is pending owner reply. Save this payload to SQLite from your Shopify app backend.</p>';
    }

    showDialog() {
      if (this.dialog && typeof this.dialog.showModal === 'function') {
        this.dialog.showModal();
      }
    }

    findPainting(id) {
      return this.paintings.find((item) => item.id === id);
    }

    formatPrice(value, currency) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || this.config.currency || 'USD'
      }).format(Number(value || 0));
    }

    escape(value) {
      return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[char]));
    }

    publish(type, detail) {
      const payload = { component: 'mtk-mina', type, detail: detail || {} };

      if (window.wc && typeof window.wc.log === 'function') {
        window.wc.log('mtk-mina publish', payload);
      } else if (window.console && typeof window.console.log === 'function') {
        window.console.log('mtk-mina publish', payload);
      }

      if (window.wc && typeof window.wc.publish === 'function') {
        window.wc.publish('mtk-mina', payload);
      } else {
        this.element.dispatchEvent(new CustomEvent('mtk-mina', { bubbles: true, detail: payload }));
      }
    }
  }

  function mountElement(element) {
    if (!element || element.__mtkMina) return;
    element.__mtkMina = new MtkMina(element, window.mtkMinaConfig);
  }

  function findMinaElement() {
    return document.querySelector('mtk-mina.mtk-mina');
  }

  function loadWcIncludeFallback() {
    const include = document.querySelector('wc-include[href="mtk-mina.html"], wc-include[href$="/mtk-mina.html"]');
    if (!include || findMinaElement() || typeof window.fetch !== 'function') return Promise.resolve();

    const href = include.getAttribute('href');
    return fetch(href)
      .then((response) => response.ok ? response.text() : '')
      .then((markup) => {
        if (!markup || findMinaElement()) return;
        include.insertAdjacentHTML('afterend', markup);
      })
      .catch(() => {});
  }

  function waitForMinaElement(callback) {
    const existing = findMinaElement();
    if (existing) {
      callback(existing);
      return;
    }

    loadWcIncludeFallback().then(() => {
      const loaded = findMinaElement();
      if (loaded) {
        callback(loaded);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = findMinaElement();
        if (!element) return;
        observer.disconnect();
        callback(element);
      });

      observer.observe(document.documentElement, { childList: true, subtree: true });
    });
  }

  function boot() {
    waitForMinaElement(mountElement);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.MtkMina = MtkMina;
}());
