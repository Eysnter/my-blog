<script lang="ts">
import { onMount, tick } from "svelte";

interface MediaItem {
	id: string;
	object_key: string;
	url: string;
	file_name: string;
	mime_type: string;
	file_size: number;
	alt: string;
	created_at?: number;
}
type Request = (path: string, init?: RequestInit) => Promise<any>;
let {
	request,
	notify,
	fail,
	editorOpen,
	onChoose,
}: {
	request: Request;
	notify: (text: string) => void;
	fail: (reason: unknown) => void;
	editorOpen: boolean;
	onChoose: (item: MediaItem, mode: "cover" | "body") => void;
} = $props();

const pageSize = 24;
const allowedTypes = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
]);
let items = $state<MediaItem[]>([]);
let total = $state(0);
let page = $state(1);
let query = $state("");
let appliedQuery = $state("");
let loading = $state(true);
let uploading = $state(false);
let uploadDone = $state(0);
let uploadCount = $state(0);
let uploadSuccess = $state(0);
let uploadFailures = $state<string[]>([]);
let uploadFinished = $state(false);
let fileInput: HTMLInputElement;
let previewDialog: HTMLDialogElement;
let selected = $state<MediaItem | null>(null);
let editName = $state("");
let editAlt = $state("");
let saving = $state(false);
let deleting = $state(false);
let loadVersion = 0;
const pageCount = $derived(Math.max(1, Math.ceil(total / pageSize)));

onMount(() => {
	void load();
});

async function load(nextPage = page, nextQuery = appliedQuery) {
	const version = ++loadVersion;
	loading = true;
	try {
		const params = new URLSearchParams({
			q: nextQuery,
			page: String(nextPage),
			limit: String(pageSize),
		});
		const result = await request(`/api/admin/media?${params}`);
		if (version !== loadVersion) return;
		items = result.items ?? [];
		total = Number(result.total ?? items.length);
		page = nextPage;
		appliedQuery = nextQuery;
		if (!items.length && total > 0 && nextPage > 1) {
			await load(Math.max(1, Math.ceil(total / pageSize)), nextQuery);
		}
	} catch (reason) {
		if (version === loadVersion) fail(reason);
	} finally {
		if (version === loadVersion) loading = false;
	}
}

function bytes(size: number) {
	if (size < 1024) return `${size} B`;
	if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
	return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function date(value?: number) {
	if (!value) return "刚刚上传";
	return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

async function uploadFiles(event: Event) {
	const input = event.currentTarget as HTMLInputElement;
	const files = Array.from(input.files ?? []);
	if (!files.length || uploading) return;
	uploading = true;
	uploadFinished = false;
	uploadDone = 0;
	uploadCount = files.length;
	uploadSuccess = 0;
	uploadFailures = [];
	// 串行上传避免大图片同时占用网络和浏览器内存；逐项保留失败原因。
	for (const file of files) {
		try {
			if (!allowedTypes.has(file.type))
				throw new Error("仅支持 JPG、PNG、WebP 和 GIF");
			if (!file.size) throw new Error("文件内容为空");
			if (file.size > 10 * 1024 * 1024) throw new Error("超过 10 MB");
			const form = new FormData();
			form.set("file", file);
			form.set("alt", file.name.replace(/\.[^.]+$/, ""));
			await request("/api/admin/media", { method: "POST", body: form });
			uploadSuccess += 1;
		} catch (reason) {
			const detail = reason instanceof Error ? reason.message : String(reason);
			uploadFailures = [...uploadFailures, `${file.name}：${detail}`];
		} finally {
			uploadDone += 1;
		}
	}
	uploading = false;
	uploadFinished = true;
	input.value = "";
	if (uploadSuccess) {
		query = "";
		await load(1, "");
	}
	notify(
		`上传完成：成功 ${uploadSuccess} 张，失败 ${uploadFailures.length} 张`,
	);
}

async function preview(item: MediaItem) {
	selected = item;
	editName = item.file_name;
	editAlt = item.alt;
	await tick();
	previewDialog.showModal();
}

function closePreview() {
	previewDialog.close();
	selected = null;
}

async function updateDetails() {
	if (!selected || saving) return;
	if (!editName.trim()) {
		fail("请填写图片名称");
		return;
	}
	saving = true;
	try {
		const result = await request("/api/admin/media", {
			method: "PATCH",
			body: JSON.stringify({
				id: selected.id,
				fileName: editName.trim(),
				alt: editAlt.trim(),
			}),
		});
		const updated = result.item ?? {
			...selected,
			file_name: editName.trim(),
			alt: editAlt.trim(),
		};
		items = items.map((item) => (item.id === updated.id ? updated : item));
		selected = updated;
		notify("图片信息已保存");
	} catch (reason) {
		fail(reason);
	} finally {
		saving = false;
	}
}

async function copy(item: MediaItem, format: "url" | "markdown") {
	const alt = (item.alt || item.file_name)
		.replace(/([\\[\]])/g, "\\$1")
		.replace(/\r?\n/g, " ");
	const content =
		format === "url"
			? item.url
			: `![${alt}](<${item.url.replace(/[<>]/g, encodeURIComponent)}>)`;
	try {
		await navigator.clipboard.writeText(content);
		notify(format === "url" ? "图片链接已复制" : "Markdown 图片代码已复制");
	} catch {
		fail("复制失败，请在详情中选择图片链接后手动复制");
	}
}

function choose(mode: "cover" | "body") {
	if (!selected || !editorOpen) return;
	const item = selected;
	closePreview();
	onChoose(item, mode);
}

async function deleteImage() {
	if (!selected || deleting) return;
	if (
		!confirm(
			`确定永久删除「${selected.file_name}」吗？已发布文章中使用这张图片的位置会失效。`,
		)
	)
		return;
	deleting = true;
	try {
		await request(`/api/admin/media?id=${encodeURIComponent(selected.id)}`, {
			method: "DELETE",
		});
		closePreview();
		notify("图片已删除");
		await load();
	} catch (reason) {
		fail(reason);
	} finally {
		deleting = false;
	}
}
</script>

<section class="media-workspace" aria-labelledby="media-heading">
	<div class="section-head">
		<div>
			<p class="eyebrow">素材管理</p>
			<h2 id="media-heading">图片库 <span>{total}</span></h2>
			<p class="muted">上传、整理图片，为文章挑选封面和配图。</p>
		</div>
		<button class="button primary" type="button" disabled={uploading} onclick={() => fileInput.click()}>
			<svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10 13V3m-4 4 4-4 4 4M3 12v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4"/></svg>
			{uploading ? `正在上传 ${uploadDone}/${uploadCount}` : "上传图片"}
		</button>
		<input bind:this={fileInput} class="visually-hidden" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" aria-label="选择需要上传的图片，可多选" onchange={uploadFiles} disabled={uploading} />
	</div>

	{#if uploading || uploadFinished}
		<div class="upload-progress panel" aria-live="polite">
			<div class="upload-line">
				<strong>{uploading ? "图片上传中" : "本次上传结果"}</strong>
				<span>{uploadDone}/{uploadCount} · 成功 {uploadSuccess} · 失败 {uploadFailures.length}</span>
			</div>
			{#if uploading}<progress value={uploadDone} max={uploadCount} aria-label="上传进度"></progress>{/if}
			{#if uploadFailures.length}
				<details open>
					<summary>查看失败文件</summary>
					<ul>{#each uploadFailures as item}<li>{item}</li>{/each}</ul>
				</details>
			{/if}
		</div>
	{/if}

	<div class="panel media-panel">
		<div class="media-toolbar">
			<form class="search-form" onsubmit={(event) => { event.preventDefault(); void load(1, query.trim()); }}>
				<label class="visually-hidden" for="media-search">搜索图片名称或说明</label>
				<div class="search-box">
					<svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/></svg>
					<input id="media-search" class="input" type="search" placeholder="搜索图片名称或说明" bind:value={query} />
				</div>
				<button class="button secondary" type="submit" disabled={loading}>搜索</button>
				{#if appliedQuery}<button class="text-button" type="button" onclick={() => { query = ""; void load(1, ""); }}>清除</button>{/if}
			</form>
			<span class="muted upload-hint">JPG / PNG / WebP / GIF · 每张 ≤ 10 MB</span>
		</div>

		{#if loading}
			<div class="empty" role="status">正在加载图片…</div>
		{:else if !items.length}
			<div class="media-empty empty">
				<svg aria-hidden="true" viewBox="0 0 40 40" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="5" y="6" width="30" height="28" rx="5"/><circle cx="14" cy="15" r="3"/><path d="m6 29 9-9 7 6 5-5 8 8"/></svg>
				<strong>{appliedQuery ? "没有找到匹配的图片" : "给文章准备一些配图"}</strong>
				<p>{appliedQuery ? "换个名称或说明搜索，或者清除筛选查看全部图片。" : "可以一次选择多张图片，上传后在这里修改名称和替代文本。"}</p>
				{#if !appliedQuery}<button class="button secondary" type="button" disabled={uploading} onclick={() => fileInput.click()}>选择图片</button>{/if}
			</div>
		{:else}
			<div class="media-grid">
				{#each items as item (item.id)}
					<article class="image-card">
						<button class="image-preview" type="button" onclick={() => preview(item)} aria-label={`查看图片：${item.file_name}`}>
							<img src={item.url} alt={item.alt || item.file_name} loading="lazy" decoding="async" />
							<span class="image-preview-label">查看详情</span>
						</button>
						<div class="image-info">
							<strong title={item.file_name}>{item.file_name}</strong>
							<div><span>{item.mime_type.replace("image/", "").toUpperCase()} · {bytes(item.file_size)}</span><button class="icon-button" type="button" title="复制图片链接" aria-label={`复制 ${item.file_name} 的链接`} onclick={() => copy(item, "url")}><svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="7" y="7" width="9" height="10" rx="2"/><path d="M12 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/></svg></button></div>
						</div>
					</article>
				{/each}
			</div>
		{/if}
		<div class="pagination">
			<span class="muted">共 {total} 张{appliedQuery ? "匹配图片" : "图片"}</span>
			<div><button class="button secondary" type="button" disabled={page <= 1 || loading} onclick={() => load(page - 1)}>上一页</button><span>{page} / {pageCount}</span><button class="button secondary" type="button" disabled={page >= pageCount || loading} onclick={() => load(page + 1)}>下一页</button></div>
		</div>
	</div>
</section>

<dialog bind:this={previewDialog} class="media-dialog" aria-labelledby="media-dialog-title" onclose={() => { selected = null; }}>
	{#if selected}
		<div class="dialog-header">
			<h2 id="media-dialog-title">图片详情</h2>
			<button class="icon-button close-button" type="button" aria-label="关闭图片详情" onclick={closePreview}>×</button>
		</div>
		<div class="dialog-layout">
			<div class="dialog-image"><img src={selected.url} alt={selected.alt || selected.file_name} /></div>
			<div class="dialog-details">
				<form class="details-form" onsubmit={(event) => { event.preventDefault(); void updateDetails(); }}>
					<label for="media-name">图片名称<input id="media-name" class="input" bind:value={editName} maxlength="200" required /></label>
					<label for="media-alt">替代文本<textarea id="media-alt" class="input" bind:value={editAlt} maxlength="300" rows="3" placeholder="描述图片内容，便于读屏访问和图片加载失败时阅读"></textarea></label>
					<p class="field-note">修改名称不会改变图片链接。</p>
					<button class="button primary" type="submit" disabled={saving || deleting}>{saving ? "保存中…" : "保存图片信息"}</button>
				</form>
				<dl class="image-metadata"><div><dt>文件格式</dt><dd>{selected.mime_type}</dd></div><div><dt>文件大小</dt><dd>{bytes(selected.file_size)}</dd></div><div><dt>上传时间</dt><dd>{date(selected.created_at)}</dd></div></dl>
				<label for="media-url">图片链接<input id="media-url" class="input url-input" value={selected.url} readonly onclick={(event) => event.currentTarget.select()} /></label>
				<div class="button-row"><button class="button secondary" type="button" onclick={() => selected && copy(selected, "url")}>复制链接</button><button class="button secondary" type="button" onclick={() => selected && copy(selected, "markdown")}>复制 Markdown</button></div>
				{#if editorOpen}
					<div class="insert-actions"><p class="field-note">插入当前正在编辑的文章</p><div class="button-row"><button class="button secondary" type="button" onclick={() => choose("cover")}>设为封面</button><button class="button secondary" type="button" onclick={() => choose("body")}>插入正文</button></div></div>
				{:else}<p class="field-note">打开文章编辑器后，可直接选择封面或插入正文。</p>{/if}
				<button class="delete-button" type="button" disabled={saving || deleting} onclick={deleteImage}>{deleting ? "正在删除…" : "删除这张图片"}</button>
			</div>
		</div>
	{/if}
</dialog>

<style>
	.media-workspace { display: grid; gap: 24px; }
	.section-head { display: flex; justify-content: space-between; align-items: center; gap: 20px; }
	.eyebrow { margin: 0 0 7px; color: #966482; font-size: 12px; font-weight: 600; letter-spacing: .06em; }
	h2 { margin: 0; color: #292733; font-size: 24px; font-weight: 650; letter-spacing: -.03em; }
	h2 span { display: inline-block; margin-left: 8px; padding: 3px 8px; border-radius: 6px; background: #eee9ed; color: #74636f; font-size: 12px; letter-spacing: 0; vertical-align: middle; }
	.section-head p.muted { margin: 9px 0 0; font-size: 13px; }
	.section-head > button { flex-shrink: 0; display: inline-flex; align-items: center; gap: 8px; }
	.media-panel { overflow: hidden; padding: 0; }
	.media-toolbar { padding: 20px; display: flex; justify-content: space-between; align-items: center; gap: 16px; border-bottom: 1px solid #ebe9ed; }
	.search-form { display: flex; align-items: center; gap: 8px; }
	.search-box { position: relative; }
	.search-box svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #918994; pointer-events: none; }
	.search-box input { padding-left: 38px; width: 260px; max-width: 100%; }
	.upload-hint { font-size: 11px; text-align: right; }
	.media-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; padding: 20px; }
	.image-card { min-width: 0; overflow: hidden; border: 1px solid #e9e6eb; border-radius: 10px; background: white; transition: border-color .15s; }
	.image-card:hover { border-color: #c7b6c2; }
	.image-preview { position: relative; display: flex; width: 100%; aspect-ratio: 4/3; padding: 0; background: #f4f2f4; border: 0; cursor: pointer; overflow: hidden; }
	.image-preview img { width: 100%; height: 100%; object-fit: contain; }
	.image-preview-label { position: absolute; bottom: 9px; left: 50%; transform: translateX(-50%); padding: 5px 10px; border-radius: 5px; background: #292733b8; color: #fff; font-size: 11px; opacity: 0; transition: opacity .15s; }
	.image-preview:hover .image-preview-label, .image-preview:focus-visible .image-preview-label { opacity: 1; }
	.image-info { padding: 12px 12px 8px; }
	.image-info > strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 550; }
	.image-info > div { margin-top: 4px; display: flex; align-items: center; justify-content: space-between; color: #8b8490; font-size: 10px; }
	.icon-button { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 30px; height: 30px; border: 0; border-radius: 6px; background: transparent; color: #817687; cursor: pointer; }
	.icon-button:hover { color: #79516b; background: #f3edf1; }
	.text-button { border: 0; background: none; color: #966482; cursor: pointer; font-size: 12px; padding: 8px; }
	.pagination { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 16px 20px; border-top: 1px solid #ebe9ed; font-size: 12px; }
	.pagination > div { display: flex; align-items: center; gap: 14px; }
	.pagination .button { min-height: 32px; padding: 6px 11px; font-size: 12px; }
	.media-empty { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 65px 24px; text-align: center; }
	.media-empty svg { color: #b9a8b5; }
	.media-empty strong { color: #49414c; font-size: 15px; font-weight: 550; }
	.media-empty p { margin: 0; max-width: 340px; font-size: 13px; line-height: 1.8; }
	.upload-progress { padding: 18px 20px; }
	.upload-line { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 13px; }
	.upload-line strong { font-weight: 550; }
	.upload-line span { color: #847a87; font-size: 12px; }
	progress { width: 100%; height: 6px; margin-top: 12px; accent-color: #966482; }
	details { margin-top: 12px; color: #a64f59; font-size: 12px; }
	details summary { cursor: pointer; }
	details ul { max-height: 150px; overflow: auto; line-height: 1.7; padding-left: 20px; }
	.media-dialog { width: min(980px, calc(100vw - 32px)); max-height: calc(100dvh - 32px); box-sizing: border-box; padding: 0; color: #3b3541; background: #fff; border: 1px solid #e4dfe6; border-radius: 12px; box-shadow: 0 24px 100px #25202d30; }
	.media-dialog::backdrop { background: #25202d80; }
	.dialog-header { display: flex; justify-content: space-between; align-items: center; padding: 17px 24px; border-bottom: 1px solid #ebe9ed; }
	.dialog-header h2 { font-size: 17px; letter-spacing: 0; }
	.close-button { font-size: 26px; font-weight: 300; }
	.dialog-layout { display: grid; grid-template-columns: minmax(0, 1fr) 330px; }
	.dialog-image { display: flex; align-items: center; justify-content: center; min-width: 0; padding: 24px; background: #f5f3f5; }
	.dialog-image img { display: block; max-width: 100%; max-height: 66dvh; object-fit: contain; }
	.dialog-details { padding: 24px; display: flex; flex-direction: column; gap: 16px; border-left: 1px solid #ebe9ed; }
	.details-form { display: grid; gap: 15px; }
	.dialog-details label { display: flex; flex-direction: column; gap: 7px; font-size: 12px; font-weight: 550; }
	.dialog-details .input { width: 100%; box-sizing: border-box; font-size: 13px; font-weight: 400; }
	.dialog-details textarea { resize: vertical; min-height: 72px; }
	.field-note { margin: 0; color: #8b8290; font-size: 11px; line-height: 1.65; font-weight: 400; }
	.image-metadata { display: grid; gap: 9px; margin: 0; padding: 16px 0; border-top: 1px solid #eeeaf0; border-bottom: 1px solid #eeeaf0; font-size: 11px; }
	.image-metadata div { display: flex; justify-content: space-between; gap: 12px; }
	.image-metadata dt { color: #938a98; }
	.image-metadata dd { margin: 0; text-align: right; }
	.url-input { color: #817787; }
	.button-row { display: flex; flex-wrap: wrap; gap: 7px; }
	.button-row .button { flex: 1; padding: 8px 10px; font-size: 11px; white-space: nowrap; }
	.insert-actions { display: grid; gap: 8px; padding-top: 15px; border-top: 1px solid #eeeaf0; }
	.delete-button { padding: 7px 0; border: 0; background: none; color: #b45a65; cursor: pointer; text-align: left; font-size: 12px; }
	.delete-button:hover { color: #983b46; }
	.delete-button:disabled { opacity: .5; cursor: not-allowed; }
	.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
	@media (max-width: 1180px) { .media-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } .media-toolbar { align-items: flex-start; flex-direction: column; } .upload-hint { text-align: left; } }
	@media (max-width: 760px) { .dialog-layout { grid-template-columns: 1fr; } .dialog-image { padding: 16px; } .dialog-image img { max-height: 35dvh; } .dialog-details { border-left: 0; border-top: 1px solid #ebe9ed; } .media-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding: 16px; } }
	@media (max-width: 540px) { .section-head { align-items: flex-start; } h2 { font-size: 22px; } .section-head p.muted { max-width: 210px; line-height: 1.7; } .section-head > button { font-size: 12px; padding: 9px 12px; } .section-head > button svg { display: none; } .media-toolbar { padding: 16px; } .search-form { width: 100%; } .search-box { flex: 1; min-width: 0; } .search-box input { width: 100%; } .search-form > .button { padding: 9px 12px; } .pagination { padding: 14px 16px; flex-direction: column; align-items: flex-start; gap: 12px; } .pagination > div { width: 100%; justify-content: space-between; } .upload-line { align-items: flex-start; flex-direction: column; gap: 7px; } .media-dialog { width: calc(100vw - 20px); max-height: calc(100dvh - 20px); } .dialog-header, .dialog-details { padding: 16px; } }
</style>
