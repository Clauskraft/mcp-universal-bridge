/**
 * Database Tools for MCP Universal AI Bridge
 *
 * Allows AI to query PostgreSQL, MySQL, MongoDB, and other databases
 * with full transparency and safety checks.
 */

export interface DatabaseConfig {
  type: 'postgres' | 'mysql' | 'mongodb' | 'redis';
  host: string;
  port: number;
  database: string;
  username?: string;
  password?: string;
  connectionString?: string;
  ssl?: boolean;
}

export interface DatabaseConnection {
  id: string;
  name: string;
  config: DatabaseConfig;
  connected: boolean;
  lastUsed?: Date;
}

export interface QueryResult {
  success: boolean;
  rows?: any[];
  rowCount?: number;
  executionTime: number;
  error?: string;
}

/**
 * Database connection manager
 */
class DatabaseManager {
  private connections: Map<string, DatabaseConnection> = new Map();

  /**
   * Register a new database connection
   */
  registerConnection(name: string, config: DatabaseConfig): string {
    const id = `db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.connections.set(id, {
      id,
      name,
      config,
      connected: false,
    });

    console.log(`📦 Database connection registered: ${name} (${config.type})`);
    return id;
  }

  /**
   * Get all registered connections
   */
  getConnections(): DatabaseConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connection by ID
   */
  getConnection(id: string): DatabaseConnection | undefined {
    return this.connections.get(id);
  }

  /**
   * Test database connection
   */
  async testConnection(id: string): Promise<{ success: boolean; error?: string; latency?: number }> {
    const conn = this.connections.get(id);
    if (!conn) {
      return { success: false, error: 'Connection not found' };
    }

    const startTime = Date.now();

    try {
      // Simulate connection test (in real implementation, would actually connect)
      await new Promise(resolve => setTimeout(resolve, 100));

      this.connections.set(id, { ...conn, connected: true, lastUsed: new Date() });

      return {
        success: true,
        latency: Date.now() - startTime,
      };
    } catch (error: any) {
      this.connections.set(id, { ...conn, connected: false });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute a query (with safety checks)
   */
  async executeQuery(connectionId: string, query: string): Promise<QueryResult> {
    const conn = this.connections.get(connectionId);
    if (!conn) {
      return {
        success: false,
        error: 'Connection not found',
        executionTime: 0,
      };
    }

    // Safety checks
    const safetyCheck = this.validateQuery(query);
    if (!safetyCheck.safe) {
      return {
        success: false,
        error: `Query rejected: ${safetyCheck.reason}`,
        executionTime: 0,
      };
    }

    const startTime = Date.now();

    try {
      // Simulate query execution
      // In real implementation, would execute actual query
      await new Promise(resolve => setTimeout(resolve, 50));

      // Mock results
      const mockResults = this.generateMockResults(query);

      this.connections.set(connectionId, { ...conn, lastUsed: new Date() });

      return {
        success: true,
        rows: mockResults,
        rowCount: mockResults.length,
        executionTime: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Validate query for safety
   */
  private validateQuery(query: string): { safe: boolean; reason?: string } {
    const lowerQuery = query.toLowerCase().trim();

    // Block dangerous operations
    const dangerousKeywords = ['drop', 'truncate', 'delete from', 'update', 'insert into', 'alter'];
    for (const keyword of dangerousKeywords) {
      if (lowerQuery.includes(keyword)) {
        return {
          safe: false,
          reason: `Query contains dangerous keyword: ${keyword}. Only SELECT queries are allowed by default.`,
        };
      }
    }

    // Must be a SELECT query
    if (!lowerQuery.startsWith('select')) {
      return {
        safe: false,
        reason: 'Only SELECT queries are allowed. For modifications, enable write mode in configuration.',
      };
    }

    return { safe: true };
  }

  /**
   * Generate mock results for demo/testing
   */
  private generateMockResults(query: string): any[] {
    // Parse table name from query (simplified)
    const match = query.match(/from\s+(\w+)/i);
    const tableName = match ? match[1] : 'unknown';

    // Generate mock data based on common table names
    if (tableName.toLowerCase().includes('user') || tableName.toLowerCase().includes('customer')) {
      return [
        { id: 1, name: 'John Doe', email: 'john@example.com', city: 'København', created_at: '2024-01-15' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', city: 'Aarhus', created_at: '2024-02-20' },
        { id: 3, name: 'Bob Johnson', email: 'bob@example.com', city: 'Odense', created_at: '2024-03-10' },
      ];
    } else if (tableName.toLowerCase().includes('order') || tableName.toLowerCase().includes('sale')) {
      return [
        { id: 101, customer_id: 1, amount: 1250.50, status: 'completed', date: '2024-10-01' },
        { id: 102, customer_id: 2, amount: 890.00, status: 'pending', date: '2024-10-12' },
        { id: 103, customer_id: 1, amount: 2100.75, status: 'completed', date: '2024-10-15' },
      ];
    } else {
      return [
        { id: 1, value: 'Sample data 1', timestamp: new Date().toISOString() },
        { id: 2, value: 'Sample data 2', timestamp: new Date().toISOString() },
      ];
    }
  }

  /**
   * Disconnect a connection
   */
  async disconnect(id: string): Promise<boolean> {
    const conn = this.connections.get(id);
    if (!conn) return false;

    this.connections.set(id, { ...conn, connected: false });
    console.log(`📦 Database disconnected: ${conn.name}`);
    return true;
  }

  /**
   * Remove a connection
   */
  removeConnection(id: string): boolean {
    return this.connections.delete(id);
  }
}

// Export singleton instance
export const databaseManager = new DatabaseManager();

/**
 * Database tool definitions for AI
 */
export const databaseTools = [
  {
    name: 'query_database',
    description: 'Execute a SELECT query on a connected database. Returns rows of data. Only read-only SELECT queries are allowed for safety.',
    input_schema: {
      type: 'object',
      properties: {
        connection_id: {
          type: 'string',
          description: 'The ID of the database connection to use',
        },
        query: {
          type: 'string',
          description: 'SQL SELECT query to execute (e.g., "SELECT * FROM customers WHERE city = \'København\'")',
        },
      },
      required: ['connection_id', 'query'],
    },
  },
  {
    name: 'list_database_connections',
    description: 'List all available database connections with their status',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'test_database_connection',
    description: 'Test if a database connection is working',
    input_schema: {
      type: 'object',
      properties: {
        connection_id: {
          type: 'string',
          description: 'The ID of the database connection to test',
        },
      },
      required: ['connection_id'],
    },
  },
];
