/** Default partner/customer base margin when estimation profit % is not configured. */
export const DEFAULT_CUSTOMER_BASE_MARGIN_PERCENT = 20;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function resolveCustomerBaseMarginPercent(
  configuredPercent: number | undefined | null,
): number {
  if (
    configuredPercent != null &&
    Number.isFinite(configuredPercent) &&
    configuredPercent >= 0
  ) {
    return configuredPercent;
  }
  return DEFAULT_CUSTOMER_BASE_MARGIN_PERCENT;
}

export type CustomerBasePriceFields = {
  customerBaseMarginPercent: number;
  customerBaseMarginAmount: number;
  suggestedCustomerBasePrice: number;
  orderCustomerBaseMarginAmount: number;
  orderSuggestedCustomerBasePrice: number;
  /** Suggested base price ÷ total area (qty included once). Before GST. */
  suggestedCustomerRatePerSqFt: number;
  customerBasePriceAvailable: boolean;
  customerRateAvailable: boolean;
};

/** Workshop cost + standard margin — before GST and additional charges. */
export function computeCustomerBasePriceFields(
  workshopTotal: number,
  qty: number,
  configuredMarginPercent: number | undefined | null,
  areaSqftPerUnit: number,
): CustomerBasePriceFields {
  const customerBaseMarginPercent = resolveCustomerBaseMarginPercent(configuredMarginPercent);
  const safeQty = Math.max(1, Math.floor(qty || 1));
  const areaPerUnit = Number.isFinite(areaSqftPerUnit) && areaSqftPerUnit > 0 ? areaSqftPerUnit : 0;
  const totalAreaSqft = round2(areaPerUnit * safeQty);

  if (!Number.isFinite(workshopTotal) || workshopTotal <= 0) {
    return {
      customerBaseMarginPercent,
      customerBaseMarginAmount: 0,
      suggestedCustomerBasePrice: 0,
      orderCustomerBaseMarginAmount: 0,
      orderSuggestedCustomerBasePrice: 0,
      suggestedCustomerRatePerSqFt: 0,
      customerBasePriceAvailable: false,
      customerRateAvailable: false,
    };
  }

  const customerBaseMarginAmount = round2(
    workshopTotal * (customerBaseMarginPercent / 100),
  );
  const suggestedCustomerBasePrice = round2(workshopTotal + customerBaseMarginAmount);
  const orderWorkshopTotal = round2(workshopTotal * safeQty);
  const orderCustomerBaseMarginAmount = round2(
    orderWorkshopTotal * (customerBaseMarginPercent / 100),
  );
  const orderSuggestedCustomerBasePrice = round2(
    orderWorkshopTotal + orderCustomerBaseMarginAmount,
  );

  const suggestedCustomerRatePerSqFt =
    totalAreaSqft > 0
      ? round2(orderSuggestedCustomerBasePrice / totalAreaSqft)
      : 0;

  const customerBasePriceAvailable = suggestedCustomerBasePrice >= workshopTotal;
  const customerRateAvailable =
    customerBasePriceAvailable &&
    suggestedCustomerRatePerSqFt > 0 &&
    Number.isFinite(suggestedCustomerRatePerSqFt);

  return {
    customerBaseMarginPercent,
    customerBaseMarginAmount,
    suggestedCustomerBasePrice,
    orderCustomerBaseMarginAmount,
    orderSuggestedCustomerBasePrice,
    suggestedCustomerRatePerSqFt,
    customerBasePriceAvailable,
    customerRateAvailable,
  };
}
