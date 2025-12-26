# TODO: Fix MongoDB Connection and Model Refs in Microservices

## Information Gathered
- The project has multiple microservices (Chat, Message, User, Common) and a monolithic version (Mono).
- Each microservice has its own `dataBaseConnection.js` file, creating separate Mongoose connections.
- Models use refs (e.g., chatModel refs 'user' and 'message'), but refs fail because models are on different connections.
- Require paths in app.js files are incorrect (absolute paths instead of relative).
- Common Microservice has a shared `databaseConnection.js` that can be used centrally.
- .env file exists with MONGO connection string.

## Plan
- Centralize database connection using Common Microservice's `databaseConnection.js` to ensure all services share the same Mongoose instance, allowing refs to work.
- Update require paths in app.js files to use relative paths and point to Common's connection.
- Update Mono/index.js to use Common's connection (it has a wrong path './Utils/databaseConnection').
- Remove or deprecate individual `dataBaseConnection.js` files in each microservice.

## Dependent Files to Edit
- Chat Microservice/app.js: Update require path for databaseConnection. ✅
- Message Microservice/app.js: Update require path for databaseConnection. ✅
- User Microservice/app.js: Update require path for databaseConnection. ✅
- Mono/index.js: Update require path for databaseConnection. ✅

## Followup Steps
- Run the services using `run_all.sh` to test connections. ✅
- Updated databaseConnection.js to prevent multiple connections and reduce timeout buffers. ✅
- Fixed invalid MongoDB options (removed bufferMaxEntries). ✅
- Wrapped app setup in connect().then() to ensure models are loaded after connection. ✅
- Check console logs for successful database connections and absence of ref errors.
- Test API endpoints that involve population of refs (e.g., fetching chats with users/messages).
- If issues persist, check for missing dependencies or version conflicts in package.json files.
