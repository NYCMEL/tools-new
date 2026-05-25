window.wc = window.wc || {};
window.wc.session = window.wc.session || {};
window.wc.local = window.wc.local || {};
window.wcENV = window.wcENV || "prod";
window.wcAPP = window.wcAPP || "NOT-SET";
window.wcURL = window.wcURL || "http://www.melify.com/tk/lib/components/w";

if (typeof console === "undefined") {
  window.console = { log: function(){}, group: function(){}, groupEnd: function(){}, info: function(){}, warn: function(){}, error: function(){} };
}

wc.log = function (...data) { return console.log(...data); };
wc.group = function (...data) { return console.group(...data); };
wc.groupEnd = function (...data) { return console.groupEnd(...data); };
wc.info = function (...data) { return console.info(...data); };
wc.warn = function (...data) { return console.warn(...data); };
wc.error = function (...data) { return console.error(...data); };

wc.publish = function (name, payload) {
  document.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: payload || {} }));
};

wc.subscribe = function (name, handler) {
  document.addEventListener(name, handler, false);
  return function () { document.removeEventListener(name, handler, false); };
};

class WCInclude extends HTMLElement {
  connectedCallback() {
    const href = this.getAttribute("href");
    if (!href) { return; }
    fetch(href, { credentials: "same-origin" })
      .then((response) => {
        if (!response.ok) { throw new Error("Unable to include " + href); }
        return response.text();
      })
      .then((html) => {
        this.innerHTML = html;
        wc.publish("wc-include:loaded", { href: href, target: this });
      })
      .catch((error) => wc.error(error));
  }
}

if (!customElements.get("wc-include")) {
  customElements.define("wc-include", WCInclude);
}
