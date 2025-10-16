/**
 * Multi-AI Collaboration System
 *
 * Enable AI providers to collaborate and discuss with each other
 * Claude can consult Gemini, Gemini can consult Claude, etc.
 */

import { providerManager } from '../providers/manager.js';
import { sessionManager } from '../utils/session.js';
import type { ProviderType } from '../types/index.js';

export interface CollaborationRequest {
  primaryAI: ProviderType;
  consultAI: ProviderType;
  topic: 'code_analysis' | 'file_review' | 'discussion' | 'problem_solving' | 'brainstorming';
  context: {
    files?: Array<{ path: string; content: string }>;
    code?: string;
    question: string;
    previousMessages?: string[];
  };
  showFullConversation: boolean;
}

export interface CollaborationMessage {
  speaker: ProviderType;
  message: string;
  timestamp: Date;
  reasoning?: string;
}

export interface CollaborationResult {
  success: boolean;
  conversation: CollaborationMessage[];
  consensus?: string;
  disagreements?: string[];
  finalAnswer: string;
  duration: number;
  tokensUsed: {
    total: number;
    perProvider: Record<string, number>;
  };
  cost: number;
}

/**
 * AI Collaboration Orchestrator
 */
export class AICollaborationManager {
  private conversations: Map<string, CollaborationResult> = new Map();

  /**
   * Orchestrate collaboration between two AI providers
   */
  async collaborate(request: CollaborationRequest): Promise<CollaborationResult> {
    const startTime = Date.now();
    const conversation: CollaborationMessage[] = [];

    console.log(`\n🤝 AI Collaboration: ${request.primaryAI.toUpperCase()} ↔️ ${request.consultAI.toUpperCase()}`);
    console.log(`📋 Topic: ${request.topic}`);
    console.log(`❓ Question: ${request.question}\n`);

    try {
      // Step 1: Primary AI asks the question
      const primaryQuestion = this.formatInitialQuestion(request);
      conversation.push({
        speaker: request.primaryAI,
        message: primaryQuestion,
        timestamp: new Date(),
        reasoning: `Asking ${request.consultAI} for their perspective on ${request.topic}`,
      });

      // Step 2: Consult AI responds
      const consultResponse = await this.getAIResponse(
        request.consultAI,
        primaryQuestion,
        request.context
      );
      conversation.push({
        speaker: request.consultAI,
        message: consultResponse.message,
        timestamp: new Date(),
        reasoning: `Providing analysis and insights`,
      });

      // Step 3: Primary AI considers the response and asks follow-up
      const followUpQuestion = this.generateFollowUp(consultResponse.message, request.topic);
      if (followUpQuestion) {
        conversation.push({
          speaker: request.primaryAI,
          message: followUpQuestion,
          timestamp: new Date(),
          reasoning: `Seeking clarification or deeper insight`,
        });

        // Step 4: Consult AI elaborates
        const elaboration = await this.getAIResponse(
          request.consultAI,
          followUpQuestion,
          { ...request.context, previousMessages: conversation.map(c => c.message) }
        );
        conversation.push({
          speaker: request.consultAI,
          message: elaboration.message,
          timestamp: new Date(),
          reasoning: `Elaborating on previous points`,
        });
      }

      // Step 5: Primary AI synthesizes and concludes
      const synthesis = await this.synthesizeConversation(
        request.primaryAI,
        conversation,
        request.context.question
      );
      conversation.push({
        speaker: request.primaryAI,
        message: synthesis.message,
        timestamp: new Date(),
        reasoning: `Synthesizing insights from collaboration`,
      });

      // Calculate metrics
      const duration = Date.now() - startTime;
      const tokensUsed = this.calculateTokens(conversation);
      const cost = this.calculateCost(tokensUsed);

      const result: CollaborationResult = {
        success: true,
        conversation,
        consensus: this.extractConsensus(conversation),
        disagreements: this.extractDisagreements(conversation),
        finalAnswer: synthesis.message,
        duration,
        tokensUsed,
        cost,
      };

      // Store conversation
      const conversationId = `collab_${Date.now()}`;
      this.conversations.set(conversationId, result);

      console.log(`✅ Collaboration completed in ${duration}ms`);
      console.log(`💰 Total cost: $${cost.toFixed(4)}`);
      console.log(`📊 Total tokens: ${tokensUsed.total}\n`);

      return result;

    } catch (error: any) {
      console.error(`❌ Collaboration failed: ${error.message}`);

      return {
        success: false,
        conversation,
        finalAnswer: `Collaboration failed: ${error.message}`,
        duration: Date.now() - startTime,
        tokensUsed: { total: 0, perProvider: {} },
        cost: 0,
      };
    }
  }

  /**
   * Format initial question for consultation
   */
  private formatInitialQuestion(request: CollaborationRequest): string {
    let question = `I'm consulting you for your expertise on ${request.topic}.\n\n`;

    if (request.context.files && request.context.files.length > 0) {
      question += `Files for review:\n`;
      request.context.files.forEach(file => {
        question += `\n📄 ${file.path}:\n\`\`\`\n${file.content}\n\`\`\`\n`;
      });
    }

    if (request.context.code) {
      question += `\nCode:\n\`\`\`\n${request.context.code}\n\`\`\`\n`;
    }

    question += `\nQuestion: ${request.context.question}\n\n`;
    question += `Please provide your analysis and insights.`;

    return question;
  }

  /**
   * Get response from AI provider
   */
  private async getAIResponse(
    provider: ProviderType,
    message: string,
    context: CollaborationRequest['context']
  ): Promise<{ message: string; tokens: number }> {
    // Create temporary device and session for this AI
    const device = sessionManager.registerDevice(
      `AI Collaboration - ${provider}`,
      'server',
      []
    );

    const session = sessionManager.createSession(device.id, {
      provider,
      model: this.getDefaultModel(provider),
      systemPrompt: this.getSystemPrompt(provider),
    });

    // Add message to session
    sessionManager.addMessage(session.id, {
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    // Get AI response
    const aiProvider = providerManager.getProvider(provider);
    const response = await aiProvider.chat(
      {
        sessionId: session.id,
        message,
        streaming: false,
      },
      session
    );

    // Add response to session
    sessionManager.addMessage(session.id, response.message);

    // Cleanup
    sessionManager.deleteSession(session.id);
    sessionManager.disconnectDevice(device.id);

    return {
      message: response.message.content,
      tokens: response.usage.totalTokens,
    };
  }

  /**
   * Generate follow-up question based on response
   */
  private generateFollowUp(response: string, topic: string): string | null {
    // Analyze response to determine if follow-up is needed
    const needsClarity = response.includes('however') ||
                        response.includes('but') ||
                        response.includes('alternatively');

    const hasCaveats = response.includes('depends') ||
                      response.includes('might') ||
                      response.includes('could');

    if (needsClarity) {
      return `Interesting perspective. You mentioned some alternatives - could you elaborate on which approach you'd recommend and why?`;
    }

    if (hasCaveats) {
      return `You mentioned some conditional factors. In the context of ${topic}, which factors are most critical?`;
    }

    // Ask for practical recommendations
    if (topic === 'code_analysis' || topic === 'problem_solving') {
      return `Based on your analysis, what would be your top 3 actionable recommendations?`;
    }

    return null; // No follow-up needed
  }

  /**
   * Synthesize conversation and create final answer
   */
  private async synthesizeConversation(
    provider: ProviderType,
    conversation: CollaborationMessage[],
    originalQuestion: string
  ): Promise<{ message: string; tokens: number }> {
    const conversationSummary = conversation
      .map(msg => `${msg.speaker.toUpperCase()}: ${msg.message}`)
      .join('\n\n');

    const synthesisPrompt = `
Based on our collaborative discussion, please synthesize a final answer to the original question:

"${originalQuestion}"

Conversation:
${conversationSummary}

Please provide:
1. A clear, actionable answer
2. Key insights from our discussion
3. Any areas where we reached consensus
4. Practical next steps
`;

    return await this.getAIResponse(provider, synthesisPrompt, { question: originalQuestion });
  }

  /**
   * Extract areas of consensus from conversation
   */
  private extractConsensus(conversation: CollaborationMessage[]): string {
    // Simple consensus detection - in production, use NLP
    const messages = conversation.map(c => c.message.toLowerCase());
    const commonPhrases = ['agree', 'consensus', 'both think', 'we concur', 'aligned'];

    for (const phrase of commonPhrases) {
      const found = messages.find(m => m.includes(phrase));
      if (found) {
        return found.substring(found.indexOf(phrase), found.indexOf(phrase) + 100);
      }
    }

    return 'Multiple perspectives provided, see conversation for details.';
  }

  /**
   * Extract disagreements or different viewpoints
   */
  private extractDisagreements(conversation: CollaborationMessage[]): string[] {
    const disagreements: string[] = [];
    const messages = conversation.map(c => c.message.toLowerCase());
    const disagreementPhrases = ['however', 'but', 'alternatively', 'different view', 'disagree'];

    messages.forEach((msg, idx) => {
      for (const phrase of disagreementPhrases) {
        if (msg.includes(phrase)) {
          disagreements.push(conversation[idx].message.substring(0, 150) + '...');
        }
      }
    });

    return disagreements;
  }

  /**
   * Calculate tokens used in conversation
   */
  private calculateTokens(conversation: CollaborationMessage[]): {
    total: number;
    perProvider: Record<string, number>;
  } {
    const perProvider: Record<string, number> = {};
    let total = 0;

    conversation.forEach(msg => {
      // Rough estimate: ~4 characters per token
      const tokens = Math.ceil(msg.message.length / 4);
      total += tokens;
      perProvider[msg.speaker] = (perProvider[msg.speaker] || 0) + tokens;
    });

    return { total, perProvider };
  }

  /**
   * Calculate cost of conversation
   */
  private calculateCost(tokensUsed: { total: number; perProvider: Record<string, number> }): number {
    // Rough cost estimates per provider (input + output averaged)
    const costPerToken = {
      claude: 0.000015,    // ~$15 per 1M tokens
      gemini: 0.000001,    // ~$1 per 1M tokens
      chatgpt: 0.000005,   // ~$5 per 1M tokens
    };

    let totalCost = 0;
    Object.entries(tokensUsed.perProvider).forEach(([provider, tokens]) => {
      const rate = costPerToken[provider as ProviderType] || 0.00001;
      totalCost += tokens * rate;
    });

    return totalCost;
  }

  /**
   * Get default model for provider
   */
  private getDefaultModel(provider: ProviderType): string {
    const models = {
      claude: 'claude-sonnet-4-5',
      gemini: 'gemini-2.0-flash-exp',
      chatgpt: 'gpt-4o',
    };
    return models[provider];
  }

  /**
   * Get system prompt for collaboration
   */
  private getSystemPrompt(provider: ProviderType): string {
    return `You are participating in a collaborative AI discussion. Provide thoughtful, detailed analysis.
Be specific with recommendations. If you see potential issues, mention them.
Share your unique perspective and reasoning. You are the ${provider.toUpperCase()} expert in this discussion.`;
  }

  /**
   * Get conversation by ID
   */
  getConversation(id: string): CollaborationResult | undefined {
    return this.conversations.get(id);
  }

  /**
   * List all conversations
   */
  getAllConversations(): Array<{ id: string; result: CollaborationResult }> {
    return Array.from(this.conversations.entries()).map(([id, result]) => ({ id, result }));
  }

  /**
   * Get collaboration statistics
   */
  getStatistics() {
    const conversations = Array.from(this.conversations.values());

    return {
      totalCollaborations: conversations.length,
      successfulCollaborations: conversations.filter(c => c.success).length,
      averageDuration: conversations.reduce((sum, c) => sum + c.duration, 0) / conversations.length || 0,
      totalTokens: conversations.reduce((sum, c) => sum + c.tokensUsed.total, 0),
      totalCost: conversations.reduce((sum, c) => sum + c.cost, 0),
      averageMessagesPerCollaboration: conversations.reduce((sum, c) => sum + c.conversation.length, 0) / conversations.length || 0,
    };
  }
}

// Export singleton instance
export const aiCollaborationManager = new AICollaborationManager();

/**
 * AI Collaboration tool definition for AI assistants
 */
export const collaborationTools = [
  {
    name: 'collaborate_with_ai',
    description: 'Collaborate with another AI provider to analyze code, review files, or solve problems. Get multiple AI perspectives on complex issues.',
    input_schema: {
      type: 'object',
      properties: {
        primary_ai: {
          type: 'string',
          enum: ['claude', 'gemini', 'chatgpt'],
          description: 'The AI initiating the collaboration',
        },
        consult_ai: {
          type: 'string',
          enum: ['claude', 'gemini', 'chatgpt'],
          description: 'The AI to consult for additional perspective',
        },
        topic: {
          type: 'string',
          enum: ['code_analysis', 'file_review', 'discussion', 'problem_solving', 'brainstorming'],
          description: 'Type of collaboration',
        },
        question: {
          type: 'string',
          description: 'The question or problem to discuss',
        },
        files: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              content: { type: 'string' },
            },
          },
          description: 'Files to analyze (optional)',
        },
        code: {
          type: 'string',
          description: 'Code snippet to analyze (optional)',
        },
        show_full_conversation: {
          type: 'boolean',
          description: 'Show complete AI-to-AI conversation',
        },
      },
      required: ['primary_ai', 'consult_ai', 'topic', 'question'],
    },
  },
];
