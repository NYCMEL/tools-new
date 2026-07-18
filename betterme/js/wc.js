(function () {
  "use strict";

  const topics = Object.create(null);

  function log(label, payload) {
    if (window.console && typeof window.console.log === "function") {
      window.console.log("[wc]", label, payload || "");
    }
  }

  function publish(topic, payload) {
    const message = {
      topic: topic,
      payload: payload || {},
      timestamp: new Date().toISOString()
    };

    (topics[topic] || []).forEach(function (handler) {
      try {
        handler(message);
      } catch (error) {
        log("subscriber error", { topic: topic, error: error });
      }
    });

    return message;
  }

  function subscribe(topic, handler) {
    if (!topics[topic]) {
      topics[topic] = [];
    }

    topics[topic].push(handler);

    return function unsubscribe() {
      topics[topic] = topics[topic].filter(function (item) {
        return item !== handler;
      });
    };
  }

  function query(selector, root) {
    return (root || document).querySelector(selector);
  }

  function queryAll(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }

    callback();
  }

  function waitForElement(selector, root, timeout) {
    const scope = root || document;
    const maxWait = typeof timeout === "number" ? timeout : 8000;

    return new Promise(function (resolve, reject) {
      const found = scope.querySelector(selector);

      if (found) {
        resolve(found);
        return;
      }

      const observer = new MutationObserver(function () {
        const element = scope.querySelector(selector);

        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(scope === document ? document.documentElement : scope, {
        childList: true,
        subtree: true
      });

      window.setTimeout(function () {
        observer.disconnect();
        reject(new Error("Element not found: " + selector));
      }, maxWait);
    });
  }

  function includeOne(element) {
    const href = element.getAttribute("href");

    if (!href) {
      return Promise.resolve();
    }

    return fetch(href, { cache: "no-cache" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Unable to include " + href);
        }

        return response.text();
      })
      .then(function (html) {
        const template = document.createElement("template");
        template.innerHTML = html.trim();
        element.replaceWith(template.content.cloneNode(true));
        log("wc-include loaded", { href: href });
        publish("wc:include:loaded", { href: href });
      });
  }

  function include(root) {
    const includes = queryAll("wc-include", root || document);
    return Promise.all(includes.map(includeOne)).then(function () {
      publish("wc:includes:ready", { count: includes.length });
    });
  }

  window.wc = window.wc || {};
  window.wc.log = window.wc.log || log;
  window.wc.publish = window.wc.publish || publish;
  window.wc.subscribe = window.wc.subscribe || subscribe;
  window.wc.query = window.wc.query || query;
  window.wc.queryAll = window.wc.queryAll || queryAll;
  window.wc.ready = window.wc.ready || ready;
  window.wc.waitForElement = window.wc.waitForElement || waitForElement;
  window.wc.include = window.wc.include || include;

  ready(function () {
    include(document).catch(function (error) {
      log("wc-include error", { error: error.message });
    });
  });
}());
