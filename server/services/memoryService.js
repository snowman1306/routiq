const { pool } = require('../database/init');
require('dotenv').config();

// Embedding functionality disabled - using simple keyword matching instead
// since Groq API doesn't provide a simple embedding endpoint

/**
 * Service to manage stateful, retrieval-augmented semantic memories for the Oracle.
 */
class MemoryService {
  /**
  * Generates a 768 or 1536 dimension vector embedding for a piece of text.
  * Currently disabled - returns null since Groq doesn't provide embedding endpoint.
   */
  static async generateEmbedding(text) {
    // Embedding functionality disabled for Groq API
    return null;
  }

  /**
   * Saves a new semantic memory in the database.
   */
  static async saveMemory(userId, content, category = 'dialogue') {
    try {
      // Save without embedding since Groq doesn't provide embedding endpoint
      await pool.query(
        `INSERT INTO oracle_memories (user_id, content, category)
         VALUES ($1, $2, $3)`,
        [userId, content, category]
      );
      return true;
    } catch (error) {
      console.error('Failed to save memory:', error.message);
      return false;
    }
  }

  /**
   * Performs simple keyword matching to return the most relevant memories.
  * Since Groq doesn't provide embedding endpoint, we use text matching.
   */
  static async retrieveMemories(userId, queryText, limit = 3) {
    try {
      // Fetch all memories for the user
      const res = await pool.query(
        `SELECT id, content, category, created_at
         FROM oracle_memories
         WHERE user_id = $1`,
        [userId]
      );
      const memories = res.rows;
      if (memories.length === 0) return [];

      // Simple keyword matching - check if query words appear in memory content
      const queryWords = queryText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const matchedMemories = memories.map(m => {
        const contentLower = m.content.toLowerCase();
        const matchCount = queryWords.filter(word => contentLower.includes(word)).length;
        return {
          content: m.content,
          category: m.category,
          matchCount,
          createdAt: m.created_at
        };
      });

      // Sort by match count descending and return top matches
      return matchedMemories
        .filter(m => m.matchCount > 0)
        .sort((a, b) => b.matchCount - a.matchCount)
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to retrieve memories:', error.message);
      return [];
    }
  }
}

module.exports = MemoryService;
