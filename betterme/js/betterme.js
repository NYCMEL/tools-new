class MtkBetterme {
    constructor(root, config) {
	if (!root || root.dataset.bettermeInitialized === "true") {
	    return;
	}

	this.root = root;
	this.config = config;
	this.state = {
	    current: 0,
	    history: [],
	    answers: {}
	};

	this.selectors = {
	    brand: "[data-betterme-brand]",
	    title: "[data-betterme-header-title]",
	    back: "[data-betterme-back]",
	    menu: "[data-betterme-menu]",
	    main: "[data-betterme-main]",
	    footer: "[data-betterme-footer]",
	    continue: "[data-betterme-continue]",
	    progress: "[data-betterme-progress-bar]"
	};

	this.root.dataset.bettermeInitialized = "true";
	this.cache();
	this.bind();
	wc.subscribe("4-betterme", this.onMessage.bind(this));
	this.render();
    }

    cache() {
	this.brand = this.root.querySelector(this.selectors.brand);
	this.headerTitle = this.root.querySelector(this.selectors.title);
	this.backBtn = this.root.querySelector(this.selectors.back);
	this.menuBtn = this.root.querySelector(this.selectors.menu);
	this.main = this.root.querySelector(this.selectors.main);
	this.footer = this.root.querySelector(this.selectors.footer);
	this.continueBtn = this.root.querySelector(this.selectors.continue);
	this.progressBar = this.root.querySelector(this.selectors.progress);
    }

    bind() {
	this.backBtn.addEventListener("click", this.previous.bind(this));
	this.continueBtn.addEventListener("click", this.next.bind(this));
    }

    onMessage(message) {
	const payload = message && message.payload ? message.payload : {};

	if (payload.action === "next") {
	    this.next();
	}

	if (payload.action === "back") {
	    this.previous();
	}

	if (payload.action === "goTo" && Number.isInteger(payload.index)) {
	    this.goTo(payload.index);
	}
    }

    getScreen() {
	return this.config.screens[this.state.current];
    }

    render() {
	const screen = this.getScreen();

	this.brand.textContent = this.config.app.brand;
	this.headerTitle.textContent = this.state.current === 0 ? "" : this.config.app.headerTitle;
	this.backBtn.textContent = this.config.app.backText;
	this.backBtn.setAttribute("aria-label", this.config.app.backLabel);
	this.backBtn.disabled = this.state.current === 0;
	this.backBtn.setAttribute("aria-disabled", String(this.state.current === 0));
	this.menuBtn.setAttribute("aria-label", this.config.app.menuLabel);
	this.continueBtn.textContent = this.config.app.continueText;

	this.updateProgress();

	if (screen.type === 0) {
	    this.renderImageChoice(screen);
	}

	if (screen.type === 1) {
	    this.renderSelection(screen);
	}

	if (screen.type === 3) {
	    this.renderContent(screen);
	}

	if (screen.type === 4) {
	    this.renderForm(screen);
	}

	this.updateFooter(screen);

	wc.log("betterme rendered", {
	    index: this.state.current,
	    type: screen.type,
	    key: screen.key
	});
    }

    updateProgress() {
	const total = this.config.screens.length - 1;
	const percent = total <= 0 ? 0 : Math.round((this.state.current / total) * 100);
	this.progressBar.className = "betterme__progress-bar betterme__progress-bar--" + percent;
	this.progressBar.setAttribute("aria-valuenow", String(percent));
    }

    renderImageChoice(screen) {
	this.main.innerHTML = `
      <section class="betterme__screen betterme__screen--images" aria-label="${this.escape(screen.title)}">
        ${this.renderEyebrow(screen)}
        <h1 class="betterme__title">${this.escape(screen.title)}</h1>
        ${this.renderDescription(screen)}
        <div class="betterme__image-grid">
          ${screen.options.map((option) => `
            <button class="betterme__image-card" type="button" data-value="${this.escape(option.value)}">
            <img class="betterme__image-card-img" src="${this.escape(option.image)}" alt="${this.escape(option.alt)}" />
            <span class="betterme__image-card-label">${this.escape(option.label)}</span>
            </button>
            `).join("")}
        </div>
      </section>
    `;

	this.main.querySelectorAll(".betterme__image-card").forEach((button) => {
	    button.addEventListener("click", () => {
		this.state.answers[screen.key] = button.dataset.value;
		this.publishSelection(screen, button.dataset.value);
		this.next();
	    });
	});
    }

    renderSelection(screen) {
	const selected = this.state.answers[screen.key];
	const isCheckbox = screen.inputType === "checkbox";
	const groupRole = isCheckbox ? "group" : "radiogroup";

	this.main.innerHTML = `
      <section class="betterme__screen betterme__screen--selection" aria-label="${this.escape(screen.title)}">
        <h1 class="betterme__title">${this.escape(screen.title)}</h1>
        ${this.renderDescription(screen)}
        <div class="betterme__choice-list" role="${groupRole}" aria-label="${this.escape(screen.title)}">
          ${screen.options.map((option) => {
            const isSelected = isCheckbox
              ? Array.isArray(selected) && selected.includes(option.value)
              : selected === option.value;

            return `
            <button
        class="betterme__choice ${isSelected ? "is-selected" : ""}"
        type="button"
        data-value="${this.escape(option.value)}"
        role="${isCheckbox ? "checkbox" : "radio"}"
        aria-checked="${String(isSelected)}"
            >
            <span class="betterme__choice-label">${this.escape(option.label)}</span>
            <span class="betterme__choice-control" aria-hidden="true">${isSelected ? "✓" : ""}</span>
            </button>
            `;
          }).join("")}
        </div>
      </section>
    `;

	this.main.querySelectorAll(".betterme__choice").forEach((button) => {
	    button.addEventListener("click", () => {
		this.selectOption(screen, button.dataset.value);
	    });
	});
    }

    renderContent(screen) {
	this.main.innerHTML = `
      <section class="betterme__screen betterme__screen--content" aria-label="${this.escape(screen.title)}">
        <div class="betterme__content-card">
          <div class="betterme__content-icon" aria-hidden="true">${this.escape(screen.icon || "✓")}</div>
          <h1 class="betterme__title">${this.escape(screen.title)}</h1>
          ${(screen.paragraphs || []).map((text) => `<p class="betterme__paragraph">${this.escape(text)}</p>`).join("")}
        </div>
      </section>
    `;
    }

    renderForm(screen) {
	this.main.innerHTML = `
      <section class="betterme__screen betterme__screen--form" aria-label="${this.escape(screen.title)}">
        <h1 class="betterme__title">${this.escape(screen.title)}</h1>
        ${this.renderDescription(screen)}
        <form class="betterme__form" novalidate>
          ${(screen.fields || []).map((field) => `
            <label class="betterme__field">
            <input
        class="betterme__field-input"
        name="${this.escape(field.name)}"
        type="${this.escape(field.type)}"
        autocomplete="${this.escape(field.autocomplete || "off")}"
        placeholder=" "
            />
            <span class="betterme__field-label">${this.escape(field.label)}</span>
            </label>
            `).join("")}
        </form>
      </section>
    `;
    }

    renderEyebrow(screen) {
	if (!screen.eyebrow) {
	    return "";
	}

	return `<p class="betterme__eyebrow">${this.escape(screen.eyebrow)}</p>`;
    }

    renderDescription(screen) {
	if (!screen.description) {
	    return "";
	}

	return `<p class="betterme__description">${this.escape(screen.description)}</p>`;
    }

    selectOption(screen, value) {
	if (screen.inputType === "checkbox") {
	    const current = Array.isArray(this.state.answers[screen.key]) ? this.state.answers[screen.key] : [];
	    const exists = current.includes(value);
	    this.state.answers[screen.key] = exists
		? current.filter((item) => item !== value)
		: current.concat(value);
	} else {
	    this.state.answers[screen.key] = value;
	}

	this.publishSelection(screen, value);
	this.render();
    }

    hasValidSelection(screen) {
	const value = this.state.answers[screen.key];

	if (screen.inputType === "checkbox") {
	    return Array.isArray(value) && value.length > 0;
	}

	if (screen.inputType === "radio") {
	    return typeof value === "string" && value.length > 0;
	}

	return false;
    }

    updateFooter(screen) {
	if (screen.type === 1) {
	    const valid = this.hasValidSelection(screen);
	    this.footer.classList.toggle("is-visible", valid);
	    this.continueBtn.disabled = !valid;
	    this.continueBtn.setAttribute("aria-disabled", String(!valid));
	    return;
	}

	if (screen.type === 3 || screen.type === 4) {
	    this.footer.classList.add("is-visible");
	    this.continueBtn.disabled = false;
	    this.continueBtn.setAttribute("aria-disabled", "false");
	    return;
	}

	this.footer.classList.remove("is-visible");
	this.continueBtn.disabled = true;
	this.continueBtn.setAttribute("aria-disabled", "true");
    }

    next() {
	if (this.state.current >= this.config.screens.length - 1) {
	    wc.log("betterme complete", { answers: this.state.answers });
	    wc.publish("betterme:complete", { answers: this.state.answers });
	    this.renderComplete();
	    return;
	}

	const current = this.getScreen();

	if (current.type === 1 && !this.hasValidSelection(current)) {
	    this.updateFooter(current);
	    return;
	}

	this.state.history.push(this.state.current);
	this.state.current += 1;
	wc.log("betterme next", { index: this.state.current });
	wc.publish("betterme:navigation", { action: "next", index: this.state.current });
	this.render();
    }

    previous() {
	if (!this.state.history.length) {
	    return;
	}

	this.state.current = this.state.history.pop();
	wc.log("betterme back", { index: this.state.current });
	wc.publish("betterme:navigation", { action: "back", index: this.state.current });
	this.render();
    }

    goTo(index) {
	if (index < 0 || index >= this.config.screens.length) {
	    return;
	}

	this.state.history.push(this.state.current);
	this.state.current = index;
	wc.log("betterme goTo", { index: index });
	wc.publish("betterme:navigation", { action: "goTo", index: index });
	this.render();
    }

    renderComplete() {
	this.main.innerHTML = `
      <section class="betterme__screen betterme__screen--content" aria-label="${this.escape(this.config.app.completedTitle)}">
        <div class="betterme__content-card">
          <div class="betterme__content-icon" aria-hidden="true">✓</div>
          <h1 class="betterme__title">${this.escape(this.config.app.completedTitle)}</h1>
          <p class="betterme__paragraph">${this.escape(this.config.app.completedText)}</p>
        </div>
      </section>
    `;

	this.footer.classList.remove("is-visible");
    }

    publishSelection(screen, value) {
	const payload = {
	    key: screen.key,
	    value: value,
	    inputType: screen.inputType || "image",
	    answers: this.state.answers
	};

	wc.log("betterme selection", payload);
	wc.publish("betterme:selection", payload);
    }

    escape(value) {
	return String(value || "")
	    .replace(/&/g, "&amp;")
	    .replace(/</g, "&lt;")
	    .replace(/>/g, "&gt;")
	    .replace(/"/g, "&quot;")
	    .replace(/'/g, "&#039;");
    }

    static boot() {
	const start = function () {
	    wc.waitForElement("betterme.betterme")
		.then(function (root) {
		    if (!window.bettermeConfig) {
			wc.log("betterme config missing");
			return;
		    }

		    new MtkBetterme(root, window.bettermeConfig);
		})
		.catch(function (error) {
		    wc.log("betterme boot failed", { error: error.message });
		});
	};

	if (window.wc && typeof window.wc.ready === "function") {
	    window.wc.ready(start);
	} else if (document.readyState === "loading") {
	    document.addEventListener("DOMContentLoaded", start, { once: true });
	} else {
	    start();
	}
    }
}

window.MtkBetterme = MtkBetterme;
MtkBetterme.boot();
