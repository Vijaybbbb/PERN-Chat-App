#!/bin/bash

# Update system
sudo yum update -y 

# Install Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Create app directory
mkdir -p /home/ec2-user/chatapp
cd /home/ec2-user/chatapp

# Create environment file
cat > .env << EOF
ECR_REGISTRY=YOUR_ECR_REGISTRY_URL
POSTGRES_PASSWORD=your_secure_password
EOF

echo "EC2 setup complete. Please:"
echo "1. Configure AWS credentials"
echo "2. Update .env file with your ECR registry URL"
echo "3. Copy docker-compose.prod.yml to this directory"
