window.wc = window.wc || {};
wc.log = wc.log || function () { return console.log.apply(console, arguments); };
wc.publish = wc.publish || function (name, data) {
  return window.dispatchEvent(new CustomEvent(name, { detail: data }));
};
wc.subscribe = wc.subscribe || function (name, callback) {
  window.addEventListener(name, function (event) {
    callback(name, event.detail);
  });
};

class Include extends HTMLElement {
  connectedCallback() {
    const href = this.getAttribute("href");
    if (!href) return;

    this.innerHTML = "<span class='wc-loading-img'></span>";

    fetch(href, { cache: "no-cache" })
      .then((response) => {
        if (!response.ok) throw new Error("wc-include: Page not found: " + href);
        return response.text();
      })
      .then((html) => {
        this.innerHTML = html;
        this.dispatchEvent(new CustomEvent("include:loaded", {
          detail: { href: href, include: this },
          bubbles: true,
          composed: true
        }));
      })
      .catch((error) => {
        this.innerHTML = error.message;
        console.error(error);
      });
  }
}

if (!window.customElements.get("wc-include")) {
  window.customElements.define("wc-include", Include);
}
