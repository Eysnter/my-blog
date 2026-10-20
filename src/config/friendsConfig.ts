import { applyAdminConfig } from "./admin-runtime";
import type { FriendLink, FriendsPageConfig } from "../types/config";

// 可以在src/content/spec/friends.md中编写友链页面下方的自定义内容

// 友链页面配置
export const friendsPageConfig: FriendsPageConfig = applyAdminConfig("friendsPageConfig", {
	// 页面标题，如果留空则使用 i18n 中的翻译
	title: "",

	// 页面描述文本，如果留空则使用 i18n 中的翻译
	description: "",

	// 是否显示底部自定义内容（friends.mdx 中的内容）
	showCustomContent: true,

	// 是否显示评论区，需要先在commentConfig.ts启用评论系统
	showComment: true,

	// 是否开启随机排序配置，如果开启，就会忽略权重，构建时进行一次随机排序
	randomizeSort: false,
});

// 友链配置
export const friendsConfig: FriendLink[] = applyAdminConfig("friendsConfig", [
  {
    title: "夏夜流萤",
    imgurl:
      "https://weavatar.com/avatar/d252655d40d6874417a720bad0a6c5f77f8f6a1fd2f882f8f338402dc37e4190?s=640",
    desc: "飞萤之火自无梦的长夜亮起，绽放在终竟的明天。",
    siteurl: "https://blog.cuteleaf.cn",
    tags: ["Blog"],
    weight: 10, // 权重，数字越大排序越靠前
    enabled: true, // 是否启用
  },
  {
    title: "十三",
    imgurl: "https://blog.nw177.cn/assets/avatar.webp",
    desc: "站点描述：欲买桂花同载酒，终不似，少年游。",
    siteurl: "https://blog.nw177.cn",
    tags: ["Docs"],
    weight: 9,
    enabled: true,
  },
  {
    title: "Astro",
    imgurl: "https://avatars.githubusercontent.com/u/44914786?v=4&s=640",
    desc: "The web framework for content-driven websites. ⭐️ Star to support our work!",
    siteurl: "https://github.com/withastro/astro",
    tags: ["Framework"],
    weight: 8,
    enabled: true,
  },
  {
    title: "雨雪冰屋",
    imgurl: "https://iamyukino.cn/favicon.ico",
    desc: "一隅雨雪一炉窝，可能会融化持久堆？",
    siteurl: "https://iamyukino.cn/",
    tags: ["Blog"],
    weight: 7,
    enabled: true,
  },
  {
    title: "Saimen Blog",
    imgurl: "https://img.z2m.store/file/public/1778862620159_g.png",
    desc: "读史可以明智,知古方能鉴今。",
    siteurl: "https://blog.z2m.store/",
    tags: ["Blog"],
    weight: 7,
    enabled: true,
  },
  {
    title: "胖小白",
    imgurl:
      "https://www.fatxiaobai.top/proxy-api/public/file/avatar/avatar.jpg",
    desc: "爱健身,哎科技,爱生活!",
    siteurl: "https://www.fatxiaobai.top/",
    tags: ["Blog"],
    weight: 10,
    enabled: true,
  },
  {
    title: "Hyde Blog",
    imgurl: "https://seasir.top/assets/avatar.avif",
    desc: "人心中的成见是一座大山",
    siteurl: "https://seasir.top/",
    tags: ["Blog"],
    weight: 10,
    enabled: true,
  },
]);


// 获取启用的友链并进行排序
export const getEnabledFriends = (): FriendLink[] => {
	const friends = friendsConfig.filter((friend) => friend.enabled);

	if (friendsPageConfig.randomizeSort) {
		return friends.sort(() => Math.random() - 0.5);
	}

	return friends.sort((a, b) => b.weight - a.weight);
};
