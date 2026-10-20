// 一次性机械迁移：用 AST 定位导出配置的初始化表达式，保留原文件注释。
import ts from "typescript";
import { readFileSync, writeFileSync } from "node:fs";
const targets = {
	siteConfig: ["siteConfig"], backgroundWallpaper: ["backgroundWallpaper"],
	sidebarConfig: ["sidebarLayoutConfig"], navBarConfig: ["navBarConfig", "navBarSearchConfig"],
	profileConfig: ["profileConfig"], announcementConfig: ["announcementConfig"],
	musicConfig: ["musicPlayerConfig"], effectsConfig: ["sakuraConfig", "snowConfig"],
	pioConfig: ["spineModelConfig", "live2dWidgetConfig"], desktopPetConfig: ["desktopPetConfig"],
	commentConfig: ["commentConfig"], coverImageConfig: ["coverImageConfig"],
	dynamicConfig: ["dynamicConfig"], friendsConfig: ["friendsPageConfig", "friendsConfig"],
	bookmarksConfig: ["bookmarksPageConfig"], booknavConfig: ["booknavPageConfig", "booknavConfig"],
	galleryConfig: ["galleryConfig"], sponsorConfig: ["sponsorConfig"],
	footerConfig: ["footerConfig"], fontConfig: ["fontConfig"], adConfig: ["adConfig1", "adConfig2"],
};
for (const [file, names] of Object.entries(targets)) {
	const path = new URL(`../src/config/${file}.ts`, import.meta.url);
	let source = readFileSync(path, "utf8");
	if (source.includes('from "./admin-runtime"')) continue;
	const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
	const edits = [];
	for (const stmt of ast.statements) {
		if (!ts.isVariableStatement(stmt)) continue;
		for (const decl of stmt.declarationList.declarations) {
			if (ts.isIdentifier(decl.name) && names.includes(decl.name.text) && decl.initializer) {
				edits.push({ start: decl.initializer.getStart(ast), end: decl.initializer.end, name: decl.name.text });
			}
		}
	}
	for (const edit of edits.sort((a, b) => b.start - a.start)) {
		source = source.slice(0, edit.start) + `applyAdminConfig("${edit.name}", ` + source.slice(edit.start, edit.end) + ")" + source.slice(edit.end);
	}
	writeFileSync(path, 'import { applyAdminConfig } from "./admin-runtime";\n' + source);
}
