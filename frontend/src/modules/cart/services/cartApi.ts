import API from "../../../shared/services/api";

export const getCart = async () => {
  const res = await API.get("/carts");
  return res.data.data;
};

export const addCartItem = async ({
  product_id,
  product_variant_id,
  quantity,
}: {
  product_id: number | string;
  product_variant_id?: number | string;
  quantity: number;
}) => {
  const res = await API.post("/carts/items", {
    product_id,
    product_variant_id,
    quantity,
  });
  return res.data.data;
};

export const updateCartItem = async (itemId: number | string, quantity: number) => {
  const res = await API.patch(`/carts/items/${itemId}`, {
    quantity,
  });
  return res.data.data;
};

export const removeCartItem = async (itemId: number | string) => {
  await API.delete(`/carts/items/${itemId}`);
};
