# PAYMENT API

## Create Payment Transaction API

ENDPOINT : `POST /api/payments`

Request Body :

```json
{
  "order_id": 101,
  "payment_type": "gopay"
}
```

Response Body Success (201 Created):

```json
{
  "status": "success",
  "message": "Payment transaction created successfully",
  "data": {
    "id": 501,
    "order_id": 101,
    "payment_type": "gopay",
    "transaction_status": "pending",
    "payment_url": "https://app.sandbox.midtrans.com/snap/v2/vtweb/12345678-abcd-1234",
    "created_at": "2026-08-09T15:05:00.000Z"
  }
}
```

Response Body Error (400 Bad Request):

```json
{
  "status": "fail",
  "message": "Payment transaction already exists for this order or order is invalid",
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

Response Body Error (422 Unprocessable Entity):

```json
{
  "status": "fail",
  "message": "Validation failed",
  "errors": [
    {
      "field": "order_id",
      "message": "Order ID is required and must be an integer"
    },
    {
      "field": "payment_type",
      "message": "Payment type is required"
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

## Midtrans Webhook Notification API (Public / Webhook)

ENDPOINT : `POST /api/payments/notification`

Request Body :

```json
{
  "order_id": "ORD-20260809-4821",
  "transaction_status": "settlement",
  "payment_type": "gopay",
  "signature_key": "a1b2c3d4..."
}
```

Response Body Success (200 OK):

```json
{
  "status": "success",
  "message": "Payment notification processed successfully"
}
```

Response Body Error (400 Bad Request):

```json
{
  "status": "fail",
  "message": "Invalid signature or payload",
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

## Get Payment Detail API

ENDPOINT : `GET /api/payments/order/:orderId`

Request Body : NONE

Response Body Success (200 OK):

```json
{
  "status": "success",
  "message": "Payment details fetched successfully",
  "data": {
    "id": 501,
    "order_id": 101,
    "payment_type": "gopay",
    "transaction_status": "settlement",
    "payment_url": "https://app.sandbox.midtrans.com/snap/v2/vtweb/12345678-abcd-1234",
    "created_at": "2026-08-09T15:05:00.000Z"
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
  "message": "Payment details not found",
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
