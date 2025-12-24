# Automation Form Service

A microservice for handling static and dynamic HTML forms in the automation workflow system. This service manages form rendering, submission, and session updates for both inline (static) and popup (dynamic) form types.

## Overview

The Automation Form Service provides a centralized way to:
- Serve HTML forms for user input
- Handle form submissions
- Update session data with form responses
- Support both static (inline) and dynamic (popup) form rendering modes

## Table of Contents

- [Features](#features)
- [Form Types](#form-types)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage in Flow Configuration](#usage-in-flow-configuration)
- [API Endpoints](#api-endpoints)
- [Form Development](#form-development)
- [Session Management](#session-management)

## Features

- **Static Forms**: Rendered inline within the frontend application
- **Dynamic Forms**: Opened in a new window/tab with automatic polling for submission status
- **Session Integration**: Automatically updates session data with form submissions
- **Multi-Domain Support**: Supports multiple domains (FIS12, FIS13, TRV14, etc.)
- **EJS Templating**: Uses EJS for dynamic form rendering with injected submission URLs

## Form Types

### Static Forms (HTML_FORM)

Static forms are rendered directly inline within the frontend application. They are suitable for:
- Simple data collection forms
- Forms that should be part of the main flow UI
- Forms that don't require a separate window

**Characteristics:**
- Rendered immediately in the frontend
- No popup window required
- Form submission happens within the same page context
- Flow continues automatically after submission

### Dynamic Forms (DYNAMIC_FORM)

Dynamic forms open in a new window/tab and are suitable for:
- Complex multi-step forms
- Forms requiring user attention in a separate window
- Forms that may take time to complete
- Forms that need to be tracked via polling

**Characteristics:**
- Opens in a new browser window/tab
- Frontend polls for submission status
- Shows success page after submission
- Auto-closes after successful submission
- Flow continues automatically once submission is detected

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Run in production mode
npm start
```

### Environment Variables

```bash
PORT=3001                    # Server port (default: 3001)
BASE_URL=http://localhost:3001  # Base URL for form service
```

## Configuration

Forms are configured in `src/config/index.yaml`. Each form must be registered with the following structure:

```yaml
domains:
  - name: 'FIS12'              # Domain identifier
    version: '2.0.2'            # Domain version
    forms:
      - name: "form_name"       # Display name
        url: "form_url"         # URL identifier (used in flow config)
        path: "FIS12/form-path" # Path to form.html file
        type: "static"          # "static" or "dynamic"
        sessionUpdateFunction: "update-session.ts"
        successRedirect: "https://example.com/success"
```

### Form File Structure

Forms are stored as HTML files in the following structure:
```
src/config/
  └── {domain}/
      └── {form-path}/
          └── form.html
```

Example:
```
src/config/
  └── FIS12/
      └── loan-amount-adjustment-form/
          └── form.html
```

### Form HTML Template

Forms use EJS templating and receive the following variables:
- `actionUrl`: The submission URL (automatically injected)
- `session_id`: Session identifier
- `transaction_id`: Transaction identifier
- `flow_id`: Flow identifier

Example form template:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Form Title</title>
</head>
<body>
  <form method="POST" action="<%= actionUrl %>">
    <label for="field1">Field 1</label>
    <input type="text" id="field1" name="field1" />
    
    <input type="submit" value="Submit" />
  </form>
</body>
</html>
```

## Usage in Flow Configuration

Forms are integrated into flows via the `automation-config-service`. Configure forms in your flow YAML files as follows:

### Static Form Configuration (HTML_FORM)

In your flow configuration file (e.g., `automation-config-service/src/config/FIS12/V-2.0.2/goldLoan/flows/index.yaml`):

```yaml
sequence:
  - key: loan_amount_adjustment_form
    label: Loan Amount Adjustment Form
    type: HTML_FORM
    unsolicited: false
    pair: null
    owner: BPP
    expect: false
    input:
      - name: form_submission_id
        label: Enter Form Submission id
        type: HTML_FORM
        reference: $.reference_data.loan_amount_adjustment_form
```

**Key Points:**
- `type: HTML_FORM` indicates a static form
- `reference` field points to the form URL in reference data (e.g., `$.reference_data.loan_amount_adjustment_form`)
- The form URL should match the `url` field in `automation-form-service/src/config/index.yaml`
- Form is rendered inline in the frontend

### Dynamic Form Configuration (DYNAMIC_FORM)

```yaml
sequence:
  - key: verification_status
    label: Verification Status Form
    type: DYNAMIC_FORM
    unsolicited: false
    pair: null
    owner: BPP
    expect: false
    input:
      - name: form_submission_id
        label: Enter Form Submission id
        type: DYNAMIC_FORM
        payloadField: "form_submission_id"
        reference: $.reference_data.verification_status
```

**Key Points:**
- `type: DYNAMIC_FORM` indicates a dynamic form
- `reference` field points to the form URL in reference data
- `payloadField` specifies where to store the submission ID
- Form opens in a new window/tab
- Frontend polls for submission status

### Reference Data Structure

The form URL must be provided in the reference data of the previous API response. For example:

```json
{
  "reference_data": {
    "loan_amount_adjustment_form": "FIS12/loan_amount_adjustment_form",
    "verification_status": "FIS12/verification_status"
  }
}
```

The form service will look up forms using the pattern: `{domain}/{formUrl}`

## API Endpoints

### Get Form

**GET** `/forms/:domain/:formUrl`

Retrieves and renders a form.

**Query Parameters:**
- `session_id` (required): Session identifier
- `transaction_id` (required): Transaction identifier
- `flow_id` (required): Flow identifier
- `direct` (optional): For dynamic forms, set to `true` to render HTML directly

**Response for Static Forms:**
- Returns HTML content directly

**Response for Dynamic Forms (without `direct=true`):**
```json
{
  "success": true,
  "type": "dynamic",
  "formUrl": "http://localhost:3001/forms/FIS12/verification_status?flow_id=...&session_id=...&transaction_id=...&direct=true",
  "message": "Please open this URL to fill the form"
}
```

**Response for Dynamic Forms (with `direct=true`):**
- Returns HTML content directly

### Submit Form

**POST** `/forms/:domain/:formUrl/submit`

Handles form submission.

**Query Parameters:**
- `session_id` (required): Session identifier
- `transaction_id` (required): Transaction identifier
- `flow_id` (required): Flow identifier

**Request Body:**
Form data as key-value pairs (standard HTML form submission)

**Response for Static Forms:**
- Calls mock service to continue flow
- Returns success response

**Response for Dynamic Forms:**
- Updates main session with submission status
- Returns HTML success page
- Does NOT call mock service (frontend handles flow continuation)

## Form Development

### Creating a New Static Form

1. **Create the form HTML file:**
   ```bash
   mkdir -p src/config/FIS12/my-new-form
   touch src/config/FIS12/my-new-form/form.html
   ```

2. **Write the form HTML:**
   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
     <meta charset="UTF-8" />
     <title>My New Form</title>
   </head>
   <body>
     <form method="POST" action="<%= actionUrl %>">
       <!-- Your form fields here -->
       <input type="submit" value="Submit" />
     </form>
   </body>
   </html>
   ```

3. **Register the form in `src/config/index.yaml`:**
   ```yaml
   - name: "My New Form"
     url: "my_new_form"
     path: "FIS12/my-new-form"
     type: "static"
     sessionUpdateFunction: "update-session.ts"
     successRedirect: "https://example.com/success"
   ```

4. **Add form to flow configuration:**
   ```yaml
   - key: my_new_form
     label: My New Form
     type: HTML_FORM
     input:
       - name: form_submission_id
         type: HTML_FORM
         reference: $.reference_data.my_new_form
   ```

### Creating a New Dynamic Form

Follow the same steps as static forms, but:
- Set `type: "dynamic"` in `index.yaml`
- Use `type: DYNAMIC_FORM` in flow configuration
- Include `payloadField` in the input configuration

## Session Management

### Session Update

When a form is submitted, the service:
1. Generates a unique `submission_id` (UUID)
2. Updates the transaction session with form data:
   ```typescript
   {
     form_data: {
       [formUrl]: {
         ...formData,
         form_submission_id: submission_id
       }
     }
   }
   ```

### Dynamic Form Submission Tracking

For dynamic forms, the service also updates the main session to track submission status:

```typescript
{
  formSubmissions: {
    [transaction_id]_[formUrl]: {
      submitted: true,
      submission_id: "uuid",
      timestamp: "ISO timestamp",
      formUrl: "form_url"
    }
  }
}
```

The frontend polls this data to detect when a dynamic form has been submitted.

## Differences Between Static and Dynamic Forms

| Feature | Static Form (HTML_FORM) | Dynamic Form (DYNAMIC_FORM) |
|---------|-------------------------|----------------------------|
| Rendering | Inline in frontend | New window/tab |
| User Experience | Part of main flow | Separate window |
| Submission Detection | Immediate | Polling-based |
| Flow Continuation | Automatic via mock service | Frontend handles proceed |
| Use Case | Simple forms | Complex/long forms |
| Configuration Type | `type: "static"` | `type: "dynamic"` |
| Flow Config Type | `type: HTML_FORM` | `type: DYNAMIC_FORM` |

## Troubleshooting

### Form Not Found (404)

- Verify the form is registered in `src/config/index.yaml`
- Check that the `url` field matches the reference data
- Ensure the form HTML file exists at the specified `path`

### Form Not Rendering

- Check that the form HTML file is valid
- Verify EJS template syntax (use `<%= %>` for variables)
- Check server logs for errors

### Dynamic Form Not Detecting Submission

- Verify `updateMainSessionWithFormSubmission` is being called
- Check that the frontend is polling the correct session
- Ensure `formUrl` parameter is passed correctly

### Session Not Updating

- Verify `transaction_id` is correct
- Check Redis connection (if using Redis for sessions)
- Review session service logs

## Development

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Architecture

```
automation-form-service/
├── src/
│   ├── config/
│   │   ├── index.yaml              # Form registry
│   │   ├── central-config.ts       # Configuration service
│   │   └── {domain}/               # Domain-specific forms
│   │       └── {form-path}/
│   │           └── form.html
│   ├── controllers/
│   │   └── form-controller.ts      # Form request handlers
│   ├── routes/
│   │   └── form-routes.ts          # Express routes
│   ├── services/
│   │   └── session-service.ts      # Session management
│   └── index.ts                    # Application entry point
└── package.json
```

## Related Services

- **automation-config-service**: Defines flow configurations with form actions
- **automation-frontend**: Renders forms and handles user interactions
- **automation-mock-service**: Continues flow after form submission (static forms)

