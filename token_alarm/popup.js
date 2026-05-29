// アラーム名を人間が読みやすいラベルに変換する
function alarmLabel(name) {
  if (name.startsWith('party_')) {
    const no = name.replace('party_', '');
    return `party.${no} finished`;
  }
  if (name === 'duty') {
    return 'uchiban finished';
  }
  return name;
}

// ミリ秒を JST の日時文字列（"MM/DD(曜) HH:MM:SS"）に変換する
function formatTime(ms) {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month:   '2-digit',
    day:     '2-digit',
    weekday: 'narrow',
    hour:    '2-digit',
    minute:  '2-digit',
    second:  '2-digit',
    hour12:  false,
  }).formatToParts(new Date(ms));

  const get = (type) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('month')}/${get('day')}(${get('weekday')}) ${get('hour')}:${get('minute')}:${get('second')}`;
}

// アラーム一覧を取得して表示する
chrome.alarms.getAll((alarms) => {
  const list  = document.getElementById('alarm-list');
  const empty = document.getElementById('empty');

  if (!alarms || alarms.length === 0) {
    empty.style.display = 'block';
    return;
  }

  // 発火時刻（scheduledTime）が早い順に並べる
  const sorted = [...alarms].sort((a, b) => a.scheduledTime - b.scheduledTime);

  sorted.forEach((alarm) => {
    // scheduledTime はアラーム発火時刻（= 完了60秒前）
    // 完了時刻 = scheduledTime + 60秒
    const finishedMs = alarm.scheduledTime + 60_000;

    const li = document.createElement('li');

    const labelEl = document.createElement('span');
    labelEl.className = 'label';
    labelEl.textContent = alarmLabel(alarm.name);

    const timeEl = document.createElement('span');
    timeEl.className = 'time';
    timeEl.textContent = formatTime(finishedMs);

    li.appendChild(labelEl);
    li.appendChild(timeEl);
    list.appendChild(li);
  });
});
