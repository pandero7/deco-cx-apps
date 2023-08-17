import { parseCookie } from "../../utils/orderForm.ts";
import { paths } from "../../utils/paths.ts";
import { fetchSafe } from "apps/utils/fetch.ts";
import { proxySetCookie } from "apps/vtex/utils/cookies.ts";
import { AppContext } from "apps/vtex/mod.ts";
import type { OrderForm } from "apps/vtex/utils/types.ts";

export interface Props {
  /** @description index of the item in the cart.items array you want to edit */
  index: number;
  /** @description attachment name */
  attachment: string;
  content: Record<string, string>;
  expectedOrderFormSections?: string[];
  noSplitItem?: boolean;
}

export const DEFAULT_EXPECTED_SECTIONS = [
  "items",
  "totalizers",
  "clientProfileData",
  "shippingData",
  "paymentData",
  "sellers",
  "messages",
  "marketingData",
  "clientPreferencesData",
  "storePreferencesData",
  "giftRegistryData",
  "ratesAndBenefitsData",
  "openTextField",
  "commercialConditionData",
  "customData",
];

const action = async (
  props: Props,
  req: Request,
  ctx: AppContext,
): Promise<OrderForm> => {
  const {
    index,
    attachment,
    content,
    noSplitItem = true,
    expectedOrderFormSections = DEFAULT_EXPECTED_SECTIONS,
  } = props;
  const { orderFormId, cookie } = parseCookie(req.headers);
  const url = new URL(
    paths(ctx).api.checkout.pub.orderForm.orderFormId(orderFormId).items
      .index(index).attachments.attachment(attachment),
  );

  const response = await fetchSafe(
    url,
    {
      method: "POST",
      body: JSON.stringify({ content, noSplitItem, expectedOrderFormSections }),
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        cookie,
      },
    },
  );

  proxySetCookie(response.headers, ctx.response.headers, req.url);

  return response.json();
};

export default action;
