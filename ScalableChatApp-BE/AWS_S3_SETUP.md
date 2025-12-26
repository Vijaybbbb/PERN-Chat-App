# AWS S3 Setup for File Attachments

## Prerequisites
1. AWS Account
2. AWS CLI installed (optional)

## Setup Steps

### 1. Create S3 Bucket
```bash
# Using AWS CLI
aws s3 mb s3://your-chat-app-bucket --region us-east-1

# Or create via AWS Console:
# - Go to S3 service
# - Click "Create bucket"
# - Enter bucket name: your-chat-app-bucket
# - Select region: us-east-1
# - Keep default settings
```

### 2. Configure Bucket Policy
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::your-chat-app-bucket/*"
        }
    ]
}
```

### 3. Create IAM User
1. Go to IAM service
2. Create new user: `chat-app-user`
3. Attach policy: `AmazonS3FullAccess`
4. Generate Access Keys

### 4. Update Environment Variables
```env
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-chat-app-bucket
```

### 5. Test Upload
Start the Message microservice and test file upload endpoint:
```bash
curl -X POST http://localhost:4003/message/upload \
  -H "Authorization: Bearer your_jwt_token" \
  -F "file=@test-image.jpg"
```

## Security Notes
- Never commit AWS credentials to version control
- Use IAM roles in production
- Enable S3 bucket versioning
- Configure CORS if needed for direct browser uploads