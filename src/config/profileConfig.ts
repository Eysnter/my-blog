import { applyAdminConfig } from "./admin-runtime";
import type { ProfileConfig } from "../types/config";

export const profileConfig: ProfileConfig = applyAdminConfig("profileConfig", {
  // 头像
  // 图片路径支持三种格式：
  // 1. public 目录（以 "/" 开头，不优化）："/assets/images/avatar.webp"
  // 2. src 目录（不以 "/" 开头，自动优化但会增加构建时间，推荐）："assets/images/avatar.webp"
  // 3. 远程 URL："https://example.com/avatar.jpg"
  avatar: "https://img.eysnter.cn/file/posts/icon/1780993886377_0122.webp",

  // 名字
  name: "Eysnter",

  // 个人签名
  bio: "Hello, I'm Eysnter.",

  // 链接配置
  // 已经预装的图标集：fa7-brands，fa7-regular，fa7-solid，material-symbols，simple-icons
  // 访问https://icones.js.org/ 获取图标代码，
  // 如果想使用尚未包含相应的图标集，则需要安装它
  // `pnpm add @iconify-json/<icon-set-name>`
  // showName: true 时显示图标和名称，false 时只显示图标
  links: [
    {
      name: "qq",
      icon: "fa7-brands:qq",
      url: "https://qm.qq.com/2532439877",
      showName: false,
    },
    {
      name: "GitHub",
      icon: "fa7-brands:github",
      url: "https://github.com/Eysnter",
      showName: false,
    },
    {
      name: "Email",
      icon: "fa7-solid:envelope",
      url: "mailto:czk246310@gmail.com",
      showName: false,
    },
    {
      name: "RSS",
      icon: "fa7-solid:rss",
      url: "/rss/",
      showName: false,
    },
  ],
});
