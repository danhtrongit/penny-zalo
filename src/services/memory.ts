/**
 * ==========================================
 * 🧠 Conversation Memory
 * ==========================================
 * In-memory short-term conversation history per user.
 * Stores last N turns with automatic TTL cleanup.
 */

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface UserMemory {
  turns: ChatTurn[];
  lastAccess: number;
}

const MAX_TURNS = 8;
const TTL_MS = 30 * 60 * 1000; // 30 minutes

/** In-memory store: conversationKey → ChatTurn[] */
const memoryStore = new Map<string, UserMemory>();

/**
 * Add a user message to memory
 */
export function addUserMessage(conversationKey: string, content: string): void {
  ensureMemory(conversationKey);
  const memory = memoryStore.get(conversationKey)!;
  memory.turns.push({ role: 'user', content, timestamp: Date.now() });
  trimMemory(memory);
  memory.lastAccess = Date.now();
}

/**
 * Add an assistant response to memory
 */
export function addAssistantMessage(conversationKey: string, content: string): void {
  ensureMemory(conversationKey);
  const memory = memoryStore.get(conversationKey)!;
  memory.turns.push({ role: 'assistant', content: content.substring(0, 500), timestamp: Date.now() });
  trimMemory(memory);
  memory.lastAccess = Date.now();
}

/**
 * Get conversation context string for AI prompt
 */
export function getConversationContext(conversationKey: string): string {
  const memory = memoryStore.get(conversationKey);
  if (!memory || memory.turns.length === 0) return '';

  // Check TTL
  if (Date.now() - memory.lastAccess > TTL_MS) {
    memoryStore.delete(conversationKey);
    return '';
  }

  const lines = memory.turns.map((turn) => {
    const label = turn.role === 'user' ? 'User' : 'Penny';
    return `${label}: ${turn.content}`;
  });

  return `\n=== LỊCH SỬ HỘI THOẠI GẦN NHẤT ===\n${lines.join('\n')}`;
}

/**
 * Clear memory for a user
 */
export function clearMemory(conversationKey: string): void {
  memoryStore.delete(conversationKey);
}

function ensureMemory(conversationKey: string): void {
  if (!memoryStore.has(conversationKey)) {
    memoryStore.set(conversationKey, { turns: [], lastAccess: Date.now() });
  }
}

function trimMemory(memory: UserMemory): void {
  while (memory.turns.length > MAX_TURNS * 2) {
    memory.turns.shift();
  }
}

// Periodic cleanup every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, memory] of memoryStore) {
    if (now - memory.lastAccess > TTL_MS) {
      memoryStore.delete(id);
    }
  }
}, 10 * 60 * 1000);
