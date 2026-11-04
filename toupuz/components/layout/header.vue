<!-- ===================================================================
     共通ヘッダー（ツール名・バージョン・メニューボタン）
     使い方: <layout-header @menu-click="menuOpen = !menuOpen"></layout-header>
     ページ固有の情報は持たない
     =================================================================== -->
<template>
	<v-app-bar color="primary" density="comfortable" flat>
		<v-app-bar-title>
			{{ title }}
			<span class="app-version text-caption ml-2" style="opacity:.8">ver {{ version }}</span>
		</v-app-bar-title>
		<template v-slot:append>
			<v-btn icon="mdi-menu" aria-label="メニュー" title="メニュー" @click="$emit('menu-click')"></v-btn>
		</template>
	</v-app-bar>
</template>

<script>
export default {
	emits: ['menu-click'],
	setup() {
		return {
			title: TouPuz.APP_TITLE,
			version: TouPuz.APP_VERSION,
		};
	},
};
</script>

<style>
.v-app-bar-title { font-weight: 700; }

/* ===== スマホ幅 ===== */
@media (max-width: 599px) {
	/* ヘッダー: タイトルを少し小さくし、バージョンはタイトルの下の行に表示 */
	.v-app-bar-title { font-size: 1.1rem; line-height: 1.25; }
	.v-app-bar-title .app-version { display: block; margin-left: 0 !important; line-height: 1.2; }
	/* 右側のボタン（メニュー）を少し小さくして、タイトルの幅を確保 */
	.v-app-bar .v-toolbar__append { margin-inline-end: 4px; }
	.v-app-bar .v-toolbar__append .v-btn { width: 40px; height: 40px; }
	.v-app-bar .v-toolbar-title { margin-inline-start: 12px; }
}
@media (max-width: 419px) {
	/* 一般的なスマホ幅ではタイトルが切れないよう、もう一段小さくする */
	.v-app-bar-title { font-size: .98rem; }
}
@media (max-width: 359px) {
	/* さらに狭い端末 */
	.v-app-bar-title { font-size: .85rem; }
}
</style>
