## GET USER API

ENDPOINT : `GET api/users/me`

Header :

- Authorization : `Bearer <token>`

Request Body : NONE

Response Body Succes (200) :

```json
{
  "status": "success",
  "message": "User profile fetched successfully",
  "data": {
    "id": 1,
    "name": "user",
    "email": "user@gmail.com",
    "phone": "083634973",
    "role": "user"
  }
}
```

Respon Body Error (401):

```json
{
  "status": "fail",
  "message": "Unauthorized access",
  "errors": "Invalid or expired token"
}
```

Respon Body Error (404):

```json
{
  "status": "fail",
  "message": "User not found",
  "errors": null
}
```

Respon Body Error (500):

```json
{
  "status": "error",
  "message": "Internal server error",
  "errors": null
}
```

## UPDATE USER API

Endpoint : `PATCH /api/users/me`

Header :

- Authorization : `Bearer <token>`

Request Body :

```json
{
  "name": "John Doe Updated",
  "phone": "08987654321"
}
```

Response Body Succes (200) :

```json
{
  "status": "success",
  "message": "User profile updated successfully",
  "data": {
    "id": 1,
    "name": "user",
    "email": "user@gmail.com",
    "phone": "083634973",
    "role": "user"
  }
}
```

Respon Body Error (400):

```json
{
  "status": "fail",
  "message": "Malformed JSON in request body",
  "errors": null
}
```

Respon Body Error (401):

```json
{
  "status": "fail",
  "message": "Unauthorized access",
  "errors": "Invalid or expired token"
}
```

Respon Body Error (404):

```json
{
  "status": "fail",
  "message": "User not found",
  "errors": null
}
```

Respon Body Error (422):

```json
{
  "status": "fail",
  "message": "Validation failed",
  "errors": [
    {
      "field": "phone",
      "message": "Phone number must be at least 10 digits"
    }
  ]
}
```

Respon Body Error (500):

```json
{
  "status": "error",
  "message": "Internal server error",
  "errors": null
}
```

## ADD ADDRESS API

ENDPOINT : `POST /api/addresses`

Header :

- Authorization : `Bearer <token>`

Request Body :

```json
{
  "label": "Rumah",
  "phone": "08123456789",
  "street_address": "Jl. Mawar No. 123",
  "city": "Surabaya",
  "country": "Indonesia",
  "postal_code": "60293"
}
```

Response Body Succes (200):

```json
{
  "status": "success",
  "message": "Address added successfully",
  "data": {
    "id": 1,
    "user_id": 1,
    "label": "Rumah",
    "phone": "08123456789",
    "street_address": "Jl. Mawar No. 123",
    "city": "Surabaya",
    "postal_code": "60293",
    "country": "Indonesia"
  }
}
```

Respon Body Error (400):

```json
{
  "status": "fail",
  "message": "Malformed JSON in request body",
  "errors": null
}
```

Respon Body Error (401):

```json
{
  "status": "fail",
  "message": "Unauthorized access",
  "errors": "Invalid or expired token"
}
```

Respon Body Error (422):

```json
{
  "status": "fail",
  "message": "Validation failed",
  "errors": [
    {
      "field": "postal_code",
      "message": "Postal code must be 5 digits"
    },
    {
      "field": "street_address",
      "message": "Street address is required"
    }
  ]
}
```

Respon Body Error (500):

```json
{
  "status": "error",
  "message": "Internal server error",
  "errors": null
}
```

## GET USER ADDRESSES API

ENDPOINT : `GET /api/addresses`

Header :

- Authorization : `Bearer <token>`

Request Body : NONE

Response Body Succes (200) :

```json
{
  "status": "success",
  "message": "User addresses fetch successfully",
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "label": "Rumah Utama",
      "phone": "08123456789",
      "street_address": "Jl. Mawar No. 123A",
      "city": "Surabaya",
      "postal_code": "60293",
      "country": "Indonesia"
    },
    {
      "id": 2,
      "user_id": 1,
      "label": "Kantor",
      "phone": "08987654321",
      "street_address": "Jl. Pemuda No. 45",
      "city": "Surabaya",
      "postal_code": "60271",
      "country": "Indonesia"
    }
  ]
}
```

Respon Body Error (401):

```json
{
  "status": "fail",
  "message": "Unauthorized access",
  "errors": "Invalid or expired token"
}
```

Respon Body Error (404):

```json
{
  "status": "fail",
  "message": "User address not found",
  "errors": null
}
```

Respon Body Error (500):

```json
{
  "status": "error",
  "message": "Internal server error",
  "errors": null
}
```

## UPDATE ADDRESS API

ENDPOINT : `PATCH /api/addresses/:id`

Header :

- Authorization : `Bearer <token>`

Request Body :

```json
{
  "label": "Rumah Utama",
  "phone": "08123456789",
  "street_address": "Jl. Mawar No. 123A",
  "city": "Surabaya",
  "postal_code": "60293",
  "country": "Indonesia"
}
```

Response Body Succes (200):

```json
{
  "status": "success",
  "message": "User address update successfully",
  "data": {
    "id": 1,
    "user_id": 1,
    "label": "Rumah Utama",
    "phone": "08123456789",
    "street_address": "Jl. Mawar No. 123A",
    "city": "Surabaya",
    "postal_code": "60293",
    "country": "Indonesia"
  }
}
```

Respon Body Error (400):

```json
{
  "status": "fail",
  "message": "Malformed JSON in request body",
  "errors": null
}
```

Respon Body Error (401):

```json
{
  "status": "fail",
  "message": "Unauthorized access",
  "errors": "Invalid or expired token"
}
```

Respon Body Error (404):

```json
{
  "status": "fail",
  "message": "Address not found",
  "errors": null
}
```

Respon Body Error (422):

```json
{
  "status": "fail",
  "message": "Validation failed",
  "errors": [
    {
      "field": "phone",
      "message": "Invalid phone number format"
    }
  ]
}
```

Respon Body Error (500):

```json
{
  "status": "error",
  "message": "Internal server error",
  "errors": null
}
```

## DELETE ADDRESS API

ENDPOINT : `DELETE /api/addresses/:id`

Header :

- Authorization : `Bearer <token>`

Request Body : NONE

Response Body Succes (200):

```json
{
  "status": "succes",
  "message": "Address deleted successfully"
}
```

Respon Body Error (401) :

```json
{
  "status": "fail",
  "message": "Unauthorized access",
  "errors": "Invalid or expired token"
}
```

Respon Body Error (404) :

```json
{
  "status": "fail",
  "message": "Address not found",
  "errors": null
}
```

Respon Body Error (500):

```json
{
  "status": "error",
  "message": "Internal server error",
  "errors": null
}
```
