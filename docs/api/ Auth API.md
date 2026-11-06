# USER API SPEC

## REGISTER USER API

ENDOPOIT: `POST api/auth/register `

Header : None

Request Body :

```json
{
  "name": "user",
  "email": "user@gmail.com",
  "password": "User1$$$"
}
```

Response Body Success (201):

```json
{
  "status": "success",
  "message": "Registration Succes",
  "data": {
    "user": {
      "id": 1,
      "name": "user",
      "email": "user@gmail.com",
      "role": "user"
    },
    "accessToken": "eyJhbGciOi..."
  }
}
```

Response Body Error (400) :

```json
{
  "status": "fail",
  "message": "Malformed JSON in request body",
  "errors": null
}
```

Response Body Error (409) :

```json
{
  "status": "fail",
  "message": "Email already registered",
  "errors": null
}
```

Response Body Error (422) :

```json
{
  "status": "fail",
  "message": "Validation failed",
  "errors": [
    {
      "field": "name",
      "message": "Invalid name format"
    },
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password",
      "message": "Password must be at least 6 characters"
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

## LOGIN USER API

Endpoint : `POST /api/auth/login`

Header : None

Request Body :

```json
{
  "email": "user@gmail.com",
  "password": "User1$$$"
}
```

Response Body Succes (200):

```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "name": "user",
      "email": "user@gmail.com",
      "role": "user"
    },
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

Response Body Error (400) :

```json
{
  "status": "fail",
  "message": "Malformed JSON in request body",
  "errors": null
}
```

esponse Body Error (401) :

```json
{
  "status": "fail",
  "message": "Invalid email or password",
  "errors": null
}
```

Response Body Error (422) :

```json
{
  "status": "fail",
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password",
      "message": "Password is required"
    }
  ]
}
```

Response Body Error (500) :

```json
{
  "status": "error",
  "message": "Internal server error",
  "errors": null
}
```

## REFRESH USER API

Endpoint : `POST /api/auth/refresh`

Header : None

Cookies : Uses HTTP-Only Cookie `refreshToken`

Request Body : None

Request Body Succes (200):

```json
{
  "status": "success",
  "message": "Access token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOi..."
  }
}
```

Response Body Auth Error (401) :

```json
{
  "status": "fail",
  "message": "Refresh token missing or invalid",
  "errors": "Invalid or expired refresh token"
}
```

Response Body Error (500) :

```json
{
  "status": "error",
  "message": "Internal server error",
  "errors": null
}
```

## LOGOUT USER API

Endpoint : `DELETE /api/auth/logout`

Header : None

Request Body : None

Response Body Succes (200):

```json
{
  "status": "success",
  "message": "Logout successful"
}
```

Response Body Error (401) :

```json
{
  "status": "fail",
  "message": "Unauthorized access",
  "errors": "User not authenticated or session already expired"
}
```

Response Body Error (500) :

```json
{
  "status": "error",
  "message": "Internal server error",
  "errors": null
}
```
