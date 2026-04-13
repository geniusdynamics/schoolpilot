# Generic SMS Gateway Plugin

Connect SchoolPilot3 to any SMS API provider with flexible HTTP configuration. Supports popular providers like Twilio, Nexmo, Africa's Talking, and custom SMS gateways.

## Overview

This plugin provides a universal SMS integration that works with virtually any HTTP-based SMS API through configurable:

- ✅ **Multiple Authentication Methods**: API Key, Bearer Token, Basic Auth, Custom Headers, Query Params
- ✅ **Flexible Request Formats**: JSON, Form Data, Query Parameters
- ✅ **Response Parsing**: Configurable success detection and message ID extraction
- ✅ **Provider Presets**: Pre-configured for popular SMS providers
- ✅ **Retry Logic**: Automatic retry with exponential backoff
- ✅ **Bulk Sending**: Send to multiple recipients
- ✅ **Status Tracking**: Check delivery status (if supported by provider)

## Supported Providers

### Pre-configured Providers

1. **Twilio** - Enterprise SMS platform
2. **Nexmo/Vonage** - Global SMS API
3. **Africa's Talking** - African SMS gateway
4. **MessageBird** - Multi-channel messaging
5. **Plivo** - Cloud communications
6. **Clickatell** - SMS gateway
7. **Custom API** - Any HTTP-based SMS API

## Installation

### 1. Activate Plugin

Navigate to **Settings > Plugins** and activate **Generic SMS Gateway**.

### 2. Configure Provider

Choose from pre-configured providers or set up a custom API.

## Configuration Examples

### Twilio

```json
{
  "provider": "twilio",
  "apiUrl": "https://api.twilio.com",
  "authType": "basic",
  "username": "YOUR_ACCOUNT_SID",
  "password": "YOUR_AUTH_TOKEN",
  "senderId": "+1234567890"
}
```

### Nexmo/Vonage

```json
{
  "provider": "nexmo",
  "apiUrl": "https://rest.nexmo.com",
  "authType": "query",
  "apiKey": "YOUR_API_KEY",
  "apiSecret": "YOUR_API_SECRET",
  "senderId": "SchoolPilot"
}
```

### Africa's Talking

```json
{
  "provider": "africastalking",
  "apiUrl": "https://api.africastalking.com",
  "authType": "apikey",
  "apiKey": "YOUR_API_KEY",
  "apiKeyHeader": "apiKey",
  "senderId": "SchoolPilot",
  "additionalFields": {
    "username": "YOUR_USERNAME"
  }
}
```

### MessageBird

```json
{
  "provider": "messagebird",
  "apiUrl": "https://rest.messagebird.com",
  "authType": "apikey",
  "apiKey": "YOUR_ACCESS_KEY",
  "apiKeyHeader": "Authorization",
  "senderId": "SchoolPilot"
}
```

### Custom API

```json
{
  "provider": "custom",
  "apiUrl": "https://api.your-sms-provider.com",
  "authType": "apikey",
  "apiKey": "YOUR_API_KEY",
  "apiKeyHeader": "X-API-Key",
  "sendEndpoint": "/v1/sms/send",
  "httpMethod": "POST",
  "requestFormat": "json",
  "phoneField": "to",
  "messageField": "message",
  "senderIdField": "from",
  "senderId": "SchoolPilot",
  "responseFormat": "json",
  "successField": "status",
  "successValue": "success",
  "messageIdField": "id"
}
```

## Configuration Options

### Basic Settings

| Setting | Description | Required |
|---------|-------------|----------|
| **Provider** | Select pre-configured provider or custom | Yes |
| **API URL** | Base URL of SMS API | Yes |
| **Sender ID** | Your sender ID or phone number | Recommended |

### Authentication

| Setting | Description | Auth Types |
|---------|-------------|------------|
| **Auth Type** | Authentication method | All |
| **API Key** | API key or token | API Key, Bearer |
| **API Secret** | API secret (if required) | Some providers |
| **API Key Header** | Header name for API key | API Key |
| **Username** | Username for basic auth | Basic Auth |
| **Password** | Password for basic auth | Basic Auth |
| **Custom Headers** | Additional headers (JSON) | Custom |

### Request Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| **Send Endpoint** | API endpoint path | /sms/send |
| **HTTP Method** | GET, POST, or PUT | POST |
| **Request Format** | JSON, Form Data, or Query | JSON |
| **Phone Field** | Field name for phone number | to |
| **Message Field** | Field name for message text | message |
| **Sender ID Field** | Field name for sender ID | from |
| **Additional Fields** | Extra fields (JSON) | {} |

### Response Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| **Response Format** | JSON, XML, or Text | JSON |
| **Success Field** | Path to success indicator | success |
| **Success Value** | Value indicating success | true |
| **Message ID Field** | Path to message ID | messageId |
| **Status Endpoint** | Endpoint for status checks | - |

### Advanced Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **Timeout** | Request timeout (ms) | 30000 |
| **Retry Attempts** | Number of retries | 3 |
| **Enable Logging** | Log requests for debugging | true |

## Usage

### Send Single SMS

```typescript
import { getPlugins } from '@/plugins/PluginManager';

const pluginManager = getPlugins();
const smsPlugin = pluginManager.getPlugin('com.schoolpilot.sms-gateway');

const result = await smsPlugin.plugin.send(
  '+1234567890',
  'Hello from SchoolPilot!'
);

console.log('Success:', result.success);
console.log('Message ID:', result.messageId);
```

### Send Bulk SMS

```typescript
const recipients = [
  '+1234567890',
  '+0987654321',
  '+1122334455'
];

const result = await smsPlugin.plugin.bulkSend(
  recipients,
  'Important school announcement!'
);

console.log(`Sent: ${result.successful}/${result.total}`);
console.log(`Failed: ${result.failed}`);
```

### Check Delivery Status

```typescript
const status = await smsPlugin.plugin.getDeliveryStatus('MSG-12345');
console.log('Status:', status); // 'sent', 'delivered', 'failed', etc.
```

### Send Template Message

```typescript
const result = await smsPlugin.plugin.sendTemplate(
  '+1234567890',
  'fee-reminder',
  {
    studentName: 'John Doe',
    amount: '$500',
    dueDate: '2026-05-01'
  }
);
```

## Field Mapping

### Understanding Field Names

Different SMS providers use different field names. Configure these to match your provider's API:

**Common Phone Field Names:**
- `to`, `phone`, `recipient`, `destination`, `number`, `msisdn`

**Common Message Field Names:**
- `message`, `text`, `body`, `content`, `msg`

**Common Sender Field Names:**
- `from`, `sender`, `senderId`, `originator`, `source`

### Nested Field Paths

Use dot notation for nested fields in responses:

```json
{
  "successField": "data.status",
  "messageIdField": "data.message.id"
}
```

For arrays, use index notation:

```json
{
  "successField": "messages.0.status",
  "messageIdField": "messages.0.message-id"
}
```

## Authentication Examples

### API Key in Header

```json
{
  "authType": "apikey",
  "apiKey": "your-api-key",
  "apiKeyHeader": "X-API-Key"
}
```

Request:
```
POST /sms/send
X-API-Key: your-api-key
Content-Type: application/json

{"to": "+1234567890", "message": "Hello"}
```

### Bearer Token

```json
{
  "authType": "bearer",
  "apiKey": "your-bearer-token"
}
```

Request:
```
POST /sms/send
Authorization: Bearer your-bearer-token
Content-Type: application/json

{"to": "+1234567890", "message": "Hello"}
```

### Basic Authentication

```json
{
  "authType": "basic",
  "username": "your-username",
  "password": "your-password"
}
```

Request:
```
POST /sms/send
Authorization: Basic base64(username:password)
Content-Type: application/json

{"to": "+1234567890", "message": "Hello"}
```

### Query Parameters

```json
{
  "authType": "query",
  "apiKey": "your-api-key",
  "apiSecret": "your-api-secret"
}
```

Request:
```
POST /sms/send?api_key=your-api-key&api_secret=your-api-secret
Content-Type: application/json

{"to": "+1234567890", "message": "Hello"}
```

### Custom Headers

```json
{
  "authType": "custom",
  "customHeaders": {
    "X-Client-ID": "your-client-id",
    "X-Client-Secret": "your-client-secret",
    "X-Custom-Header": "custom-value"
  }
}
```

## Request Format Examples

### JSON (Default)

```json
{
  "requestFormat": "json"
}
```

Request body:
```json
{
  "to": "+1234567890",
  "message": "Hello",
  "from": "SchoolPilot"
}
```

### Form Data (URL Encoded)

```json
{
  "requestFormat": "form"
}
```

Request body:
```
to=%2B1234567890&message=Hello&from=SchoolPilot
```

### Query Parameters

```json
{
  "requestFormat": "query",
  "httpMethod": "GET"
}
```

Request:
```
GET /sms/send?to=%2B1234567890&message=Hello&from=SchoolPilot
```

## Response Parsing Examples

### Simple JSON Response

API Response:
```json
{
  "success": true,
  "messageId": "MSG-12345",
  "status": "sent"
}
```

Configuration:
```json
{
  "responseFormat": "json",
  "successField": "success",
  "successValue": "true",
  "messageIdField": "messageId"
}
```

### Nested JSON Response

API Response:
```json
{
  "data": {
    "result": "ok",
    "message": {
      "id": "ABC123",
      "status": "queued"
    }
  }
}
```

Configuration:
```json
{
  "responseFormat": "json",
  "successField": "data.result",
  "successValue": "ok",
  "messageIdField": "data.message.id"
}
```

### Array Response

API Response:
```json
{
  "messages": [
    {
      "status": "0",
      "message-id": "XYZ789"
    }
  ]
}
```

Configuration:
```json
{
  "responseFormat": "json",
  "successField": "messages.0.status",
  "successValue": "0",
  "messageIdField": "messages.0.message-id"
}
```

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to SMS API

**Solutions**:
- Verify API URL is correct and accessible
- Check authentication credentials
- Ensure network access is allowed
- Test API with curl or Postman first

### Authentication Errors

**Problem**: 401 Unauthorized or 403 Forbidden

**Solutions**:
- Verify API key/credentials are correct
- Check auth type matches provider requirements
- Ensure API key header name is correct
- Check if credentials have expired

### Messages Not Sending

**Problem**: API returns success but messages don't arrive

**Solutions**:
- Verify sender ID is registered with provider
- Check phone number format (include country code)
- Ensure account has sufficient credits
- Check provider's message logs

### Response Parsing Errors

**Problem**: Cannot parse API response

**Solutions**:
- Enable logging to see actual response
- Verify response format (JSON/XML/Text)
- Check field paths are correct
- Test with provider's API documentation

### Rate Limiting

**Problem**: Too many requests error

**Solutions**:
- Reduce bulk send batch size
- Add delays between messages
- Check provider's rate limits
- Upgrade to higher tier plan

## Testing

### Test Configuration

```typescript
// Test with a single message
const result = await smsPlugin.plugin.send(
  'YOUR_PHONE_NUMBER',
  'Test message from SchoolPilot'
);

console.log('Test result:', result);
```

### Enable Debug Logging

Set `enableLogging: true` in configuration to see detailed request/response logs.

### Use Provider's Test Mode

Many providers offer test/sandbox modes:

- **Twilio**: Use test credentials
- **Nexmo**: Use test numbers
- **Africa's Talking**: Use sandbox environment

## Best Practices

### Security

1. **Never commit credentials** to version control
2. **Use environment variables** for sensitive data
3. **Rotate API keys** regularly
4. **Use HTTPS** for all API calls
5. **Validate phone numbers** before sending

### Performance

1. **Use bulk send** for multiple recipients
2. **Implement rate limiting** to avoid API throttling
3. **Cache delivery status** to reduce API calls
4. **Use async operations** for large batches

### Reliability

1. **Enable retry logic** for transient failures
2. **Log all SMS operations** for audit trail
3. **Monitor delivery rates** and investigate failures
4. **Set appropriate timeouts** based on provider SLA

### Cost Optimization

1. **Validate phone numbers** to avoid wasted sends
2. **Use templates** to reduce message length
3. **Batch messages** when possible
4. **Monitor usage** and set alerts

## Provider-Specific Notes

### Twilio

- Requires Account SID and Auth Token
- Phone numbers must be in E.164 format
- Sender ID must be a Twilio number or verified sender
- Supports delivery status webhooks

### Nexmo/Vonage

- API key and secret in query parameters
- Supports alphanumeric sender IDs
- Status code "0" means success
- Good international coverage

### Africa's Talking

- Popular in African countries
- Requires username in additional fields
- Supports bulk sending natively
- Competitive pricing for African numbers

### MessageBird

- Good European coverage
- Supports voice and SMS
- Real-time delivery reports
- Supports Unicode messages

## API Reference

### SMSPlugin Interface

```typescript
interface SMSPlugin {
  send(phone: string, message: string): Promise<SMSResult>;
  bulkSend(recipients: string[], message: string): Promise<BulkSMSResult>;
  sendTemplate(phone: string, templateId: string, params: Record<string, any>): Promise<SMSResult>;
  getDeliveryStatus(messageId: string): Promise<string>;
}
```

### SMSResult

```typescript
interface SMSResult {
  success: boolean;
  messageId: string;
  status: 'sent' | 'failed' | 'pending';
  recipient: string;
  message: string;
}
```

### BulkSMSResult

```typescript
interface BulkSMSResult {
  total: number;
  successful: number;
  failed: number;
  results: SMSResult[];
}
```

## Support

- **Documentation**: [SchoolPilot3 Docs](https://docs.schoolpilot3.com)
- **GitHub Issues**: [Report Issues](https://github.com/schoolpilot/schoolpilot3/issues)
- **Community**: [Discord Server](https://discord.gg/schoolpilot)

## License

MIT License - See LICENSE file for details

## Credits

- SchoolPilot3 Team
- Community Contributors

---

**Version**: 1.0.0
**Last Updated**: April 12, 2026
