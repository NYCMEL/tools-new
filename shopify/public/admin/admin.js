(async function () {
  const $ = (s) => document.querySelector(s);
  const api = (p, o) => fetch(p, Object.assign({ credentials: "same-origin", headers: { "Content-Type": "application/json" } }, o));

  async function checkAuth() {
    const me = await api("/api/me").then(r => r.json());
    if (me.admin) showDash(); else showLogin();
  }
  function showLogin() { $("#login").hidden = false; $("#dash").hidden = true; }
  function showDash()  { $("#login").hidden = true;  $("#dash").hidden = false; loadItems(); loadOffers(); }

  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const r = await api("/api/login", { method: "POST", body: JSON.stringify({ username: fd.get("username"), password: fd.get("password") }) });
    if (r.ok) checkAuth(); else $("#loginError").hidden = false;
  });

  $("#logoutBtn").addEventListener("click", async () => { await api("/api/logout", { method: "POST" }); showLogin(); });

  async function loadItems() {
    const items = await api("/api/items").then(r => r.json());
    $("#rows").innerHTML = items.map(it => `
      <tr>
        <td>${it.title}</td>
        <td>$${Number(it.price).toFixed(2)}</td>
        <td>${it.available ? "Yes" : "No"}</td>
        <td>
          <button data-edit='${JSON.stringify(it)}'>Edit</button>
          <button data-del="${it.id}">Delete</button>
        </td>
      </tr>`).join("");
    document.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => openDialog(JSON.parse(b.dataset.edit))));
    document.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", async () => {
      if (!confirm("Delete?")) return;
      await api(`/api/admin/items/${b.dataset.del}`, { method: "DELETE" });
      loadItems();
    }));
  }

  async function loadOffers() {
    const offers = await api("/api/admin/offers").then(r => r.json());
    $("#offers").innerHTML = offers.map(o => `
      <tr>
        <td>#${o.item_id}</td><td>${o.email}</td><td>$${o.offer}</td>
        <td>${(o.message || "").replace(/</g, "&lt;")}</td>
        <td>${o.status}</td>
        <td>
          <button data-reply="${o.id}" data-status="accepted">Accept</button>
          <button data-reply="${o.id}" data-status="declined">Decline</button>
        </td>
      </tr>`).join("");
    document.querySelectorAll("[data-reply]").forEach(b => b.addEventListener("click", async () => {
      await api(`/api/admin/offers/${b.dataset.reply}/reply`, { method: "POST", body: JSON.stringify({ status: b.dataset.status }) });
      loadOffers();
    }));
  }

  const dialog = $("#itemDialog");
  $("#newBtn").addEventListener("click", () => openDialog(null));
  $("#cancelBtn").addEventListener("click", () => dialog.close());

  function openDialog(item) {
    const f = $("#itemForm");
    f.reset();
    if (item) {
      $("#dialogTitle").textContent = "Edit Painting";
      f.elements.id.value = item.id;
      f.elements.title.value = item.title;
      f.elements.description.value = item.description || "";
      f.elements.medium.value = item.medium || "";
      f.elements.size.value = item.size || "";
      f.elements.year.value = item.year || "";
      f.elements.price.value = item.price;
      f.elements.image.value = item.image;
      f.elements.available.checked = !!item.available;
    } else {
      $("#dialogTitle").textContent = "New Painting";
      f.elements.available.checked = true;
    }
    dialog.showModal();
  }

  $("#itemForm").addEventListener("submit", async (e) => {
    const f = e.target;
    const payload = {
      title: f.elements.title.value,
      description: f.elements.description.value,
      medium: f.elements.medium.value,
      size: f.elements.size.value,
      year: Number(f.elements.year.value) || null,
      price: Number(f.elements.price.value),
      image: f.elements.image.value,
      available: f.elements.available.checked
    };
    const id = f.elements.id.value;
    if (id) await api(`/api/admin/items/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    else    await api(`/api/admin/items`, { method: "POST", body: JSON.stringify(payload) });
    loadItems();
  });

  checkAuth();
})();
