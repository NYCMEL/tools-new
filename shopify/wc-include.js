class WcInclude extends HTMLElement {
  connectedCallback() {
    this.load();
  }

  static get observedAttributes() {
    return ["href"];
  }

  attributeChangedCallback() {
    if (this.isConnected) {
      this.load();
    }
  }

  async load() {
    const href = this.getAttribute("href");
    if (!href) return;

    try {
      const response = await fetch(href, { cache: "no-cache" });
      if (!response.ok) {
        throw new Error(`Unable to load ${href}`);
      }

      this.innerHTML = await response.text();

      this.dispatchEvent(new CustomEvent("wc-include-loaded", {
        bubbles: true,
        detail: { href }
      }));
    } catch (error) {
      console.error(error);
      this.innerHTML = "";
    }
  }
}

if (!customElements.get("wc-include")) {
  customElements.define("wc-include", WcInclude);
}

window.wc = window.wc || {};

if (typeof window.wc.log !== "function") {
  window.wc.log = function log() {
    console.log.apply(console, arguments);
  };
}

if (typeof window.wc.publish !== "function") {
  window.wc.publish = function publish(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
  };
}

if (typeof window.wc.subscribe !== "function") {
  window.wc.subscribe = function subscribe(name, callback) {
    document.addEventListener(name, function onEvent(event) {
      callback(event.detail);
    });
  };
}
