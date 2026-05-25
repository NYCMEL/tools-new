(function () {
  'use strict';

  window.wc = window.wc || {};
  window.wcAPP = window.wcAPP || 'mtk-gallery';
  window.wcURL = window.wcURL || '';

  wc.log = function () { return console.log.apply(console, arguments); };
  wc.info = function () { return console.info.apply(console, arguments); };
  wc.warn = function () { return console.warn.apply(console, arguments); };
  wc.error = function () { return console.error.apply(console, arguments); };
  wc.group = function () { return console.group.apply(console, arguments); };
  wc.groupEnd = function () { return console.groupEnd.apply(console, arguments); };

  var messages = {};
  var lastUid = -1;
  var allTopic = '*';

  function hasDirectSubscribers(topic) {
    return Object.prototype.hasOwnProperty.call(messages, topic) && Object.keys(messages[topic]).length > 0;
  }

  function hasSubscribers(topic) {
    var current = String(topic);
    if (hasDirectSubscribers(current) || hasDirectSubscribers(allTopic)) return true;
    var position = current.lastIndexOf('.');
    while (position !== -1) {
      current = current.substring(0, position);
      if (hasDirectSubscribers(current)) return true;
      position = current.lastIndexOf('.');
    }
    return false;
  }

  function deliver(originalTopic, matchedTopic, data) {
    if (!messages[matchedTopic]) return;
    Object.keys(messages[matchedTopic]).forEach(function (token) {
      try {
        messages[matchedTopic][token](originalTopic, data);
      } catch (error) {
        setTimeout(function () { throw error; }, 0);
      }
    });
  }

  function publish(topic, data) {
    topic = typeof topic === 'symbol' ? topic.toString() : String(topic);
    if (!hasSubscribers(topic)) return false;
    setTimeout(function () {
      var current = topic;
      deliver(topic, current, data);
      var position = current.lastIndexOf('.');
      while (position !== -1) {
        current = current.substring(0, position);
        deliver(topic, current, data);
        position = current.lastIndexOf('.');
      }
      deliver(topic, allTopic, data);
    }, 0);
    return true;
  }

  function publishSync(topic, data) {
    topic = typeof topic === 'symbol' ? topic.toString() : String(topic);
    if (!hasSubscribers(topic)) return false;
    var current = topic;
    deliver(topic, current, data);
    var position = current.lastIndexOf('.');
    while (position !== -1) {
      current = current.substring(0, position);
      deliver(topic, current, data);
      position = current.lastIndexOf('.');
    }
    deliver(topic, allTopic, data);
    return true;
  }

  function subscribe(topic, callback) {
    if (typeof callback !== 'function') return false;
    topic = typeof topic === 'symbol' ? topic.toString() : String(topic);
    messages[topic] = messages[topic] || {};
    var token = 'uid_' + String(++lastUid);
    messages[topic][token] = callback;
    return token;
  }

  function unsubscribe(value) {
    var removed = false;
    Object.keys(messages).forEach(function (topic) {
      if (messages[topic][value]) {
        delete messages[topic][value];
        removed = value;
      }
      if (topic.indexOf(value) === 0) {
        delete messages[topic];
        removed = true;
      }
    });
    return removed;
  }

  window.PubSub = window.PubSub || {};
  window.PubSub.publish = publish;
  window.PubSub.publishSync = publishSync;
  window.PubSub.subscribe = subscribe;
  window.PubSub.unsubscribe = unsubscribe;
  window.PubSub.subscribeAll = function (callback) { return subscribe(allTopic, callback); };

  window.publish = publish;
  wc.publish = publish;
  wc.publishSync = publishSync;
  wc.subscribe = subscribe;

  if (!window.customElements.get('wc-include')) {
    class Include extends HTMLElement {
      connectedCallback() {
        var href = this.getAttribute('href');
        var self = this;
        if (!href) return;
        function load() {
          self.dispatchEvent(new CustomEvent('include:before-load', { detail: { href: href, include: self }, bubbles: true, composed: true }));
          fetch(href, { cache: 'no-cache' })
            .then(function (response) {
              if (!response.ok) throw new Error('Page not found: ' + href);
              return response.text();
            })
            .then(function (html) {
              self.innerHTML = html;
              Array.prototype.slice.call(self.querySelectorAll('script')).forEach(function (oldScript) {
                var script = document.createElement('script');
                Array.prototype.slice.call(oldScript.attributes).forEach(function (attr) { script.setAttribute(attr.name, attr.value); });
                script.textContent = oldScript.textContent || '';
                oldScript.parentNode.replaceChild(script, oldScript);
              });
              self.dispatchEvent(new CustomEvent('include:loaded', { detail: { href: href, include: self }, bubbles: true, composed: true }));
            })
            .catch(function (error) {
              if (!self.innerHTML.trim()) { self.innerHTML = '<p role="alert">wc-include: ' + error.message + '</p>'; }
              self.dispatchEvent(new CustomEvent('include:loaded', { detail: { href: href, include: self, error: error }, bubbles: true, composed: true }));
              wc.error(error);
            });
        }
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', load, { once: true });
        } else {
          load();
        }
      }
    }
    window.customElements.define('wc-include', Include);
  }
}());
