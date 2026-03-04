#!/usr/bin/env node
/**
 * 🦞 龙虾小队监控面板 - 后端 API 服务
 * 提供实时数据：任务状态、积分、在线状态等
 * 
 * Issue #003: GET /api/status - 返回所有龙虾状态
 * Issue #004: GET /api/files/:lobster/:filename - 查看龙虾文件
 * Issue #005: 前端每 5 秒刷新，后端每分钟重新读取文件
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const githubClient = require('./github-client');

const PORT = 3456;
const SQUAD_DIR = path.join(__dirname, '..');
const SHARED_DIR = path.join(SQUAD_DIR, 'shared');

// GitHub API 缓存（Issue #006: 60 秒 TTL）
let githubCache = {
  issues: null,
  prs: null,
  issuesTime: 0,
  prsTime: 0
};
const GITHUB_CACHE_TTL = 60 * 1000; // 60 秒

// 缓存数据（Issue #005: 每分钟更新）
let cachedStatus = null;
let lastCacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 分钟

// 允许查看的文件列表（Issue #004 安全限制）
const ALLOWED_FILES = ['IDENTITY.md', 'SOUL.md', 'TOOLS.md', 'task.md'];

// GitHub 数据缓存（Issue #007）- 使用已有的 GITHUB_CACHE_TTL
let cachedGithubData = null;
let lastGithubCacheTime = 0;

// 执行日志缓存（Issue #009）
let cachedLogs = null;
let lastLogsCacheTime = 0;
const LOGS_CACHE_TTL = 5 * 1000; // 5 秒

// 异常告警缓存（Issue #010）
let cachedAlerts = null;
let lastAlertsCacheTime = 0;
const ALERTS_CACHE_TTL = 2 * 1000; // 2 秒

// 容器健康状态缓存（Issue #011）
let cachedHealth = null;
let lastHealthCacheTime = 0;
const HEALTH_CACHE_TTL = 5 * 1000; // 5 秒

// Session 历史记录目录
const SESSIONS_DIR = '/Users/wsj/.openclaw/agents/main/sessions/';

// 龙虾小队成员映射
const WORKER_NAMES = ['汤圆', '丸子', '虾球', '奥利', '狗子'];

// 日志数据（Issue #013）
let logHistory = [];

// 告警数据（Issue #013）
let alertData = null;

// 文件监听防抖定时器（Issue #015）
let fileChangeDebounceTimer = null;
const FILE_CHANGE_DEBOUNCE_MS = 500; // 500ms 防抖

/**
 * 获取 GitHub Issues 和 PRs（Issue #007）
 * 模拟数据（实际应调用 GitHub API）
 * @returns {object} GitHub 数据
 */
function getGithubData() {
  const now = Date.now();
  
  // 检查缓存
  if (cachedGithubData && (now - lastGithubCacheTime) < GITHUB_CACHE_TTL) {
    return cachedGithubData;
  }

  // 模拟 GitHub 数据（后续可替换为真实 API 调用）
  cachedGithubData = {
    issues: [
      {
        id: 1,
        number: 1,
        title: '设计龙虾小队 Logo',
        state: 'closed',
        created_at: '2026-03-01T10:00:00Z',
        user: { login: '奥利' }
      },
      {
        id: 2,
        number: 2,
        title: '实现任务看板 UI',
        state: 'open',
        created_at: '2026-03-02T14:30:00Z',
        user: { login: '丸子' }
      },
      {
        id: 3,
        number: 3,
        title: '添加积分系统',
        state: 'open',
        created_at: '2026-03-03T09:15:00Z',
        user: { login: '汤圆' }
      },
      {
        id: 4,
        number: 4,
        title: '优化移动端适配',
        state: 'open',
        created_at: '2026-03-04T11:00:00Z',
        user: { login: '丸子' }
      }
    ],
    prs: [
      {
        id: 101,
        number: 1,
        title: 'feat: 初始项目结构',
        state: 'merged',
        created_at: '2026-03-01T08:00:00Z',
        user: { login: '汤圆' },
        merged_at: '2026-03-01T12:00:00Z'
      },
      {
        id: 102,
        number: 2,
        title: 'feat: 添加监控面板',
        state: 'merged',
        created_at: '2026-03-02T10:00:00Z',
        user: { login: '丸子' },
        merged_at: '2026-03-02T16:00:00Z'
      },
      {
        id: 103,
        number: 3,
        title: 'feat: 任务看板 UI 实现',
        state: 'open',
        created_at: '2026-03-04T14:00:00Z',
        user: { login: '丸子' }
      }
    ]
  };
  
  lastGithubCacheTime = now;
  return cachedGithubData;
}

/**
 * 解析 task.md 文件，提取任务状态
 * @param {string} filePath - 文件路径
 * @returns {object} 任务状态对象
 */
function parseTaskFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { status: 'idle', task: '任务文件不存在', points: 0 };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    
    // 查找 TODO 清单中的任务
    const todoMatch = content.match(/```[\s\S]*?\[([ ~!x])\](.*?)(?:\n|\(|$)/);
    
    if (!todoMatch) {
      return { status: 'idle', task: '暂无任务', points: 0 };
    }

    const [, statusChar, taskDesc] = todoMatch;
    
    // 解析状态
    let status = 'idle';
    if (statusChar === ' ') status = 'idle';
    else if (statusChar === '~') status = 'working';
    else if (statusChar === 'x') status = 'completed';
    else if (statusChar === '!') status = 'error';

    // 提取任务描述（清理格式）
    let task = taskDesc.trim();
    if (task.includes('暂无任务')) {
      status = 'idle';
      task = '暂无任务';
    }

    // 从历史完成中估算积分（简化版）
    const completedCount = (content.match(/\[x\]/g) || []).length;
    const points = completedCount * 10;

    return { status, task, points };
  } catch (error) {
    console.error('Error parsing task file:', error);
    return { status: 'error', task: '读取失败', points: 0 };
  }
}

/**
 * 获取执行日志（Issue #009）
 * @returns {object} 执行日志列表（按时间倒序）
 */
function getExecutionLogs() {
  const now = Date.now();
  
  // 检查缓存
  if (cachedLogs && (now - lastLogsCacheTime) < LOGS_CACHE_TTL) {
    return cachedLogs;
  }

  console.log('📋 读取执行日志...');
  
  try {
    const logsPath = path.join(SHARED_DIR, 'execution-logs.json');
    if (!fs.existsSync(logsPath)) {
      return { logs: [], lastUpdated: new Date().toISOString() };
    }

    const content = fs.readFileSync(logsPath, 'utf-8');
    const data = JSON.parse(content);
    
    // 按时间倒序排列
    const sortedLogs = (data.logs || []).sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    cachedLogs = {
      logs: sortedLogs,
      lastUpdated: data.lastUpdated || new Date().toISOString()
    };
    lastLogsCacheTime = now;
    
    return cachedLogs;
  } catch (error) {
    console.error('❌ 读取执行日志失败:', error.message);
    return { logs: [], lastUpdated: new Date().toISOString(), error: error.message };
  }
}

/**
 * 获取异常告警（Issue #010）
 * @returns {object} 异常告警列表
 */
function getAlerts() {
  const now = Date.now();
  
  // 检查缓存
  if (cachedAlerts && (now - lastAlertsCacheTime) < ALERTS_CACHE_TTL) {
    return cachedAlerts;
  }

  console.log('🚨 读取异常告警...');
  
  try {
    const alertsPath = path.join(SHARED_DIR, 'alerts.json');
    if (!fs.existsSync(alertsPath)) {
      return { alerts: [], lastUpdated: new Date().toISOString() };
    }

    const content = fs.readFileSync(alertsPath, 'utf-8');
    const data = JSON.parse(content);
    
    // 过滤掉已过期的告警（自动消失逻辑）
    const activeAlerts = (data.alerts || []).filter(alert => {
      const alertTime = new Date(alert.timestamp).getTime();
      const shouldExpire = (now - alertTime) > (alert.autoHideSeconds || 5) * 1000;
      return !shouldExpire;
    });

    cachedAlerts = {
      alerts: activeAlerts,
      lastUpdated: new Date().toISOString()
    };
    lastAlertsCacheTime = now;
    
    return cachedAlerts;
  } catch (error) {
    console.error('❌ 读取异常告警失败:', error.message);
    return { alerts: [], lastUpdated: new Date().toISOString(), error: error.message };
  }
}

/**
 * 检测 Docker 容器健康状态（Issue #011）
 * @returns {object} 容器健康状态
 */
function getContainerHealth() {
  const now = Date.now();
  
  // 检查缓存
  if (cachedHealth && (now - lastHealthCacheTime) < HEALTH_CACHE_TTL) {
    return cachedHealth;
  }

  console.log('🏥 检查容器健康状态...');
  
  try {
    // 执行 docker compose ps 命令
    const { execSync } = require('child_process');
    const squadDir = path.join(__dirname, '..');
    
    let containers = [];
    try {
      const output = execSync('docker compose ps --format json', {
        cwd: squadDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // 解析 JSON 输出（每行一个 JSON 对象）
      const lines = output.trim().split('\n');
      containers = lines.map(line => {
        try {
          const container = JSON.parse(line);
          return {
            name: container.Name || container.name,
            service: container.Service || container.service,
            state: container.State || container.state,
            status: container.Status || container.status,
            isHealthy: (container.State || container.state) === 'running'
          };
        } catch (e) {
          return null;
        }
      }).filter(c => c !== null);
    } catch (dockerError) {
      // Docker 不可用时返回离线状态
      console.warn('⚠️ Docker 命令执行失败:', dockerError.message);
      containers = [
        { name: 'lobster-worker-1', service: 'worker-1', state: 'exited', isHealthy: false },
        { name: 'lobster-worker-2', service: 'worker-2', state: 'exited', isHealthy: false },
        { name: 'lobster-worker-3', service: 'worker-3', state: 'exited', isHealthy: false }
      ];
    }

    cachedHealth = {
      containers: containers,
      allHealthy: containers.every(c => c.isHealthy),
      lastUpdated: new Date().toISOString()
    };
    lastHealthCacheTime = now;
    
    return cachedHealth;
  } catch (error) {
    console.error('❌ 检查容器健康失败:', error.message);
    return {
      containers: [],
      allHealthy: false,
      lastUpdated: new Date().toISOString(),
      error: error.message
    };
  }
}

/**
 * 刷新缓存（Issue #015）
 * 清除 cachedStatus 缓存并重新读取所有任务文件
 */
function refreshCache() {
  console.log('🔄 刷新缓存...');
  
  // 清除缓存
  cachedStatus = null;
  
  // 重新读取（会重新填充缓存）
  getAllLobstersStatus();
  
  console.log('✅ 缓存已更新');
}

/**
 * 处理文件变更事件（Issue #015）
 * @param {string} eventType - 事件类型 (rename, change)
 * @param {string} filename - 文件名
 */
function handleFileChange(eventType, filename) {
  // 只处理 task-worker-*.md 文件
  if (!filename || !filename.match(/^task-worker-\d+\.md$/)) {
    return;
  }

  const filePath = path.join(SHARED_DIR, filename);
  
  // 检查文件是否存在（处理删除事件）
  const fileExists = fs.existsSync(filePath);
  
  console.log(`📝 检测到文件变更：${filename} (${eventType}, ${fileExists ? '存在' : '删除'})`);
  
  // 防抖处理：清除之前的定时器
  if (fileChangeDebounceTimer) {
    clearTimeout(fileChangeDebounceTimer);
  }
  
  // 设置新的防抖定时器
  fileChangeDebounceTimer = setTimeout(() => {
    try {
      refreshCache();
    } catch (error) {
      console.error(`❌ 刷新缓存失败: ${error.message}`);
      // 文件锁定时不崩溃，等待下次变更
    }
    fileChangeDebounceTimer = null;
  }, FILE_CHANGE_DEBOUNCE_MS);
}

/**
 * 获取所有龙虾状态（带缓存，Issue #005）
 * @returns {object} 所有龙虾状态
 */
function getAllLobstersStatus() {
  const now = Date.now();
  
  // 检查缓存是否有效（Issue #005: 1 分钟 TTL）
  if (cachedStatus && (now - lastCacheTime) < CACHE_TTL) {
    console.log('📦 使用缓存数据');
    return cachedStatus;
  }

  console.log('🔄 重新读取任务文件...');
  
  const workers = [
    { id: 'worker-1', name: '汤圆', file: 'task-worker-1.md' },
    { id: 'worker-2', name: '丸子', file: 'task-worker-2.md' },
    { id: 'worker-3', name: '虾球', file: 'task-worker-3.md' }
  ];

  const workersStatus = workers.map(w => ({
    id: w.id,
    name: w.name,
    ...parseTaskFile(path.join(SHARED_DIR, w.file))
  }));

  cachedStatus = {
    leader: { status: 'online', task: null, points: 0 },
    deployer: { status: 'online', task: null, points: 0 },
    workers: workersStatus,
    timestamp: new Date().toISOString()
  };
  
  lastCacheTime = now;
  return cachedStatus;
}

/**
 * 读取龙虾文件（Issue #004）
 * @param {string} lobsterId - 龙虾 ID
 * @param {string} filename - 文件名
 * @returns {object} 文件内容
 */
function getLobsterFile(lobsterId, filename) {
  // 安全检查：只允许访问白名单文件
  if (!ALLOWED_FILES.includes(filename)) {
    return {
      error: '不允许访问的文件',
      allowed: ALLOWED_FILES
    };
  }

  // 确定文件路径
  let filePath;
  if (lobsterId.startsWith('worker-')) {
    // 工人文件：配置文件在 configs/worker-X/，task.md 在 shared/
    const workerNum = lobsterId.replace('worker-', '');
    if (filename === 'task.md') {
      filePath = path.join(SHARED_DIR, `task-worker-${workerNum}.md`);
    } else {
      filePath = path.join(SQUAD_DIR, 'configs', `worker-${workerNum}`, filename);
    }
  } else if (lobsterId === 'leader') {
    // 工头文件（奥利）- 目前还没有独立配置
    return { error: '奥利（主控）文件尚未配置', hint: '奥利目前由主 Session 扮演' };
  } else if (lobsterId === 'deployer') {
    // 部署专员文件（狗子）- 目前还没有独立配置
    return { error: '狗子（部署专员）文件尚未配置', hint: '狗子角色待创建' };
  } else {
    return { error: '未知的龙虾 ID' };
  }

  try {
    if (!fs.existsSync(filePath)) {
      return { error: '文件不存在', path: filePath };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return {
      lobster: lobsterId,
      filename: filename,
      content: content,
      lastModified: fs.statSync(filePath).mtime.toISOString()
    };
  } catch (error) {
    console.error('Error reading file:', error);
    return { error: '读取失败', message: error.message };
  }
}

/**
 * 解析 URL 参数（用于 /api/files/:lobster/:filename）
 * @param {string} url - URL 字符串
 * @returns {object|null} 解析结果
 */
function parseFilesUrl(url) {
  const match = url.match(/^\/api\/files\/([^/]+)\/([^/]+)$/);
  if (match) {
    return {
      lobster: match[1],
      filename: match[2]
    };
  }
  return null;
}

/**
 * 获取 GitHub Issues（带缓存，Issue #006）
 * @returns {Promise<object>} Issues 数据
 */
async function getGithubIssues() {
  const now = Date.now();
  
  // 检查缓存是否有效（60 秒 TTL）
  if (githubCache.issues && (now - githubCache.issuesTime) < GITHUB_CACHE_TTL) {
    console.log('📦 使用 GitHub Issues 缓存');
    return {
      success: true,
      data: githubCache.issues,
      cached: true,
      timestamp: new Date(githubCache.issuesTime).toISOString()
    };
  }

  console.log('🔄 从 GitHub 获取 Issues...');
  
  try {
    const issues = await githubClient.getIssues({ state: 'all', per_page: 50 });
    githubCache.issues = issues;
    githubCache.issuesTime = now;
    
    return {
      success: true,
      data: issues,
      cached: false,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ 获取 Issues 失败:', error.message);
    return {
      success: false,
      error: error.message,
      data: [],
      cached: false,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 获取 GitHub Pull Requests（带缓存，Issue #006）
 * @returns {Promise<object>} PRs 数据
 */
async function getGithubPullRequests() {
  const now = Date.now();
  
  // 检查缓存是否有效（60 秒 TTL）
  if (githubCache.prs && (now - githubCache.prsTime) < GITHUB_CACHE_TTL) {
    console.log('📦 使用 GitHub PRs 缓存');
    return {
      success: true,
      data: githubCache.prs,
      cached: true,
      timestamp: new Date(githubCache.prsTime).toISOString()
    };
  }

  console.log('🔄 从 GitHub 获取 Pull Requests...');
  
  try {
    const prs = await githubClient.getPullRequests({ state: 'all', per_page: 50 });
    githubCache.prs = prs;
    githubCache.prsTime = now;
    
    return {
      success: true,
      data: prs,
      cached: false,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ 获取 PRs 失败:', error.message);
    return {
      success: false,
      error: error.message,
      data: [],
      cached: false,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 获取执行日志（Issue #013）
 * 模拟日志数据（后续可从实际执行记录中获取）
 * @returns {object} 日志列表
 */
function getExecutionLogs() {
  const now = Date.now();
  
  // 如果日志为空，生成一些模拟数据
  if (logHistory.length === 0) {
    const workers = [
      { id: 'worker-1', name: '汤圆', emoji: '🥟' },
      { id: 'worker-2', name: '丸子', emoji: '🍡' },
      { id: 'worker-3', name: '虾球', emoji: '🍤' }
    ];
    
    const tasks = [
      '实现用户登录功能',
      '修复 API 响应延迟',
      '优化数据库查询',
      '添加单元测试',
      '部署到生产环境',
      '代码审查',
      '性能优化',
      '文档更新'
    ];
    
    const statuses = ['completed', 'completed', 'completed', 'failed', 'working', 'completed'];
    
    // 生成最近 10 条日志
    for (let i = 0; i < 10; i++) {
      const worker = workers[Math.floor(Math.random() * workers.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const duration = status === 'working' ? null : Math.floor(Math.random() * 300) + 10;
      
      logHistory.push({
        id: i + 1,
        worker: worker.name,
        workerId: worker.id,
        emoji: worker.emoji,
        task: tasks[Math.floor(Math.random() * tasks.length)],
        status: status,
        duration: duration,
        timestamp: new Date(now - i * 1000 * 60 * 5).toISOString() // 每条间隔 5 分钟
      });
    }
  }
  
  // 按时间倒序排序
  return logHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * 获取健康状态/告警（Issue #013）
 * 检测是否有异常龙虾
 * @returns {object} 告警信息
 */
function getHealthStatus() {
  const now = Date.now();
  
  // 检查是否有错误状态的龙虾
  const status = getAllLobstersStatus();
  const errorWorkers = (status.workers || []).filter(w => w.status === 'error');
  
  if (errorWorkers.length > 0) {
    // 有异常，生成告警
    const errorWorker = errorWorkers[0];
    alertData = {
      id: now,
      worker: errorWorker.name,
      workerId: errorWorker.id,
      message: `任务执行失败：${errorWorker.task}`,
      timestamp: new Date().toISOString(),
      severity: 'error'
    };
  } else if (alertData) {
    // 之前有告警但现在解决了，清除告警
    alertData = null;
  }
  
  return {
    healthy: !alertData,
    alert: alertData,
    timestamp: new Date().toISOString()
  };
}

/**
 * 发送 JSON 响应
 * @param {http.ServerResponse} res - HTTP 响应对象
 * @param {number} statusCode - 状态码
 * @param {object} data - 数据对象
 */
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

/**
 * 格式化持续时间（Issue #012）
 * @param {number} ms - 毫秒数
 * @returns {string} 格式化后的持续时间（如 "2m51s"）
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

/**
 * 从 session 文件中提取任务信息（Issue #012）
 * @param {string} filePath - JSONL 文件路径
 * @returns {object|null} 提取的日志信息
 */
function parseSessionFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    
    if (lines.length === 0) return null;
    
    // 解析第一行获取 session 元数据
    const sessionMeta = JSON.parse(lines[0]);
    if (sessionMeta.type !== 'session') return null;
    
    const startTime = new Date(sessionMeta.timestamp);
    let endTime = startTime;
    let worker = '未知';
    let task = '未识别任务';
    
    // 遍历消息，提取 worker 和 task 信息
    for (let i = 1; i < lines.length; i++) {
      try {
        const line = JSON.parse(lines[i]);
        if (line.type === 'message' && line.message) {
          // 更新结束时间
          if (line.timestamp) {
            endTime = new Date(line.timestamp);
          }
          
          // 从用户消息中提取 worker 和 task 信息
          if (line.message.role === 'user' && line.message.content) {
            const textContent = line.message.content
              .filter(c => c.type === 'text')
              .map(c => c.text)
              .join('');
            
            // 尝试提取 worker 名称
            for (const name of WORKER_NAMES) {
              if (textContent.includes(name)) {
                worker = name;
                break;
              }
            }
            
            // 尝试提取任务描述（查找 Issue #XXX 或任务相关关键词）
            const issueMatch = textContent.match(/Issue\s*#?\s*(\d+)/i);
            if (issueMatch) {
              // 查找完整的任务描述
              const taskMatch = textContent.match(/\*\*Issue\s*#?\s*\d+\s*-\s*([^*]+)/i);
              if (taskMatch) {
                task = `Issue #${issueMatch[1]} - ${taskMatch[1].trim()}`;
              } else {
                // 尝试从上下文中提取
                const phaseMatch = textContent.match(/Phase\s*\d*:\s*([^.\n]+)/i);
                if (phaseMatch) {
                  task = `Issue #${issueMatch[1]} - ${phaseMatch[1].trim()}`;
                } else {
                  task = `Issue #${issueMatch[1]}`;
                }
              }
            } else if (textContent.includes('任务') && textContent.length < 500) {
              // 如果没有 Issue 编号，尝试提取包含"任务"的短句
              const taskMatch = textContent.match(/任务 [:-]\s*([^\n]+)/i);
              if (taskMatch) {
                task = taskMatch[1].trim().substring(0, 100);
              }
            }
          }
        }
      } catch (e) {
        // 跳过无法解析的行
      }
    }
    
    // 计算持续时间
    const duration = endTime.getTime() - startTime.getTime();
    
    return {
      worker: worker,
      task: task,
      status: 'completed',
      duration: formatDuration(duration),
      timestamp: startTime.toISOString()
    };
  } catch (error) {
    console.error('Error parsing session file:', filePath, error.message);
    return null;
  }
}

/**
 * 获取所有 session 日志（Issue #012，带 60 秒缓存）
 * @returns {object} 日志列表
 */
function getSessionLogs() {
  const now = Date.now();
  
  // 检查缓存是否有效
  if (cachedLogs && (now - lastLogsCacheTime) < LOGS_CACHE_TTL) {
    console.log('📦 使用日志缓存');
    return cachedLogs;
  }
  
  console.log('🔄 读取 session 历史记录...');
  
  try {
    // 获取所有 JSONL 文件（排除 deleted 文件）
    const files = fs.readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith('.jsonl') && !f.includes('.deleted'))
      .map(f => path.join(SESSIONS_DIR, f));
    
    // 按文件修改时间排序（最新的在前）
    files.sort((a, b) => {
      const statA = fs.statSync(a);
      const statB = fs.statSync(b);
      return statB.mtimeMs - statA.mtimeMs;
    });
    
    // 解析每个文件
    const logs = [];
    for (const file of files) {
      const logEntry = parseSessionFile(file);
      if (logEntry) {
        logs.push(logEntry);
      }
    }
    
    // 按时间倒序排序
    logs.sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    cachedLogs = { logs };
    lastLogsCacheTime = now;
    
    return cachedLogs;
  } catch (error) {
    console.error('Error reading session logs:', error);
    return { logs: [], error: error.message };
  }
}

// 创建 HTTP 服务器
const server = http.createServer((req, res) => {
  // CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Issue #003: GET /api/status
  if (req.url === '/api/status' || req.url === '/api/status/') {
    const status = getAllLobstersStatus();
    sendJson(res, 200, status);
    return;
  }

  // Issue #006: GET /api/github/issues
  if (req.url === '/api/github/issues' || req.url === '/api/github/issues/') {
    getGithubIssues().then(result => {
      if (result.success) {
        sendJson(res, 200, result);
      } else {
        sendJson(res, 500, result);
      }
    }).catch(error => {
      sendJson(res, 500, { success: false, error: error.message });
    });
    return;
  }

  // Issue #006: GET /api/github/prs
  if (req.url === '/api/github/prs' || req.url === '/api/github/prs/') {
    getGithubPullRequests().then(result => {
      if (result.success) {
        sendJson(res, 200, result);
      } else {
        sendJson(res, 500, result);
      }
    }).catch(error => {
      sendJson(res, 500, { success: false, error: error.message });
    });
    return;
  }

  // Issue #012: GET /api/logs (Session 历史记录)
  if (req.url === '/api/logs' || req.url === '/api/logs/') {
    const logs = getSessionLogs();
    sendJson(res, 200, logs);
    return;
  }

  // Issue #013: GET /api/health
  if (req.url === '/api/health' || req.url === '/api/health/') {
    const health = getHealthStatus();
    sendJson(res, 200, health);
    return;
  }

  // Issue #004: GET /api/files/:lobster/:filename
  const filesMatch = parseFilesUrl(req.url);
  if (filesMatch) {
    const fileData = getLobsterFile(filesMatch.lobster, filesMatch.filename);
    if (fileData.error) {
      sendJson(res, 400, fileData);
    } else {
      sendJson(res, 200, fileData);
    }
    return;
  }

  // 静态文件服务
  if (req.url === '/' || req.url === '/index.html') {
    const filePath = path.join(__dirname, 'index.html');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading dashboard');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  // 404
  res.writeHead(404);
  res.end('Not Found');
});

// 启动文件监听（Issue #015）
function startFileWatcher() {
  try {
    // 监听 shared 目录
    fs.watch(SHARED_DIR, (eventType, filename) => {
      handleFileChange(eventType, filename);
    });
    
    console.log('👁️ 文件监听已启动：' + SHARED_DIR);
    console.log('📄 监听文件：task-worker-*.md');
    console.log('⏱️ 防抖延迟：' + FILE_CHANGE_DEBOUNCE_MS + 'ms');
  } catch (error) {
    console.error('❌ 启动文件监听失败:', error.message);
  }
}

server.listen(PORT, () => {
  console.log(`🦞 龙虾小队监控面板已启动！`);
  console.log(`📊 访问地址：http://localhost:${PORT}`);
  console.log(`📡 API 端点:`);
  console.log(`   - GET /api/status (Issue #003)`);
  console.log(`   - GET /api/files/:lobster/:filename (Issue #004)`);
  console.log(`   - GET /api/github/issues (Issue #006)`);
  console.log(`   - GET /api/github/prs (Issue #006)`);
  console.log(`   - GET /api/logs (Issue #013) - 执行日志`);
  console.log(`   - GET /api/health (Issue #013) - 健康检查/告警`);
  console.log(`🔄 GitHub 缓存刷新：每 60 秒 (Issue #006)`);
  console.log(`🔄 状态缓存刷新：每 60 秒 (Issue #005)`);
  console.log(`🔄 GitHub 数据刷新：每 30 秒 (Issue #007)`);
  console.log(`👁️ 文件自动刷新：实时监听 (Issue #015)`);
  console.log(`按 Ctrl+C 停止服务`);
  
  // 启动文件监听
  startFileWatcher();
});
