# CART API

## Add Item to Cart API

ENDPOINT : `POST /api/cart/items`

Request Body :

```json
{
  "product_id": 1,
  "product_variant_id": 11,
  "quantity": 1
}
```

Response Body Success (201 Created):

```json
{
  "status": "success",
  "message": "Item added to cart successfully",
  "data": {
    "id": 1,
    "cart_id": 10,
    "product_id": 1,
    "product_variant_id": 11,
    "quantity": 1
  }
}
```

Response Body Error (400 Bad Request):

```json
{
  "status": "fail",
  "message": "Requested quantity exceeds available stock",
  "errors": null
}
```

Response Body Error (401 Unauthorized):

```json
{
  "status": "fail",
  "message": "Unauthorized access",
  "errors": "Invalid or expired token"
}
```

Response Body Error (404 Not Found):

```json
{
  "status": "fail",
  "message": "Product or variant not found",
  "errors": null
}
```

Response Body Error (422 Unprocessable Entity):

```json
{
  "status": "fail",
  "message": "Validation failed",
  "errors": [
    {
      "field": "product_id",
      "message": "Product ID is required and must be an integer"
    },
    {
      "field": "product_variant_id",
      "message": "Product variant ID is required and must be an integer"
    },
    {
      "field": "quantity",
      "message": "Quantity must be a positive integer"
    }
  ]
}
```

Response Body Error (500 Internal Server Error):

```json
{
  "status": "error",
  "message": "Internal server error",
  "errors": null
}
```

## Get User Cart API

ENDPOINT : `GET /api/carts`

Request Body : NONE

Response Body Success (200 OK):

```json
{
  "status": "success",
  "message": "User cart fetched successfully",
  "data": {
    "id": 10,
    "user_id": 1,
    "items": [
      {
        "id": 1,
        "product_id": 1,
        "product_name": "Streetwear Canvas Low Black",
        "product_variant_id": 11,
        "size": "41",
        "price": 450000,
        "quantity": 2,
        "subtotal": 900000
      }
    ],
    "total_price": 900000
  }
}
```

Response Body Error (401 Unauthorized):

```json
{
  "status": "fail",
  "message": "Unauthorized access",
  "errors": "Invalid or expired token"
}
```

Response Body Error (500 Internal Server Error):

```json
{
  "status": "error",
  "message": "Internal server error",
  "errors": null
}
```

## Update Cart Item Quantity API

ENDPOINT : `PATCH /api/carts/items/:item-id`

Request Body :

```json
{
  "quantity": 3
}
```

Response Body Success (200 OK):

```json
{
  "status": "success",
  "message": "Cart item quantity updated successfully",
  "data": {
    "id": 1,
    "cart_id": 10,
    "product_variant_id": 11,
    "quantity": 3
  }
}
```

Response Body Error (400 Bad Request):

```json
{
  "status": "fail",
  "message": "Quantity must be greater than 0 and not exceed stock",
  "errors": null
}
```

Response Body Error (401 Unauthorized):

```json
{
  "status": "fail",
  "message": "Unauthorized access",
  "errors": "Invalid or expired token"
}
```

Response Body Error (404 Not Found):

```json
{
  "status": "fail",
  "message": "Cart item not found",
  "errors": null
}
```

Response Body Error (422 Unprocessable Entity):

```json
{
  "status": "fail",
  "message": "Validation failed",
  "errors": [
    {
      "field": "quantity",
      "message": "Quantity must be a positive integer"
    }
  ]
}
```

Response Body Error (500 Internal Server Error):

```json
{
  "status": "error",
  "message": "Internal server error",
  "errors": null
}
```

## Remove Item from Cart API

ENDPOINT : `DELETE /api/carts/items/:item-id`

Request Body : NONE

Response Body Success (200 OK):

```json
{
  "status": "success",
  "message": "Item removed from cart successfully"
}
```

Response Body Error (401 Unauthorized):

```json
{
  "status": "fail",
  "message": "Unauthorized access",
  "errors": "Invalid or expired token"
}
```

Response Body Error (404 Not Found):

```json
{
  "status": "fail",
  "message": "Cart item not found",
  "errors": null
}
```

Response Body Error (500 Internal Server Error):

```json
{
  "status": "error",
  "message": "Internal server error",
  "errors": null
}
```
