const { app, BrowserWindow, protocol, Menu } = require('electron')
const path = require('path')
const fs = require('fs')
const isDev = process.env.NODE_ENV === 'development'

// 区分开发环境和打包环境
function getAppPath() {
  return app.isPackaged 
    ? path.join(process.resourcesPath, 'public') 
    : path.join(process.cwd(), 'public')
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(getAppPath(), 'kazusa.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  global.appPath = getAppPath()
  console.log('应用资源路径:', global.appPath)

  global.electronAPIGlobal = {
    getResourcePath: () => getAppPath(),
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
      if (relativePath.startsWith('/')) {
        relativePath = relativePath.substring(1);
      }
      return path.join(getAppPath(), relativePath);
    }
  }

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key.toLowerCase() === 'f12') {
        mainWindow.webContents.toggleDevTools()
        event.preventDefault()
      }
    })
  }

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('页面加载完成，发送API信号');
    // 延迟时间确保渲染进程准备好
    setTimeout(() => {
      mainWindow.webContents.send('get-global-api');
      // 直接注入代码
      mainWindow.webContents.executeJavaScript(`
        if (!window.electronAPI) {
          console.log('通过executeJavaScript设置electronAPI');
          window.electronAPI = {};
        }

        // 确保getResourcePath方法存在
        if (!window.electronAPI.getResourcePath) {
          console.log('添加getResourcePath方法');
          window.electronAPI.getResourcePath = function() {
            return '${getAppPath()}';
          };
        }

        // 确保其他方法存在
        if (!window.electronAPI.getLocalPath) {
          window.electronAPI.getLocalPath = function(path) {
            if (path.startsWith('/')) path = path.substring(1);
            return '${getAppPath()}/' + path;
          };
        }

        // 检查API是否可用
        console.log('API检查:', window.electronAPI ? '可用' : '不可用', 
                   '方法:', Object.keys(window.electronAPI).join(', '));
      `).catch(err => console.error('执行JavaScript失败:', err));
    }, 500);
  });
}

// 中文菜单
function createChineseMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', role: 'undo' },
        { label: '重做', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', role: 'cut' },
        { label: '复制', role: 'copy' },
        { label: '粘贴', role: 'paste' },
        { label: '删除', role: 'delete' },
        { type: 'separator' },
        { label: '全选', role: 'selectAll' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', role: 'reload' },
        { label: '强制重新加载', role: 'forceReload' },
        { label: '开发者工具', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '重置缩放', role: 'resetZoom' },
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' },
        { type: 'separator' },
        { label: '全屏', role: 'togglefullscreen' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', role: 'minimize' },
        { label: '关闭', role: 'close' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: async () => {
            const { dialog } = require('electron');
            dialog.showMessageBox({
              title: '关于',
              message: 'MerPlayer',
              detail: '版本 0.2.3\n构建于:' + new Date().toLocaleString() +'\nVite版本：6.3.5\nVue版本：3.0.3\nElectron版本：37.2.1',
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();
  createChineseMenu();
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
