const ORDER_STATUS_RANK = {
  pending: 0,
  accepted: 1,
  preparing: 2,
  picked: 3,
  delivered: 4,
  cancelled: 5,
};

// Normalize status derivation to the statuses that exist on orderModel. This
// helper accepts either an order document/object or a raw status string so old
// callers do not need special handling.
export default function deriveOrderStatus(orderOrStatus) {
  const status =
    typeof orderOrStatus === "string" ? orderOrStatus : orderOrStatus?.status;

  if (!status || ORDER_STATUS_RANK[status] === undefined) {
    return "pending";
  }

  return status;
}
