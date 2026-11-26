const loginView = document.querySelector("#login-view");
const dashboardView = document.querySelector("#dashboard-view");
const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const logoutBtn = document.querySelector("#logout-btn");

const ordersList = document.querySelector("#orders-list");
const statusMessage = document.querySelector("#orders-status");
const refreshButton = document.querySelector("#refresh-orders");
const paymentFilter = document.querySelector("#payment-filter");
const exportBtn = document.querySelector("#export-csv");

let loadedOrders = [];
let chartInstance = null;
let refreshTimer = null;

function getToken() {
  return localStorage.getItem("adminToken");
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${getToken()}`
  };
}

function addTextElement(parent, tagName, className, value) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = value;
  parent.append(element);
  return element;
}

// 1. Login & Auth State Check
function checkAuth() {
  if (getToken()) {
    loginView.classList.add("hidden");
    dashboardView.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    loadAllData();
    if (!refreshTimer) {
      refreshTimer = window.setInterval(() => {
        if (!document.hidden && getToken()) loadAllData();
      }, 15000);
    }
  } else {
    loginView.classList.remove("hidden");
    dashboardView.classList.add("hidden");
    logoutBtn.classList.add("hidden");
    if (refreshTimer) {
      window.clearInterval(refreshTimer);
      refreshTimer = null;
    }
  }
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "Logging in...";
  const email = document.querySelector("#login-email").value;
  const password = document.querySelector("#login-password").value;

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok || !data.token) {
      throw new Error(data.message || "Invalid email or password");
    }
    localStorage.setItem("adminToken", data.token);
    loginError.textContent = "";
    checkAuth();
  } catch (err) {
    loginError.textContent = err.message;
  }
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("adminToken");
  checkAuth();
});

// 2. Load Dashboard Stats, Chart & Low Stock
async function loadDashboardStats() {
  const res = await fetch("/api/analytics/dashboard", { headers: authHeaders() });
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem("adminToken");
    checkAuth();
    throw new Error("Admin access required. Please login with an admin account.");
  }
  if (!res.ok) throw new Error("Could not load dashboard statistics.");
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "Could not load dashboard statistics.");

  document.querySelector("#stat-collected").textContent = `₹${(data.stats.totalCollectedRevenue || 0).toLocaleString("en-IN")}`;
  document.querySelector("#stat-pending").textContent = `₹${(data.stats.pendingRevenue || 0).toLocaleString("en-IN")}`;
  document.querySelector("#stat-total-orders").textContent = data.stats.totalOrders || 0;
  document.querySelector("#stat-delivered").textContent = data.stats.deliveredOrders || 0;

  // Low Stock
  const stockList = document.querySelector("#low-stock-list");
  stockList.replaceChildren();
  if (data.lowStockProducts && data.lowStockProducts.length > 0) {
    data.lowStockProducts.forEach((p) => {
      addTextElement(stockList, "li", "", `${p.name} — Only ${p.stock} left!`);
    });
  } else {
    addTextElement(stockList, "li", "", "✅ All rice varieties are well stocked.");
  }

  // Monthly Chart
  const ctx = document.querySelector("#revenue-chart").getContext("2d");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const labels = (data.monthlyTrend || []).map((m) => `${monthNames[m._id.month - 1]} ${m._id.year}`);
  const values = (data.monthlyTrend || []).map((m) => m.revenue);

  if (chartInstance) chartInstance.destroy();
  if (window.Chart) chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "Revenue (₹)", data: values, backgroundColor: "#2e7d32" }]
    }
  });
}

// 3. Render Orders in Your Existing Card Style
function renderOrders(orders) {
  ordersList.replaceChildren();
  if (orders.length === 0) {
    addTextElement(ordersList, "p", "empty-state", "No orders found for this filter.");
    return;
  }

  orders.forEach((order) => {
    const card = document.createElement("article");
    card.className = "order-card";

    const header = document.createElement("div");
    header.className = "order-card-header";
    const identity = document.createElement("div");
    const customerName = order.address?.fullName || "Customer";
    addTextElement(identity, "h2", "", customerName);
    addTextElement(identity, "p", "order-id", `ID: ${order._id} • Mode: ${order.paymentMethod || "COD"}`);

    const timestamp = document.createElement("time");
    timestamp.dateTime = order.createdAt;
    timestamp.textContent = new Date(order.createdAt).toLocaleString("en-IN");

    const payBadge = addTextElement(
      header,
      "span",
      "order-status",
      `${(order.paymentStatus || "pending").toUpperCase()} | ${(order.status || "pending").toUpperCase()}`
    );
    header.append(identity, timestamp, payBadge);
    card.append(header);

    const addrText = `${order.address?.street || ""}, ${order.address?.city || ""} - ${order.address?.postalCode || ""} ${order.address?.phone ? "| 📞 " + order.address.phone : ""}`;
    addTextElement(card, "p", "customer-details", addrText);
    addTextElement(card, "p", "order-total", `Order Total: ₹${order.totalAmount.toLocaleString("en-IN")}`);
    const items = document.createElement("ul");
    items.className = "customer-details";
    (order.items || []).forEach((item) => {
      const name = item.name || item.productId?.name || "Rice";
      addTextElement(items, "li", "", `${item.quantity} × ${name}${item.weight ? ` (${item.weight} kg)` : ""}`);
    });
    card.append(items);

    // Actions Row (Collect COD Cash + Delivery Status + WhatsApp)
    const actions = document.createElement("div");
    actions.className = "card-actions";

    // Delivery Status Dropdown
    const statusSelect = document.createElement("select");
    ["pending", "shipped", "delivered", "cancelled"].forEach((st) => {
      const opt = document.createElement("option");
      opt.value = st;
      opt.textContent = `Delivery: ${st.toUpperCase()}`;
      if (order.status === st) opt.selected = true;
      statusSelect.append(opt);
    });
    statusSelect.addEventListener("change", async () => {
      const response = await fetch(`/api/analytics/order-status/${order._id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status: statusSelect.value })
      });
      if (!response.ok) {
        const result = await response.json();
        statusMessage.textContent = result.message || "Could not update order status.";
      }
      loadAllData();
    });
    actions.append(statusSelect);

    // Collect Cash Button for COD
    if (order.paymentMethod === "COD" && order.paymentStatus === "pending") {
      const cashBtn = addTextElement(actions, "button", "btn-cash", "💵 Collect COD Cash");
      cashBtn.type = "button";
      cashBtn.addEventListener("click", async () => {
        if (!confirm(`Confirm cash collection of ₹${order.totalAmount} from ${customerName}?`)) return;
        const response = await fetch(`/api/analytics/collect-payment/${order._id}`, {
          method: "PATCH",
          headers: authHeaders()
        });
        if (!response.ok) {
          const result = await response.json();
          statusMessage.textContent = result.message || "Could not mark COD payment as collected.";
          return;
        }
        loadAllData();
      });
    }

    // WhatsApp Update Link
    if (order.address?.phone) {
      const waLink = addTextElement(actions, "a", "btn-wa", "📲 Send WhatsApp Update");
      const msg = encodeURIComponent(`Namaste ${customerName}, Gayatri Traders se aapka ₹${order.totalAmount} ka Rice Order abhi "${order.status.toUpperCase()}" hai. Dhanyavaad!`);
      const phone = order.address.phone.replace(/\D/g, "");
      waLink.href = `https://wa.me/${phone.length === 10 ? `91${phone}` : phone}?text=${msg}`;
      waLink.target = "_blank";
    }

    card.append(actions);
    ordersList.append(card);
  });
}

// 4. Load Transactions & Combine Everything
async function loadOrders() {
  refreshButton.disabled = true;
  statusMessage.textContent = "Loading revenue & orders...";
  try {
    const filter = paymentFilter.value;
    const url = filter
      ? `/api/analytics/revenue-collection?paymentStatus=${filter}`
      : `/api/analytics/revenue-collection`;

    const response = await fetch(url, { headers: authHeaders(), cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Could not load orders.");

    loadedOrders = result.transactions || [];
    renderOrders(loadedOrders);
    statusMessage.textContent = `${loadedOrders.length} order${loadedOrders.length === 1 ? "" : "s"} shown`;
  } catch (error) {
    statusMessage.textContent = `Error: ${error.message}`;
  } finally {
    refreshButton.disabled = false;
  }
}

async function loadAllData() {
  try {
    await Promise.all([loadDashboardStats(), loadOrders()]);
  } catch (err) {
    statusMessage.textContent = err.message;
  }
}

// Export Excel / CSV
exportBtn.addEventListener("click", () => {
  let csv = "Order ID,Customer,City,Phone,Amount (INR),Payment Mode,Payment Status,Delivery Status,Date\n";
  loadedOrders.forEach((o) => {
    csv += `"${o._id}","${o.address?.fullName || ""}","${o.address?.city || ""}","${o.address?.phone || ""}",${o.totalAmount},"${o.paymentMethod || "COD"}","${o.paymentStatus}","${o.status}","${new Date(o.createdAt).toLocaleDateString("en-IN")}"\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Gayatri_Traders_Revenue_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
});

refreshButton.addEventListener("click", loadAllData);
paymentFilter.addEventListener("change", loadOrders);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && getToken()) loadAllData();
});

// Initialize
checkAuth();
