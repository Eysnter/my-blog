import { applyAdminConfig } from "./admin-runtime";
import type { AnnouncementConfig } from "../types/config";

export const announcementConfig: AnnouncementConfig = applyAdminConfig("announcementConfig", {
  // 公告标题
  title: "公告",

  // 公告内容
  content:
    "✨欢迎光临我的个人技术博客！\n✨独学而无友，则孤陋而寡闻。\n" +
    "\n●  这里是我用来记录个人笔记、梳理关键知识点以及总结实践技巧的分享空间。\n" +
    "\n●  文章皆为原创输出，难免有疏漏之处，旨在抛砖引玉。\n" +
    "\n●  希望这些内容对你有所帮助，更期待与你在这里交换思考，共同进步！",

  // 是否允许用户关闭公告
  closable: true,

  link: {
    // 启用链接
    enable: true,
    // 链接文本
    text: "了解更多",
    // 链接 URL
    url: "/about/",
    // 内部链接
    external: false,
  },

});
