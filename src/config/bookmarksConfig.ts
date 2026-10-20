import { applyAdminConfig } from "./admin-runtime";
import type { BookmarksPageConfig } from "../types/config";

// 导航（书签）页面配置
export const bookmarksPageConfig: BookmarksPageConfig = applyAdminConfig("bookmarksPageConfig", {
  // 页面标题，如果留空则使用 i18n 中的翻译
  title: "",

  // 页面描述文本，如果留空则使用 i18n 中的翻译
  description: "",

  // 是否显示评论区，需要先在commentConfig.ts启用评论系统
  showComment: true,

  // 书签分类数据
  categories: [
    {
      name: "常用网站",
      icon: "material-symbols:bookmark",
      sites: [
        {
          name: "GitHub",
          url: "https://github.com/",
          icon: "fa7-brands:github",
          description: "代码托管平台",
        },
        {
          name: "Stack Overflow",
          url: "https://stackoverflow.com/",
          icon: "fa7-brands:stack-overflow",
          description: "程序员问答社区",
        },
        {
          name: "MDN Web Docs",
          url: "https://developer.mozilla.org/",
          icon: "material-symbols:book",
          description: "Web开发文档",
        },
      ],
    },
    {
      name: "社交媒体",
      icon: "material-symbols:group",
      groups: [
        {
          name: "国际平台",
          icon: "material-symbols:language",
          sites: [
            {
              name: "Twitter",
              url: "https://twitter.com/",
              icon: "fa7-brands:x-twitter",
              description: "微博客社交平台",
            },
            {
              name: "LinkedIn",
              url: "https://www.linkedin.com/",
              icon: "fa7-brands:linkedin",
              description: "职业社交网络",
            },
          ],
        },
        {
          name: "国内平台",
          icon: "material-symbols:flag",
          sites: [
            {
              name: "微博",
              url: "https://weibo.com/",
              icon: "fa7-brands:weibo",
              description: "中文社交媒体平台",
            },
            {
              name: "知乎",
              url: "https://www.zhihu.com/",
              icon: "material-symbols:help",
              description: "中文问答社区",
            },
            {
              name: "B站",
              url: "https://www.bilibili.com/",
              icon: "simple-icons:bilibili",
              description: "弹幕视频网站",
            },
          ],
        },
      ],
    },
    {
      name: "技术资源",
      icon: "material-symbols:code",
      subcategories: [
        {
          name: "前端开发",
          icon: "material-symbols:web",
          groups: [
            {
              name: "框架库",
              icon: "material-symbols:widgets",
              sites: [
                {
                  name: "React",
                  url: "https://reactjs.org/",
                  icon: "fa7-brands:react",
                  description: "React官方文档",
                },
                {
                  name: "Vue.js",
                  url: "https://vuejs.org/",
                  icon: "fa7-brands:vuejs",
                  description: "Vue.js官方文档",
                },
                {
                  name: "Angular",
                  url: "https://angular.io/",
                  icon: "fa7-brands:angular",
                  description: "Angular官方文档",
                },
              ],
            },
            {
              name: "构建工具",
              icon: "material-symbols:build",
              sites: [
                {
                  name: "Vite",
                  url: "https://vitejs.dev/",
                  icon: "simple-icons:vite",
                  description: "下一代前端构建工具",
                },
                {
                  name: "Webpack",
                  url: "https://webpack.js.org/",
                  icon: "simple-icons:webpack",
                  description: "模块打包工具",
                },
              ],
            },
          ],
        },
        {
          name: "后端开发",
          icon: "material-symbols:cloud",
          groups: [
            {
              name: "Node.js生态",
              icon: "fa7-brands:node-js",
              sites: [
                {
                  name: "Express",
                  url: "https://expressjs.com/",
                  icon: "simple-icons:express",
                  description: "Node.js Web框架",
                },
                {
                  name: "NestJS",
                  url: "https://nestjs.com/",
                  icon: "simple-icons:nestjs",
                  description: "Node.js企业级框架",
                },
              ],
            },
            {
              name: "Python框架",
              icon: "fa7-brands:python",
              sites: [
                {
                  name: "Django",
                  url: "https://www.djangoproject.com/",
                  icon: "fa7-brands:python",
                  description: "Python Web框架",
                },
                {
                  name: "FastAPI",
                  url: "https://fastapi.tiangolo.com/",
                  icon: "simple-icons:fastapi",
                  description: "现代Python Web框架",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "开发工具",
      icon: "material-symbols:settings",
      groups: [
        {
          name: "代码编辑器",
          icon: "material-symbols:code",
          sites: [
            {
              name: "Visual Studio Code",
              url: "https://code.visualstudio.com/",
              icon: "simple-icons:visualstudiocode",
              description: "微软代码编辑器",
            },
            {
              name: "WebStorm",
              url: "https://www.jetbrains.com/webstorm/",
              icon: "simple-icons:webstorm",
              description: "JetBrains前端IDE",
            },
          ],
        },
        {
          name: "版本控制",
          icon: "material-symbols:sync",
          sites: [
            {
              name: "GitHub",
              url: "https://github.com/",
              icon: "fa7-brands:github",
              description: "代码托管平台",
            },
            {
              name: "GitLab",
              url: "https://gitlab.com/",
              icon: "fa7-brands:gitlab",
              description: "Git代码管理平台",
            },
          ],
        },
      ],
    },
  ],
});
