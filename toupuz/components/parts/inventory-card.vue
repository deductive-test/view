<!-- ===================================================================
     所持数カード（見出し・検索欄・アイテムごとの所持数の入力欄）
     使い方:
       <inventory-card :rows="inventoryRows" :inputs="inventoryState.inputs"
         v-model:search="inventorySearch" @input="onInventoryInput">
         <template #filter>…絞り込みボタンなど（検索欄と一覧の間に表示）…</template>
         <template #name-suffix="{ item }">…アイテム名の後ろに付ける表示（「あとN」など）…</template>
       </inventory-card>
       rows  : 表示するアイテム [{ id, text }]（検索・絞り込みはページ側で済ませて渡す）
       inputs: アイテムID → 入力欄の文字列（TouPuz.createInventoryState() の inputs）
       search: 検索欄の文字列（v-model:search）
       @input(id, value): 入力欄の入力（保存はページ側で TouPuz.createInventoryState() の input を呼ぶ）
     id などの属性はカード（v-card）にそのまま付く。スタイルは components/common.css（必要数量の行と共通）
     =================================================================== -->
<template>
	<v-card border flat>
		<v-card-title class="section-title pt-4">所持数</v-card-title>
		<v-card-subtitle class="pb-2">入力した値はこのブラウザに自動で保存されます</v-card-subtitle>
		<v-card-text>
			<v-text-field
				:model-value="search"
				@update:model-value="$emit('update:search', $event)"
				label="アイテム名で検索"
				prepend-inner-icon="mdi-magnify"
				variant="outlined" density="compact"
				clearable hide-details
				class="mb-3"
			></v-text-field>

			<slot name="filter"></slot>

			<div class="inventory-list">
				<div v-for="it in rows" :key="it.id" class="inventory-row">
					<label class="inventory-name" :for="'inv-' + it.id">
						{{ it.text }}<slot name="name-suffix" :item="it"></slot>
					</label>
					<v-text-field
						:id="'inv-' + it.id"
						class="inventory-input"
						:model-value="inputs[it.id]"
						@update:model-value="$emit('input', it.id, $event)"
						type="number" min="0" step="1" inputmode="numeric"
						placeholder="0"
						variant="outlined" density="compact"
						hide-details="auto"
						:rules="[qtyRule]"
					></v-text-field>
				</div>
				<div v-if="!rows.length" class="muted pa-3">該当するアイテムはありません。</div>
			</div>
		</v-card-text>
	</v-card>
</template>

<script>
export default {
	props: {
		rows: { type: Array, required: true },
		inputs: { type: Object, required: true },
		search: { type: String, default: '' },
	},
	emits: ['update:search', 'input'],
	setup() {
		return {
			qtyRule: TouPuz.qtyRule,
		};
	},
};
</script>
