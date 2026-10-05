const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');
const queries = require('../Model/queries');
const redisClient = require('../../Common Microservice/redisClient');
const { createObservability } = require('../../Common Microservice/observability');
const observability = createObservability(process.env.SERVICE_NAME);
const { logger } = observability;

const getDb = () => require('../Model/dataBaseConnection');
const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'amazon.nova-micro-v1:0';
const MAX_CONTEXT_MESSAGES = Number(process.env.AI_MAX_CONTEXT_MESSAGES || 80);
const MAX_CONTEXT_CHARS = Number(process.env.AI_MAX_CONTEXT_CHARS || 18000);
const CACHE_TTL = Number(process.env.AI_CACHE_TTL || 300);

let bedrockClient;

const isBedrockEnabled = () => process.env.BEDROCK_ENABLED === 'true';

const getBedrockClient = () => {
    if (!bedrockClient) {
        bedrockClient = new BedrockRuntimeClient({
            region: process.env.AWS_REGION || 'us-east-1'
        });
    }
    return bedrockClient;
};

const cacheGet = async (key) => {
    try {
        return redisClient.isReady ? await redisClient.get(key) : null;
    } catch (error) {
        logger.warn('AI cache read skipped', { event: 'ai_cache_read_failed', error });
        return null;
    }
};

const cacheSet = async (key, value) => {
    try {
        if (redisClient.isReady) await redisClient.setEx(key, CACHE_TTL, JSON.stringify(value));
    } catch (error) {
        logger.warn('AI cache write skipped', { event: 'ai_cache_write_failed', error });
    }
};

const parseModelJson = (text, fallback) => {
    try {
        const cleaned = String(text || '')
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();
        return JSON.parse(cleaned);
    } catch (error) {
        return fallback;
    }
};

const invokeClaude = async (systemPrompt, userPrompt, maxTokens, temperature = 0.2) => {
    const response = await observability.measureDependency('bedrock', 'converse', () => (
        getBedrockClient().send(new ConverseCommand({
            modelId: MODEL_ID,
            system: [{ text: systemPrompt }],
            messages: [{ role: 'user', content: [{ text: userPrompt }] }],
            inferenceConfig: { maxTokens, temperature }
        }))
    ));

    return (response.output?.message?.content || [])
        .filter((part) => part.text)
        .map((part) => part.text)
        .join('\n')
        .trim();
};

const requireChatAccess = async (chatId, userId) => {
    const db = getDb();
    const result = await db.query(queries.getChatAccess, [chatId, userId]);
    return result.rows[0] || null;
};

const getConversationContext = async (chatId) => {
    const db = getDb();
    const result = await db.query(queries.getAiMessages, [chatId, MAX_CONTEXT_MESSAGES]);
    const messages = result.rows.reverse();
    let context = messages
        .map((message) => `[${message.senderName}] ${message.content}`)
        .join('\n');

    if (context.length > MAX_CONTEXT_CHARS) {
        context = context.slice(-MAX_CONTEXT_CHARS);
    }

    return { messages, context };
};

const unavailableResponse = (res) => res.status(503).json({
    success: false,
    message: 'AI features are not configured. Set BEDROCK_ENABLED=true and configure AWS Bedrock credentials.'
});

const summarizeChat = async (req, res) => {
    if (!isBedrockEnabled()) return unavailableResponse(res);

    try {
        const chat = await requireChatAccess(req.params.chatId, req.userId);
        if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });
        if (!chat.isGroupChat) {
            return res.status(400).json({ success: false, message: 'Summaries are available for group chats only' });
        }

        const { messages, context } = await getConversationContext(req.params.chatId);
        if (!messages.length) return res.status(400).json({ success: false, message: 'There are no text messages to summarize yet' });

        const cacheKey = `ai:summary:${req.params.chatId}:${messages.length}:${messages[messages.length - 1].createdAt}`;
        const cached = await cacheGet(cacheKey);
        if (cached) return res.json(JSON.parse(cached));

        const raw = await invokeClaude(
            'You summarize workplace group chats accurately and neutrally. Do not invent facts, names, deadlines, or decisions. Return only valid JSON.',
            `Summarize this group chat in concise, useful language. Return exactly this JSON shape:
{"title":"short title","summary":"2-4 sentence summary","keyPoints":["point"],"actionItems":["action item"]}

Conversation:
${context}`,
            700
        );

        const parsed = parseModelJson(raw, {
            title: 'Group chat summary',
            summary: raw,
            keyPoints: [],
            actionItems: []
        });
        const result = {
            success: true,
            model: MODEL_ID,
            messagesConsidered: messages.length,
            title: String(parsed.title || 'Group chat summary'),
            summary: String(parsed.summary || raw),
            keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.map(String).slice(0, 8) : [],
            actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems.map(String).slice(0, 8) : []
        };

        await cacheSet(cacheKey, result);
        observability.recordOperation('ai_chat_summary');
        return res.json(result);
    } catch (error) {
        observability.recordOperation('ai_chat_summary', 'failure');
        req.log.error('Bedrock summary failed', { event: 'bedrock_summary_failed', modelId: MODEL_ID, error });
        return res.status(502).json({ success: false, message: 'Unable to generate the group summary right now' });
    }
};

const suggestReplies = async (req, res) => {
    if (!isBedrockEnabled()) return unavailableResponse(res);

    try {
        const chat = await requireChatAccess(req.params.chatId, req.userId);
        if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });

        const { messages, context } = await getConversationContext(req.params.chatId);
        if (!messages.length) return res.status(400).json({ success: false, message: 'Send a message first to get smart replies' });

        const cacheKey = `ai:replies:${req.params.chatId}:${messages.length}:${messages[messages.length - 1].createdAt}`;
        const cached = await cacheGet(cacheKey);
        if (cached) return res.json(JSON.parse(cached));

        const raw = await invokeClaude(
            'You suggest natural, concise chat replies. Never claim actions the user did not ask for. Return only valid JSON.',
            `Suggest exactly three short replies to the latest message in this conversation. Use different tones such as helpful, concise, and friendly. Return only a JSON array like:
[{"reply":"...","tone":"helpful"},{"reply":"...","tone":"concise"},{"reply":"...","tone":"friendly"}]

Conversation:
${context}`,
            300,
            0.5
        );

        const parsed = parseModelJson(raw, []);
        const suggestions = (Array.isArray(parsed) ? parsed : [])
            .map((item) => ({ reply: String(item.reply || '').trim(), tone: String(item.tone || 'suggested') }))
            .filter((item) => item.reply)
            .slice(0, 3);
        const result = { success: true, model: MODEL_ID, suggestions };

        await cacheSet(cacheKey, result);
        observability.recordOperation('ai_smart_replies');
        return res.json(result);
    } catch (error) {
        observability.recordOperation('ai_smart_replies', 'failure');
        req.log.error('Bedrock smart replies failed', {
            event: 'bedrock_smart_replies_failed',
            modelId: MODEL_ID,
            error
        });
        return res.status(502).json({ success: false, message: 'Unable to generate smart replies right now' });
    }
};

module.exports = { summarizeChat, suggestReplies };
