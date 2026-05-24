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
    baseUrl: ""
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
  },
  items: [
  {
    "id": 1,
    "title": "Floral Study No. 1",
    "description": "Original one-of-a-kind hand painting. Signed by the artist.",
    "medium": "Acrylic on canvas",
    "size": "16\" × 20\"",
    "year": 2024,
    "price": 101,
    "image": "./public/images/painting-01.jpg",
    "available": true
  },
  {
    "id": 2,
    "title": "Landscape Study No. 2",
    "description": "Original one-of-a-kind hand painting. Signed by the artist.",
    "medium": "Mixed media",
    "size": "18\" × 24\"",
    "year": 2024,
    "price": 122,
    "image": "./public/images/painting-02.jpg",
    "available": true
  },
  {
    "id": 3,
    "title": "Portrait Study No. 3",
    "description": "Original one-of-a-kind hand painting. Signed by the artist.",
    "medium": "Watercolor",
    "size": "24\" × 36\"",
    "year": 2024,
    "price": 143,
    "image": "./public/images/painting-03.jpg",
    "available": true
  },
  {
    "id": 4,
    "title": "Cubist Study No. 4",
    "description": "Original one-of-a-kind hand painting. Signed by the artist.",
    "medium": "Oil on canvas",
    "size": "12\" × 16\"",
    "year": 2024,
    "price": 164,
    "image": "./public/images/painting-04.jpg",
    "available": true
  },
  {
    "id": 5,
    "title": "Abstract Study No. 5",
    "description": "Original one-of-a-kind hand painting. Signed by the artist.",
    "medium": "Acrylic on canvas",
    "size": "16\" × 20\"",
    "year": 2024,
    "price": 185,
    "image": "./public/images/painting-05.jpg",
    "available": true
  },
  {
    "id": 6,
    "title": "Floral Study No. 6",
    "description": "Original one-of-a-kind hand painting. Signed by the artist.",
    "medium": "Mixed media",
    "size": "18\" × 24\"",
    "year": 2024,
    "price": 206,
    "image": "./public/images/painting-06.jpg",
    "available": true
  },
  {
    "id": 7,
    "title": "Landscape Study No. 7",
    "description": "Original one-of-a-kind hand painting. Signed by the artist.",
    "medium": "Watercolor",
    "size": "24\" × 36\"",
    "year": 2024,
    "price": 227,
    "image": "./public/images/painting-07.jpg",
    "available": false
  },
  {
    "id": 8,
    "title": "Portrait Study No. 8",
    "description": "Original one-of-a-kind hand painting. Signed by the artist.",
    "medium": "Oil on canvas",
    "size": "12\" × 16\"",
    "year": 2024,
    "price": 248,
    "image": "./public/images/painting-08.jpg",
    "available": true
  },
  {
    "id": 9,
    "title": "Cubist Study No. 9",
    "description": "Original one-of-a-kind hand painting. Signed by the artist.",
    "medium": "Acrylic on canvas",
    "size": "16\" × 20\"",
    "year": 2024,
    "price": 269,
    "image": "./public/images/painting-09.jpg",
    "available": true
  },
  {
    "id": 10,
    "title": "Abstract Study No. 10",
    "description": "Original one-of-a-kind hand painting. Signed by the artist.",
    "medium": "Mixed media",
    "size": "18\" × 24\"",
    "year": 2024,
    "price": 290,
    "image": "./public/images/painting-10.jpg",
    "available": true
  },
  {
    "id": 11,
    "title": "Floral Study No. 11",
    "description": "Original one-of-a-kind hand painting. Signed by the artist.",
    "medium": "Watercolor",
    "size": "24\" × 36\"",
    "year": 2024,
    "price": 311,
    "image": "./public/images/painting-11.jpg",
    "available": true
  },
  {
    "id": 12,
    "title": "Landscape Study No. 12",
    "description": "Original one-of-a-kind hand painting. Signed by the artist.",
    "medium": "Oil on canvas",
    "size": "12\" × 16\"",
    "year": 2024,
    "price": 332,
    "image": "./public/images/painting-12.jpg",
    "available": true
  },
  {
    "id": 13,
    "title": "Portrait Study No. 13",
    "description": "Original one-of-a-kind hand painting. Signed by the artist.",
    "medium": "Acrylic on canvas",
    "size": "16\" × 20\"",
    "year": 2024,
    "price": 353,
    "image": "./public/images/painting-13.jpg",
    "available": true
  },
  {
    "id": 14,
    "title": "Cubist Study No. 14",
    "description": "Original one-of-a-kind hand painting. Signed by the artist.",
    "medium": "Mixed media",
    "size": "18\" × 24\"",
    "year": 2024,
    "price": 374,
    "image": "./public/images/painting-14.jpg",
    "available": false
  },
  {
    "id": 15,
    "title": "Abstract Study No. 15",
    "description": "Original one-of-a-kind hand painting. Signed by the artist.",
    "medium": "Watercolor",
    "size": "24\" × 36\"",
    "year": 2024,
    "price": 395,
    "image": "./public/images/painting-15.jpg",
    "available": true
  },
  {
    "id": 16,
    "title": "Floral Study No. 16",
    "description": "Original one-of-a-kind hand painting. Signed by the artist.",
    "medium": "Oil on canvas",
    "size": "12\" × 16\"",
    "year": 2024,
    "price": 416,
    "image": "./public/images/painting-16.jpg",
    "available": true
  },
  {
    "id": 17,
    "title": "Landscape Study No. 17",
    "description": "Original one-of-a-kind hand painting. Signed by the artist.",
    "medium": "Acrylic on canvas",
    "size": "16\" × 20\"",
    "year": 2024,
    "price": 437,
    "image": "./public/images/painting-17.jpg",
    "available": true
  },
  {
    "id": 18,
    "title": "Portrait Study No. 18",
    "description": "Original one-of-a-kind hand painting. Signed by the artist.",
    "medium": "Mixed media",
    "size": "18\" × 24\"",
    "year": 2024,
    "price": 458,
    "image": "./public/images/painting-18.jpg",
    "available": true
  },
  {
    "id": 19,
    "title": "Cubist Study No. 19",
    "description": "Original one-of-a-kind hand painting. Signed by the artist.",
    "medium": "Watercolor",
    "size": "24\" × 36\"",
    "year": 2024,
    "price": 479,
    "image": "./public/images/painting-19.jpg",
    "available": true
  },
  {
    "id": 20,
    "title": "Abstract Study No. 20",
    "description": "Original one-of-a-kind hand painting. Signed by the artist.",
    "medium": "Oil on canvas",
    "size": "12\" × 16\"",
    "year": 2024,
    "price": 500,
    "image": "./public/images/painting-20.jpg",
    "available": true
  }
]
};
