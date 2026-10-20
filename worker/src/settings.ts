import * as configs from "../../src/config/index";
import { friendsConfig } from "../../src/config/friendsConfig";
import { originalConfigs, mergeConfig } from "../../src/config/admin-runtime";
import { fieldBounds, fieldChoices, isPrivateField, settingsGroups } from "../../shared/admin-settings";
import { decodeBase64, encodeBase64, githubFetch, requireGitHub } from "./github";
import type { Env, SessionUser } from "./types";

const FILE = "src/config/admin-settings.json";
// Keep explicit references: bundlers must retain registrations from each configurable module.
const configured = { ...configs, friendsConfig } as Record<string, unknown>;
const keys = settingsGroups.flatMap((group) => group.keys);
const defaults = Object.fromEntries(keys.map((key) => [key, originalConfigs()[key] ?? configured[key]]));
function publicValues(value: any): any {
	if (Array.isArray(value)) return value.map(publicValues);
	if (value && typeof value === "object") return Object.fromEntries(Object.entries(value)
		.filter(([key]) => !isPrivateField(key)).map(([key, item]) => [key, publicValues(item)]));
	return value;
}
function restoreHidden(submitted: any, previous: any): any {
	if (Array.isArray(submitted)) {
		const oldItems = Array.isArray(previous) ? previous : [];
		return submitted.map((item, index) => {
			if (!item || typeof item !== "object") return item;
			const stableKey = ["id", "url", "siteurl", "name", "title"].find((key) => item[key] !== undefined);
			const old = stableKey ? oldItems.find((entry) => entry?.[stableKey] === item[stableKey]) : oldItems[index];
			return restoreHidden(item, old);
		});
	}
	if (submitted && typeof submitted === "object") {
		const result = { ...(previous && typeof previous === "object" ? previous : {}) };
		for (const [key, value] of Object.entries(submitted)) result[key] = restoreHidden(value, result[key]);
		return result;
	}
	return submitted;
}

// Validate against the known configuration shape; arrays may contain different optional fields.
export function validateSettings(value: any, shape: any, path = ""): void {
	const fail = (detail: string): never => { throw new Error(`${path || "配置"}：${detail}`); };
	if (Array.isArray(shape)) {
		if (!Array.isArray(value) || value.length > 500) fail("必须为最多 500 项的列表");
		const objects = shape.filter((item: any) => item && typeof item === "object" && !Array.isArray(item));
		const objectTemplate = Object.assign({}, ...objects);
		value.forEach((item: any, i: number) => {
			// Navigation permits a preset enum or a complete custom link.
			if (/^navBarConfig\.links(?:\.\d+\.children)*$/.test(path)) {
				if (Number.isInteger(item) && item >= 0 && item <= 9) return;
				validateSettings(item, { name:"", url:"", icon:"", external:false, children:[0] }, `${path}.${i}`);
				if (!item.name || typeof item.url !== "string") fail("自定义菜单需要名称与地址");
				return;
			}
			const template = item && typeof item === "object" ? objectTemplate : shape.find((x: any) => typeof x === typeof item) ?? "";
			validateSettings(item, template, `${path}.${i}`);
		});
		return;
	}
	if (shape && typeof shape === "object") {
		if (!value || typeof value !== "object" || Array.isArray(value)) fail("必须为配置对象");
		for (const [key, item] of Object.entries(value)) {
			if (["__proto__", "constructor", "prototype"].includes(key) || isPrivateField(key)) fail("不允许修改此字段");
			if (!Object.hasOwn(shape, key)) fail(`不支持的字段 ${key}`);
			validateSettings(item, shape[key], path ? `${path}.${key}` : key);
		}
		return;
	}
	if (typeof value !== typeof shape) fail("字段类型不正确");
	if (typeof value === "string") {
		if (value.length > 20000 || /^\s*(javascript|vbscript|data):/i.test(value)) fail("内容过长或链接协议无效");
		const choices = fieldChoices(path);
		if (choices && !choices.includes(value)) fail("不支持的选项");
		if (path === "siteConfig.site_url" && !/^https?:\/\/[^/\s]+/i.test(value)) fail("请填写完整的 HTTP(S) 站点地址");
	}
	if (typeof value === "number") {
		const bounds = fieldBounds(path) ?? [-100000, 1000000];
		if (!Number.isFinite(value) || value < bounds[0] || value > bounds[1]) fail(`请输入 ${bounds[0]}–${bounds[1]} 之间的数值`);
	}
}
function endpoint(env: Env) {
	const {owner,repo,branch} = requireGitHub(env);
	return { path:`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${FILE}`, branch };
}
async function readSettings(env: Env) {
	const { path, branch } = endpoint(env);
	try {
		const response = await githubFetch(env, `${path}?ref=${encodeURIComponent(branch)}`);
		const item = await response.json() as {sha:string; content:string};
		return { sha:item.sha, data:JSON.parse(decodeBase64(item.content)) };
	} catch (error) {
		if (!(error instanceof Error) || !error.message.includes("（404）")) throw error;
		// Verify the repository is accessible before treating a missing settings file as first use.
		const {owner,repo} = requireGitHub(env);
		await githubFetch(env, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches/${encodeURIComponent(branch)}`);
		return { sha:"", data:{} };
	}
}
export async function handleSettings(request: Request, env: Env, session: SessionUser): Promise<Response> {
	const respond = (body: unknown, status = 200) => Response.json(body, { status, headers:{"Cache-Control":"no-store"} });
	if (session.role !== "owner") return respond({error:"只有站点所有者可以管理网站设置"}, 403);
	try {
		if (request.method === "GET") {
			const current = await readSettings(env);
			return respond({ sha:current.sha, values:publicValues(mergeConfig(defaults,current.data)), defaults:publicValues(defaults), groups:settingsGroups });
		}
		if (request.method === "PUT") {
			const input = await request.json() as {sha?:string; values?:Record<string,unknown>};
			if (!input.values || JSON.stringify(input.values).length > 500000) return respond({error:"配置缺失或超过 500 KB"},400);
			validateSettings(input.values, publicValues(defaults));
			const current = await readSettings(env);
			if (current.sha !== (input.sha || "")) return respond({error:"设置已被其他操作更新，请重新加载后再修改"},409);
			// Merge hidden values from the previous version, never overwrite them with redacted UI data.
			const data = mergeConfig(current.data, restoreHidden(input.values, current.data));
			const {path,branch} = endpoint(env);
			const response = await githubFetch(env,path,{method:"PUT",body:JSON.stringify({
				message:"更新博客设置", content:encodeBase64(JSON.stringify(data,null,2)+"\n"), branch, sha:current.sha || undefined,
			})});
			const result = await response.json() as {content:{sha:string};commit:{sha:string;html_url:string}};
			await env.DB!.prepare("INSERT INTO audit_logs (user_id,action,target_type,target_id,detail_json,created_at) VALUES (?, 'update', 'settings', ?, '{}', ?)")
				.bind(session.id,FILE,Date.now()).run();
			return respond({saved:true,sha:result.content.sha,commit:{sha:result.commit.sha,url:result.commit.html_url}});
		}
		return respond({error:"不支持的请求方式"},405);
	} catch (error) { return respond({error:error instanceof Error ? error.message : "配置处理失败"},400); }
}
