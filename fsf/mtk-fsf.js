(function () {
  'use strict';

  class MtkFsf {
    constructor(element, config) {
      this.element = element;
      this.config = config;
      this.state = {
        current: 0,
        answers: {},
        review: false,
        submitted: false,
        direction: 'next'
      };
      this.boundKeydown = this.onKeydown.bind(this);
      this.onMessage = this.onMessage.bind(this);
      this.init();
    }

    init() {
      if (!this.element || this.element.dataset.mtkFsfInitialized === 'true') {
        return;
      }
      this.element.dataset.mtkFsfInitialized = 'true';
      this.subscribe();
      this.render();
      this.publish('ready', { fields: this.config.fields.length });
    }

    subscribe() {
      if (window.wc && typeof window.wc.subscribe === 'function') {
        window.wc.subscribe('4-mtk-fsf', this.onMessage);
      }
    }

    onMessage(message) {
      const action = message && (message.action || message.type);
      const payload = message && message.payload ? message.payload : {};
      switch (action) {
        case 'next':
          this.next();
          break;
        case 'previous':
          this.previous();
          break;
        case 'goTo':
          this.goTo(Number(payload.index));
          break;
        case 'reset':
          this.reset();
          break;
        case 'submit':
          this.submit();
          break;
        default:
          this.publish('message:received', { message: message || null });
          break;
      }
    }

    render() {
      const app = this.config.app;
      this.element.innerHTML = '';
      this.element.appendChild(this.createShell(app));
      this.cacheElements();
      this.bindEvents();
      this.updateView();
    }

    createShell(app) {
      const shell = this.el('section', 'mtk-fsf__shell');
      shell.setAttribute('aria-label', app.title);

      const header = this.el('header', 'mtk-fsf__header');
      const eyebrow = this.el('p', 'mtk-fsf__eyebrow', app.eyebrow);
      const title = this.el('h1', 'mtk-fsf__title', app.title);
      const subtitle = this.el('p', 'mtk-fsf__subtitle', app.subtitle);
      header.append(eyebrow, title, subtitle);

      const progress = this.el('div', 'mtk-fsf__progress mtk-fsf__progress--step-0');
      progress.setAttribute('role', 'progressbar');
      progress.setAttribute('aria-label', app.progressLabel);
      progress.setAttribute('aria-valuemin', '0');
      progress.setAttribute('aria-valuemax', String(this.config.fields.length));
      progress.setAttribute('aria-valuenow', '1');
      progress.appendChild(this.el('span', 'mtk-fsf__progress-bar'));

      const card = this.el('article', 'mtk-fsf__card');
      card.setAttribute('aria-live', 'polite');

      const form = this.el('form', 'mtk-fsf__form');
      form.noValidate = true;
      form.setAttribute('autocomplete', 'off');
      form.appendChild(this.createFields());
      form.appendChild(this.createReview());
      form.appendChild(this.createError());
      form.appendChild(this.createControls());
      card.appendChild(form);

      shell.append(header, progress, card);
      return shell;
    }

    createFields() {
      const list = this.el('ol', 'mtk-fsf__fields');
      this.config.fields.forEach((field, index) => {
        const item = this.el('li', 'mtk-fsf__field');
        item.dataset.index = String(index);
        item.dataset.field = field.name;

        const meta = this.el('div', 'mtk-fsf__meta');
        meta.appendChild(this.el('span', 'mtk-fsf__count', `${this.config.app.questionLabel} ${index + 1} / ${this.config.fields.length}`));
        if (field.required) {
          meta.appendChild(this.el('span', 'mtk-fsf__required', this.config.app.requiredText));
        }

        const label = this.el('label', 'mtk-fsf__label', field.label);
        if (field.info) {
          const info = this.el('span', 'mtk-fsf__info', field.info);
          label.appendChild(info);
        }

        const control = this.createControl(field);
        item.append(meta, label, control);
        list.appendChild(item);
      });
      return list;
    }

    createControl(field) {
      const wrap = this.el('div', `mtk-fsf__control mtk-fsf__control--${field.type}`);
      switch (field.type) {
        case 'textarea': {
          const textarea = this.el('textarea', 'mtk-fsf__textarea');
          textarea.name = field.name;
          textarea.placeholder = field.placeholder || '';
          textarea.rows = field.rows || 4;
          if (field.required) textarea.required = true;
          wrap.appendChild(textarea);
          break;
        }
        case 'select': {
          const select = this.el('select', 'mtk-fsf__select');
          select.name = field.name;
          if (field.required) select.required = true;
          const placeholder = this.el('option', '', field.placeholder || 'Select');
          placeholder.value = '';
          placeholder.disabled = true;
          placeholder.selected = true;
          select.appendChild(placeholder);
          field.options.forEach((option, optionIndex) => {
            const item = this.el('option', '', `${option.label} ${option.value}`);
            item.value = option.value;
            item.dataset.colorIndex = String(optionIndex + 1);
            select.appendChild(item);
          });
          const preview = this.el('span', 'mtk-fsf__color-preview mtk-fsf__color-preview--none');
          preview.setAttribute('aria-hidden', 'true');
          wrap.append(select, preview);
          break;
        }
        case 'radio': {
          const group = this.el('div', 'mtk-fsf__radio-group');
          group.setAttribute('role', 'radiogroup');
          group.setAttribute('aria-label', field.label);
          field.options.forEach((option) => {
            const optionLabel = this.el('label', 'mtk-fsf__radio-card');
            const input = this.el('input', 'mtk-fsf__radio-input');
            input.type = 'radio';
            input.name = field.name;
            input.value = option.value;
            if (field.required) input.required = true;
            const icon = this.el('span', 'mtk-fsf__radio-icon', option.icon);
            icon.setAttribute('aria-hidden', 'true');
            const text = this.el('span', 'mtk-fsf__radio-text', option.label);
            optionLabel.append(input, icon, text);
            group.appendChild(optionLabel);
          });
          wrap.appendChild(group);
          break;
        }
        default: {
          const input = this.el('input', `mtk-fsf__input ${field.prefix ? 'mtk-fsf__input--prefix' : ''}`);
          input.type = field.type;
          input.name = field.name;
          input.placeholder = field.placeholder || '';
          if (field.required) input.required = true;
          if (field.autocomplete) input.autocomplete = field.autocomplete;
          if (field.min !== undefined) input.min = String(field.min);
          if (field.step !== undefined) input.step = String(field.step);
          if (field.prefix) {
            wrap.appendChild(this.el('span', 'mtk-fsf__prefix', field.prefix));
          }
          wrap.appendChild(input);
          break;
        }
      }
      return wrap;
    }

    createReview() {
      const review = this.el('section', 'mtk-fsf__review');
      review.setAttribute('aria-label', this.config.app.reviewTitle);
      const title = this.el('h2', 'mtk-fsf__review-title', this.config.app.reviewTitle);
      const list = this.el('dl', 'mtk-fsf__review-list');
      review.append(title, list);
      return review;
    }

    createError() {
      const error = this.el('p', 'mtk-fsf__error');
      error.setAttribute('role', 'alert');
      return error;
    }

    createControls() {
      const controls = this.el('div', 'mtk-fsf__controls');
      const previous = this.button('mtk-fsf__button mtk-fsf__button--text', this.config.app.previousLabel, 'previous');
      const next = this.button('mtk-fsf__button mtk-fsf__button--primary', this.config.app.continueLabel, 'next');
      const submit = this.button('mtk-fsf__button mtk-fsf__button--primary', this.config.app.submitLabel, 'submit');
      const reset = this.button('mtk-fsf__button mtk-fsf__button--text', this.config.app.resetLabel, 'reset');
      const hint = this.el('span', 'mtk-fsf__hint', this.config.app.enterHint);
      controls.append(previous, next, submit, reset, hint);
      return controls;
    }

    button(className, label, action) {
      const button = this.el('button', className, label);
      button.type = action === 'submit' ? 'submit' : 'button';
      button.dataset.action = action;
      return button;
    }

    cacheElements() {
      this.form = this.element.querySelector('.mtk-fsf__form');
      this.fields = Array.from(this.element.querySelectorAll('.mtk-fsf__field'));
      this.progress = this.element.querySelector('.mtk-fsf__progress');
      this.error = this.element.querySelector('.mtk-fsf__error');
      this.review = this.element.querySelector('.mtk-fsf__review');
      this.reviewList = this.element.querySelector('.mtk-fsf__review-list');
      this.controls = this.element.querySelector('.mtk-fsf__controls');
    }

    bindEvents() {
      this.form.addEventListener('submit', (event) => {
        event.preventDefault();
        this.submit();
      });
      this.element.addEventListener('click', (event) => {
        const action = event.target.closest('[data-action]');
        if (!action) return;
        const handlers = {
          next: () => this.next(),
          previous: () => this.previous(),
          submit: () => this.submit(),
          reset: () => this.reset(),
          edit: () => this.goTo(Number(action.dataset.index))
        };
        if (handlers[action.dataset.action]) handlers[action.dataset.action]();
      });
      this.element.addEventListener('change', (event) => {
        const target = event.target;
        if (!target.name) return;
        this.captureValue(target.name);
        this.updateColorPreview(target);
        const field = this.config.fields[this.state.current];
        if (field && field.autoAdvance) {
          window.setTimeout(() => this.next(), 120);
        }
      });
      this.element.addEventListener('input', (event) => {
        if (event.target.name) this.captureValue(event.target.name);
      });
      document.removeEventListener('keydown', this.boundKeydown);
      document.addEventListener('keydown', this.boundKeydown);
    }

    onKeydown(event) {
      if (!this.element.contains(document.activeElement)) return;
      if (event.key === 'Enter' && document.activeElement.tagName.toLowerCase() !== 'textarea' && !this.state.review) {
        event.preventDefault();
        this.next();
      }
    }

    next() {
      if (this.state.review) return;
      if (!this.validateCurrent()) return;
      if (this.state.current >= this.config.fields.length - 1) {
        this.showReview();
        return;
      }
      this.state.direction = 'next';
      this.state.current += 1;
      this.updateView();
      this.publish('step:next', this.snapshot());
    }

    previous() {
      if (this.state.review) {
        this.state.review = false;
        this.state.direction = 'prev';
        this.updateView();
        this.publish('review:closed', this.snapshot());
        return;
      }
      if (this.state.current <= 0) return;
      this.state.direction = 'prev';
      this.state.current -= 1;
      this.clearError();
      this.updateView();
      this.publish('step:previous', this.snapshot());
    }

    goTo(index) {
      if (Number.isNaN(index) || index < 0 || index >= this.config.fields.length) return;
      this.state.review = false;
      this.state.direction = index < this.state.current ? 'prev' : 'next';
      this.state.current = index;
      this.updateView();
      this.publish('step:goto', this.snapshot());
    }

    showReview() {
      this.captureAll();
      this.state.review = true;
      this.buildReview();
      this.updateView();
      this.publish('review:open', this.snapshot());
    }

    submit() {
      if (!this.state.review) {
        if (!this.validateCurrent()) return;
        this.showReview();
        return;
      }
      this.captureAll();
      this.state.submitted = true;
      this.updateView();
      this.publish('submit', this.snapshot());
      this.showError(this.config.app.messages.submitted, 'success');
    }

    reset() {
      this.state = { current: 0, answers: {}, review: false, submitted: false, direction: 'next' };
      this.form.reset();
      this.clearError();
      this.element.querySelectorAll('.mtk-fsf__color-preview').forEach((preview) => {
        preview.className = 'mtk-fsf__color-preview mtk-fsf__color-preview--none';
      });
      this.updateView();
      this.publish('reset', this.snapshot());
      this.showError(this.config.app.messages.reset, 'success');
    }

    validateCurrent() {
      const field = this.config.fields[this.state.current];
      this.captureValue(field.name);
      const value = this.state.answers[field.name];
      if (field.required && (value === undefined || value === null || value === '')) {
        this.showError(this.config.app.messages.required);
        return false;
      }
      if (field.type === 'email' && value && !/^\S+@\S+\.\S+$/.test(value)) {
        this.showError(this.config.app.messages.email);
        return false;
      }
      if (field.type === 'number' && value && field.min !== undefined && Number(value) < Number(field.min)) {
        this.showError(this.config.app.messages.numberMin);
        return false;
      }
      this.clearError();
      return true;
    }

    captureValue(name) {
      const controls = Array.from(this.form.elements).filter((control) => control.name === name);
      if (!controls.length) return;
      const first = controls[0];
      if (first.type === 'radio') {
        const checked = controls.find((control) => control.checked);
        this.state.answers[name] = checked ? checked.value : '';
        return;
      }
      this.state.answers[name] = first.value;
    }

    captureAll() {
      this.config.fields.forEach((field) => this.captureValue(field.name));
    }

    buildReview() {
      this.reviewList.innerHTML = '';
      this.config.fields.forEach((field, index) => {
        const answer = this.formatAnswer(field);
        const term = this.el('dt', 'mtk-fsf__review-question', field.label);
        const definition = this.el('dd', 'mtk-fsf__review-answer');
        definition.appendChild(this.el('span', 'mtk-fsf__review-value', answer));
        const edit = this.button('mtk-fsf__edit', this.config.app.editLabel, 'edit');
        edit.dataset.index = String(index);
        definition.appendChild(edit);
        this.reviewList.append(term, definition);
      });
    }

    formatAnswer(field) {
      const value = this.state.answers[field.name];
      if (!value) return 'Not provided';
      if (field.options) {
        const found = field.options.find((option) => option.value === value);
        return found ? found.label : value;
      }
      if (field.prefix) return `${field.prefix}${value}`;
      return value;
    }

    updateView() {
      this.fields.forEach((field, index) => {
        field.classList.toggle('mtk-fsf__field--current', index === this.state.current && !this.state.review);
        field.classList.toggle('mtk-fsf__field--past', index < this.state.current);
        field.classList.toggle('mtk-fsf__field--next', index > this.state.current);
      });
      this.element.classList.toggle('mtk-fsf--review', this.state.review);
      this.element.classList.toggle('mtk-fsf--submitted', this.state.submitted);
      this.element.classList.toggle('mtk-fsf--prev', this.state.direction === 'prev');
      this.element.classList.toggle('mtk-fsf--next', this.state.direction === 'next');
      this.progress.className = `mtk-fsf__progress mtk-fsf__progress--step-${this.state.review ? this.config.fields.length : this.state.current}`;
      this.progress.setAttribute('aria-valuenow', String(this.state.review ? this.config.fields.length : this.state.current + 1));
      this.controls.querySelector('[data-action="previous"]').hidden = this.state.current === 0 && !this.state.review;
      this.controls.querySelector('[data-action="next"]').hidden = this.state.review;
      this.controls.querySelector('[data-action="submit"]').hidden = !this.state.review || this.state.submitted;
      this.controls.querySelector('[data-action="reset"]').hidden = !this.state.review && !this.state.submitted;
      this.controls.querySelector('.mtk-fsf__hint').hidden = this.state.review;
      this.focusCurrent();
    }

    updateColorPreview(target) {
      if (!target.matches('.mtk-fsf__select')) return;
      const selectedIndex = target.selectedIndex;
      const preview = target.parentElement.querySelector('.mtk-fsf__color-preview');
      if (!preview) return;
      preview.className = `mtk-fsf__color-preview mtk-fsf__color-preview--${selectedIndex}`;
    }

    focusCurrent() {
      window.setTimeout(() => {
        const scope = this.state.review ? this.review : this.fields[this.state.current];
        if (!scope) return;
        const focusable = scope.querySelector('input, textarea, select, button');
        if (focusable) focusable.focus({ preventScroll: true });
      }, 80);
    }

    showError(message, tone) {
      this.error.textContent = message;
      this.error.classList.add('mtk-fsf__error--show');
      this.error.classList.toggle('mtk-fsf__error--success', tone === 'success');
    }

    clearError() {
      this.error.textContent = '';
      this.error.classList.remove('mtk-fsf__error--show', 'mtk-fsf__error--success');
    }

    publish(type, payload) {
      const eventPayload = {
        component: 'mtk-fsf',
        type,
        payload,
        timestamp: new Date().toISOString()
      };
      if (window.wc && typeof window.wc.log === 'function') {
        window.wc.log('mtk-fsf', eventPayload);
      }
      if (window.wc && typeof window.wc.publish === 'function') {
        window.wc.publish('mtk-fsf', eventPayload);
      }
    }

    snapshot() {
      return {
        current: this.state.current,
        review: this.state.review,
        submitted: this.state.submitted,
        answers: Object.assign({}, this.state.answers)
      };
    }

    el(tag, className, text) {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (text !== undefined) element.textContent = text;
      return element;
    }
  }

  function waitForElement(selector, callback, attempts) {
    const maxAttempts = attempts || 120;
    const element = document.querySelector(selector);
    if (element) {
      callback(element);
      return;
    }
    if (maxAttempts <= 0) return;
    window.setTimeout(() => waitForElement(selector, callback, maxAttempts - 1), 50);
  }

  function boot() {
    waitForElement('mtk-fsf.mtk-fsf', (element) => {
      const config = window.MTK_FSF_CONFIG;
      if (!config) return;
      new MtkFsf(element, config);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.MtkFsf = MtkFsf;
}());
