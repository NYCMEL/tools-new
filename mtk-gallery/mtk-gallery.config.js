(function () {
  "use strict";

  const artSvg = function (a, b, c, label) {
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent([
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 700" role="img" aria-label="' + label + '">',
      '<rect width="900" height="700" fill="' + a + '"/>',
      '<circle cx="230" cy="190" r="120" fill="' + b + '" opacity="0.88"/>',
      '<path d="M95 565 C220 360 355 620 510 405 S725 340 830 565 Z" fill="' + c + '" opacity="0.9"/>',
      '<path d="M105 120 C260 40 355 210 495 135 S685 35 815 145" fill="none" stroke="#fff" stroke-width="28" stroke-linecap="round" opacity="0.55"/>',
      '</svg>'
    ].join(''));
  };

  window.mtkGalleryConfig = {
    app: {
      name: "mtk-gallery",
      title: "Madam Mina's Artwork",
      subtitle: "Original hand-painted artwork for homes, studios, and collectors.",
      currency: "USD",
      locale: "en-US",
      paypalSellerEmail: "seller@example.com",
      paypalBusinessName: "Madam Mina's Artwork",
      storageKey: "mtk-gallery.paintings.v1",
      adminSessionKey: "mtk-gallery.admin.session.v1"
    },
    api: {
      mode: "local-config",
      endpoints: {
        paintings: "paintings",
        offers: "offers",
        requests: "requests"
      },
      sqlite: {
        enabled: false,
        note: "No server mode stores UI data in this config and browser localStorage. Use the matching SQLite table names when a server adapter is added.",
        tables: ["paintings", "offers", "requests"]
      }
    },
    admin: {
      username: "admin",
      password: "test"
    },
    paintings: [
      {
        id: "mina-001",
        title: "Morning Garden",
        description: "A bright hand-painted floral scene with soft layered brushwork and warm movement.",
        image: artSvg("#f9efe7", "#e48a7b", "#588157", "Morning Garden"),
        price: 425,
        availability: "available",
        dimensions: "24 x 30 in",
        medium: "Acrylic on canvas",
        category: "Floral",
        paypal: { itemName: "Morning Garden", sku: "MINA-001", shipping: 0 }
      },
      {
        id: "mina-002",
        title: "Blue Market Afternoon",
        description: "Cool blue tones meet expressive market shapes in a calm city-inspired composition.",
        image: artSvg("#eaf4ff", "#3f88c5", "#284b63", "Blue Market Afternoon"),
        price: 560,
        availability: "available",
        dimensions: "30 x 40 in",
        medium: "Oil on canvas",
        category: "City",
        paypal: { itemName: "Blue Market Afternoon", sku: "MINA-002", shipping: 0 }
      },
      {
        id: "mina-003",
        title: "Pomegranate Moon",
        description: "Deep reds and gold accents arranged around a quiet moonlit centerpiece.",
        image: artSvg("#2b1a1f", "#b23a48", "#f2cc8f", "Pomegranate Moon"),
        price: 780,
        availability: "available",
        dimensions: "36 x 36 in",
        medium: "Mixed media on canvas",
        category: "Abstract",
        paypal: { itemName: "Pomegranate Moon", sku: "MINA-003", shipping: 0 }
      },
      {
        id: "mina-004",
        title: "Quiet Harbor",
        description: "A soft coastal painting with muted light, gentle water, and distant harbor forms.",
        image: artSvg("#edf6f9", "#83c5be", "#006d77", "Quiet Harbor"),
        price: 640,
        availability: "unavailable",
        dimensions: "28 x 34 in",
        medium: "Watercolor and gouache",
        category: "Landscape",
        paypal: { itemName: "Quiet Harbor", sku: "MINA-004", shipping: 0 }
      },
      {
        id: "mina-005",
        title: "Persian Window",
        description: "Pattern, color, and memory combine in a decorative architectural study.",
        image: artSvg("#fff3b0", "#9e2a2b", "#335c67", "Persian Window"),
        price: 910,
        availability: "available",
        dimensions: "40 x 48 in",
        medium: "Acrylic and ink on canvas",
        category: "Pattern",
        paypal: { itemName: "Persian Window", sku: "MINA-005", shipping: 0 }
      },
      {
        id: "mina-006",
        title: "Lavender Field Study",
        description: "A compact study of lavender rows, soft wind, and late afternoon color.",
        image: artSvg("#f6f0ff", "#9d4edd", "#7f5539", "Lavender Field Study"),
        price: 350,
        availability: "unavailable",
        dimensions: "18 x 24 in",
        medium: "Acrylic on wood panel",
        category: "Landscape",
        paypal: { itemName: "Lavender Field Study", sku: "MINA-006", shipping: 0 }
      }
    ],
    forms: {
      offerFields: ["name", "email", "offer", "message"],
      requestFields: ["name", "email", "budget", "message"]
    }
  };
}());
