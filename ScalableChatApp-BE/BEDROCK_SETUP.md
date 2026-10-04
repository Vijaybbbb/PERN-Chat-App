# AI chat features with Amazon Bedrock

The Message Microservice now exposes two authenticated endpoints:

- `GET /message/ai/summary/:chatId` — summarizes a group conversation and extracts key points/action items.
- `GET /message/ai/smart-replies/:chatId` — suggests three short replies based on the latest conversation context.

The frontend displays these actions in the chat panel. Selecting a smart reply puts it into the composer; it is not sent automatically.

## Configuration

Set these variables for the Message Microservice:

```env
BEDROCK_ENABLED=true
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=amazon.nova-micro-v1:0
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

In production, prefer an ECS/EC2 task or instance IAM role instead of static AWS keys. The role needs permission to invoke the selected Bedrock model, for example:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["bedrock:InvokeModel", "bedrock:Converse"],
    "Resource": "*"
  }]
}
```

Enable model access for the selected Claude model in the Bedrock console. AI calls are authenticated by the existing JWT middleware, limited to chat members, rate-limited, cached in Redis for five minutes, and capped to the most recent text messages so attachments are never sent to the model.

When `BEDROCK_ENABLED` is not `true`, normal chat continues to work and AI buttons show a configuration message.
