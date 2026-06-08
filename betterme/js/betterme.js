(function () {
  "use strict";

  class MtkBetterme {
    constructor(root, config) {
      if (!root || root.dataset.mtkBettermeReady === "true") {
        return;
      }

      this.root = root;
      this.config = config;
      this.index = 0;
      this.history = [];
      this.answers = this.loadAnswers();
      this.namespace = "4-betterme";
      this.selectors = {
        appMain: ".app-main",
        appFooter: ".app-footer",
        continueButton: ".app-action--continue",
        backButton: ".app-action--back",
        progressBar: ".app-progress__bar"
      };

      this.root.dataset.mtkBettermeReady = "true";
      this.onMessage = this.onMessage.bind(this);
      this.handleRootClick = this.handleRootClick.bind(this);
      this.handleRootInput = this.handleRootInput.bind(this);
      this.handleKeydown = this.handleKeydown.bind(this);

      wc.subscribe(this.namespace, this.onMessage.bind(this));
      this.init();
    }

    init() {
      this.renderShell();
      this.cacheElements();
      this.bindEvents();
      this.renderScreen();
      this.publishEvent("ready", {
        screenIndex: this.index,
        screen: this.currentScreen()
      });
    }

    renderShell() {
      const app = this.config.app;

      this.root.innerHTML = `
        <section class="betterme__app" aria-label="${this.escape(app.brand)} quiz">
          <header class="app-header">
            <div class="app-header__left">
              <button class="app-action app-action--back" type="button" aria-label="${this.escape(app.backLabel)}">
                <span class="app-action__icon" aria-hidden="true">←</span>
              </button>
              <span class="app-brand" aria-label="${this.escape(app.brand)}">${this.escape(app.brand)}</span>
            </div>
            <p class="app-header__title">${this.escape(app.headerTitle)}</p>
            <div class="app-header__right">
              <button class="app-action app-action--menu" type="button" aria-label="${this.escape(app.menuLabel)}">
                <span class="app-menu" aria-hidden="true"></span>
              </button>
            </div>
          </header>
          <div class="app-progress" role="progressbar" aria-label="${this.escape(app.progressLabel)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <span class="app-progress__bar"></span>
          </div>
          <main class="app-main" tabindex="-1"></main>
          <footer class="app-footer" aria-label="Screen actions">
            <button class="app-primary app-action--continue" type="button">${this.escape(app.continueLabel)}</button>
          </footer>
        </section>
      `;
    }

    cacheElements() {
      this.appMain = this.root.querySelector(this.selectors.appMain);
      this.appFooter = this.root.querySelector(this.selectors.appFooter);
      this.continueButton = this.root.querySelector(this.selectors.continueButton);
      this.backButton = this.root.querySelector(this.selectors.backButton);
      this.progressBar = this.root.querySelector(this.selectors.progressBar);
      this.progress = this.root.querySelector(".app-progress");
    }

    bindEvents() {
      this.root.addEventListener("click", this.handleRootClick);
      this.root.addEventListener("input", this.handleRootInput);
      this.root.addEventListener("keydown", this.handleKeydown);
    }

    onMessage(message) {
      if (!message || !message.action) {
        return;
      }

      const actions = {
        next: () => this.next(),
        back: () => this.back(),
        reset: () => this.reset(),
        goTo: () => this.goTo(Number(message.index || 0))
      };

      if (actions[message.action]) {
        actions[message.action]();
      }
    }

    handleRootClick(event) {
      const action = event.target.closest("button");
      if (!action || !this.root.contains(action)) {
        return;
      }

      if (action.classList.contains("app-action--back")) {
        this.back();
        return;
      }

      if (action.classList.contains("app-action--continue")) {
        this.next();
        return;
      }

      if (action.classList.contains("screen-option")) {
        this.selectOption(action);
      }
    }

    handleRootInput(event) {
      const field = event.target.closest(".form-field__control");
      if (!field) {
        return;
      }

      const screen = this.currentScreen();
      const values = this.answers[screen.key] || {};
      values[field.name] = field.value;
      this.answers[screen.key] = values;
      this.saveAnswers();
      this.updateFooter();
    }

    handleKeydown(event) {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      const option = event.target.closest(".screen-option");
      if (!option) {
        return;
      }

      event.preventDefault();
      this.selectOption(option);
    }

    selectOption(option) {
      const screen = this.currentScreen();
      const value = option.dataset.value;

      this.answers[screen.key] = value;
      this.saveAnswers();

      this.publishEvent("selected", {
        screenKey: screen.key,
        value: value,
        screenIndex: this.index
      });

      this.renderScreen();

      if (screen.autoNextOnSelect || screen.type === 0) {
        window.setTimeout(() => this.next(), 220);
      }
    }

    currentScreen() {
      return this.config.screens[this.index];
    }

    renderScreen() {
      const screen = this.currentScreen();
      const renderers = {
        0: () => this.renderImageChoice(screen),
        1: () => this.renderChoice(screen),
        3: () => this.renderInfo(screen),
        4: () => this.renderForm(screen)
      };

      this.updateChrome();
      this.appMain.innerHTML = renderers[screen.type] ? renderers[screen.type]() : this.renderInfo(screen);
      this.updateFooter();
      this.focusMain();
    }

    renderImageChoice(screen) {
      return `
        <section class="screen screen--image-choice" aria-label="Screen">
          ${this.renderIntro(screen)}
          <div class="image-grid" role="list">
            ${screen.options.map((option) => this.renderImageOption(screen, option)).join("")}
          </div>
        </section>
      `;
    }

    renderImageOption(screen, option) {
      const selected = this.answers[screen.key] === option.value;
      return `
        <button class="screen-option image-card${selected ? " is-selected" : ""}" type="button" data-value="${this.escape(option.value)}" aria-pressed="${selected ? "true" : "false"}">
          <span class="image-card__media"><img src="${this.escape(option.image)}" alt="${this.escape(option.alt || option.label)}" /></span>
          <span class="image-card__content">
            <span class="image-card__label">${this.escape(option.label)}</span>
            <span class="image-card__radio" aria-hidden="true">${selected ? "✓" : ""}</span>
          </span>
        </button>
      `;
    }

    renderChoice(screen) {
      return `
        <section class="screen screen--choice" aria-label="Screen">
          ${this.renderIntro(screen)}
          <div class="option-list" role="list">
            ${screen.options.map((option) => this.renderOption(screen, option)).join("")}
          </div>
        </section>
      `;
    }

    renderOption(screen, option) {
      const selected = this.answers[screen.key] === option.value;
      return `
        <button class="screen-option text-option${selected ? " is-selected" : ""}" type="button" data-value="${this.escape(option.value)}" aria-pressed="${selected ? "true" : "false"}">
          <span class="text-option__label">${this.escape(option.label)}</span>
          <span class="text-option__radio" aria-hidden="true">${selected ? "✓" : ""}</span>
        </button>
      `;
    }

    renderInfo(screen) {
      const paragraphs = Array.isArray(screen.paragraphs) ? screen.paragraphs : [];
      return `
        <section class="screen screen--info" aria-label="Screen">
          <div class="info-card">
            ${screen.icon ? `<span class="info-card__icon" aria-hidden="true">${this.escape(screen.icon)}</span>` : ""}
            ${this.renderIntro(screen)}
            <div class="info-card__copy">
              ${paragraphs.map((item) => `<p>${this.emphasize(item, screen.emphasis || [])}</p>`).join("")}
            </div>
          </div>
        </section>
      `;
    }

    renderForm(screen) {
      return `
        <section class="screen screen--form" aria-label="Screen">
          ${this.renderIntro(screen)}
          <form class="form-card" novalidate>
            ${screen.fields.map((field) => this.renderField(screen, field)).join("")}
          </form>
        </section>
      `;
    }

    renderField(screen, field) {
      const values = this.answers[screen.key] || {};
      const value = values[field.name] || "";
      return `
        <label class="form-field">
          <input class="form-field__control" name="${this.escape(field.name)}" type="${this.escape(field.type)}" value="${this.escape(value)}" autocomplete="${this.escape(field.autocomplete || "off")}" inputmode="${this.escape(field.inputmode || "text")}" ${field.required ? "required" : ""} placeholder=" " />
          <span class="form-field__label">${this.escape(field.label)}</span>
        </label>
      `;
    }

    renderIntro(screen) {
      return `
        <div class="screen-intro">
          ${screen.eyebrow ? `<p class="screen-intro__eyebrow">${this.escape(screen.eyebrow)}</p>` : ""}
          <h1 class="screen-intro__title">${this.escape(screen.title)}</h1>
          ${screen.description ? `<p class="screen-intro__description">${this.escape(screen.description)}</p>` : ""}
        </div>
      `;
    }

    updateChrome() {
      const percent = Math.round((this.index / (this.config.screens.length - 1)) * 100);
      this.progressBar.style.width = percent + "%";
      this.progress.setAttribute("aria-valuenow", String(percent));
      this.backButton.disabled = this.index === 0;
      this.backButton.setAttribute("aria-hidden", this.index === 0 ? "true" : "false");
    }

    updateFooter() {
      const screen = this.currentScreen();
      const show = this.canContinue(screen);
      this.appFooter.classList.toggle("is-visible", show);
      this.continueButton.disabled = !show;
    }

    canContinue(screen) {
      if (screen.type === 3) {
        return true;
      }

      if (screen.type === 4) {
        const values = this.answers[screen.key] || {};
        return screen.fields.every((field) => !field.required || String(values[field.name] || "").trim().length > 0);
      }

      if (screen.selectionRequired) {
        return Boolean(this.answers[screen.key]);
      }

      return false;
    }

    next() {
      const screen = this.currentScreen();
      if (!this.canContinue(screen) && screen.type !== 0) {
        return;
      }

      if (this.index < this.config.screens.length - 1) {
        this.history.push(this.index);
        this.index += 1;
        this.renderScreen();
        this.publishEvent("screenChanged", {
          direction: "next",
          screenIndex: this.index,
          screen: this.currentScreen()
        });
        return;
      }

      this.publishEvent("completed", {
        answers: this.answers,
        completedAt: new Date().toISOString()
      });
    }

    back() {
      if (this.index === 0) {
        return;
      }

      this.index = this.history.length ? this.history.pop() : Math.max(0, this.index - 1);
      this.renderScreen();
      this.publishEvent("screenChanged", {
        direction: "back",
        screenIndex: this.index,
        screen: this.currentScreen()
      });
    }

    goTo(index) {
      if (index < 0 || index >= this.config.screens.length) {
        return;
      }
      this.history.push(this.index);
      this.index = index;
      this.renderScreen();
    }

    reset() {
      this.index = 0;
      this.history = [];
      this.answers = {};
      this.saveAnswers();
      this.renderScreen();
      this.publishEvent("reset", {});
    }

    publishEvent(type, payload) {
      const message = {
        app: this.config.app.name,
        type: type,
        payload: payload
      };
      wc.log("betterme publish", message);
      wc.publish("betterme." + type, message);
    }

    focusMain() {
      window.setTimeout(() => {
        this.appMain.focus({ preventScroll: true });
      }, 0);
    }

    loadAnswers() {
      try {
        return JSON.parse(localStorage.getItem("betterme.answers") || "{}");
      } catch (error) {
        wc.warn("betterme answers could not be loaded", error);
        return {};
      }
    }

    saveAnswers() {
      localStorage.setItem("betterme.answers", JSON.stringify(this.answers));
    }

    emphasize(text, phrases) {
      let output = this.escape(text);
      phrases.forEach((phrase) => {
        const safe = this.escape(phrase);
        output = output.replace(safe, `<strong>${safe}</strong>`);
      });
      return output;
    }

    escape(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    static initAll() {
      const config = window.bettermeConfig;
      if (!config) {
        wc.warn("bettermeConfig not found");
        return;
      }

      document.querySelectorAll("betterme.betterme").forEach((root) => {
        if (root.dataset.mtkBettermeReady !== "true") {
          new MtkBetterme(root, config);
        }
      });
    }
  }

  window.MtkBetterme = MtkBetterme;

  function boot() {
    MtkBetterme.initAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  document.addEventListener("include:loaded", boot);
  wc.subscribe("wc.include.loaded", boot);
}());
