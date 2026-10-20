<script lang="ts">
import { onMount } from "svelte";
import ConfigField from "./ConfigField.svelte";
import { settingsGroups, settingsLabels } from "../../../shared/admin-settings";
let {
	request,
	notify,
	fail,
	ondirty,
}: {
	request: (path: string, init?: RequestInit) => Promise<any>;
	notify: (s: string) => void;
	fail: (e: unknown) => void;
	ondirty: (dirty: boolean) => void;
} = $props();
let values = $state<Record<string, any>>({});
let defaults = $state<Record<string, any>>({});
let saved = $state("");
let sha = $state("");
let busy = $state(false);
let loading = $state(true);
let group = $state("site");
let keyword = $state("");
let commitUrl = $state("");
const dirty = $derived(JSON.stringify(values) !== saved && !loading);
const active = $derived(settingsGroups.find((item) => item.id === group)!);
$effect(() => ondirty(dirty));
onMount(() => {
	void load();
	return () => ondirty(false);
});
async function load() {
	loading = true;
	try {
		const result = await request("/api/admin/settings");
		values = result.values;
		defaults = result.defaults;
		sha = result.sha;
		saved = JSON.stringify(result.values);
	} catch (e) {
		fail(e);
	} finally {
		loading = false;
	}
}
async function save() {
	if (!confirm("将设置提交到博客仓库？网站将在构建部署完成后更新。")) return;
	busy = true;
	try {
		const snapshot = JSON.stringify(values);
		const result = await request("/api/admin/settings", {
			method: "PUT",
			body: JSON.stringify({ sha, values: JSON.parse(snapshot) }),
		});
		sha = result.sha;
		saved = snapshot;
		commitUrl = result.commit.url;
		notify("设置已提交，等待博客构建部署。");
	} catch (e) {
		fail(e);
	} finally {
		busy = false;
	}
}
function resetGroup() {
	if (confirm(`恢复「${active.title}」的代码默认值？保存后才会生效。`)) {
		const next = { ...values };
		for (const key of active.keys)
			next[key] = structuredClone($state.snapshot(defaults[key]));
		values = next;
	}
}
function matches(key: string, item: any): boolean {
	const q = keyword.trim().toLowerCase();
	return (
		!q ||
		`${key} ${settingsLabels[key] || ""}`.toLowerCase().includes(q) ||
		(!!item &&
			typeof item === "object" &&
			Object.entries(item).some(([k, v]) => matches(k, v)))
	);
}
</script>
<div class="settings-toolbar">
	<div><strong>{dirty ? "有未保存的设置" : "设置已与仓库同步"}</strong><p class="muted">修改仅对发布后的默认设置生效；访客已有的本地偏好可能会覆盖默认值。</p></div>
	<button class="button primary" disabled={busy||loading||!dirty} onclick={()=>void save()}>{busy?"正在提交…":"保存并发布设置"}</button>
</div>
{#if commitUrl}<div class="notice">设置已保存到 GitHub；此处不代表部署已经成功。<a href={commitUrl} target="_blank" rel="noreferrer">查看提交 ↗</a></div>{/if}
{#if loading}<div class="panel empty">正在读取网站配置…</div>
{:else if Object.keys(values).length===0}<div class="panel empty"><p>暂时无法读取设置。</p><button class="button secondary" onclick={()=>void load()}>重试</button></div>
{:else}
	<div class="settings-layout">
		<nav class="settings-nav" aria-label="设置分类">
			{#each settingsGroups as item}<button class:active={group===item.id} onclick={()=>{group=item.id;keyword="";}}>{item.title}<span>›</span></button>{/each}
		</nav>
		<section class="panel settings-content">
			<div class="section-heading"><div><h2>{active.title}</h2><p class="muted">{active.description}</p></div><button class="text-button" onclick={resetGroup}>恢复默认</button></div>
			<label class="search-box"><span>搜索设置</span><input bind:value={keyword} placeholder="查找标题、布局、开关…"/></label>
			{#each active.keys as key}
				{#if values[key] !== undefined}
					{#if keyword && values[key] && !Array.isArray(values[key]) && typeof values[key]==="object"}
						{#each Object.entries(values[key]) as [field,value]}{#if matches(field,value)}
							<ConfigField {value} template={defaults[key]?.[field]} path={`${key}.${field}`} onchange={(next)=>values={...values,[key]:{...values[key],[field]:next}}}/>
						{/if}{/each}
					{:else}<ConfigField value={values[key]} template={defaults[key]} path={key} onchange={(next)=>values={...values,[key]:next}}/>{/if}
				{/if}
			{/each}
		</section>
	</div>
{/if}
