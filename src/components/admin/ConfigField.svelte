<script lang="ts">
import ConfigField from "./ConfigField.svelte";
import {
	fieldBounds,
	fieldChoices,
	settingsLabels,
} from "../../../shared/admin-settings";
let {
	value,
	template,
	path,
	label = "",
	onchange,
}: {
	value: any;
	template?: any;
	path: string;
	label?: string;
	onchange: (value: any) => void;
} = $props();
const title = $derived(
	label || settingsLabels[path.split(".").at(-1)!] || path.split(".").at(-1)!,
);
const choices = $derived(fieldChoices(path));
const bounds = $derived(fieldBounds(path));
function addItem() {
	const sample = template?.[0] ?? value[0] ?? "";
	const item = /^navBarConfig/.test(path)
		? { name: "新链接", url: "/", icon: "", external: false, children: [] }
		: sample && typeof sample === "object"
			? structuredClone($state.snapshot(sample))
			: typeof sample === "number"
				? 0
				: "";
	onchange([...value, item]);
}
function move(i: number, direction: number) {
	const list = [...value];
	[list[i], list[i + direction]] = [list[i + direction], list[i]];
	onchange(list);
}
</script>
{#if Array.isArray(value)}
	<details class="config-section" open={path.split(".").length < 2}>
		<summary>{title} <span>{value.length} 项</span></summary>
		<div class="config-array">
			{#each value as item, i}
				<div class="array-item">
					<div class="array-heading"><strong>{typeof item === "object" ? item.name || item.title || item.type || `项目 ${i+1}` : `${i+1}`}</strong>
						<div class="row-actions">
							<button class="icon-button" type="button" title="上移" aria-label={`上移 ${i+1}`} disabled={i===0} onclick={()=>move(i,-1)}>↑</button>
							<button class="icon-button" type="button" title="下移" aria-label={`下移 ${i+1}`} disabled={i===value.length-1} onclick={()=>move(i,1)}>↓</button>
							<button class="text-button danger-link" type="button" onclick={()=>onchange(value.filter((_:any,index:number)=>index!==i))}>移除</button>
						</div>
					</div>
					{#if typeof item === "number" && path.startsWith("navBarConfig")}
						<label>预设页面<select value={item} onchange={(e)=>onchange(value.map((v:any,n:number)=>n===i ? Number(e.currentTarget.value):v))}>{#each ["首页","归档","关于","友链","赞助","留言板","相册","标签","分类","书签"] as name,n}<option value={n}>{name}</option>{/each}</select></label>
					{:else}
						<ConfigField value={item} template={template?.[i] ?? template?.[0]} path={`${path}.${i}`} label={typeof item === "object" ? "详细设置" : title} onchange={(next)=>onchange(value.map((v:any,n:number)=>n===i?next:v))}/>
					{/if}
				</div>
			{/each}
			<button class="button secondary" type="button" onclick={addItem}>＋ 添加一项</button>
		</div>
	</details>
{:else if value && typeof value === "object"}
	<details class="config-section" open={path.split(".").length === 1}>
		<summary>{title}</summary>
		<div class="config-fields">{#each Object.entries(value) as [key,item]}
			<ConfigField value={item} template={template?.[key]} path={`${path}.${key}`} onchange={(next)=>onchange({...value,[key]:next})}/>
		{/each}</div>
	</details>
{:else if typeof value === "boolean"}
	<label class="switch-row"><span>{title}</span><input type="checkbox" role="switch" checked={value} onchange={(e)=>onchange(e.currentTarget.checked)}/></label>
{:else}
	<label class="config-input"><span>{title}</span>
		{#if choices}<select value={value} onchange={(e)=>onchange(e.currentTarget.value)}>{#each choices as choice}<option value={choice}>{choice}</option>{/each}</select>
		{:else if typeof value === "number"}<input type="number" step="any" min={bounds?.[0]} max={bounds?.[1]} value={value} oninput={(e)=>onchange(e.currentTarget.valueAsNumber)}/>
		{:else if /content|description|bio|subtitle|desc$/i.test(path) || String(value).length > 160}<textarea rows="3" value={value ?? ""} oninput={(e)=>onchange(e.currentTarget.value)}></textarea>
		{:else}<input value={value ?? ""} oninput={(e)=>onchange(e.currentTarget.value)}/>{/if}
	</label>
{/if}
