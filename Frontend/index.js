const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");

menuToggle?.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

mainNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
  });
});

const productShelves = [
  {
    title: "Basmati Rice",
    products: [
      {
        name: "1121 Basmati Rice",
        image: "basmati",
        rate: 160,
        photos: {
          1: "../images/basmati%201121%201kg.jpg",
          5: "../images/basmati%201121%205kg.jpg",
          10: "../images/basmati%201121%2010kg.jpg",
          20: "../images/basmati%201121%2020kg.jpg",
          30: "../images/basmati%201121%2030kg.jpg",
        },
      },
      { name: "1509 Basmati Rice", image: "sella", rate: 135 },
      { name: "Pusa Basmati Rice", image: "sona", rate: 110 },
      { name: "Traditional Basmati Rice", image: "tibar", rate: 190 },
    ],
  },
  {
    title: "Basmati Grades",
    products: [
      { name: "Tibar", image: "tibar", rate: 105 },
      { name: "Dubar", image: "dubar", rate: 85 },
      { name: "Mogra", image: "rozana", rate: 70 },
    ],
  },
  {
    title: "Biryani Special",
    products: [
      { name: "1121 Basmati Biryani", image: "basmati", rate: 180 },
      { name: "1121 Golden Sella", image: "sella", rate: 165 },
      { name: "1121 Steam", image: "sona", rate: 170 },
      { name: "1509 Basmati", image: "tibar", rate: 135 },
    ],
  },
  {
    title: "Non-Basmati Rice",
    products: [
      { name: "Sona Masoori", image: "sona", rate: 75 },
      { name: "IR 64", image: "dubar", rate: 58 },
      { name: "PR 11", image: "rozana", rate: 65 },
    ],
  },
];

const weights = [1, 5, 10, 20, 30];
const productShelvesElement = document.querySelector("#product-shelves");

function formatPrice(amount) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

productShelvesElement.innerHTML = productShelves.map((shelf) => `
  <section class="product-shelf" aria-label="${shelf.title}">
    <h3 class="shelf-title">${shelf.title}</h3>
    <div class="product-grid">
      ${shelf.products.map((product) => `
        <article class="product-card" data-rate="${product.rate}">
          <button class="product-image product-image-button ${product.image}${product.photos ? " has-photo" : ""}" type="button" aria-label="View ${product.name}, 1 kg pack image full size">
            ${product.photos
              ? `<img class="product-photo" src="${product.photos[1]}" alt="${product.name}, 1 kg pack" loading="lazy">`
              : `<div class="grain-bowl" aria-hidden="true"><i></i><i></i><i></i></div>`}
          </button>
          <div class="product-info">
            <p>${shelf.title}</p>
            <h4>${product.name}</h4>
            <div class="weight-options" aria-label="Choose packet weight for ${product.name}">
              ${weights.map((weight, index) => `<button class="${index === 0 ? "active" : ""}" type="button" data-weight="${weight}"${product.photos ? ` data-image-src="${product.photos[weight]}"` : ""} aria-pressed="${index === 0}">${weight} kg</button>`).join("")}
            </div>
            <div class="product-buy">
              <div class="price-block">
                <strong>${formatPrice(product.rate)} / kg</strong>
                <span class="pack-price">Pack: ${formatPrice(product.rate)}</span>
              </div>
              <a href="#contact" aria-label="Contact us about ${product.name}">Details ↗</a>
            </div>
            <div class="product-actions">
              <button class="add-to-cart" type="button">Add to Cart</button>
              <button class="buy-now" type="button">Buy Now</button>
            </div>
          </div>
        </article>
      `).join("")}
    </div>
  </section>
`).join("");

const cart = [];
let pendingOrderItems = [];

const cartDialog = document.querySelector("#cart-dialog");
const cartItemsElement = document.querySelector("#cart-items");
const cartCount = document.querySelector("#cart-count");
const cartTotal = document.querySelector("#cart-total");
const checkoutCart = document.querySelector("#checkout-cart");
const orderDialog = document.querySelector("#order-dialog");
const orderForm = document.querySelector("#order-form");
const orderSummary = document.querySelector("#order-summary");
const orderStatus = document.querySelector("#order-status");
const orderSubmit = orderForm.querySelector('button[type="submit"]');
const photoDialog = document.querySelector("#photo-dialog");
const imagePreview = document.querySelector("#image-preview");
const photoCaption = document.querySelector("#photo-caption");
const authStatus = document.querySelector("#auth-status");
const authSetupNote = document.querySelector("#auth-setup-note");
const googleSignInButton = document.querySelector("#google-signin-button");
const emailRegisterForm = document.querySelector("#email-register-form");
const emailVerifyForm = document.querySelector("#email-verify-form");
const emailLoginForm = document.querySelector("#email-login-form");

function getSelectedProduct(card) {
  return {
    name: card.querySelector("h4").textContent,
    weight: Number(card.querySelector(".weight-options button.active").dataset.weight),
    rate: Number(card.dataset.rate),
  };
}

function renderCart() {
  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
  const estimatedTotal = cart.reduce((total, item) => total + item.rate * item.weight * item.quantity, 0);
  cartCount.textContent = String(totalItems);
  cartTotal.textContent = formatPrice(estimatedTotal);
  checkoutCart.disabled = cart.length === 0;
  cartItemsElement.replaceChildren();

  if (cart.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "cart-empty";
    emptyMessage.textContent = "Your cart is empty. Choose a rice variety to get started.";
    cartItemsElement.append(emptyMessage);
    return;
  }

  cart.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "cart-item";
    const details = document.createElement("div");
    details.className = "cart-item-details";
    const name = document.createElement("strong");
    name.textContent = item.name;
    const pack = document.createElement("span");
    pack.textContent = `${item.quantity} × ${item.weight} kg · ${formatPrice(item.rate * item.weight * item.quantity)}`;
    details.append(name, pack);

    const quantity = document.createElement("div");
    quantity.className = "cart-quantity";
    const decrement = document.createElement("button");
    decrement.type = "button";
    decrement.dataset.cartAction = "decrement";
    decrement.dataset.cartIndex = String(index);
    decrement.setAttribute("aria-label", `Remove one ${item.name}`);
    decrement.textContent = "−";
    const quantityValue = document.createElement("span");
    quantityValue.textContent = String(item.quantity);
    const increment = document.createElement("button");
    increment.type = "button";
    increment.dataset.cartAction = "increment";
    increment.dataset.cartIndex = String(index);
    increment.setAttribute("aria-label", `Add one ${item.name}`);
    increment.textContent = "+";
    quantity.append(decrement, quantityValue, increment);
    row.append(details, quantity);
    cartItemsElement.append(row);
  });
}

function renderOrderSummary(items) {
  orderSummary.replaceChildren();
  const list = document.createElement("div");
  list.className = "order-summary-list";
  let total = 0;

  items.forEach((item) => {
    const lineTotal = item.rate * item.weight * item.quantity;
    total += lineTotal;
    const line = document.createElement("p");
    line.textContent = `${item.quantity} × ${item.name}, ${item.weight} kg — ${formatPrice(lineTotal)}`;
    list.append(line);
  });

  const totalLine = document.createElement("strong");
  totalLine.textContent = `Estimated total: ${formatPrice(total)}`;
  orderSummary.append(list, totalLine);
}

function openOrderForm(items) {
  pendingOrderItems = items.map((item) => ({ ...item }));
  orderStatus.textContent = "";
  orderSubmit.disabled = false;
  renderOrderSummary(pendingOrderItems);
  orderDialog.showModal();
}

productShelvesElement.querySelectorAll(".product-card").forEach((card) => {
  const productName = card.querySelector("h4").textContent;
  const productPhoto = card.querySelector(".product-photo");
  const imageButton = card.querySelector(".product-image-button");
  const packPrice = card.querySelector(".pack-price");
  const rate = Number(card.dataset.rate);

  card.querySelectorAll(".weight-options button").forEach((button) => {
    button.addEventListener("click", () => {
      card.querySelectorAll(".weight-options button").forEach((item) => {
        item.classList.remove("active");
        item.setAttribute("aria-pressed", "false");
      });
      button.classList.add("active");
      button.setAttribute("aria-pressed", "true");

      const weight = Number(button.dataset.weight);
      packPrice.textContent = `Pack: ${formatPrice(rate * weight)}`;
      imageButton.setAttribute("aria-label", `View ${productName}, ${weight} kg pack image full size`);
      if (productPhoto && button.dataset.imageSrc) {
        productPhoto.src = button.dataset.imageSrc;
        productPhoto.alt = `${productName}, ${weight} kg pack`;
      }
    });
  });

  imageButton.addEventListener("click", () => {
    const selectedWeight = Number(card.querySelector(".weight-options button.active").dataset.weight);
    imagePreview.replaceChildren();
    if (productPhoto) {
      const enlargedImage = document.createElement("img");
      enlargedImage.className = "zoomed-product-photo";
      enlargedImage.src = productPhoto.currentSrc || productPhoto.src;
      enlargedImage.alt = productPhoto.alt;
      imagePreview.append(enlargedImage);
    } else {
      const visual = document.createElement("div");
      const visualClass = [...imageButton.classList]
        .filter((name) => !["product-image", "product-image-button", "has-photo"].includes(name))
        .join(" ");
      visual.className = `zoomed-placeholder ${visualClass}`;
      const bowl = imageButton.querySelector(".grain-bowl")?.cloneNode(true);
      if (bowl) visual.append(bowl);
      imagePreview.append(visual);
    }
    photoCaption.textContent = `${productName} · ${selectedWeight} kg pack`;
    photoDialog.showModal();
  });

  card.querySelector(".add-to-cart").addEventListener("click", () => {
    const selection = getSelectedProduct(card);
    const existingItem = cart.find((item) => item.name === selection.name && item.weight === selection.weight);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ ...selection, quantity: 1 });
    }
    renderCart();
    cartDialog.showModal();
  });

  card.querySelector(".buy-now").addEventListener("click", () => {
    openOrderForm([{ ...getSelectedProduct(card), quantity: 1 }]);
  });
});

cartItemsElement.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest("button[data-cart-action]");
  if (!button) return;

  const item = cart[Number(button.dataset.cartIndex)];
  if (!item) return;

  if (button.dataset.cartAction === "increment") {
    item.quantity += 1;
  } else {
    item.quantity -= 1;
    if (item.quantity <= 0) cart.splice(cart.indexOf(item), 1);
  }
  renderCart();
});

document.querySelector("#cart-toggle").addEventListener("click", () => cartDialog.showModal());
document.querySelector("#sign-in-toggle").addEventListener("click", () => document.querySelector("#sign-in-dialog").showModal());
document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});

emailRegisterForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(emailRegisterForm);
  const email = String(formData.get("email")).trim();
  try {
    const result = await postJson("/api/auth/register", {
      name: String(formData.get("name")).trim(),
      email,
      password: String(formData.get("password")),
    });
    document.querySelector("#verify-email").value = email;
    authStatus.textContent = result.message;
  } catch (error) {
    authStatus.textContent = error.message;
  }
});

emailVerifyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(emailVerifyForm);
  try {
    const result = await postJson("/api/auth/verify-email", {
      email: String(formData.get("email")).trim(),
      otp: String(formData.get("otp")).trim(),
    });
    completeCustomerSignIn(result);
  } catch (error) {
    authStatus.textContent = error.message;
  }
});

document.querySelector("#resend-verification").addEventListener("click", async () => {
  try {
    const result = await postJson("/api/auth/resend-verification", {
      email: document.querySelector("#verify-email").value.trim(),
    });
    authStatus.textContent = result.message;
  } catch (error) {
    authStatus.textContent = error.message;
  }
});

emailLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(emailLoginForm);
  try {
    const result = await postJson("/api/auth/login", {
      email: String(formData.get("email")).trim(),
      password: String(formData.get("password")),
    });
    completeCustomerSignIn(result);
  } catch (error) {
    authStatus.textContent = error.message;
  }
});

checkoutCart.addEventListener("click", () => {
  if (cart.length === 0) return;
  cartDialog.close();
  openOrderForm(cart);
});

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  orderStatus.textContent = "Submitting your order...";
  orderSubmit.disabled = true;

  const formData = new FormData(orderForm);
  const checkout = {
    customer: {
      name: String(formData.get("name")).trim(),
      email: String(formData.get("email")).trim(),
      phone: String(formData.get("phone")).trim(),
      street: String(formData.get("street")).trim(),
      city: String(formData.get("city")).trim(),
      postalCode: String(formData.get("postalCode")).trim(),
    },
    paymentMethod: String(formData.get("paymentMethod")),
    items: pendingOrderItems.map(({ name, weight, quantity }) => ({ name, weight, quantity })),
  };

  try {
    let orderId;
    if (checkout.paymentMethod === "ONLINE") {
      const paymentOrder = await postJson("/api/payment/order", checkout);
      await loadRazorpayScript();
      await new Promise((resolve, reject) => {
        const razorpay = new window.Razorpay({
          key: paymentOrder.keyId,
          amount: paymentOrder.amount,
          currency: paymentOrder.currency,
          name: "Gayatri Traders",
          description: "Rice order",
          order_id: paymentOrder.razorpayOrderId,
          prefill: {
            name: checkout.customer.name,
            email: checkout.customer.email,
            contact: checkout.customer.phone,
          },
          handler: async (paymentResult) => {
            try {
              await postJson("/api/payment/verify", {
                orderId: paymentOrder.orderId,
                ...paymentResult,
              });
              orderId = paymentOrder.orderId;
              resolve();
            } catch (error) {
              reject(error);
            }
          },
          modal: {
            ondismiss: () => reject(new Error("Payment was cancelled. Your order remains unpaid.")),
          },
        });
        razorpay.on("payment.failed", (paymentError) => {
          reject(new Error(paymentError.error?.description || "Payment failed. Please try again."));
        });
        razorpay.open();
      });
    } else {
      const result = await postJson("/api/orders", checkout);
      orderId = result.orderId;
    }

    if (!orderId) throw new Error("The server did not return an order reference.");
    orderStatus.textContent = `Order saved successfully. Reference: ${orderId}`;
    cart.splice(0, cart.length);
    pendingOrderItems = [];
    renderCart();
    orderForm.reset();
  } catch (error) {
    orderStatus.textContent = `Could not complete the order: ${error.message}`;
    orderSubmit.disabled = false;
  }
});

async function postJson(url, body) {
  const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "The server could not complete the request.");
  return result;
}

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load the payment service."));
    document.head.append(script);
  });
}

async function setupGoogleSignIn() {
  try {
    const response = await fetch("/api/config", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load sign-in configuration.");
    const { googleClientId } = await response.json();
    if (!googleClientId) {
      authSetupNote.textContent = "Google sign-in is unavailable until GOOGLE_CLIENT_ID is configured.";
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          authStatus.textContent = "Verifying your Google account...";
          try {
            const result = await postJson("/api/auth/google", { credential });
            completeCustomerSignIn(result);
          } catch (error) {
            authStatus.textContent = error.message;
          }
        },
      });
      window.google.accounts.id.renderButton(googleSignInButton, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        width: 320,
      });
      authSetupNote.textContent = "Your Google account is verified securely by the server.";
    };
    script.onerror = () => {
      authSetupNote.textContent = "Google sign-in could not be loaded. Please try again later.";
    };
    document.head.append(script);
  } catch (error) {
    authSetupNote.textContent = error.message;
  }
}

function completeCustomerSignIn(result) {
  localStorage.setItem("userToken", result.token);
  authStatus.textContent = "Signed in successfully.";
  document.querySelector("#sign-in-dialog").close();
}

renderCart();
setupGoogleSignIn();
