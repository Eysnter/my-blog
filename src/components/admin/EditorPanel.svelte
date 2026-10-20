<script lang="ts">
	import { countWords, type EditorFields } from "../../../shared/admin-content";

	type Props = {
		fields: EditorFields;
		body: string;
		preview: boolean;
		dirty: boolean;
		busy: boolean;
		folders: string[];
		categories: string[];
		previewHtml: string;
		onDirty: () => void;
		onBack: () => void;
		onSave: () => void;
		onPublish: () => void;
		onChooseMedia: () => void;
	};

	let {
		fields = $bindable(),
		body = $bindable(),
		preview = $bindable(),
		dirty,
		busy,
		folders,
		categories,
		previewHtml,
		onDirty,
		onBack,
		onSave,
		onPublish,
		onChooseMedia,
	}: Props = $props();

	let textarea: HTMLTextAreaElement;
	let customFolder = $state(false);
	const currentFolders = $derived(
		[...new Set([...folders, fields.folder].filter(Boolean))].sort((a, b) => a.localeCompare(b)),
	);
	const pathPreview = $derived(
		`src/content/posts/${fields.folder ? `${fields.folder}/` : ""}${fields.slug || "article"}.${fields.extension}`,
	);
	const coverValid = $derived(!fields.image || /^(https?:\/\/|\/)/i.test(fields.image));

	function changed() {
		onDirty();
	}
	function chooseFolder(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;
		if (value === "__custom__") {
			customFolder = true;
			fields.folder = "";
		} else {
			customFolder = false;
			fields.folder = value;
		}
		changed();
	}
	function insert(before: string, after = "", placeholder = "文字") {
		const start = textarea?.selectionStart ?? body.length;
		const end = textarea?.selectionEnd ?? start;
		const selected = body.slice(start, end) || placeholder;
		body = `${body.slice(0, start)}${before}${selected}${after}${body.slice(end)}`;
		changed();
		requestAnimationFrame(() => {
			textarea?.focus();
			const cursor = start + before.length + selected.length;
			textarea?.setSelectionRange(cursor, cursor);
		});
	}
</script>

<section class="editor-commandbar">
	<div class="command-left">
		<button class="back-button" onclick={onBack} aria-label="返回文章列表">←</button>
		<div>
			<strong>{fields.title || "未命名文章"}</strong>
			<span class:unsaved={dirty}>{dirty ? "有未保存修改" : "所有修改已保存"}</span>
		</div>
	</div>
	<div class="command-actions">
		<button class="button secondary" onclick={() => (preview = !preview)}>{preview ? "继续编辑" : "文章预览"}</button>
		<button class="button secondary" disabled={busy} onclick={onSave}>保存草稿</button>
		<button class="button primary" disabled={busy} onclick={onPublish}>提交发布</button>
	</div>
</section>

{#if preview}
	<section class="panel preview-sheet">
		<header>
			<p>{fields.category || "未分类"} · {fields.published || "未设置日期"} · {countWords(body)} 字</p>
			<h1>{fields.title || "未命名文章"}</h1>
			{#if fields.description}<div>{fields.description}</div>{/if}
		</header>
		{#if fields.image && coverValid}<img class="preview-cover" src={fields.image} alt="文章封面" />{/if}
		<div class="markdown-body">{@html previewHtml}</div>
	</section>
{:else}
	<section class="editor-layout">
		<div class="editor-column">
			<section class="panel document-card">
				<label class="title-field">
					<span>文章标题</span>
					<input bind:value={fields.title} oninput={changed} placeholder="输入一个清晰、具体的标题" />
				</label>

				<div class="path-section">
					<div class="path-heading">
						<div><strong>保存位置</strong><small>选择已有目录，或创建一个新目录</small></div>
						<code>{pathPreview}</code>
					</div>
					<div class="path-fields">
						<label>
							<span>文章目录</span>
							<select value={customFolder ? "__custom__" : fields.folder} onchange={chooseFolder}>
								<option value="">根目录</option>
								{#each currentFolders as folder}<option value={folder}>{folder}</option>{/each}
								<option value="__custom__">＋ 新建目录…</option>
							</select>
						</label>
						<label>
							<span>文件名</span>
							<div class="slug-input"><input bind:value={fields.slug} oninput={changed} placeholder="linux-getting-started" /><em>.{fields.extension}</em></div>
						</label>
					</div>
					{#if customFolder}
						<label class="custom-folder"><span>新目录名称</span><input bind:value={fields.folder} oninput={changed} autofocus placeholder="例如 posts3-Linux" /></label>
					{/if}
				</div>
			</section>

			<section class="panel writing-card">
				<header class="writing-header">
					<div><strong>正文</strong><small>支持 Markdown · Ctrl+S 保存草稿</small></div>
					<div class="editor-stats"><span>{countWords(body)} 字</span><span>{body.split(/\n/u).length} 行</span></div>
				</header>
				<div class="markdown-toolbar" aria-label="Markdown 工具栏">
					<button title="二级标题" onclick={() => insert("## ", "", "标题")}>H2</button>
					<button title="加粗" onclick={() => insert("**", "**")}>B</button>
					<button title="斜体" onclick={() => insert("*", "*")}>I</button>
					<button title="引用" onclick={() => insert("> ", "", "引用内容")}>❝</button>
					<button title="无序列表" onclick={() => insert("- ", "", "列表项")}>≡</button>
					<button title="行内代码" onclick={() => insert("`", "`", "code")}>{"</>"}</button>
					<button title="链接" onclick={() => insert("[", "](https://)", "链接文字")}>↗</button>
					<button title="从图片库插入" onclick={onChooseMedia}>图片</button>
				</div>
				<textarea bind:this={textarea} class="markdown-editor" bind:value={body} oninput={changed} spellcheck="false" placeholder="从这里开始写作…"></textarea>
			</section>
		</div>

		<aside class="meta-column">
			<section class="panel meta-card">
				<header><div><strong>发布信息</strong><small>日期、分类与内容摘要</small></div><span class:published={!fields.draft}>{fields.draft ? "隐藏" : "公开"}</span></header>
				<div class="date-grid">
					<label><span>发布日期</span><input type="date" bind:value={fields.published} oninput={changed} /></label>
					<label><span>更新日期</span><input type="date" bind:value={fields.updated} oninput={changed} /></label>
				</div>
				<label><span>分类</span><input list="article-categories" bind:value={fields.category} oninput={changed} /><datalist id="article-categories">{#each categories as category}<option value={category}></option>{/each}</datalist></label>
				<label><span>标签</span><input bind:value={fields.tags} oninput={changed} placeholder="Linux, 教程" /></label>
				<label><span>摘要</span><textarea bind:value={fields.description} oninput={changed} rows="4" placeholder="用于文章卡片和搜索结果"></textarea></label>
			</section>

			<section class="panel meta-card cover-card">
				<header><div><strong>标题图片</strong><small>建议使用 16:9 横图</small></div><button onclick={onChooseMedia}>图片库</button></header>
				{#if fields.image && coverValid}<img src={fields.image} alt="封面预览" />{:else}<div class="cover-empty"><span>▧</span><p>{fields.image ? "图片地址格式无效" : "还没有选择标题图片"}</p></div>{/if}
				<input bind:value={fields.image} oninput={changed} placeholder="https://…" aria-label="标题图片地址" />
			</section>

			<section class="panel option-card">
				<label><span><b>公开显示</b><small>关闭后不会出现在博客前台</small></span><input type="checkbox" checked={!fields.draft} onchange={(event) => { fields.draft = !(event.currentTarget as HTMLInputElement).checked; changed(); }} /></label>
				<label><span><b>置顶文章</b><small>在文章列表优先展示</small></span><input type="checkbox" bind:checked={fields.pinned} onchange={changed} /></label>
				<label><span><b>允许评论</b><small>显示文章评论区域</small></span><input type="checkbox" bind:checked={fields.comment} onchange={changed} /></label>
			</section>

			<details class="panel advanced-card">
				<summary>高级设置 <span>语言、作者与访问控制</span></summary>
				<div>
					<label><span>语言</span><input bind:value={fields.lang} oninput={changed} /></label>
					<label><span>排序权重</span><input type="number" bind:value={fields.weight} oninput={changed} /></label>
					<label><span>作者</span><input bind:value={fields.author} oninput={changed} /></label>
					<label><span>来源链接</span><input bind:value={fields.sourceLink} oninput={changed} /></label>
					<label><span>许可证名称</span><input bind:value={fields.licenseName} oninput={changed} /></label>
					<label><span>许可证链接</span><input bind:value={fields.licenseUrl} oninput={changed} /></label>
					<label><span>访问密码</span><input type="password" bind:value={fields.password} oninput={changed} /></label>
					<label><span>密码提示</span><input bind:value={fields.passwordHint} oninput={changed} /></label>
				</div>
			</details>
		</aside>
	</section>
{/if}

<style>
	.editor-commandbar{position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;gap:18px;margin:0 -8px;padding:14px 8px;background:rgba(245,244,243,.94);border-bottom:1px solid #e7e2e5;backdrop-filter:blur(14px)}
	.command-left,.command-actions{display:flex;align-items:center;gap:10px}.back-button{display:grid;place-items:center;width:38px;height:38px;border:1px solid #ded8dd;border-radius:10px;background:#fff;color:#625862;cursor:pointer;font-size:18px}.command-left div{display:grid;gap:3px}.command-left strong{max-width:36vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.command-left span{color:#7d9887;font-size:10px}.command-left span.unsaved{color:#b27a55}.editor-layout{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:18px;align-items:start;padding-top:18px}.editor-column,.meta-column{display:grid;gap:16px}.document-card,.writing-card,.meta-card,.option-card{overflow:hidden}.document-card{padding:22px}.title-field,.path-section label,.meta-card>label,.advanced-card label{display:grid;gap:7px}.title-field>span,.path-section label>span,.meta-card label>span,.advanced-card label>span{color:#736a73;font-size:10px;font-weight:650}.title-field input{padding:3px 0 15px;border:0;border-bottom:1px solid #e7e1e5;border-radius:0;box-shadow:none;font-size:22px;font-weight:650;letter-spacing:-.025em}.path-section{margin-top:20px;padding:16px;border-radius:10px;background:#f8f6f7}.path-heading{display:flex;align-items:start;justify-content:space-between;gap:16px;margin-bottom:13px}.path-heading div{display:grid;gap:4px}.path-heading strong,.writing-header strong,.meta-card header strong{font-size:12px}.path-heading small,.writing-header small,.meta-card header small{color:#9a9199;font-size:9px}.path-heading code{max-width:55%;overflow:hidden;color:#907085;font:9px/1.5 Consolas,monospace;text-overflow:ellipsis;white-space:nowrap}.path-fields,.date-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.custom-folder{margin-top:10px}.slug-input{display:flex}.slug-input input{border-radius:8px 0 0 8px}.slug-input em{display:flex;align-items:center;padding:0 10px;border:1px solid #dcd7dc;border-left:0;border-radius:0 8px 8px 0;background:#eee9ec;color:#897e87;font-size:10px;font-style:normal}.writing-header,.meta-card header{display:flex;align-items:center;justify-content:space-between;gap:12px}.writing-header{padding:16px 18px;border-bottom:1px solid #ebe6e9}.writing-header>div:first-child,.meta-card header>div{display:grid;gap:4px}.editor-stats{display:flex;gap:12px;color:#999099;font-size:9px}.markdown-toolbar{display:flex;gap:2px;padding:8px 12px;border-bottom:1px solid #ece7ea;background:#faf9f9}.markdown-toolbar button{min-width:30px;height:28px;padding:0 7px;border-radius:6px;background:transparent;color:#6c626c;cursor:pointer;font-size:10px}.markdown-toolbar button:hover{background:#ece6ea;color:#754f67}.markdown-editor{display:block;min-height:620px;padding:22px;border:0;border-radius:0;box-shadow:none;resize:vertical;background:#fff;font:13px/1.85 "JetBrains Mono",Consolas,monospace}.meta-column{position:sticky;top:82px}.meta-card{display:grid;gap:14px;padding:18px}.meta-card header>span{padding:4px 7px;border-radius:5px;background:#f4eee5;color:#8d6946;font-size:9px}.meta-card header>span.published{background:#eaf3ed;color:#4d755b}.cover-card header button{padding:5px 8px;border-radius:6px;background:#eee7eb;color:#77576a;cursor:pointer;font-size:9px}.cover-card img,.cover-empty{width:100%;aspect-ratio:16/9;border-radius:8px}.cover-card img{object-fit:cover}.cover-empty{display:grid;place-content:center;gap:5px;background:#f7f4f6;color:#a0979f;text-align:center}.cover-empty span{font-size:22px}.cover-empty p{margin:0;font-size:9px}.option-card{display:grid;padding:5px 18px}.option-card label{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 0;border-bottom:1px solid #eee9ec}.option-card label:last-child{border:0}.option-card span{display:grid;gap:3px}.option-card b{font-size:11px}.option-card small{color:#9b929a;font-size:9px}.option-card input{width:32px;height:18px;accent-color:#91617e}.advanced-card summary{display:flex;justify-content:space-between;padding:16px 18px;cursor:pointer;font-size:11px;font-weight:650}.advanced-card summary span{color:#9c939b;font-size:9px;font-weight:400}.advanced-card>div{display:grid;gap:12px;padding:0 18px 18px}.preview-sheet{max-width:900px;margin:24px auto;padding:48px}.preview-sheet header{text-align:center}.preview-sheet header p{color:#95718a;font-size:10px}.preview-sheet h1{margin:12px 0;font-size:32px}.preview-sheet header div{margin:auto;color:#817881;max-width:620px;line-height:1.7;font-size:12px}.preview-cover{width:100%;max-height:440px;margin:30px 0 18px;border-radius:12px;object-fit:cover}.markdown-body{font-size:14px;line-height:1.9}.markdown-body :global(img){max-width:100%;height:auto}.markdown-body :global(pre){overflow:auto;padding:16px;border-radius:9px;background:#29262d;color:#eee}
	@media(max-width:1100px){.editor-layout{grid-template-columns:1fr}.meta-column{position:static;grid-template-columns:1fr 1fr}.option-card,.advanced-card{grid-column:1/-1}.markdown-editor{min-height:520px}}
	@media(max-width:720px){.editor-commandbar{align-items:flex-start}.command-actions{overflow:auto}.command-left div{display:none}.editor-layout{padding-top:12px}.document-card{padding:16px}.path-heading{display:grid}.path-heading code{max-width:100%}.path-fields,.date-grid,.meta-column{grid-template-columns:1fr}.option-card,.advanced-card{grid-column:auto}.markdown-editor{min-height:460px;padding:16px}.preview-sheet{padding:24px 18px}.preview-sheet h1{font-size:25px}}
</style>
