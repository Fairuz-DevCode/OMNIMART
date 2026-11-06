import { CartModel } from "./cart.model.js";
import { AddCartItemDTO, CartResponse } from "./cart.types.js";
import { AppError } from "../../utils/appError.js";

export class CartServices {
  static async addItem(userId: number, { product_id, product_variant_id, quantity }: AddCartItemDTO): Promise<any> {
    const variant = await CartModel.checkVariantStock(null, product_variant_id);
    if (!variant || variant.product_id !== product_id) {
      throw new AppError("Product or variant not found", 404);
    }

    if (quantity > variant.stock) {
      throw new AppError("Requested quantity exceeds available stock", 400);
    }

    const cart = await CartModel.findOrCreateCart(null, userId);
    const existingItem = await CartModel.findCartItem(null, cart.id, product_variant_id);

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > variant.stock) {
        throw new AppError("Requested quantity exceeds available stock", 400);
      }
      const updated = await CartModel.updateCartItemQuantity(null, existingItem.id, newQuantity);
      return updated;
    }

    const newItem = await CartModel.addCartItem(null, cart.id, product_id, product_variant_id, quantity);
    return newItem;
  }

  static async getUserCart(userId: number): Promise<CartResponse> {
    const cart = await CartModel.findOrCreateCart(null, userId);
    const items = await CartModel.getCartDetails(null, cart.id);

    const formattedItems = items.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_variant_id: item.product_variant_id,
      size: item.size,
      price: Number(item.price),
      quantity: item.quantity,
      subtotal: Number(item.subtotal),
    }));

    const totalPrice = formattedItems.reduce((acc, item) => acc + item.subtotal, 0);

    return {
      id: cart.id,
      user_id: userId,
      items: formattedItems,
      total_price: totalPrice,
    };
  }

  static async updateItemQuantity(userId: number, itemId: number, quantity: number): Promise<any> {
    const item = await CartModel.findCartItemById(null, itemId);
    if (!item || item.user_id !== userId) {
      throw new AppError("Cart item not found", 404);
    }

    const variant = await CartModel.checkVariantStock(null, item.product_variant_id);
    if (!variant || quantity > variant.stock) {
      throw new AppError("Quantity must be greater than 0 and not exceed stock", 400);
    }

    const updated = await CartModel.updateCartItemQuantity(null, itemId, quantity);
    return updated;
  }

  static async removeItem(userId: number, itemId: number): Promise<void> {
    const item = await CartModel.findCartItemById(null, itemId);
    if (!item || item.user_id !== userId) {
      throw new AppError("Cart item not found", 404);
    }

    await CartModel.removeCartItem(null, itemId);
  }
}
