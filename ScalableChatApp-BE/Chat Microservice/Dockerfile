FROM node:22-alpine
WORKDIR /app
COPY ["Chat Microservice/package*.json", "./"]
COPY ["Common Microservice/package*.json", "/tmp/common/"]
RUN npm install --production
RUN cd /tmp/common && npm install --production && cp -a node_modules/. /app/node_modules/
COPY ["Chat Microservice/", "./"]
COPY ["Common Microservice/", "/Common Microservice/"]
RUN ln -s /app/node_modules "/Common Microservice/node_modules"
EXPOSE 3002
CMD ["node", "app.js"]
