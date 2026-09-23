import { bookmarksPageConfig } from "./bookmarksConfig";
import type { BookmarkCategory } from "../types/config";
import type { BooknavGroup, BooknavPageConfig } from "../types/booknavConfig";

export const booknavPageConfig: BooknavPageConfig = {
	title: bookmarksPageConfig.title,
	description: bookmarksPageConfig.description,
	favicon: {
		enabled: true,
		api: "https://a.favicon.im/{domain}",
	},
};

const toId = (value: string, index: number) => {
	const normalized = value
		.toLowerCase()
		.trim()
		.replace(/[^\p{L}\p{N}]+/gu, "-")
		.replace(/^-|-$/g, "");
	return normalized || `group-${index + 1}`;
};

function flattenCategories(
	categories: BookmarkCategory[],
	parent = "",
): BooknavGroup[] {
	const groups: BooknavGroup[] = [];

	for (const [index, category] of categories.entries()) {
		const categoryName = parent ? `${parent} · ${category.name}` : category.name;
		if (category.sites?.length) {
			groups.push({
				id: toId(categoryName, groups.length),
				name: categoryName,
				icon: category.icon,
				weight: categories.length - index,
				items: category.sites.map((site) => ({
					title: site.name,
					url: site.url,
					desc: site.description,
					icon: site.icon,
				})),
			});
		}

		for (const group of category.groups ?? []) {
			groups.push({
				id: toId(`${categoryName}-${group.name}`, groups.length),
				name: `${categoryName} · ${group.name}`,
				icon: group.icon ?? category.icon,
				weight: categories.length - index,
				items: group.sites.map((site) => ({
					title: site.name,
					url: site.url,
					desc: site.description,
					icon: site.icon,
				})),
			});
		}

		groups.push(
			...flattenCategories(category.subcategories ?? [], categoryName),
		);
	}

	return groups;
}

// 继续复用原有 bookmarksConfig.ts 的数据，避免迁移时丢失个人书签。
export const booknavConfig: BooknavGroup[] = flattenCategories(
	bookmarksPageConfig.categories,
);
