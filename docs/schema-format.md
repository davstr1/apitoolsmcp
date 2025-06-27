# API Schema Format

This document describes the YAML format used to define API schemas in API Tools MCP.

## Basic Structure

```yaml
id: unique-api-id          # Required: Unique identifier
name: API Name             # Required: Human-readable name
version: 1.0.0            # Required: API version
description: Description   # Optional: API description
baseURL: https://api.url  # Required: Base URL for all endpoints
```

## Global Headers

Define headers that apply to all endpoints:

```yaml
globalHeaders:
  - name: X-API-Key
    required: true
    description: API Key for authentication
  - name: X-Client-Version
    required: false
    value: "1.0"
    description: Client version
```

## Authentication

Define authentication method for the API:

```yaml
authentication:
  type: bearer  # Options: bearer, basic, apiKey, oauth2
  details:
    headerName: Authorization
    format: Bearer {token}
```

## Endpoints

Define individual API endpoints:

```yaml
endpoints:
  - path: /users/{id}
    method: GET  # GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
    description: Get user by ID
    parameters: []
    headers: []
    requestBody: {}
    responses: {}
    authentication: {}  # Override global auth
```

### Parameters

Define URL parameters, query parameters, or path parameters:

```yaml
parameters:
  - name: id
    type: string      # string, number, boolean, array, object
    required: true
    description: User ID
    default: null
    enum: []         # Allowed values
    format: uuid     # Additional format hint
    example: "123"
```

### Headers

Define endpoint-specific headers:

```yaml
headers:
  - name: Content-Type
    value: application/json
    required: true
    description: Request content type
    example: application/json
```

### Request Body

Define the request body for POST, PUT, PATCH methods:

```yaml
requestBody:
  required: true
  contentType: application/json
  schema:
    type: object
    properties:
      name:
        type: string
      email:
        type: string
  example:
    name: John Doe
    email: john@example.com
```

### Responses

Define possible responses:

```yaml
responses:
  200:
    description: Success response
    contentType: application/json
    schema:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
    example:
      id: "123"
      name: "John Doe"
  404:
    description: User not found
  500:
    description: Internal server error
```

## Complete Example

```yaml
id: user-management-api
name: User Management API
version: 2.0.0
description: Complete user management system
baseURL: https://api.example.com/v2
globalHeaders:
  - name: X-API-Version
    value: "2.0"
    required: true
authentication:
  type: bearer
  details:
    headerName: Authorization
    format: Bearer {token}
endpoints:
  # List users
  - path: /users
    method: GET
    description: List all users with pagination
    parameters:
      - name: page
        type: number
        required: false
        description: Page number (1-based)
        default: 1
      - name: limit
        type: number
        required: false
        description: Items per page
        default: 20
        enum: [10, 20, 50, 100]
    responses:
      200:
        description: Paginated list of users
        contentType: application/json
        example:
          data:
            - id: "123"
              name: "John Doe"
              email: "john@example.com"
          pagination:
            page: 1
            limit: 20
            total: 100

  # Create user
  - path: /users
    method: POST
    description: Create a new user
    headers:
      - name: Content-Type
        value: application/json
        required: true
    requestBody:
      required: true
      contentType: application/json
      schema:
        type: object
        required: [name, email]
        properties:
          name:
            type: string
            minLength: 1
          email:
            type: string
            format: email
          role:
            type: string
            enum: [admin, user, guest]
            default: user
      example:
        name: "Jane Doe"
        email: "jane@example.com"
        role: "user"
    responses:
      201:
        description: User created successfully
        contentType: application/json
        example:
          id: "456"
          name: "Jane Doe"
          email: "jane@example.com"
          role: "user"
          createdAt: "2024-01-01T00:00:00Z"
      400:
        description: Invalid request data
      409:
        description: Email already exists

  # Get specific user
  - path: /users/{id}
    method: GET
    description: Get a specific user by ID
    parameters:
      - name: id
        type: string
        required: true
        description: User ID
        format: uuid
        example: "123e4567-e89b-12d3-a456-426614174000"
    responses:
      200:
        description: User details
        contentType: application/json
      404:
        description: User not found

  # Update user
  - path: /users/{id}
    method: PUT
    description: Update user information
    parameters:
      - name: id
        type: string
        required: true
        description: User ID
    requestBody:
      required: true
      contentType: application/json
      schema:
        type: object
        properties:
          name:
            type: string
          email:
            type: string
          role:
            type: string
    responses:
      200:
        description: User updated successfully
      404:
        description: User not found

  # Delete user
  - path: /users/{id}
    method: DELETE
    description: Delete a user
    parameters:
      - name: id
        type: string
        required: true
        description: User ID
    responses:
      204:
        description: User deleted successfully
      404:
        description: User not found
```

## Best Practices

1. **Use meaningful IDs**: Choose IDs that clearly identify the API
2. **Version your APIs**: Always include a version number
3. **Provide descriptions**: Add descriptions to help AI understand the API
4. **Include examples**: Examples help both humans and AI understand the expected format
5. **Be consistent**: Use consistent naming conventions and formats
6. **Document authentication**: Clearly specify authentication requirements
7. **Define all responses**: Include both success and error responses