const PRODUCT_RATES = Object.freeze({
  "1121 Basmati Rice": 160,
  "1509 Basmati Rice": 135,
  "Pusa Basmati Rice": 110,
  "Traditional Basmati Rice": 190,
  Tibar: 105,
  Dubar: 85,
  Mogra: 70,
  "1121 Basmati Biryani": 180,
  "1121 Golden Sella": 165,
  "1121 Steam": 170,
  "1509 Basmati": 135,
  "Sona Masoori": 75,
  "IR 64": 58,
  "PR 11": 65,
});
const VALID_WEIGHTS = new Set([1, 5, 10, 20, 30]);

class CheckoutValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "CheckoutValidationError";
    this.statusCode = 400;
  }
}

function validateCheckout(input) {
  if (!input || typeof input !== "object") {
    throw new CheckoutValidationError("Order details are required.");
  }
  const customer = input && input.customer;
  const fullName = typeof customer?.name === "string" ? customer.name.trim() : "";
  const email = typeof customer?.email === "string" ? customer.email.trim().toLowerCase() : "";
  const phone = typeof customer?.phone === "string" ? customer.phone.replace(/\D/g, "") : "";
  const street = typeof customer?.street === "string" ? customer.street.trim() : "";
  const city = typeof customer?.city === "string" ? customer.city.trim() : "";
  const postalCode = typeof customer?.postalCode === "string" ? customer.postalCode.trim() : "";
  const paymentMethod = input?.paymentMethod || "COD";

  if (fullName.length < 2 || fullName.length > 100) {
    throw new CheckoutValidationError("Enter a name between 2 and 100 characters.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new CheckoutValidationError("Enter a valid email address.");
  }
  if (phone.length < 10 || phone.length > 15) {
    throw new CheckoutValidationError("Enter a valid phone number with 10 to 15 digits.");
  }
  if (street.length < 5 || street.length > 300 || city.length < 2 || city.length > 100) {
    throw new CheckoutValidationError("Enter a valid street address and city.");
  }
  if (postalCode.length < 4 || postalCode.length > 12) {
    throw new CheckoutValidationError("Enter a valid postal code.");
  }
  if (!["COD", "ONLINE"].includes(paymentMethod)) {
    throw new CheckoutValidationError("Choose COD or online payment.");
  }
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 20) {
    throw new CheckoutValidationError("An order must contain between 1 and 20 items.");
  }

  const items = input.items.map((item) => {
    const name = typeof item?.name === "string" ? item.name.trim() : "";
    const ratePerKg = PRODUCT_RATES[name];
    const weight = Number(item?.weight);
    const quantity = Number(item?.quantity);
    if (!ratePerKg) throw new CheckoutValidationError("The order includes an unlisted rice variety.");
    if (!VALID_WEIGHTS.has(weight)) throw new CheckoutValidationError("Choose a listed pack size.");
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new CheckoutValidationError("Item quantity must be between 1 and 99.");
    }

    const price = ratePerKg * weight;
    return { name, weight, quantity, ratePerKg, price, totalPrice: price * quantity };
  });

  return {
    customerEmail: email,
    address: { fullName, phone, street, city, postalCode, country: "India" },
    items,
    paymentMethod,
    totalAmount: items.reduce((total, item) => total + item.totalPrice, 0),
  };
}

module.exports = { CheckoutValidationError, PRODUCT_RATES, validateCheckout };
