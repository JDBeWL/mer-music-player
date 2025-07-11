# MerMusic - 基于 Vite6 + Vue3 的音乐播放器

## 目标

[待完成目标](/todolist.md)

## 目录

- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [开发](#开发)
- [构建与部署](#构建与部署)

### 环境要求

- Node.js ≥18.x
- npm ≥9.6.x

> 如果需要使用本地后端部署测试，推荐环境如下

- JDK >= 21
- Maven >= 3.9.9
- PostgreSQL >= 16

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/jdbewl/mer-music-player.git

# 进入项目目录
cd frontend

# 安装依赖(推荐使用pnpm安装)
pnpm/npm install

# 启动开发服务器
pnpm/npm run dev
```

## 项目结构

```text

// 前端
frontend/
├── public/                # 静态资源
├── src/
│   ├── api/            # api控制拦截
│   │   ├── index.js                 # 基础api设置
│   │   └── graphql.js               # GraphQL请求转发
│   ├── assets/            # 全局资源文件
│   │   ├── css                 # 播放器样式
│   │   └── data                # 数据
│   ├── components/        # 组件
│   │   ├── PlayerControls.vue  # 播放控制组件
│   │   ├── Playlist.vue        # 播放列表组件
│   │   ├── ProgressBar.vue     # 进度条组件
│   │   ├── AlbumArt.vue        # 专辑封面组件
│   │   ├── AudioPlayer.vue     # 播放器核心组件
│   │   └── LyricsDisplay.vue   # 歌词显示组件
│   ├── stores/            # Pinia状态管理
│   │   └── player.js      # 播放器状态管理
│   ├── App.vue            # 根组件
│   └── main.js            # 入口文件
├── .env.example           # 环境变量示例
├── vite.config.js         # Vite配置
└── package.json

// 后端
backend/
├── src/
│   ├── main/             
│   │   ├── java/com/mercury/player/music   # 播放器后端
│   │   └── resources                       # GraphQL定义和SQL建表语句
│   └── test/
└── pom.xml  
```

## 开发

在安装好后可以对其进行开发，播放器通过pinia store存储状态，使用vue组件和js对控件进行交互。

按照上面的项目结构可以快速完成对于播放器的快速开发和添加到其他项目中。

可以通过控制不同Vue组件和CSS样式的渲染实现多种显示效果，能给用户提供显示效果。

## 构建与部署

```bash
# 生产环境构建
pnpm/npm run build

# 预览生产版本
pnpm/npm run preview

# 预览开发版本
pnpm/npm run dev

# 快速集成到你的项目？
需要修改app.vue/main.js至你项目合适的地方

可能需要将vite.config.js中新增的内容至你的项目

# 部署项目
netlify/github action:把你的项目提交到仓库或者将构建好的项目交给其发布
```

## 其他

修改playlist.json中的内容并向public添加类似的内容即可预览出整个界面的效果。
格式如下

```json
  {
    "id": 1,     // id编号
    "title": "", // 曲名
    "artist": "",// 作者
    "cover": "", // 封面
    "url": ""    // 音乐源
  },
```

> 现在可以向PostgreSQL数据库中插入指定的表进行查询操作。
