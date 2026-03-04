/**
 * 🦞 龙虾小队 - GitHub API 客户端
 * Issue #006: GitHub API 封装
 * 
 * 功能：
 * - getIssues(): 获取仓库 Issue 列表
 * - getPullRequests(): 获取仓库 PR 列表
 * 
 * 配置：
 * - Token: ${GITHUB_TOKEN}
 * - 仓库：wsj666-hub/lobster-squad
 */

const https = require('https');

const GITHUB_CONFIG = {
  token: '${GITHUB_TOKEN}',
  owner: 'wsj666-hub',
  repo: 'lobster-squad',
  baseUrl: 'https://api.github.com',
  headers: {
    'Authorization': 'token ${GITHUB_TOKEN}',
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'lobster-squad-dashboard'
  }
};

/**
 * 发起 GitHub API 请求
 * @param {string} endpoint - API 端点路径
 * @returns {Promise<object>} 响应数据
 */
function githubRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${GITHUB_CONFIG.baseUrl}${endpoint}`;
    
    https.get(url, {
      headers: GITHUB_CONFIG.headers
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          
          // 检查 HTTP 状态码
          if (res.statusCode >= 400) {
            reject(new Error(`GitHub API Error: ${res.statusCode} - ${parsed.message || 'Unknown error'}`));
            return;
          }
          
          resolve(parsed);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
  });
}

/**
 * 获取 Issue 列表
 * @param {object} options - 查询选项
 * @param {string} options.state - 状态：open, closed, all (默认：all)
 * @param {number} options.per_page - 每页数量 (默认：30, 最大：100)
 * @returns {Promise<Array>} Issue 列表
 */
async function getIssues(options = {}) {
  const {
    state = 'all',
    per_page = 30
  } = options;
  
  const endpoint = `/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/issues?state=${state}&per_page=${per_page}`;
  
  try {
    const issues = await githubRequest(endpoint);
    
    // 格式化返回数据
    return issues.map(issue => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      state: issue.state,
      labels: issue.labels.map(label => ({
        name: label.name,
        color: label.color
      })),
      author: issue.user.login,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      closedAt: issue.closed_at,
      html_url: issue.html_url,
      // 排除 PR（GitHub API 中 PR 也会出现在 issues 中）
      isPullRequest: !!issue.pull_request
    })).filter(issue => !issue.isPullRequest); // 过滤掉 PR
  } catch (error) {
    console.error('Error fetching issues:', error.message);
    throw error;
  }
}

/**
 * 获取 Pull Request 列表
 * @param {object} options - 查询选项
 * @param {string} options.state - 状态：open, closed, all (默认：all)
 * @param {number} options.per_page - 每页数量 (默认：30, 最大：100)
 * @returns {Promise<Array>} PR 列表
 */
async function getPullRequests(options = {}) {
  const {
    state = 'all',
    per_page = 30
  } = options;
  
  const endpoint = `/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/pulls?state=${state}&per_page=${per_page}`;
  
  try {
    const pulls = await githubRequest(endpoint);
    
    // 格式化返回数据
    return pulls.map(pr => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      state: pr.state,
      merged: pr.merged,
      mergedAt: pr.merged_at,
      labels: pr.labels.map(label => ({
        name: label.name,
        color: label.color
      })),
      author: pr.user.login,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      closedAt: pr.closed_at,
      html_url: pr.html_url,
      head: {
        ref: pr.head.ref,
        sha: pr.head.sha
      },
      base: {
        ref: pr.base.ref,
        sha: pr.base.sha
      }
    }));
  } catch (error) {
    console.error('Error fetching pull requests:', error.message);
    throw error;
  }
}

// 导出模块
module.exports = {
  getIssues,
  getPullRequests,
  GITHUB_CONFIG
};
