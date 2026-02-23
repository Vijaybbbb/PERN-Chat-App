#!/bin/bash
# Fix duplicate rabbitmq in message-service depends_on

# This will show the current docker-compose.yml message-service section
echo "=== Current message-service depends_on ==="
grep -A10 "message-service:" ~/chatapp/docker-compose.yml | grep -A5 "depends_on:"

echo ""
echo "=== Fixing duplicate rabbitmq entry ==="

# Remove duplicate lines in depends_on section
sed -i '/message-service:/,/restart:/{
  /depends_on:/,/restart:/{
    /- rabbitmq/!b
    N
    /\n.*- rabbitmq/d
  }
}' ~/chatapp/docker-compose.yml

echo ""
echo "=== Fixed message-service depends_on ==="
grep -A10 "message-service:" ~/chatapp/docker-compose.yml | grep -A5 "depends_on:"
