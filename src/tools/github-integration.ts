/**
 * GitHub Integration System
 *
 * Provides comprehensive GitHub API integration for repository operations,
 * pull requests, issues, and code review with full transparency.
 */

export interface GitHubConnection {
  id: string;
  name: string;
  token: string;
  owner?: string; // Default repository owner/organization
  baseUrl?: string; // For GitHub Enterprise
  createdAt: Date;
}

export interface GitHubRepository {
  owner: string;
  name: string;
  fullName: string;
  description: string;
  url: string;
  defaultBranch: string;
  private: boolean;
  stars: number;
  forks: number;
  openIssues: number;
  language: string;
  updatedAt: string;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  merged: boolean;
  author: string;
  baseBranch: string;
  headBranch: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  mergeable?: boolean;
  comments: number;
  commits: number;
  additions: number;
  deletions: number;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  author: string;
  labels: string[];
  assignees: string[];
  url: string;
  createdAt: string;
  updatedAt: string;
  comments: number;
}

export interface GitHubFileContent {
  path: string;
  content: string;
  encoding: string;
  size: number;
  sha: string;
  url: string;
}

export interface GitHubBranch {
  name: string;
  sha: string;
  protected: boolean;
  url: string;
}

export interface CreatePRRequest {
  connectionId: string;
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string; // Source branch
  base: string; // Target branch
  draft?: boolean;
}

export interface CreateIssueRequest {
  connectionId: string;
  owner: string;
  repo: string;
  title: string;
  body: string;
  labels?: string[];
  assignees?: string[];
}

export interface CreateReviewRequest {
  connectionId: string;
  owner: string;
  repo: string;
  prNumber: number;
  event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  body: string;
  comments?: Array<{
    path: string;
    position: number;
    body: string;
  }>;
}

/**
 * GitHub Integration Manager
 */
export class GitHubManager {
  private connections: Map<string, GitHubConnection> = new Map();

  /**
   * Register a new GitHub connection
   */
  registerConnection(config: {
    name: string;
    token: string;
    owner?: string;
    baseUrl?: string;
  }): { success: boolean; connectionId: string; message: string } {
    const connectionId = `gh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const connection: GitHubConnection = {
      id: connectionId,
      name: config.name,
      token: config.token,
      owner: config.owner,
      baseUrl: config.baseUrl || 'https://api.github.com',
      createdAt: new Date(),
    };

    this.connections.set(connectionId, connection);

    console.log(`✅ GitHub connection registered: ${config.name} (${connectionId})`);

    return {
      success: true,
      connectionId,
      message: `GitHub connection "${config.name}" registered successfully`,
    };
  }

  /**
   * List all registered connections
   */
  listConnections(): Array<{ id: string; name: string; owner?: string; createdAt: Date }> {
    return Array.from(this.connections.values()).map(conn => ({
      id: conn.id,
      name: conn.name,
      owner: conn.owner,
      createdAt: conn.createdAt,
    }));
  }

  /**
   * Get connection by ID
   */
  private getConnection(connectionId: string): GitHubConnection {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`GitHub connection "${connectionId}" not found`);
    }
    return connection;
  }

  /**
   * Test GitHub connection
   */
  async testConnection(connectionId: string): Promise<{ success: boolean; message: string; user?: any }> {
    const connection = this.getConnection(connectionId);

    console.log(`🔍 Testing GitHub connection: ${connection.name}`);

    try {
      const response = await this.makeRequest(connection, '/user', 'GET');

      if (response.login) {
        console.log(`✅ GitHub connection successful: ${response.login}`);
        return {
          success: true,
          message: `Connected as ${response.login}`,
          user: {
            login: response.login,
            name: response.name,
            email: response.email,
            publicRepos: response.public_repos,
          },
        };
      }

      return {
        success: false,
        message: 'Invalid response from GitHub API',
      };
    } catch (error: any) {
      console.error(`❌ GitHub connection failed: ${error.message}`);
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
      };
    }
  }

  /**
   * List repositories
   */
  async listRepositories(
    connectionId: string,
    options?: { owner?: string; type?: 'all' | 'owner' | 'member'; limit?: number }
  ): Promise<GitHubRepository[]> {
    const connection = this.getConnection(connectionId);
    const owner = options?.owner || connection.owner;

    console.log(`📚 Listing GitHub repositories${owner ? ` for ${owner}` : ''}`);

    try {
      let endpoint: string;
      if (owner) {
        endpoint = `/users/${owner}/repos?per_page=${options?.limit || 30}`;
      } else {
        endpoint = `/user/repos?per_page=${options?.limit || 30}&type=${options?.type || 'all'}`;
      }

      const repos = await this.makeRequest(connection, endpoint, 'GET');

      const repositories: GitHubRepository[] = repos.map((repo: any) => ({
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description || '',
        url: repo.html_url,
        defaultBranch: repo.default_branch,
        private: repo.private,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        openIssues: repo.open_issues_count,
        language: repo.language || 'Unknown',
        updatedAt: repo.updated_at,
      }));

      console.log(`✅ Found ${repositories.length} repositories`);
      return repositories;
    } catch (error: any) {
      console.error(`❌ Failed to list repositories: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get repository details
   */
  async getRepository(connectionId: string, owner: string, repo: string): Promise<GitHubRepository> {
    const connection = this.getConnection(connectionId);

    console.log(`🔍 Getting repository: ${owner}/${repo}`);

    try {
      const repoData = await this.makeRequest(connection, `/repos/${owner}/${repo}`, 'GET');

      const repository: GitHubRepository = {
        owner: repoData.owner.login,
        name: repoData.name,
        fullName: repoData.full_name,
        description: repoData.description || '',
        url: repoData.html_url,
        defaultBranch: repoData.default_branch,
        private: repoData.private,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        openIssues: repoData.open_issues_count,
        language: repoData.language || 'Unknown',
        updatedAt: repoData.updated_at,
      };

      console.log(`✅ Repository details retrieved: ${repository.fullName}`);
      return repository;
    } catch (error: any) {
      console.error(`❌ Failed to get repository: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get file content from repository
   */
  async getFileContent(
    connectionId: string,
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<GitHubFileContent> {
    const connection = this.getConnection(connectionId);

    console.log(`📄 Getting file: ${owner}/${repo}/${path}${ref ? ` (ref: ${ref})` : ''}`);

    try {
      const endpoint = `/repos/${owner}/${repo}/contents/${path}${ref ? `?ref=${ref}` : ''}`;
      const fileData = await this.makeRequest(connection, endpoint, 'GET');

      if (fileData.type !== 'file') {
        throw new Error(`Path "${path}" is not a file`);
      }

      // Decode base64 content
      const content = Buffer.from(fileData.content, 'base64').toString('utf-8');

      const file: GitHubFileContent = {
        path: fileData.path,
        content,
        encoding: fileData.encoding,
        size: fileData.size,
        sha: fileData.sha,
        url: fileData.html_url,
      };

      console.log(`✅ File retrieved: ${file.path} (${file.size} bytes)`);
      return file;
    } catch (error: any) {
      console.error(`❌ Failed to get file: ${error.message}`);
      throw error;
    }
  }

  /**
   * List branches
   */
  async listBranches(connectionId: string, owner: string, repo: string): Promise<GitHubBranch[]> {
    const connection = this.getConnection(connectionId);

    console.log(`🌿 Listing branches: ${owner}/${repo}`);

    try {
      const branches = await this.makeRequest(connection, `/repos/${owner}/${repo}/branches`, 'GET');

      const branchList: GitHubBranch[] = branches.map((branch: any) => ({
        name: branch.name,
        sha: branch.commit.sha,
        protected: branch.protected,
        url: branch.commit.url,
      }));

      console.log(`✅ Found ${branchList.length} branches`);
      return branchList;
    } catch (error: any) {
      console.error(`❌ Failed to list branches: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create pull request
   */
  async createPullRequest(request: CreatePRRequest): Promise<GitHubPullRequest> {
    const connection = this.getConnection(request.connectionId);

    console.log(`🔀 Creating pull request: ${request.owner}/${request.repo}`);
    console.log(`   ${request.head} → ${request.base}`);
    console.log(`   Title: ${request.title}`);

    try {
      const prData = await this.makeRequest(
        connection,
        `/repos/${request.owner}/${request.repo}/pulls`,
        'POST',
        {
          title: request.title,
          body: request.body,
          head: request.head,
          base: request.base,
          draft: request.draft || false,
        }
      );

      const pullRequest: GitHubPullRequest = {
        number: prData.number,
        title: prData.title,
        body: prData.body || '',
        state: prData.state,
        merged: prData.merged || false,
        author: prData.user.login,
        baseBranch: prData.base.ref,
        headBranch: prData.head.ref,
        url: prData.html_url,
        createdAt: prData.created_at,
        updatedAt: prData.updated_at,
        comments: prData.comments,
        commits: prData.commits,
        additions: prData.additions,
        deletions: prData.deletions,
      };

      console.log(`✅ Pull request created: #${pullRequest.number}`);
      console.log(`   URL: ${pullRequest.url}`);
      return pullRequest;
    } catch (error: any) {
      console.error(`❌ Failed to create pull request: ${error.message}`);
      throw error;
    }
  }

  /**
   * List pull requests
   */
  async listPullRequests(
    connectionId: string,
    owner: string,
    repo: string,
    options?: { state?: 'open' | 'closed' | 'all'; limit?: number }
  ): Promise<GitHubPullRequest[]> {
    const connection = this.getConnection(connectionId);

    console.log(`📋 Listing pull requests: ${owner}/${repo} (${options?.state || 'open'})`);

    try {
      const endpoint = `/repos/${owner}/${repo}/pulls?state=${options?.state || 'open'}&per_page=${options?.limit || 30}`;
      const prs = await this.makeRequest(connection, endpoint, 'GET');

      const pullRequests: GitHubPullRequest[] = prs.map((pr: any) => ({
        number: pr.number,
        title: pr.title,
        body: pr.body || '',
        state: pr.state,
        merged: pr.merged || false,
        author: pr.user.login,
        baseBranch: pr.base.ref,
        headBranch: pr.head.ref,
        url: pr.html_url,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        comments: pr.comments,
        commits: pr.commits,
        additions: pr.additions,
        deletions: pr.deletions,
      }));

      console.log(`✅ Found ${pullRequests.length} pull requests`);
      return pullRequests;
    } catch (error: any) {
      console.error(`❌ Failed to list pull requests: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get pull request details
   */
  async getPullRequest(
    connectionId: string,
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<GitHubPullRequest> {
    const connection = this.getConnection(connectionId);

    console.log(`🔍 Getting pull request: ${owner}/${repo}#${prNumber}`);

    try {
      const prData = await this.makeRequest(connection, `/repos/${owner}/${repo}/pulls/${prNumber}`, 'GET');

      const pullRequest: GitHubPullRequest = {
        number: prData.number,
        title: prData.title,
        body: prData.body || '',
        state: prData.state,
        merged: prData.merged || false,
        author: prData.user.login,
        baseBranch: prData.base.ref,
        headBranch: prData.head.ref,
        url: prData.html_url,
        createdAt: prData.created_at,
        updatedAt: prData.updated_at,
        mergeable: prData.mergeable,
        comments: prData.comments,
        commits: prData.commits,
        additions: prData.additions,
        deletions: prData.deletions,
      };

      console.log(`✅ Pull request retrieved: #${pullRequest.number} - ${pullRequest.title}`);
      return pullRequest;
    } catch (error: any) {
      console.error(`❌ Failed to get pull request: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create review on pull request
   */
  async createReview(request: CreateReviewRequest): Promise<{ success: boolean; reviewId: number; url: string }> {
    const connection = this.getConnection(request.connectionId);

    console.log(`📝 Creating review on PR #${request.prNumber}: ${request.event}`);

    try {
      const reviewData = await this.makeRequest(
        connection,
        `/repos/${request.owner}/${request.repo}/pulls/${request.prNumber}/reviews`,
        'POST',
        {
          body: request.body,
          event: request.event,
          comments: request.comments || [],
        }
      );

      console.log(`✅ Review created: ${reviewData.id}`);
      return {
        success: true,
        reviewId: reviewData.id,
        url: reviewData.html_url,
      };
    } catch (error: any) {
      console.error(`❌ Failed to create review: ${error.message}`);
      throw error;
    }
  }

  /**
   * Merge pull request
   */
  async mergePullRequest(
    connectionId: string,
    owner: string,
    repo: string,
    prNumber: number,
    options?: { commitTitle?: string; commitMessage?: string; mergeMethod?: 'merge' | 'squash' | 'rebase' }
  ): Promise<{ success: boolean; sha: string; message: string }> {
    const connection = this.getConnection(connectionId);

    console.log(`🔀 Merging pull request: ${owner}/${repo}#${prNumber}`);

    try {
      const mergeData = await this.makeRequest(
        connection,
        `/repos/${owner}/${repo}/pulls/${prNumber}/merge`,
        'PUT',
        {
          commit_title: options?.commitTitle,
          commit_message: options?.commitMessage,
          merge_method: options?.mergeMethod || 'merge',
        }
      );

      console.log(`✅ Pull request merged: ${mergeData.sha}`);
      return {
        success: true,
        sha: mergeData.sha,
        message: mergeData.message,
      };
    } catch (error: any) {
      console.error(`❌ Failed to merge pull request: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create issue
   */
  async createIssue(request: CreateIssueRequest): Promise<GitHubIssue> {
    const connection = this.getConnection(request.connectionId);

    console.log(`📝 Creating issue: ${request.owner}/${request.repo}`);
    console.log(`   Title: ${request.title}`);

    try {
      const issueData = await this.makeRequest(
        connection,
        `/repos/${request.owner}/${request.repo}/issues`,
        'POST',
        {
          title: request.title,
          body: request.body,
          labels: request.labels || [],
          assignees: request.assignees || [],
        }
      );

      const issue: GitHubIssue = {
        number: issueData.number,
        title: issueData.title,
        body: issueData.body || '',
        state: issueData.state,
        author: issueData.user.login,
        labels: issueData.labels.map((label: any) => label.name),
        assignees: issueData.assignees.map((assignee: any) => assignee.login),
        url: issueData.html_url,
        createdAt: issueData.created_at,
        updatedAt: issueData.updated_at,
        comments: issueData.comments,
      };

      console.log(`✅ Issue created: #${issue.number}`);
      console.log(`   URL: ${issue.url}`);
      return issue;
    } catch (error: any) {
      console.error(`❌ Failed to create issue: ${error.message}`);
      throw error;
    }
  }

  /**
   * List issues
   */
  async listIssues(
    connectionId: string,
    owner: string,
    repo: string,
    options?: { state?: 'open' | 'closed' | 'all'; labels?: string[]; limit?: number }
  ): Promise<GitHubIssue[]> {
    const connection = this.getConnection(connectionId);

    console.log(`📋 Listing issues: ${owner}/${repo} (${options?.state || 'open'})`);

    try {
      let endpoint = `/repos/${owner}/${repo}/issues?state=${options?.state || 'open'}&per_page=${options?.limit || 30}`;
      if (options?.labels && options.labels.length > 0) {
        endpoint += `&labels=${options.labels.join(',')}`;
      }

      const issues = await this.makeRequest(connection, endpoint, 'GET');

      // Filter out pull requests (GitHub API includes PRs in issues endpoint)
      const issueList: GitHubIssue[] = issues
        .filter((issue: any) => !issue.pull_request)
        .map((issue: any) => ({
          number: issue.number,
          title: issue.title,
          body: issue.body || '',
          state: issue.state,
          author: issue.user.login,
          labels: issue.labels.map((label: any) => label.name),
          assignees: issue.assignees.map((assignee: any) => assignee.login),
          url: issue.html_url,
          createdAt: issue.created_at,
          updatedAt: issue.updated_at,
          comments: issue.comments,
        }));

      console.log(`✅ Found ${issueList.length} issues`);
      return issueList;
    } catch (error: any) {
      console.error(`❌ Failed to list issues: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add comment to issue or pull request
   */
  async addComment(
    connectionId: string,
    owner: string,
    repo: string,
    issueNumber: number,
    body: string
  ): Promise<{ success: boolean; commentId: number; url: string }> {
    const connection = this.getConnection(connectionId);

    console.log(`💬 Adding comment to ${owner}/${repo}#${issueNumber}`);

    try {
      const commentData = await this.makeRequest(
        connection,
        `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
        'POST',
        { body }
      );

      console.log(`✅ Comment added: ${commentData.id}`);
      return {
        success: true,
        commentId: commentData.id,
        url: commentData.html_url,
      };
    } catch (error: any) {
      console.error(`❌ Failed to add comment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Close issue
   */
  async closeIssue(
    connectionId: string,
    owner: string,
    repo: string,
    issueNumber: number
  ): Promise<{ success: boolean; message: string }> {
    const connection = this.getConnection(connectionId);

    console.log(`🔒 Closing issue: ${owner}/${repo}#${issueNumber}`);

    try {
      await this.makeRequest(
        connection,
        `/repos/${owner}/${repo}/issues/${issueNumber}`,
        'PATCH',
        { state: 'closed' }
      );

      console.log(`✅ Issue closed: #${issueNumber}`);
      return {
        success: true,
        message: `Issue #${issueNumber} closed successfully`,
      };
    } catch (error: any) {
      console.error(`❌ Failed to close issue: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove connection
   */
  removeConnection(connectionId: string): { success: boolean; message: string } {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return {
        success: false,
        message: `GitHub connection "${connectionId}" not found`,
      };
    }

    this.connections.delete(connectionId);
    console.log(`🗑️ GitHub connection removed: ${connection.name}`);

    return {
      success: true,
      message: `GitHub connection "${connection.name}" removed successfully`,
    };
  }

  /**
   * Make authenticated request to GitHub API
   */
  private async makeRequest(
    connection: GitHubConnection,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    body?: any
  ): Promise<any> {
    const url = `${connection.baseUrl}${endpoint}`;

    const options: RequestInit = {
      method,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${connection.token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MCP-Universal-Bridge',
      },
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || `GitHub API error: ${response.status}`);
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {};
    }

    return await response.json();
  }
}

// Export singleton instance
export const githubManager = new GitHubManager();

/**
 * GitHub tool definitions for AI assistants
 */
export const githubTools = [
  {
    name: 'github_list_repos',
    description: 'List GitHub repositories for a user or organization',
    input_schema: {
      type: 'object',
      properties: {
        connection_id: {
          type: 'string',
          description: 'GitHub connection ID',
        },
        owner: {
          type: 'string',
          description: 'Repository owner (username or organization)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of repositories to return',
        },
      },
      required: ['connection_id'],
    },
  },
  {
    name: 'github_get_file',
    description: 'Get file content from a GitHub repository',
    input_schema: {
      type: 'object',
      properties: {
        connection_id: {
          type: 'string',
          description: 'GitHub connection ID',
        },
        owner: {
          type: 'string',
          description: 'Repository owner',
        },
        repo: {
          type: 'string',
          description: 'Repository name',
        },
        path: {
          type: 'string',
          description: 'File path in repository',
        },
        ref: {
          type: 'string',
          description: 'Branch, tag, or commit SHA (optional)',
        },
      },
      required: ['connection_id', 'owner', 'repo', 'path'],
    },
  },
  {
    name: 'github_create_pr',
    description: 'Create a pull request',
    input_schema: {
      type: 'object',
      properties: {
        connection_id: {
          type: 'string',
          description: 'GitHub connection ID',
        },
        owner: {
          type: 'string',
          description: 'Repository owner',
        },
        repo: {
          type: 'string',
          description: 'Repository name',
        },
        title: {
          type: 'string',
          description: 'Pull request title',
        },
        body: {
          type: 'string',
          description: 'Pull request description',
        },
        head: {
          type: 'string',
          description: 'Source branch',
        },
        base: {
          type: 'string',
          description: 'Target branch',
        },
        draft: {
          type: 'boolean',
          description: 'Create as draft PR',
        },
      },
      required: ['connection_id', 'owner', 'repo', 'title', 'head', 'base'],
    },
  },
  {
    name: 'github_create_issue',
    description: 'Create a GitHub issue',
    input_schema: {
      type: 'object',
      properties: {
        connection_id: {
          type: 'string',
          description: 'GitHub connection ID',
        },
        owner: {
          type: 'string',
          description: 'Repository owner',
        },
        repo: {
          type: 'string',
          description: 'Repository name',
        },
        title: {
          type: 'string',
          description: 'Issue title',
        },
        body: {
          type: 'string',
          description: 'Issue description',
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: 'Issue labels',
        },
      },
      required: ['connection_id', 'owner', 'repo', 'title'],
    },
  },
  {
    name: 'github_review_pr',
    description: 'Create a review on a pull request',
    input_schema: {
      type: 'object',
      properties: {
        connection_id: {
          type: 'string',
          description: 'GitHub connection ID',
        },
        owner: {
          type: 'string',
          description: 'Repository owner',
        },
        repo: {
          type: 'string',
          description: 'Repository name',
        },
        pr_number: {
          type: 'number',
          description: 'Pull request number',
        },
        event: {
          type: 'string',
          enum: ['APPROVE', 'REQUEST_CHANGES', 'COMMENT'],
          description: 'Review type',
        },
        body: {
          type: 'string',
          description: 'Review comment',
        },
      },
      required: ['connection_id', 'owner', 'repo', 'pr_number', 'event', 'body'],
    },
  },
];
