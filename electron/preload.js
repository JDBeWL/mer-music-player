const { contextBridge, ipcRenderer } = require('electron')
const path = require('path')
const fs = require('fs')

const api = {
  getResourcePath: () => {
    try {
      if (process.resourcesPath) {
        return path.join(process.resourcesPath, 'public');
      } else {
        return path.join(process.cwd(), 'public');
      }
    } catch (e) {
      console.error('获取资源路径失败:', e);
      return './public';
    }
  },

  readFile: (filePath, encoding = 'utf-8') => {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, encoding, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  },

  readDirectory: (dirPath) => {
    return new Promise((resolve, reject) => {
      fs.readdir(dirPath, (err, files) => {
        if (err) reject(err);
        else resolve(files);
      });
    });
  },

  fileExists: (filePath) => {
    try {
      return fs.existsSync(filePath);
    } catch (err) {
      console.error(`检查文件存在失败: ${filePath}`, err);
      return false;
    }
  },

  getLocalPath: (relativePath) => {
    try {
      if (relativePath.startsWith('/')) {
        relativePath = relativePath.substring(1);
      }
      return path.join(process.cwd(), 'public', relativePath);
    } catch (e) {
      console.error('获取本地路径失败:', e);
      return relativePath;
    }
  }
};

global.electronAPIFunctions = api;

try {
  // 无论如何都尝试直接设置
  if (typeof window !== 'undefined') {
    window.electronAPI = api;
    window.isElectron = true;
    window.isPackaged = process.env.NODE_ENV !== 'development';
    console.log('直接设置window.electronAPI');
  }

  // 尝试使用contextBridge
  contextBridge.exposeInMainWorld('electronAPI', api);
  contextBridge.exposeInMainWorld('electronEnv', {
    isElectron: true,
    isPackaged: process.env.NODE_ENV !== 'development'
  });
  console.log('使用contextBridge API模式');
} catch (e) {
  console.log('contextBridge不可用，使用直接设置模式:', e.message);

  // 确保在出错的情况下也设置API
  if (typeof window !== 'undefined') {
    window.electronAPI = api;
    window.isElectron = true;
    window.isPackaged = process.env.NODE_ENV !== 'development';
    console.log('使用备用方式设置window.electronAPI');
  }
}

setTimeout(() => {
  if (typeof window !== 'undefined') {
    // 检查API可用性
    console.log('检查electronAPI是否可用:', 
      window.electronAPI ? '可用' : '不可用',
      '包含的方法:', Object.keys(window.electronAPI || {}).join(', '));

    // 确保getResourcePath存在
    if (window.electronAPI && !window.electronAPI.getResourcePath) {
      console.log('找不到getResourcePath，添加该方法');
      window.electronAPI.getResourcePath = () => {
        try {
          if (process.resourcesPath) {
            return path.join(process.resourcesPath, 'public');
          } else {
            return path.join(process.cwd(), 'public');
          }
        } catch (e) {
          console.error('获取资源路径失败:', e);
          return './public';
        }
      };
      console.log('getResourcePath已添加，现在的方法:', Object.keys(window.electronAPI).join(', '));
    }
  }
}, 500);

setTimeout(() => {
  if (typeof window !== 'undefined' && window.electronAPI) {
    console.log('再次检查electronAPI方法:', Object.keys(window.electronAPI).join(', '));
    if (!window.electronAPI.getResourcePath) {
      console.error('getResourcePath仍然不可用，尝试再次添加');
      window.electronAPI.getResourcePath = function() {
        return process.cwd ? process.cwd() + '/public' : './public';
      };
    }
  }
}, 2000);

if (ipcRenderer) {
  ipcRenderer.on('get-global-api', (event) => {
    if (typeof window !== 'undefined' && !window.electronAPI && global.electronAPIFunctions) {
      console.log('通过IPC重新设置electronAPI');
      window.electronAPI = global.electronAPIFunctions;
    }
  });
}

if (typeof window !== 'undefined' && global.electronAPIGlobal) {
  if (!window.electronAPI) {
    window.electronAPI = global.electronAPIGlobal;
    console.log('使用全局API设置window.electronAPI');
  } else {
    for (const key in global.electronAPIGlobal) {
      if (!window.electronAPI[key]) {
        window.electronAPI[key] = global.electronAPIGlobal[key];
        console.log(`补充API方法: ${key}`);
      }
    }
  }
}

console.log('Electron环境初始化完成，当前工作目录:', process.cwd());
