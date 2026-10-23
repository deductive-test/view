/* ===================================================================
   calc.html / event.html で共通に使う設定と処理
   （ヘッダー・メニューの部品 components/layout/*.vue からも使う）
   読み込み順: jQuery → Vue → Vuetify → vue3-sfc-loader → このファイル
   =================================================================== */
const TouPuz = (() => {
	'use strict';

	// ---------------------------------------------------------------
	// 定数
	// ---------------------------------------------------------------

	/** ツール名とバージョン（ヘッダーに表示） */
	const APP_TITLE = '刀剣乱舞 ぱずぎり 素材計算ツール';
	const APP_VERSION = '1.1.0';

	/**
	 * メニューの先頭に出すページ（どのページでも常に表示し、表示中のページを色付きで選択状態にする）。
	 *   id  : 各ページが layout-menu の page に渡す値
	 *   href: ページの相対パス（calc.html と同じ階層に置く）
	 */
	const PAGES = Object.freeze([
		Object.freeze({ id: 'calc', title: '素材計算', icon: 'mdi-calculator-variant-outline', href: 'calc.html' }),
		Object.freeze({ id: 'event', title: 'イベント', icon: 'mdi-flag-checkered', href: 'event.html' }),
	]);

	/** このツールが localStorage に保存するキーの接頭辞（エクスポートの対象を見分けるのに使う） */
	const STORAGE_PREFIX = 'toupuzCalc.';
	/** localStorage のキー */
	const STORAGE_KEYS = Object.freeze({
		inventory: 'toupuzCalc.itemInventory',      // 所持数（アイテムID → 所持数）
		eventProgress: 'toupuzCalc.eventProgress',  // イベントの進捗（event.html が使う）
		theme: 'toupuzCalc.theme',                  // 表示モード（'light' / 'dark'）
	});
	/** 端末ごとの好みなので、エクスポート・インポートの対象にしないキー */
	const EXPORT_EXCLUDED_KEYS = Object.freeze([STORAGE_KEYS.theme]);
	/** インポート後の再読み込みをまたいで、完了メッセージを渡すための sessionStorage のキー */
	const FLASH_KEY = 'toupuzCalc.flash';

	/**
	 * リリースノート（新しいものを先頭に追加する）。
	 *   title: 1行目（日付とバージョンなど）
	 *   body : 本文。\n で改行できる。長い行は画面幅に合わせて自動で折り返す
	 */
	const RELEASE_NOTES = Object.freeze([
		{
			title: '2026/10/21(水) ver 1.1.0',
			body: '・イベントページ(event.html)を追加(メニューから切替)'
				+ '\n・レシピ追加：太郎太刀10→20/20→30'
				+ '\n・刀剣男士の育成素材以外のアイテムを所持数の入力欄に追加(宝玉・経験値の書など)'
		},
		{
			title: '2026/10/20(火) ver 1.0.7',
			body:'・所持数欄に小判の在庫管理を追加(出陣中タブでも入力可能)'
				+ '\n・レシピ追加：R乱藤四郎30→35、秋田藤四郎30→35、陸奥守吉行(勇気百寸)10→20/20→30'
				+ '\n・アイテム表示順、刀剣男士一覧の微調整'
		},
		{
			title: '2026/10/15(木) ver 1.0.6',
			body: '・問合せ対応：レシピ追加：R歌仙30→35、R今剣10→20'
		},
		{
			title: '2026/10/12(木) ver 1.0.5',
			body: '・問合せ対応：インポート/エクスポートの説明を明記'
				+ '\n・レシピ追加'
		},
		{
			title: '2026/10/08(木) ver 1.0.4',
			body: '・問合せ対応：一部アイテムの表示順に対する報告の反映'
						+'\n・アイテムv-selectの「作成品」「素材」グルーピングを廃止、ゲーム内表示と同じ表示順に換装'
						+'\n・タブ(v-tabs)をタブっぽい見た目に調整'
						+'\n・ライトモード/ダークモードの手動切替'
		},
		{
			title: '2026/10/07(水) ver 1.0.3',
			body: '目標設定に「刀剣男士」タブを追加\n' +
				'刀剣男士の強化段階を選ぶと、必要なアイテムを目標に合算',
		},
		{
			title: '2026/10/01(木) ver 1.0.2',
			body: '出陣マップに絞った所有量記録機能',
		},
		{
			title: '2026/09/30(水) ver 1.0.1',
			body: '目標アイテムの複数選択機能を追加\n' +
				'所持アイテム入力のインポート・エクスポート機能を追加',
		},
		{
			title: '2026/09/29(火) ver 1.0.0',
			body: 'リリース',
		},
	]);

	const REPORT_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxKIBuPLyoC6jIKFFY24brWgw3gHNXfiEK4uS5QJnS-G8awfbBmd8AR_buZnzZQj7Un/exec';

	/** 報告の種別（報告ダイアログの選択肢）。GAS 側の CONFIG.TYPES と必ず揃える */
	const REPORT_TYPES = Object.freeze(['アイテム', 'レシピ', 'その他']);

	/** 報告の最大文字数。GAS 側の CONFIG.MAX_TITLE / MAX_BODY と揃える */
	const REPORT_LIMITS = Object.freeze({ title: 100, body: 2000 });

	/** 報告送信の待ち時間の上限（ミリ秒） */
	const REPORT_TIMEOUT_MS = 20000;

	/** アイテムマスタ（インポート時の所持数の確認に使う。calc.html からの相対パス） */
	const ITEM_DATA_FILE = 'data/item.json';

	/** インポートで受け付ける文字数の上限（貼り付けミスで巨大な文字列が来た場合に備える） */
	const IMPORT_MAX_LENGTH = 100000;

	/** ver 1.1.0 開発中の形式で、イベントの進捗を入れていた予約キー（インポートの互換のためだけに使う） */
	const LEGACY_EVENT_EXPORT_KEY = '_eventProgress';

	// ---------------------------------------------------------------
	// 汎用ヘルパー
	// ---------------------------------------------------------------

	const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
	const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

	/** 非負整数の入力か */
	const isNonNegativeIntegerText = (text) => /^\d+$/.test(text) && Number.isSafeInteger(Number(text));

	/**
	 * 日時を「2026/09/29(火) 17:58:23」の形式にする（閲覧者の端末の時刻で表示）。
	 * 日時として解釈できない場合は空文字を返す。
	 */
	function formatDateTime(date) {
		if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
		const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
		const pad = (n) => String(n).padStart(2, '0');
		return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}` +
			`(${WEEKDAYS[date.getDay()]}) ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
	}

	// ---------------------------------------------------------------
	// データ読み込み（jQuery）
	// ---------------------------------------------------------------

	/** JSONを相対パスで読み込む */
	function loadJson(path) {
		return new Promise((resolve, reject) => {
			$.ajax({ url: path, dataType: 'json', cache: false })
				.done((data) => resolve(data))
				.fail((xhr, status) => {
					const detail = status === 'parsererror'
						? 'JSONの書式が正しくありません'
						: `読み込めませんでした${xhr.status ? `（HTTP ${xhr.status}）` : ''}`;
					reject(new Error(`${path}: ${detail}。`));
				});
		});
	}

	// ---------------------------------------------------------------
	// .vue ファイルの読み込み（vue3-sfc-loader）
	// ---------------------------------------------------------------

	/** vue3-sfc-loader の設定 */
	const sfcOptions = {
		moduleCache: { vue: typeof Vue !== 'undefined' ? Vue : null },  // Node.js でのテスト時は Vue がない
		async getFile(url) {
			const res = await fetch(url);
			if (!res.ok) throw new Error(`${url}: 読み込めませんでした（HTTP ${res.status}）。`);
			const text = await res.text();
			// キャッシュ回避の「?_=…」が付いていても .vue として扱われるよう、種類を明示する
			return { getContentData: () => text, type: '.' + url.split('?')[0].split('.').pop() };
		},
		addStyle(css) {
			const style = document.createElement('style');
			style.textContent = css;
			document.head.appendChild(style);
		},
	};

	/**
	 * .vue ファイルを非同期コンポーネントとして読み込む（httpVueLoader の Vue 3 版の使い方）。
	 * 例: components: { 'layout-header': TouPuz.vueLoader(`components/layout/header.vue?_=${Date.now()}`) }
	 * データの読み込み後に初めて表示する部品（所持数カードなど）でも表示が遅れないよう、呼んだ時点で読み込みを始める。
	 */
	const vueLoader = (url) => {
		const loading = window['vue3-sfc-loader'].loadModule(url, sfcOptions);
		// 表示する前に失敗した場合の「未処理の Promise」の警告を抑える（エラーは表示するときに defineAsyncComponent 側で扱う）
		loading.catch(() => {});
		return Vue.defineAsyncComponent(() => loading);
	};

	// ---------------------------------------------------------------
	// 所持数（calc.html / event.html で共通の保存データ。入力欄は components/parts/inventory-card.vue）
	// ---------------------------------------------------------------

	/** 数量の入力欄の検証ルール（Vuetify の rules に渡す）。空欄は0として扱うので許可する */
	const qtyRule = (v) => {
		const text = v == null ? '' : String(v).trim();
		return text === '' || isNonNegativeIntegerText(text) || '0以上の整数で入力してください';
	};

	/** アイテム名の検索条件（大文字・小文字を区別しない部分一致）。キーワードが空ならすべて一致 */
	function itemKeywordMatcher(keyword) {
		const kw = (keyword || '').trim().toLowerCase();
		return (it) => !kw || it.text.toLowerCase().includes(kw);
	}

	/**
	 * 保存済み所持数の整理。
	 * valid : アイテムマスタに存在するIDの、0以上の整数値のみ（計算に使用）
	 * extras: アイテムマスタに存在しないID（計算には使わないが、保存データからは消さずに残す）
	 * nameMap: アイテムマスタのID（has を持つ Map / Set）
	 */
	function sanitizeInventory(raw, nameMap) {
		const valid = {};
		const extras = {};
		if (!isPlainObject(raw)) return { valid, extras };
		for (const [id, v] of Object.entries(raw)) {
			if (!nameMap.has(id)) { extras[id] = v; continue; }
			if (Number.isSafeInteger(v) && v >= 0) valid[id] = v;
		}
		return { valid, extras };
	}

	/** 所持数を復元する。壊れたデータや存在しないIDは計算に使わない */
	function loadInventory(nameMap) {
		let raw = null;
		try {
			const text = window.localStorage.getItem(STORAGE_KEYS.inventory);
			raw = text ? JSON.parse(text) : null;
		} catch (e) {
			raw = null;
		}
		return sanitizeInventory(raw, nameMap);
	}

	/** 所持数を保存する。アイテムマスタにない古いIDの値も消さずに書き戻す */
	function saveInventory(inventory, extras) {
		try {
			window.localStorage.setItem(STORAGE_KEYS.inventory, JSON.stringify({ ...extras, ...inventory }));
			return true;
		} catch (e) {
			return false;
		}
	}

	/**
	 * 所持数の状態（画面の入力欄と保存データをつなぐ）。1ページに1つだけ作り、所持数カードと他の処理で共有する。
	 *   inventory: アイテムID → 所持数（保存済みの確定値。リアクティブ）
	 *   inputs   : アイテムID → 入力欄の文字列（リアクティブ）
	 *   restore(nameMap, itemIds): アイテムマスタの読み込み後に、保存データから復元する（保存がないアイテムは0）
	 *   reload() : 保存データを読み直して表示に反映する（別のタブで保存された・このページで保存データを直接書き換えた後など）
	 *   input(id, value): 入力欄の入力。正しい値ならすぐ保存し、不正な値は保存しない。保存に失敗したら false
	 */
	function createInventoryState() {
		const inventory = Vue.reactive({});
		const inputs = Vue.reactive({});
		let extras = {};           // アイテムマスタにない古いID（保存時に残すだけ）
		let nameMap = null;        // restore 前は null（reload しない）

		/** 確定値と入力欄の文字列を設定する（0 は空欄で表示し、placeholder の「0」を見せる） */
		const setValue = (valid, id) => {
			inventory[id] = hasOwn(valid, id) ? valid[id] : 0;
			inputs[id] = hasOwn(valid, id) && valid[id] !== 0 ? String(valid[id]) : '';
		};

		function restore(map, itemIds) {
			nameMap = map;
			const loaded = loadInventory(nameMap);
			extras = loaded.extras;
			for (const id of itemIds) setValue(loaded.valid, id);
		}

		function reload() {
			if (!nameMap) return;
			const loaded = loadInventory(nameMap);
			extras = loaded.extras;
			for (const id of Object.keys(inventory)) setValue(loaded.valid, id);
		}

		function input(id, value) {
			const text = value == null ? '' : String(value).trim();
			inputs[id] = text;
			if (text === '') inventory[id] = 0;
			else if (isNonNegativeIntegerText(text)) inventory[id] = Number(text);
			else return true;
			return saveInventory({ ...inventory }, extras);
		}

		return { inventory, inputs, restore, reload, input };
	}

	// ---------------------------------------------------------------
	// 表示モード（ライト / ダーク）
	// ---------------------------------------------------------------

	/** 表示モードを復元する。保存がない・読めないときはライトモード */
	function loadThemeMode() {
		try {
			return window.localStorage.getItem(STORAGE_KEYS.theme) === 'dark' ? 'dark' : 'light';
		} catch (e) {
			return 'light';
		}
	}

	/** 表示モードを保存する（保存できなくても切り替え自体はできる） */
	function saveThemeMode(mode) {
		try {
			window.localStorage.setItem(STORAGE_KEYS.theme, mode);
		} catch (e) {
			console.warn('[表示モード] 保存に失敗しました:', e);
		}
	}

	/** Vuetify の作成（初期はライトモード。メニューで切り替えたモードがあればそれを使う） */
	function createVuetify() {
		return Vuetify.createVuetify({
			theme: {
				defaultTheme: loadThemeMode(),
				themes: {
					// 配色: ヘッダー=オレンジ / 背景=薄い黄色 / アクセント=黄緑（刀剣乱舞ぱずぎり公式サイトの印象に合わせる）
					light: {
						colors: {
							primary: '#d9661a',      // オレンジ（ヘッダー・選択状態）
							'on-primary': '#ffffff',
							accent: '#8cc63f',       // 黄緑（計算ボタン・「ここだけ」）
							'on-accent': '#1f2d0a',
							link: '#b3500f',         // 濃いオレンジ（aタグのリンク）
							background: '#fdf6d8',   // 薄い黄色（ページ背景）
							surface: '#fffdf4',      // カード
							info: '#3d7a8c',
						},
					},
					dark: {
						colors: {
							primary: '#f0914a',
							'on-primary': '#1d1206',
							accent: '#a6d65f',
							'on-accent': '#15200a',
							link: '#f39c5a',
							background: '#1d1a12',
							surface: '#29251a',
							info: '#8cc3d1',
						},
					},
				},
			},
		});
	}

	// ---------------------------------------------------------------
	// 報告の送信（GAS ウェブアプリ）
	// ---------------------------------------------------------------

	/**
	 * 報告を GAS に送信し、{ ok, code, message } を返す（例外は投げない）。
	 * Content-Type を指定せずに文字列を送る（text/plain 扱い）ことで、
	 * 別ドメインへの送信時に事前確認（preflight）が発生せず、GAS でも受け取れる。
	 */
	async function postReport(payload) {
		if (!REPORT_ENDPOINT) return { ok: false, code: 'endpoint_not_set' };
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), REPORT_TIMEOUT_MS);
		try {
			const res = await fetch(REPORT_ENDPOINT, {
				method: 'POST',
				body: JSON.stringify(payload),
				signal: controller.signal,
			});
			if (!res.ok) return { ok: false, code: `http_${res.status}` };
			let data;
			try {
				data = await res.json();
			} catch (e) {
				return { ok: false, code: 'bad_response' };  // JSON以外（GASのエラーページ等）が返ってきた
			}
			if (!data || typeof data !== 'object') return { ok: false, code: 'bad_response' };
			return { ok: data.ok === true, code: String(data.code || ''), message: String(data.message || '') };
		} catch (e) {
			return { ok: false, code: e && e.name === 'AbortError' ? 'timeout' : 'network_error' };
		} finally {
			clearTimeout(timer);
		}
	}

	// ---------------------------------------------------------------
	// クリップボード
	// ---------------------------------------------------------------

	/**
	 * 文字列をクリップボードにコピーし、成功したら true を返す。
	 * 通常は Clipboard API を使い、使えない環境（http で開いた場合など）では
	 * 一時的なテキストエリア経由の旧来の方法で試す。
	 */
	async function copyToClipboard(text) {
		try {
			if (navigator.clipboard && window.isSecureContext) {
				await navigator.clipboard.writeText(text);
				return true;
			}
		} catch (e) {
			console.warn('[エクスポート] Clipboard API でのコピーに失敗しました:', e);
		}
		try {
			const ta = document.createElement('textarea');
			ta.value = text;
			ta.setAttribute('readonly', '');
			ta.style.position = 'fixed';
			ta.style.opacity = '0';
			document.body.appendChild(ta);
			ta.select();
			const ok = document.execCommand('copy');
			document.body.removeChild(ta);
			return ok;
		} catch (e) {
			console.warn('[エクスポート] コピーに失敗しました:', e);
			return false;
		}
	}

	// ---------------------------------------------------------------
	// エクスポート・インポート（このツールの保存データ全体。中身の意味は各ページが読み込み時に確認する）
	// ---------------------------------------------------------------

	/** エクスポート・インポートの対象になる localStorage のキーか */
	const isExportKey = (key) => typeof key === 'string' && key.startsWith(STORAGE_PREFIX) && !EXPORT_EXCLUDED_KEYS.includes(key);

	/**
	 * エクスポートする内容を作る。
	 * 形式: { "toupuzCalc.itemInventory": { アイテムID: 所持数 }, "toupuzCalc.eventProgress": {...}, ... }
	 *   保存されている値（JSON文字列）は読み取ってそのまま入れる。JSON として読めない値は文字列のまま入れる。
	 * 保存データが1件もないときは null。
	 */
	function buildExportData(storage) {
		const out = {};
		for (let i = 0; i < storage.length; i++) {
			const key = storage.key(i);
			if (!isExportKey(key)) continue;
			const text = storage.getItem(key);
			try {
				out[key] = JSON.parse(text);
			} catch (e) {
				out[key] = text;
			}
		}
		return Object.keys(out).length ? out : null;
	}

	/**
	 * 所持数（アイテムID → 所持数）の検証。
	 * すべての値が0以上の整数で、アイテムマスタに存在するIDを1つ以上含むときだけ採用する。
	 * 戻り値: null（問題なし）または理由の文字列（開発者向け）
	 */
	function checkInventory(inv, itemIds) {
		if (!isPlainObject(inv)) return '所持数がオブジェクト形式ではありません';
		const entries = Object.entries(inv);
		const badKey = entries.find(([, v]) => !(Number.isSafeInteger(v) && v >= 0));
		if (badKey) return `0以上の整数ではない値があります: ${badKey[0]}`;
		if (!entries.some(([id]) => itemIds.has(id))) return 'アイテムマスタに存在するIDがありません';
		return null;
	}

	/**
	 * インポートされた文字列の検証。次の3つの形式を受け付ける:
	 *   1. 現在の形式: { "toupuzCalc.〜": 値, ... }（キーはすべて toupuzCalc. で始まる）
	 *      → 対象のキーをすべて置き換える（含まれていないキーは削除する）
	 *   2. ver 1.0.x の形式: { アイテムID: 所持数, ... }（所持数だけ）
	 *      → 所持数だけを置き換え、それ以外の保存データは残す
	 *   3. ver 1.1.0 開発中の形式: 2. に "_eventProgress": { … } が付いたもの
	 *      → 所持数とイベントの進捗を置き換える
	 * 所持数が含まれるときは、checkInventory の条件を満たす場合だけ採用する。
	 * itemIds: アイテムマスタのIDの集合
	 * 戻り値: { ok: true, entries: { キー: 値 }, replaceAll } または { ok: false, reason }（reason は開発者向け）
	 */
	function parseImportText(text, itemIds) {
		const src = typeof text === 'string' ? text.trim() : '';
		if (src === '') return { ok: false, reason: '入力が空です' };
		if (src.length > IMPORT_MAX_LENGTH) return { ok: false, reason: '文字数が多すぎます' };
		let raw;
		try {
			raw = JSON.parse(src);
		} catch (e) {
			return { ok: false, reason: 'JSONとして読み取れません' };
		}
		if (!isPlainObject(raw)) return { ok: false, reason: 'オブジェクト形式ではありません' };
		const keys = Object.keys(raw);

		// 1. 現在の形式
		if (keys.some((k) => k.startsWith(STORAGE_PREFIX))) {
			const bad = keys.find((k) => !k.startsWith(STORAGE_PREFIX));
			if (bad) return { ok: false, reason: `このツールのデータではないキーがあります: ${bad}` };
			const entries = {};
			for (const k of keys) if (isExportKey(k)) entries[k] = raw[k];  // 表示モードなど端末ごとの設定は取り込まない
			if (!Object.keys(entries).length) return { ok: false, reason: '取り込めるデータがありません' };
			if (hasOwn(entries, STORAGE_KEYS.inventory)) {
				const reason = checkInventory(entries[STORAGE_KEYS.inventory], itemIds);
				if (reason) return { ok: false, reason };
			}
			return { ok: true, entries, replaceAll: true };
		}

		// 2. / 3. 以前の形式（所持数そのもの。イベントの進捗が付いていることもある）
		const inv = { ...raw };
		const entries = {};
		if (hasOwn(inv, LEGACY_EVENT_EXPORT_KEY)) {
			if (!isPlainObject(inv[LEGACY_EVENT_EXPORT_KEY])) return { ok: false, reason: `${LEGACY_EVENT_EXPORT_KEY} がオブジェクトではありません` };
			entries[STORAGE_KEYS.eventProgress] = inv[LEGACY_EVENT_EXPORT_KEY];
			delete inv[LEGACY_EVENT_EXPORT_KEY];
		}
		const reason = checkInventory(inv, itemIds);
		if (reason) return { ok: false, reason };
		entries[STORAGE_KEYS.inventory] = inv;
		return { ok: true, entries, replaceAll: false };
	}

	/**
	 * parseImportText の結果を localStorage に書き込む。成功したら true。
	 * 文字列の値はそのまま、それ以外は JSON 文字列にして保存する。
	 */
	function applyImport(parsed, storage) {
		try {
			if (parsed.replaceAll) {
				const old = [];
				for (let i = 0; i < storage.length; i++) if (isExportKey(storage.key(i))) old.push(storage.key(i));
				old.forEach((k) => storage.removeItem(k));
			}
			for (const [k, v] of Object.entries(parsed.entries)) {
				storage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
			}
			return true;
		} catch (e) {
			console.warn('[インポート] 保存に失敗しました:', e);
			return false;
		}
	}

	/** 再読み込み後に表示するメッセージを預ける（インポート後など） */
	function setFlash(text, color = 'success') {
		try {
			window.sessionStorage.setItem(FLASH_KEY, JSON.stringify({ text, color }));
		} catch (e) {
			// 預けられなくても処理は続ける（メッセージが出ないだけ）
		}
	}

	/** 預けたメッセージを取り出す（1回だけ）。なければ null */
	function takeFlash() {
		try {
			const text = window.sessionStorage.getItem(FLASH_KEY);
			window.sessionStorage.removeItem(FLASH_KEY);
			const v = text ? JSON.parse(text) : null;
			return v && typeof v.text === 'string' ? v : null;
		} catch (e) {
			return null;
		}
	}

	return {
		APP_TITLE,
		APP_VERSION,
		PAGES,
		STORAGE_PREFIX,
		STORAGE_KEYS,
		RELEASE_NOTES,
		REPORT_TYPES,
		REPORT_LIMITS,
		ITEM_DATA_FILE,
		isNonNegativeIntegerText,
		formatDateTime,
		loadJson,
		vueLoader,
		qtyRule,
		itemKeywordMatcher,
		sanitizeInventory,
		loadInventory,
		saveInventory,
		createInventoryState,
		loadThemeMode,
		saveThemeMode,
		createVuetify,
		postReport,
		copyToClipboard,
		buildExportData,
		parseImportText,
		applyImport,
		setFlash,
		takeFlash,
	};
})();

// Node.js からテストするための書き出し（ブラウザでは何もしない）
if (typeof module !== 'undefined' && module.exports) module.exports = TouPuz;
