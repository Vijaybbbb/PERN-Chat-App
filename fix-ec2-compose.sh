#!/bin/bash
# Fix EC2 docker-compose.yml to add rabbitmq dependency for message-service

cat > /tmp/compose-fix.txt << 'EOF'
    depends_on:
      - postgres
      - redis
      - rabbitmq
EOF

echo "This script will add 'rabbitmq' to message-service depends_on in EC2"
echo "Run this on EC2:"
echo ""
echo "sed -i '/message-service:/,/depends_on:/{/depends_on:/a\      - rabbitmq' /home/ubuntu/chatapp/docker-compose.yml"
echo ""
echo "Then restart: docker-compose up -d message-service"
