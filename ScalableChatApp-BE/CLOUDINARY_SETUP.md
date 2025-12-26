# Cloudinary Setup for Voice Messages

## Prerequisites
1. Cloudinary Account (free tier available)

## Setup Steps

### 1. Create Cloudinary Account
- Go to https://cloudinary.com/
- Sign up for free account
- Get your credentials from Dashboard

### 2. Get API Credentials
From your Cloudinary Dashboard, copy:
- Cloud Name
- API Key  
- API Secret

### 3. Update Environment Variables
Add to your `.env` file:
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

### 4. Test Voice Upload
Start the Message microservice and test voice upload:
```bash
# Record audio and upload via frontend
# Or test with curl:
curl -X POST http://localhost:4003/message/upload-voice \
  -H "Authorization: Bearer your_jwt_token" \
  -F "voice=@test-audio.webm"
```

## Features
- **Audio Storage**: Cloudinary handles audio file storage and delivery
- **Format Conversion**: Automatically converts to MP3 for compatibility
- **CDN Delivery**: Fast audio streaming via Cloudinary CDN
- **Folder Organization**: Voice messages stored in `chat-voice-messages/` folder

## Browser Compatibility
- Chrome/Edge: WebM audio recording
- Firefox: WebM/OGG audio recording  
- Safari: MP4 audio recording
- All browsers: MP3 playback via Cloudinary conversion