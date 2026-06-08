(function () {
  "use strict";

  window.wc = window.wc || {};

  const topics = {};

  wc.log = function (...data) {
    return console.log(...data);
  };

  wc.info = function (...data) {
    return console.info(...data);
  };

  wc.warn = function (...data) {
    return console.warn(...data);
  };

  wc.error = function (...data) {
    return console.error(...data);
  };

  wc.publish = function (topic, payload) {
    const subscriptions = topics[topic] || [];
    subscriptions.forEach((callback) => {
      window.setTimeout(() => callback(payload), 0);
    });
    return subscriptions.length > 0;
  };

  wc.publishSync = function (topic, payload) {
    const subscriptions = topics[topic] || [];
    subscriptions.forEach((callback) => callback(payload));
    return subscriptions.length > 0;
  };

  wc.subscribe = function (topic, callback) {
    if (typeof callback !== "function") {
      return false;
    }
    topics[topic] = topics[topic] || [];
    topics[topic].push(callback);
    return topic + ":" + topics[topic].length;
  };

  wc.unsubscribe = function (token) {
    if (!token || token.indexOf(":") === -1) {
      return false;
    }
    const topic = token.split(":").slice(0, -1).join(":");
    const index = Number(token.split(":").pop()) - 1;
    if (!topics[topic] || !topics[topic][index]) {
      return false;
    }
    topics[topic].splice(index, 1);
    return true;
  };

  wc.getAttributes = function (node) {
    return Array.from(node.attributes || []).reduce((attrs, attr) => {
      attrs[attr.name] = attr.value;
      return attrs;
    }, {});
  };

  wc.waitForElement = function (selector, root = document, timeout = 8000) {
    return new Promise((resolve, reject) => {
      const found = root.querySelector(selector);
      if (found) {
        resolve(found);
        return;
      }

      const observer = new MutationObserver(() => {
        const node = root.querySelector(selector);
        if (node) {
          observer.disconnect();
          resolve(node);
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });

      window.setTimeout(() => {
        observer.disconnect();
        reject(new Error("Element not found: " + selector));
      }, timeout);
    });
  };

  wc.fetch = async function (url) {
    wc.log("wc.fetch", { url: url });
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error("HTTP error " + response.status);
    }
    return response.json();
  };

  class WcInclude extends HTMLElement {
    connectedCallback() {
      const href = this.getAttribute("href");
      if (!href) {
        return;
      }

      this.dispatchEvent(new CustomEvent("include:before-load", {
        bubbles: true,
        composed: true,
        detail: { href: href, include: this }
      }));

      fetch(href, { cache: "no-cache" })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Page not found: " + href);
          }
          return response.text();
        })
        .then((html) => {
          this.innerHTML = html;
          this.dispatchEvent(new CustomEvent("include:loaded", {
            bubbles: true,
            composed: true,
            detail: { href: href, include: this }
          }));
          wc.log("wc-include loaded", { href: href });
          wc.publish("wc.include.loaded", { href: href, include: this });
        })
        .catch((error) => {
          wc.error("wc-include error", error);
          this.textContent = "wc-include: " + error.message;
        });
    }
  }

  if (!customElements.get("wc-include")) {
    customElements.define("wc-include", WcInclude);
  }
}());
