/* mtk-mina.config.js — JSON-driven configuration */
window.mtkMinaConfig = {
  title: "Hand-Painted Originals",
  subtitle: "Each piece painted by hand. One-of-a-kind.",
  currency: "USD",
  paypal: {
    clientId: "sb", // sandbox; replace with live client id
    mode: "sandbox"
  },
  api: {
    baseUrl: "/api"
  },
  events: {
    publish: {
      open:        "mtk-mina:open",
      close:       "mtk-mina:close",
      counter:     "mtk-mina:counter-offer",
      buy:         "mtk-mina:buy",
      similar:     "mtk-mina:request-similar"
    },
    subscribe: [
      "mtk-mina:refresh",
      "mtk-mina:offer-reply",
      "mtk-mina:order-status",
      "mtk-mina:admin-update"
    ]
  },
  ui: {
    grid: { cols: { xs: 1, sm: 2, md: 3, lg: 4 } },
    showSoldBadge: true,
    labels: {
      buy: "Buy with PayPal",
      counter: "Make Counter Offer",
      similar: "Request a Similar Painting",
      sold: "Sold",
      unavailable: "Unavailable",
      detail: "View details",
      close: "Close",
      submit: "Submit",
      yourEmail: "Your email",
      yourOffer: "Your offer",
      message: "Message (optional)"
    }
  }
};
