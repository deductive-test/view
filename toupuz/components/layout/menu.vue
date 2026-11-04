<!-- ===================================================================
     共通メニュー（画面の右端から引き出すパネル）と、メニューから開くダイアログ
       ・ページの切り替え（素材計算 / イベント。表示中のページは色付きで選択状態）
       ・インポート / エクスポート（このツールの保存データ全体。中身の意味は各ページが読み込み時に確認する）
       ・報告 / リリースノート / このサイトについて
       ・ライトモード / ダークモードの切り替え
     使い方: <layout-menu v-model="menuOpen" page="calc"></layout-menu>
       v-model: パネルの開閉 / page: 表示中のページ（TouPuz.PAGES の id）
     =================================================================== -->
<template>
	<!-- メニュー。項目を選ぶとパネルを閉じてから各処理を行う -->
	<v-navigation-drawer :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)"
		location="right" temporary width="260">
		<v-list density="comfortable" nav>
			<!-- ページの切り替え。表示中のページの項目は色付きで選択状態にする（押してもパネルを閉じるだけ） -->
			<v-list-item v-for="p in pages" :key="p.id"
				:prepend-icon="p.icon" :title="p.title" color="primary"
				:active="p.id === page"
				:href="p.id === page ? undefined : p.href"
				@click="onPage(p)"></v-list-item>
			<v-divider class="my-2"></v-divider>
			<v-list-item prepend-icon="mdi-tray-arrow-down" title="インポート" @click="onMenu(openImportDialog)"></v-list-item>
			<v-list-item prepend-icon="mdi-tray-arrow-up" title="エクスポート" @click="onMenu(onExport)"></v-list-item>
			<v-list-item prepend-icon="mdi-message-draw" title="報告" @click="onMenu(() => { dialogReport.isShow = true; })"></v-list-item>
			<v-list-item prepend-icon="mdi-note-text-outline" title="リリースノート" @click="onMenu(() => { dialogReleaseNotes.isShow = true; })"></v-list-item>
			<v-list-item prepend-icon="mdi-information-outline" title="このサイトについて" @click="onMenu(() => { dialogAbout.isShow = true; })"></v-list-item>
		</v-list>
		<!-- ライトモード / ダークモードの切り替え（切り替えてもパネルは閉じない） -->
		<div class="theme-switch">
			<v-btn-toggle v-model="themeMode" mandatory divided density="compact"
				variant="outlined" color="primary" class="filter-toggle" aria-label="表示モード">
				<v-btn value="light" aria-label="ライトモード" title="ライトモード"><v-icon icon="mdi-white-balance-sunny"></v-icon></v-btn>
				<v-btn value="dark" aria-label="ダークモード" title="ダークモード"><v-icon icon="mdi-weather-night"></v-icon></v-btn>
			</v-btn-toggle>
		</div>
	</v-navigation-drawer>

	<!-- インポートダイアログ -->
	<v-dialog v-model="dialogImport.isShow" max-width="600" scrollable>
		<v-card>
			<v-card-title class="text-center">インポート</v-card-title>
			<v-divider></v-divider>
			<v-card-text class="text-high-emphasis pt-3">
				<p class="mb-1">「エクスポート」でコピーした設定を貼り付けてください。</p>
				<p class="mb-1 text-medium-emphasis">
					※「エクスポート」すると、設定がテキストとしてクリップボードにコピーされます。メモ帳などに貼り付けて保管しておき、インポートするときはその文字をすべてコピーして下の欄に貼り付けてください。
				</p>
				<p class="mb-4 text-error">インポートすると、現在の設定（所持数など）はすべて上書きされます。</p>
				<v-textarea
					v-model="importText"
					label="設定"
					rows="5"
					clearable
					variant="outlined" density="comfortable"
					hide-details
				></v-textarea>
			</v-card-text>
			<v-divider></v-divider>
			<v-card-actions>
				<v-spacer></v-spacer>
				<v-btn variant="flat" color="grey" prepend-icon="mdi-close" @click="dialogImport.isShow = false">キャンセル</v-btn>
				<v-spacer></v-spacer>
				<v-btn variant="flat" color="accent" prepend-icon="mdi-tray-arrow-down" :disabled="!hasText(importText) || importing" :loading="importing" @click="onImport">インポート</v-btn>
				<v-spacer></v-spacer>
			</v-card-actions>
		</v-card>
	</v-dialog>

	<!-- 報告ダイアログ -->
	<v-dialog v-model="dialogReport.isShow" :persistent="dialogReport.persistent" max-width="600" scrollable>
		<v-card>
			<v-card-title class="text-center">{{ dialogReport.title }}</v-card-title>
			<v-divider></v-divider>
			<v-card-text class="text-high-emphasis pt-3">
				<p class="mb-4">
					追加して欲しいデータ、バグなどの報告がございましたら、こちらから入力をお願い致します。不定期で順次対応していきます。
				</p>
				<v-select
					v-model="reportForm.type"
					:items="reportTypes"
					label="種別"
					variant="outlined" density="comfortable"
					class="mb-2"
					:disabled="reportSending"
				></v-select>
				<v-text-field
					v-model="reportForm.title"
					label="タイトル"
					variant="outlined" density="comfortable"
					class="mb-2"
					clearable
					:maxlength="reportLimits.title" :counter="reportLimits.title"
					:disabled="reportSending"
				></v-text-field>
				<v-textarea
					v-model="reportForm.body"
					label="本文"
					rows="3"
					clearable
					:maxlength="reportLimits.body" :counter="reportLimits.body"
					:disabled="reportSending"
					variant="outlined" density="comfortable"
				></v-textarea>
			</v-card-text>
			<v-divider></v-divider>
			<v-card-actions>
				<v-spacer></v-spacer>
				<v-btn variant="flat" color="grey" prepend-icon="mdi-close" :disabled="reportSending" @click="dialogReport.isShow = false">キャンセル</v-btn>
				<v-spacer></v-spacer>
				<v-btn variant="flat" color="accent" prepend-icon="mdi-send" :disabled="!canSubmitReport" :loading="reportSending" @click="onReportSubmit">&emsp;送信&emsp;</v-btn>
				<v-spacer></v-spacer>
			</v-card-actions>
		</v-card>
	</v-dialog>

	<!-- リリースノートダイアログ -->
	<v-dialog v-model="dialogReleaseNotes.isShow" max-width="600" scrollable>
		<v-card>
			<v-card-title class="text-center">リリースノート</v-card-title>
			<v-divider></v-divider>
			<v-card-text class="text-high-emphasis pt-3">
				<div v-for="(note, i) in releaseNotes" :key="i" class="release-note" :class="{ 'mt-4 pt-4 release-note--sep': i > 0 }">
					<div class="release-note__title">{{ note.title }}</div>
					<div class="release-note__body">{{ note.body }}</div>
				</div>
			</v-card-text>
			<v-divider></v-divider>
			<v-card-actions>
				<v-spacer></v-spacer>
				<v-btn variant="text" @click="dialogReleaseNotes.isShow = false">閉じる</v-btn>
				<v-spacer></v-spacer>
			</v-card-actions>
		</v-card>
	</v-dialog>

	<!-- about ダイアログ -->
	<v-dialog v-model="dialogAbout.isShow" :persistent="dialogAbout.persistent" max-width="600" scrollable>
		<v-card>
			<v-card-title v-if="dialogAbout.title" class="text-center">{{ dialogAbout.title }}</v-card-title>
			<v-card-subtitle v-if="dialogAbout.subtitle" class="text-high-emphasis">{{ dialogAbout.subtitle }}</v-card-subtitle>
			<v-divider></v-divider>
			<v-card-text class="text-high-emphasis pt-3">
				<p>
					スマホアプリゲーム <a href="https://touken-puzzle.com/" target="_blank" rel="noopener">『刀剣乱舞 ぱずぎり』</a> の攻略を目的としたWEBツールです。
				</p>
				<p>
					合成したいアイテムと、現在の所持アイテム数を入力すると、合成アイテムに必要な素材を得るために最も周回すべきマップを表示します。
					<br><span class="muted">※周回マップで必ずしもアイテムがドロップするとは限りません。ドロップ率や法則などは未確定です。</span>
					<br><span class="muted">※不足しているアイテムのうち、複数種類を同時に狙えること、不足数量、取得可能な場所の少なさをもとに計算した優先度で重み付けしています。</span>
				</p>
				<br>
				<p>
					アイテムやレシピは順次追加していきます。
					<br>現在の設定値を確認したい場合は、それぞれ以下よりご確認ください。
				</p>
				<ul>
					<li><a href="data/item.json" target="_blank" rel="noopener">アイテムマスタ</a> - ドロップアイテム、合成アイテムを管理</li>
					<li><a href="data/map.json" target="_blank" rel="noopener">マップマスタ</a> - 各マスごとのアイテムドロップを管理</li>
					<li><a href="data/bom.json" target="_blank" rel="noopener">レシピマスタ</a> - 合成アイテムのレシピを管理</li>
					<li><a href="data/sword.json" target="_blank" rel="noopener">刀剣男士マスタ</a> - 刀剣男士のIDと名前を管理</li>
					<li><a href="data/sword_recipe.json" target="_blank" rel="noopener">刀剣男士レシピマスタ</a> - 刀剣男士の強化段階ごとに必要なアイテムを管理</li>
					<li><a href="data/event.json" target="_blank" rel="noopener">イベントマスタ</a> - イベントの期間と報酬を管理</li>
				</ul>
				<br>
				<p>
					このサイトでは報告を受け付けています。
					<br>追加してほしいデータ、バグ報告などがございましたら、「報告」からお送りください。
					<br><span class="muted">※報告者の個人情報(ブラウザのログイン情報、IPアドレス、位置情報など)が送信されることはありません。</span>
					<br><span class="muted">※個人の趣味で設置しておりますので、状況に応じて報告機能を制限することがあります。</span>
				</p>
				<br>
				<p>
					アクセス数の把握のため、Cloudflare Web Analytics を使用しています（Cookie は使用せず、個人を特定する情報は収集しません）。
				</p>
				<br>
				<p class="muted">Author: <a href="https://x.com/deductive_test" target="_blank" rel="noopener">@deductive_test</a></p>
				<p class="muted">Last Update: {{lastModified}}</p>
			</v-card-text>
			<v-divider></v-divider>
			<v-card-actions>
				<v-spacer></v-spacer>
				<v-btn variant="text" @click="dialogAbout.isShow = false">閉じる</v-btn>
				<v-spacer></v-spacer>
			</v-card-actions>
		</v-card>
	</v-dialog>

	<!-- メニューの処理の結果（インポート・エクスポート・報告）を知らせる -->
	<v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="snackbar.timeout" location="bottom">
		<span class="pre-line">{{ snackbar.text }}</span>
	</v-snackbar>
</template>

<script>
const { ref, reactive, computed, watch, onMounted } = Vue;

export default {
	props: {
		modelValue: { type: Boolean, default: false },  // パネルの開閉
		page: { type: String, default: '' },            // 表示中のページ（TouPuz.PAGES の id）
	},
	emits: ['update:modelValue'],
	setup(props, { emit }) {
		const snackbar = reactive({ show: false, text: '', color: 'error', timeout: 5000 });
		const showSnack = (text, color = 'error', timeout = 5000) => {
			snackbar.text = text;
			snackbar.color = color;
			snackbar.timeout = timeout;
			snackbar.show = true;
		};
		const hasText = (v) => typeof v === 'string' && v.trim() !== '';

		/** メニュー項目の選択: パネルを閉じてから処理を行う */
		const onMenu = (action) => {
			emit('update:modelValue', false);
			action();
		};

		/** ページの項目: 別のページはリンク（href）で移動する。表示中のページはパネルを閉じるだけ */
		const onPage = (p) => {
			emit('update:modelValue', false);
		};

		// 表示モード（メニュー下部の切り替え。選んだモードはこのブラウザに保存する）
		const theme = Vuetify.useTheme();
		const themeMode = ref(theme.global.name.value === 'dark' ? 'dark' : 'light');
		watch(themeMode, (mode) => {
			if (mode !== 'light' && mode !== 'dark') return;
			if (typeof theme.change === 'function') theme.change(mode);
			else theme.global.name.value = mode;
			TouPuz.saveThemeMode(mode);
		});

		// リリースノートダイアログ
		const dialogReleaseNotes = reactive({ isShow: false });

		// about ダイアログ
		const dialogAbout = reactive({
			isShow: false,
			persistent: false,
			title: 'このサイトについて',
			subtitle: '',
		});

		// about ダイアログの最終更新日時（画面を読み込んだ時点の document.lastModified）
		const lastModified = TouPuz.formatDateTime(new Date(document.lastModified));

		// ----- エクスポート・インポート -----

		const dialogImport = reactive({ isShow: false });
		const importText = ref('');  // 貼り付けられた設定
		const importing = ref(false);

		/** エクスポート: このツールの保存データ（表示モードを除く）をクリップボードにコピー */
		async function onExport() {
			let data = null;
			try {
				data = TouPuz.buildExportData(window.localStorage);
			} catch (e) {
				console.warn('[エクスポート] 保存データを読み取れませんでした:', e);
			}
			if (!data) {
				showSnack('エクスポートする設定がありません');
				return;
			}
			if (await TouPuz.copyToClipboard(JSON.stringify(data))) {
				// ファイルが保存されたと誤解されないよう、クリップボードへのコピーであることと使い方を長めに表示する
				showSnack('設定をクリップボードにコピーしました（ファイルは作成されません）。\n' +
					'メモ帳などに貼り付けて保管し、インポート時にその文字を貼り付けてください。', 'success', 10000);
			} else {
				showSnack('設定のコピーに失敗しました');
			}
		}

		/** インポートダイアログを開く（前回の入力は残さない） */
		function openImportDialog() {
			importText.value = '';
			dialogImport.isShow = true;
		}

		/**
		 * インポート: 貼り付けられた設定を検証し、問題なければ保存データを置き換えて、ページを読み込み直す。
		 * 所持数のアイテムIDを確認するため、アイテムマスタを読み込む。
		 */
		async function onImport() {
			importing.value = true;
			try {
				let itemIds;
				try {
					const items = await TouPuz.loadJson(TouPuz.ITEM_DATA_FILE);
					itemIds = new Set(Array.isArray(items) ? items.filter((it) => it && typeof it.id === 'string').map((it) => it.id) : []);
				} catch (e) {
					console.warn('[インポート] アイテムマスタを読み込めませんでした:', e && e.message ? e.message : e);
					showSnack('設定のインポートに失敗しました');
					return;
				}
				const parsed = TouPuz.parseImportText(importText.value, itemIds);
				if (!parsed.ok) {
					console.warn('[インポート] 採用できない内容です:', parsed.reason);
					showSnack('設定のインポートに失敗しました');
					return;
				}
				if (!TouPuz.applyImport(parsed, window.localStorage)) {
					showSnack('設定をブラウザに保存できませんでした。プライベートモードやストレージの設定を確認してください。');
					return;
				}
				// 各ページは読み込み時に保存データを確認して使うので、読み込み直して反映する
				TouPuz.setFlash('設定をインポートしました');
				location.reload();
			} finally {
				importing.value = false;
			}
		}

		// ----- 報告 -----

		const dialogReport = reactive({
			isShow: false,
			persistent: false,
			title: '報告',
		});
		// 報告フォームの入力内容（ダイアログを閉じても、送信するまでは入力を残す）
		const reportForm = reactive({
			type: null,   // 種別（REPORT_TYPES のいずれか）
			title: '',    // タイトル（1行）
			body: '',     // 本文（複数行）
		});

		/**
		 * 報告を送信できるか。
		 * 種別は必須、タイトルか本文の少なくとも一方に入力が必要。
		 * 空白だけの入力や、消去ボタン（×）で値なし（null）になった欄は未入力として扱う。
		 */
		const reportSending = ref(false);  // 送信中（二重送信防止・入力欄の無効化に使う）
		const canSubmitReport = computed(() =>
			!reportSending.value &&
			TouPuz.REPORT_TYPES.includes(reportForm.type) && (hasText(reportForm.title) || hasText(reportForm.body)));

		/** 報告の送信: 成功したら入力を消してダイアログを閉じる。失敗したら入力を残したまま知らせる */
		async function onReportSubmit() {
			if (!canSubmitReport.value) return;
			reportSending.value = true;
			try {
				const res = await TouPuz.postReport({
					type: reportForm.type,
					title: hasText(reportForm.title) ? reportForm.title : '',
					body: hasText(reportForm.body) ? reportForm.body : '',
				});
				if (res.ok) {
					showSnack(res.message || '報告を受け付けました。', 'success');
					reportForm.type = null;
					reportForm.title = '';
					reportForm.body = '';
					dialogReport.isShow = false;
				} else {
					// 利用者にはざっくり表示し、原因（エラーコード）は開発者ツールのコンソールにだけ出す
					console.warn('[報告] 送信に失敗しました:', res.code);
					showSnack('エラーが発生しました');
				}
			} finally {
				reportSending.value = false;
			}
		}

		// インポート後の読み込み直しなど、前のページから預かったメッセージがあれば表示する
		onMounted(() => {
			const flash = TouPuz.takeFlash();
			if (flash) showSnack(flash.text, flash.color);
		});

		return {
			pages: TouPuz.PAGES, onMenu, onPage, themeMode,
			snackbar, hasText,
			dialogImport, importText, importing, openImportDialog, onImport, onExport,
			dialogReport, reportForm, reportTypes: TouPuz.REPORT_TYPES, reportLimits: TouPuz.REPORT_LIMITS,
			reportSending, canSubmitReport, onReportSubmit,
			dialogReleaseNotes, releaseNotes: TouPuz.RELEASE_NOTES,
			dialogAbout, lastModified,
		};
	},
};
</script>

<style>
/* ライト/ダークの切り替え: メニュー項目の下に、パネルの幅いっぱいで置く */
.theme-switch { padding: 4px 16px 16px; }
/* リリースノート: 本文は \n で改行し、長い行は折り返す */
.release-note__title { font-weight: 700; }
.release-note__body { margin-top: 4px; white-space: pre-line; overflow-wrap: anywhere; }
.release-note--sep { border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); }
</style>
