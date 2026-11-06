# ORDER API

## Create Order / Checkout API

ENDPOINT : `POST /api/orders`

Request Body :

```json
{
  "address_id": 1,
  "shipping_cost": 20000
}
```

Response Body Success (201 Created):

```json
{
  "status": "success",
  "message": "Order created successfully",
  "data": {
    "id": 101,
    "order_number": "ORD-20260809-001",
    "user_id": 1,
    "address_id": 1,
    "total_amount": 920000,
    "shipping_cost": 20000,
    "status": "pending",
    "created_at": "2026-08-09T15:00:00.000Z",
    "items": [
      {
        "id": 1,
        "product_id": 1,
        "product_name": "Streetwear Canvas Low Black",
        "size": "41",
        "price": 450000,
        "quantity": 2
      }
    ]
  }
}
```

Response Body Error (400 Bad Request):

```json
{
  "status": "fail",
  "message": "Cart is empty or stock is insufficient",
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

Response Body Error (422 Unprocessable Entity):

```json
{
  "status": "fail",
  "message": "Validation failed",
  "errors": [
    {
      "field": "address_id",
      "message": "Address ID is required and must be an integer"
    },
    {
      "field": "shipping_cost",
      "message": "Shipping cost is required and must be a non-negative integer"
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

## Get User Order History API

ENDPOINT : `GET /api/orders`

Request Body : NONE

Response Body Success (200 OK):

```json
{
  "status": "success",
  "message": "Order history fetched successfully",
  "data": [
    {
      "id": 101,
      "order_number": "ORD-20260809-001",
      "total_amount": 920000,
      "status": "pending",
      "created_at": "2026-08-09T15:00:00.000Z"
    }
  ]
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

## Get Order Detail API

ENDPOINT : `GET /api/orders/:id`

Request Body : NONE

Response Body Success (200 OK):

```json
{
  "status": "success",
  "message": "Order details fetched successfully",
  "data": {
    "id": 101,
    "order_number": "ORD-20260809-001",
    "total_amount": 920000,
    "shipping_cost": 20000,
    "status": "pending",
    "created_at": "2026-08-09T15:00:00.000Z",
    "address": {
      "label": "Rumah",
      "phone": "08123456789",
      "street_address": "Jl. Mawar No. 123",
      "city": "Surabaya",
      "postal_code": "60293",
      "country": "Indonesia"
    },
    "items": [
      {
        "id": 1,
        "product_id": 1,
        "product_name": "Streetwear Canvas Low Black",
        "size": "41",
        "price": 450000,
        "quantity": 2
      }
    ]
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

Response Body Error (404 Not Found):

```json
{
  "status": "fail",
  "message": "Order not found",
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

## Cancel Order API

ENDPOINT : `PATCH /api/orders/:id/cancel`

Request Body : NONE

Response Body Success (200 OK):

```json
{
  "status": "success",
  "message": "Order cancelled successfully",
  "data": {
    "id": 101,
    "order_number": "ORD-20260809-001",
    "status": "cancel"
  }
}
```

Response Body Error (400 Bad Request):

```json
{
  "status": "fail",
  "message": "Cannot cancel order that has already been shipped or completed",
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
  "message": "Order not found",
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
