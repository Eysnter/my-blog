<script lang="ts">
import { onMount } from "svelte";

interface AccountUser {
	id: string;
	username: string;
	role: "owner" | "editor";
	created_at: number;
	last_login_at?: number;
	password_changed_at?: number;
}
interface Session {
	hash: string;
	created_at: number;
	expires_at: number;
	user_agent: string;
	current: boolean;
}
let {
	request,
	notify,
	fail,
}: {
	request: (path: string, init?: RequestInit) => Promise<any>;
	notify: (text: string) => void;
	fail: (reason: unknown) => void;
} = $props();
let user = $state<AccountUser | null>(null);
let sessions = $state<Session[]>([]);
let loading = $state(true);
let saving = $state(false);
let revoking = $state("");
let currentPassword = $state("");
let newPassword = $state("");
let confirmPassword = $state("");
let showPasswords = $state(false);
let validation = $state("");
let submitStatus = $state("");

onMount(() => {
	void load();
});

async function load() {
	loading = true;
	try {
		const result = await request("/api/admin/account");
		user = result.user;
		sessions = result.sessions ?? [];
	} catch (reason) {
		fail(reason);
	} finally {
		loading = false;
	}
}

function date(value?: number) {
	if (!value) return "暂无记录";
	return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function device(agent: string) {
	const system = /Android/i.test(agent)
		? "Android"
		: /iPhone|iPad/i.test(agent)
			? "iOS"
			: /Windows/i.test(agent)
				? "Windows"
				: /Macintosh|Mac OS/i.test(agent)
					? "macOS"
					: /Linux/i.test(agent)
						? "Linux"
						: "未知设备";
	const browser = /Edg\//i.test(agent)
		? "Edge"
		: /Firefox\//i.test(agent)
			? "Firefox"
			: /Chrome|CriOS/i.test(agent)
				? "Chrome"
				: /Safari/i.test(agent)
					? "Safari"
					: "浏览器";
	return `${system} · ${browser}`;
}

async function changePassword() {
	if (saving) return;
	validation = "";
	submitStatus = "";
	if (!currentPassword) {
		validation = "请输入当前密码";
		return;
	}
	if (newPassword.length < 12 || newPassword.length > 256) {
		validation = "新密码需要 12–256 个字符";
		return;
	}
	if (newPassword === currentPassword) {
		validation = "新密码不能与当前密码相同";
		return;
	}
	if (newPassword !== confirmPassword) {
		validation = "两次输入的新密码不一致";
		return;
	}
	saving = true;
	try {
		await request("/api/admin/account", {
			method: "PATCH",
			body: JSON.stringify({ currentPassword, newPassword }),
		});
		currentPassword = "";
		newPassword = "";
		confirmPassword = "";
		showPasswords = false;
		submitStatus = "密码已更新，其他设备的登录会话已退出。";
		notify("密码已更新");
		await load();
	} catch (reason) {
		validation = reason instanceof Error ? reason.message : String(reason);
		fail(reason);
	} finally {
		saving = false;
	}
}

async function revoke(session: Session) {
	if (session.current || revoking) return;
	if (
		!confirm(
			`退出「${device(session.user_agent)}」上的登录会话？该设备下次访问后台需要重新登录。`,
		)
	)
		return;
	revoking = session.hash;
	try {
		await request(
			`/api/admin/sessions?hash=${encodeURIComponent(session.hash)}`,
			{ method: "DELETE" },
		);
		sessions = sessions.filter((item) => item.hash !== session.hash);
		notify("该设备的登录会话已退出");
	} catch (reason) {
		fail(reason);
	} finally {
		revoking = "";
	}
}
</script>

<section class="account-workspace" aria-labelledby="account-heading">
	<div class="section-head">
		<p class="eyebrow">个人设置</p>
		<h2 id="account-heading">账户与安全</h2>
		<p class="muted">查看账户信息、更新密码，管理已经登录的设备。</p>
	</div>

	{#if loading && !user}
		<div class="panel empty" role="status">正在加载账户信息…</div>
	{:else if user}
		<div class="account-layout">
			<div class="profile-column">
				<section class="panel profile-card" aria-labelledby="profile-heading">
					<div class="avatar" aria-hidden="true">{user.username.slice(0, 1).toUpperCase()}</div>
					<h3 id="profile-heading">{user.username}</h3>
					<span class="role">{user.role === "owner" ? "站点管理员" : "内容编辑"}</span>
					<dl class="account-details">
						<div><dt>用户名</dt><dd>{user.username}</dd></div>
						<div><dt>创建时间</dt><dd>{date(user.created_at)}</dd></div>
						<div><dt>最近登录</dt><dd>{date(user.last_login_at)}</dd></div>
						<div><dt>密码更新时间</dt><dd>{date(user.password_changed_at)}</dd></div>
					</dl>
					<p class="profile-note">此账户用于登录博客管理后台。</p>
				</section>
			</div>

			<div class="settings-column">
				<section class="panel password-card" aria-labelledby="password-heading">
					<header><h3 id="password-heading">修改密码</h3><p>更改后保留当前登录，并退出其他设备。</p></header>
					<form onsubmit={(event) => { event.preventDefault(); void changePassword(); }}>
						<label for="account-current-password">当前密码<input id="account-current-password" class="input" type={showPasswords ? "text" : "password"} bind:value={currentPassword} autocomplete="current-password" maxlength="256" required /></label>
						<div class="password-fields">
							<label for="account-new-password">新密码<input id="account-new-password" class="input" type={showPasswords ? "text" : "password"} bind:value={newPassword} autocomplete="new-password" minlength="12" maxlength="256" aria-describedby="password-guidance" required /></label>
							<label for="account-confirm-password">确认新密码<input id="account-confirm-password" class="input" type={showPasswords ? "text" : "password"} bind:value={confirmPassword} autocomplete="new-password" minlength="12" maxlength="256" aria-invalid={Boolean(confirmPassword && newPassword !== confirmPassword)} required /></label>
						</div>
						<div class="password-guidance"><p id="password-guidance">使用至少 12 个字符的密码，避免与其他网站重复。</p><label class="checkbox-label"><input type="checkbox" bind:checked={showPasswords} />显示密码</label></div>
						{#if validation}<p class="form-error" role="alert">{validation}</p>{/if}
						{#if submitStatus}<p class="form-success" role="status">{submitStatus}</p>{/if}
						<div class="form-footer"><button class="button primary" type="submit" disabled={saving}>{saving ? "正在更新…" : "更新密码"}</button></div>
					</form>
				</section>

				<section class="panel sessions-card" aria-labelledby="sessions-heading">
					<header><div><h3 id="sessions-heading">登录设备 <span>{sessions.length}</span></h3><p>退出不再使用的设备，保护你的创作内容。</p></div><button class="icon-button" type="button" title="刷新登录设备" aria-label="刷新登录设备" disabled={loading} onclick={load}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16.4 7a7 7 0 1 0 .2 5M16.5 3v4.5H12"/></svg></button></header>
					{#if !sessions.length}
						<div class="session-empty muted">暂无有效会话。</div>
					{:else}
						<ul class="session-list">
							{#each sessions as session (session.hash)}
								<li>
									<div class="device-icon" aria-hidden="true"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/></svg></div>
									<div class="session-info"><div class="device-title"><strong>{device(session.user_agent)}</strong>{#if session.current}<span class="current-badge">当前设备</span>{/if}</div><p>登录于 {date(session.created_at)}</p><p>有效期至 {date(session.expires_at)}</p></div>
									{#if !session.current}<button class="button secondary revoke-button" type="button" disabled={Boolean(revoking)} onclick={() => revoke(session)}>{revoking === session.hash ? "正在退出…" : "退出登录"}</button>{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</section>
			</div>
		</div>
	{:else}
		<div class="panel empty"><p>暂时无法加载账户信息。</p><button class="button secondary" type="button" onclick={load}>重新加载</button></div>
	{/if}
</section>

<style>
	.account-workspace { display: grid; gap: 24px; }
	.eyebrow { margin: 0 0 7px; color: #966482; font-size: 12px; font-weight: 600; letter-spacing: .06em; }
	h2 { margin: 0; color: #292733; font-size: 24px; font-weight: 650; letter-spacing: -.03em; }
	.section-head p.muted { margin: 9px 0 0; font-size: 13px; }
	.account-layout { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 24px; align-items: start; }
	.profile-card { padding: 28px 24px 22px; text-align: center; }
	.avatar { display: flex; align-items: center; justify-content: center; width: 62px; height: 62px; margin: 0 auto 15px; border: 1px solid #eadfe7; background: #f5eef3; color: #966482; border-radius: 16px; font-size: 25px; font-weight: 550; }
	h3 { margin: 0; color: #37313d; font-size: 15px; font-weight: 600; letter-spacing: -.01em; }
	.profile-card h3 { font-size: 19px; }
	.role { display: inline-block; margin-top: 10px; padding: 4px 9px; border-radius: 5px; background: #f0edf2; color: #83708c; font-size: 10px; }
	.account-details { display: grid; gap: 18px; margin: 27px 0 20px; padding: 23px 0; border-top: 1px solid #edeaf0; border-bottom: 1px solid #edeaf0; text-align: left; }
	.account-details dt { margin-bottom: 5px; color: #938b99; font-size: 11px; }
	.account-details dd { margin: 0; color: #625869; font-size: 12px; overflow-wrap: anywhere; }
	.profile-note { margin: 0; color: #9c93a1; font-size: 11px; line-height: 1.65; }
	.settings-column { display: grid; gap: 24px; min-width: 0; }
	.password-card { padding: 24px; }
	header p { margin: 7px 0 0; color: #938a99; font-size: 12px; line-height: 1.65; }
	form { display: grid; gap: 19px; margin-top: 26px; }
	form label { display: grid; gap: 8px; font-size: 12px; color: #625767; font-weight: 500; }
	form .input { width: 100%; box-sizing: border-box; }
	form > label { max-width: calc(50% - 8px); }
	.password-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
	.password-guidance { display: flex; gap: 16px; align-items: center; justify-content: space-between; margin-top: -6px; }
	.password-guidance p { margin: 0; color: #9a909e; font-size: 11px; line-height: 1.65; }
	.password-guidance .checkbox-label { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; font-size: 11px; cursor: pointer; }
	.checkbox-label input { width: 13px; height: 13px; margin: 0; accent-color: #966482; }
	.form-footer { display: flex; justify-content: flex-end; padding-top: 4px; }
	.form-error, .form-success { margin: 0; padding: 10px 12px; border-radius: 6px; font-size: 12px; line-height: 1.65; }
	.form-error { background: #fcf0f1; color: #a34e5c; }
	.form-success { background: #edf5f1; color: #507764; }
	.sessions-card { padding: 0; overflow: hidden; }
	.sessions-card header { display: flex; justify-content: space-between; align-items: center; padding: 23px 24px; border-bottom: 1px solid #edeaf0; }
	.sessions-card h3 span { padding: 3px 7px; margin-left: 6px; color: #8d7c95; background: #f2eef4; border-radius: 5px; font-size: 10px; vertical-align: middle; }
	.icon-button { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: 1px solid #e8e2eb; border-radius: 7px; color: #8c7a95; background: #fff; cursor: pointer; }
	.icon-button:hover { background: #f7f3f6; }
	.icon-button:disabled { opacity: .5; cursor: wait; }
	.session-list { list-style: none; padding: 0 24px; margin: 0; }
	.session-list li { display: flex; align-items: center; gap: 14px; padding: 20px 0; border-bottom: 1px solid #f0edf2; }
	.session-list li:last-child { border: 0; }
	.device-icon { width: 42px; height: 42px; display: flex; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 9px; background: #f4f1f5; color: #93829b; }
	.session-info { flex: 1; min-width: 0; }
	.device-title { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
	.device-title strong { font-size: 12px; font-weight: 550; color: #5b5063; }
	.current-badge { padding: 3px 6px; border-radius: 4px; background: #edf5ef; color: #64856c; font-size: 9px; }
	.session-info p { margin: 6px 0 0; color: #9b91a1; font-size: 10px; line-height: 1.5; }
	.revoke-button { flex-shrink: 0; padding: 7px 10px; font-size: 11px; }
	.session-empty { padding: 25px; font-size: 13px; }
	@media (max-width: 1100px) { .account-layout { grid-template-columns: 235px minmax(0, 1fr); gap: 18px; } .password-guidance { flex-direction: column; align-items: flex-start; gap: 12px; } }
	@media (max-width: 850px) { .account-layout { grid-template-columns: 1fr; } .profile-card { display: grid; grid-template-columns: 62px 1fr; column-gap: 16px; text-align: left; align-items: center; } .avatar { grid-row: span 2; margin: 0; } .profile-card h3 { align-self: end; } .role { justify-self: start; align-self: start; margin-top: 7px; } .account-details { grid-column: 1/-1; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; } .profile-note { grid-column: 1/-1; } }
	@media (max-width: 540px) { h2 { font-size: 22px; } .section-head p.muted { line-height: 1.75; } .profile-card, .password-card { padding: 20px; } .password-fields { grid-template-columns: 1fr; gap: 19px; } form > label { max-width: none; } .form-footer .button { width: 100%; } .sessions-card header { padding: 20px; } .session-list { padding: 0 20px; } .session-list li { flex-wrap: wrap; gap: 12px; } .device-icon { width: 36px; height: 36px; } .session-info { min-width: calc(100% - 48px); } .revoke-button { margin-left: 48px; } .account-details { grid-template-columns: 1fr; gap: 16px; } }
</style>
