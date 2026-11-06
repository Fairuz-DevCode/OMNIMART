# CATEGORY & PRODUCT API

## Create Category API (Admin Only)

ENDPOINT: `POST /api/categories`

Header:

- Authorization: Bearer <token_admin>

Request Body:

```json
{
  "name": "Sport Shoes",
  "slug": "sport-shoes"
}
```

Response Body Success (201 Created):

```json
{
  "status": "success",
  "message": "Category created successfully",
  "payload": {
    "id": 3,
    "name": "Sport Shoes",
    "slug": "sport-shoes"
  }
}
```

Response Body Error (400 Bad Request):

```json
{
  "status": "fail",
  "message": "Category name or slug already exists",
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

Response Body Error (422 Unprocessable Entity):

```json
{
  "status": "fail",
  "message": "Validation failed",
  "errors": [
    {
      "field": "name",
      "message": "Category name is required"
    },
    {
      "field": "slug",
      "message": "Slug is required and must be unique"
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

## Get Categories API

ENDPOINT : `GET /api/categories`

Request Body : NONE

Response Body Success (200 OK):

```json
{
  "status": "success",
  "message": "Categories fetched successfully",
  "payload": [
    {
      "id": 1,
      "name": "Sport Shoes",
      "slug": "sport-shoes"
    },
    {
      "id": 2,
      "name": "Running Shoes",
      "slug": "running-shoes"
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

Response Body Error (403 Forbidden):

```json
{
  "status": "fail",
  "message": "Access forbidden",
  "errors": "Admin role is required"
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

## Delete Category API (Admin Only)

ENDPOINT: `DELETE /api/categories`

Header:

- Authorization: Bearer <token_admin>

Request Body: NONE

Response Body Success (200 OK):

```json
{
  "status": "success",
  "message": "Category deleted successfully"
}
```

Response Body Error (400 Bad Request):

```json
{
  "status": "fail",
  "message": "Category cannot be deleted because it is still being used by shoes products",
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
  "message": "Category not found",
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

## Create Product API (Admin Only)

ENDPOINT : `POST /api/products`

Header :

- Authorization: `Bearer <token_admin>`

Request Body :

```json
{
  "category_id": 1,
  "sku": "SNK-BLK-4042",
  "name": "Streetwear Canvas Low Black",
  "description": "Sepatu low-top canvas premium dengan insole empuk untuk penggunaan sehari-hari",
  "price": 450000,
  "variants": [
    { "size": "40", "stock": 15 },
    { "size": "41", "stock": 20 },
    { "size": "42", "stock": 8 }
  ]
}
```

Response Body Success (201 Created):

```json
{
  "status": "success",
  "message": "Product created successfully",
  "payload": {
    "id": 1,
    "sku": "SNK-BLK-4042",
    "name": "Streetwear Canvas Low Black",
    "price": 450000,
    "variants": [
      { "id": 10, "size": "40", "stock": 15 },
      { "id": 11, "size": "41", "stock": 20 },
      { "id": 12, "size": "42", "stock": 8 }
    ]
  }
}
```

Response Body Error (400 Bad Request):

```json
{
  "status": "fail",
  "message": "SKU already exists or invalid data",
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

Response Body Error (422 Unprocessable Entity):

```json
{
  "status": "fail",
  "message": "Validation failed",
  "errors": [
    {
      "field": "category_id",
      "message": "Category ID is required and must be an integer"
    },
    {
      "field": "sku",
      "message": "SKU is required and must be unique"
    },
    {
      "field": "name",
      "message": "Product name is required"
    },
    {
      "field": "price",
      "message": "Price is required and must be a positive number"
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

## Get Products API

ENDPOINT : `GET /api/products`

Request Body : NONE

Response Body Success (200 OK):

```json
{
  "status": "success",
  "message": "Products fetched successfully",
  "payload": [
    {
      "id": 1,
      "category_id": 1,
      "sku": "SNK-BLK-4042",
      "img_url": "/images/products/streetwear-canvas-low-black.jpg",
      "name": "Streetwear Canvas Low Black",
      "price": 450000
    },
    {
      "id": 2,
      "category_id": 1,
      "sku": "SNK-BLK-4042",
      "img_url": "/images/products/streetwear-canvas-low-black.jpg",
      "name": "Streetwear Canvas Low Black",
      "price": 450000
    }
  ],
  "paging": {
    "page": 1,
    "total_page": 1,
    "total_item": 1
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

## Get Product Detail API

ENDPOINT : `GET /api/products/:id`

Request Body : NONE

Response Body Success (200 OK):

```json
{
  "status": "success",
  "message": "Product details fetched successfully",
  "payload": {
    "id": 1,
    "category_id": 1,
    "sku": "SNK-BLK-4042",
    "img_url": "/images/products/streetwear-canvas-low-black.jpg",
    "name": "Streetwear Canvas Low Black",
    "description": "Sepatu low-top canvas premium dengan insole empuk untuk penggunaan sehari-hari",
    "price": 450000,
    "variants": [
      {
        "id": 10,
        "size": "40",
        "stock": 15
      },
      {
        "id": 11,
        "size": "41",
        "stock": 20
      },
      {
        "id": 12,
        "size": "42",
        "stock": 8
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
  "message": "Product not found",
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

## Update Product API (Admin Only)

ENDPOINT : `PATCH /api/products/:id`

Header :

- Authorization: `Bearer <token_admin>`

Request Body :

```json
{
  "name": "Streetwear Canvas Low Black Edition",
  "price": 499000
}
```

Response Body Success (200 OK):

```json
{
  "status": "success",
  "message": "Product updated successfully",
  "payload": {
    "id": 1,
    "category_id": 1,
    "sku": "SNK-BLK-4042",
    "img_url": "/images/products/streetwear-canvas-low-black.jpg",
    "name": "Streetwear Canvas Low Black Edition",
    "price": 499000
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
  "message": "Product not found",
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
      "field": "price",
      "message": "Price must be a positive number"
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

## Update Product Variant & Stock API (Admin Only)

ENDPOINT : `PATCH /api/products/:id/variants/:variant-id`

Header :

- Authorization: `Bearer <token_admin>`

Request Body :

```json
{
  "size": "41",
  "stock": 25
}
```

Response Body Success (200 OK):

```json
{
  "status": "success",
  "message": "Product variant updated successfully",
  "payload": {
    "id": 11,
    "product_id": 1,
    "size": "41",
    "stock": 25
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
      "field": "stock",
      "message": "Stock is required and must be a non-negative integer"
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

## Delete Product API (Admin Only)

ENDPOINT : `DELETE /api/products/:id`

Header :

- Authorization: `Bearer <token_admin>`

Request Body : NONE

Response Body Success (200 OK):

```json
{
  "status": "success",
  "message": "Product deleted successfully"
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
  "message": "Product not found",
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
