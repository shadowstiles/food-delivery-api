export const fmtNGN = (amount) =>
  Number(amount).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
  });

export const genRef = (prefix = "EPE") =>
  `${prefix}_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
