import overrides from "./admin-settings.json";

// 原配置仍是默认值；后台只提交 JSON 覆盖层，避免生成或执行任意 TypeScript。
const originals: Record<string, unknown> = {};
export function mergeConfig<T>(base: T, patch: unknown): T {
	if (patch === undefined) return base;
	if (Array.isArray(patch)) return patch as T;
	if (patch && typeof patch === "object" && base && typeof base === "object" && !Array.isArray(base)) {
		const result = { ...base } as Record<string, unknown>;
		for (const [key, value] of Object.entries(patch)) {
			if (["__proto__", "prototype", "constructor"].includes(key)) continue;
			result[key] = mergeConfig(result[key], value);
		}
		return result as T;
	}
	return patch as T;
}
export function applyAdminConfig<T>(name: string, defaults: T): T {
	originals[name] = defaults;
	return mergeConfig(defaults, (overrides as Record<string, unknown>)[name]);
}
export function originalConfigs() {
	return JSON.parse(JSON.stringify(originals)) as Record<string, any>;
}
