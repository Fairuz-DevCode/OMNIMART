# Shipping API Spec

## Update Shipping Status API (Admin Only)

ENDPOINT : `PATCH /api/shippings/order/:orderId`

Header :
- Authorization: `Bearer <token_admin>`

Request Body :

```json
{
  "courier": "JNE",
  "tracking_number": "JNE123456789ID",
  "shipping_status": "shipped"
}
```

Response Body Success (200 OK):

```json
{
  "status": "success",
  "message": "Shipping information updated successfully",
  "data": {
    "order_id": 101,
    "courier": "JNE",
    "tracking_number": "JNE123456789ID",
    "shipping_status": "shipped",
    "shipped_at": "2026-08-09T17:00:00.000Z"
  }
}
```

Response Body Error (400 Bad Request):

```json
{
  "status": "fail",
  "message": "Order must be paid before updating shipping status",
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

Response Body Error (403 Forbidden):

```json
{
  "status": "fail",
  "message": "Access forbidden",
  "errors": "Admin role is required"
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

Response Body Error (422 Unprocessable Entity):

```json
{
  "status": "fail",
  "message": "Validation failed",
  "errors": [
    {
      "field": "courier",
      "message": "Courier is required"
    },
    {
      "field": "tracking_number",
      "message": "Tracking number is required"
    },
    {
      "field": "shipping_status",
      "message": "Invalid shipping status"
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

## Get Shipping Detail & Tracking API

ENDPOINT : `GET /api/shippings/order/:orderId`

Request Body : NONE

Response Body Success (200 OK) :

```json
{
  "status": "success",
  "message": "Shipping details fetched successfully",
  "data": {
    "order_id": 101,
    "courier": "JNE",
    "tracking_number": "JNE123456789ID",
    "shipping_status": "shipped",
    "shipped_at": "2026-08-09T17:00:00.000Z",
    "delivered_at": null
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

Response Body Error (404 Not Found) :

```json
{
  "status": "fail",
  "message": "Shipping information not found",
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

## Confirm Order Received API (Customer)

ENDPOINT : `PATCH /api/shippings/order/:orderId/complete`

Request Body : NONE

Response Body Success (200 OK) :

```json
{
  "status": "success",
  "message": "Order completed successfully",
  "data": {
    "order_id": 101,
    "shipping_status": "delivered",
    "order_status": "completed",
    "delivered_at": "2026-08-11T10:00:00.000Z"
  }
}
```

Response Body Error (400 Bad Request):

```json
{
  "status": "fail",
  "message": "Cannot complete order before it is shipped",
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

Response Body Error (404 Not Found) :

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
