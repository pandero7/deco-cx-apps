import { HttpError } from "../../../utils/http.ts";
import { AppContext } from "../../mod.ts";
import { getCartCookie, setCartCookie } from "../../utils/cart.ts";
import { AddCoupon } from "../../utils/graphql/queries.ts";
import {
  AddCouponMutation,
  AddCouponMutationVariables,
  CheckoutFragment,
} from "../../utils/graphql/storefront.graphql.gen.ts";

export interface Props {
  coupon: string;
}

const action = async (
  props: Props,
  req: Request,
  ctx: AppContext,
): Promise<Partial<CheckoutFragment>> => {
  const { storefront } = ctx;
  const cartId = getCartCookie(req.headers);

  if (!cartId) {
    throw new HttpError(400, "Missing cart cookie");
  }

  const data = await storefront.query<
    AddCouponMutation,
    AddCouponMutationVariables
  >({
    variables: { checkoutId: cartId, ...props },
    ...AddCoupon,
  });

  const checkoutId = data.checkout?.checkoutId;
  setCartCookie(ctx.response.headers, checkoutId);

  return data.checkout ?? {};
};

export default action;
