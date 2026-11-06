import API from "../../../shared/services/api";

export const getProducts = async (page = 1, limit = 10) => {
  const res = await API.get(`/products?page=${page}&limit=${limit}`);
  return res.data.payload;
};

export const getProductById = async (id: number | string) => {
  const res = await API.get(`/products/${id}`);
  return res.data.payload;
};

export const getBySlugPath = async (slugPath: string) => {
  const res = await API.get(`/products/${slugPath}`);
  return res.data.payload;
};

export const getTopProducts = async (limit = 4) => {
  const res = await API.get(`/products/top-products?limit=${limit}`);
  return res.data.payload;
};
