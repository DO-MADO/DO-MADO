const assert = require('node:assert/strict');
const { test } = require('node:test');
const { optimizeCalendarColors } = require('./optimize-3d-calendar.cjs');

const rise = '<animateTransform attributeName="transform" type="translate" values="0 20;0 10" dur="3s" repeatCount="1"></animateTransform>';
const height = '<animate attributeName="height" values="2;10" dur="3s" repeatCount="1"></animate>';
const statistics = '<g transform="translate(980, 284.5)"><text>1963 contributions</text><polygon points="1,2 3,4"><animate attributeName="points" values="0,0 0,0;1,2 3,4" dur="3s" repeatCount="1"></animate></polygon></g>';
const languageChart = '<g transform="translate(40, 520)"><rect fill="#3178c6"></rect><text>TypeScript</text></g>';
const face = (color, extra = '') => `<rect width="18" height="10"><animate attributeName="fill" values="${color};rgb(0, 255, 0);${color}" dur="10s" repeatCount="indefinite"></animate>${extra}</rect>`;
const source = `<svg xmlns="http://www.w3.org/2000/svg"><rect fill="#00000f"></rect><g><g transform="translate(0 10)">${rise}${face('rgb(115, 38, 38)')}${face('rgb(96, 32, 32)', height)}${face('rgb(80, 27, 27)', height)}</g></g>${statistics}${languageChart}</svg>`;

test('면별 색상 변화를 공통 효과 하나로 바꾸고 초기 색과 등장 모션을 보존한다', () => {
  const result = optimizeCalendarColors(source);
  assert.equal((result.match(/repeatCount="indefinite"/g) || []).length, 1);
  assert.equal((result.match(/<filter\b/g) || []).length, 1);
  assert.ok(!result.includes('attributeName="fill"'));
  for (const color of ['rgb(115, 38, 38)', 'rgb(96, 32, 32)', 'rgb(80, 27, 27)']) {
    assert.ok(result.includes(`fill="${color}"`));
  }
  assert.ok(result.includes(rise));
  assert.equal(result.split(height).length - 1, 2);
  assert.ok(result.includes('<g filter="url(#domado-calendar-hue)"><g transform="translate(0 10)">'));
});

test('배경과 통계·언어 차트에는 색상 효과를 적용하지 않는다', () => {
  const result = optimizeCalendarColors(source);
  assert.ok(result.startsWith('<svg xmlns="http://www.w3.org/2000/svg"><rect fill="#00000f"></rect>'));
  assert.ok(result.endsWith(`${statistics}${languageChart}</svg>`));
  assert.equal((result.match(/filter="url/g) || []).length, 1);
});

test('재실행해도 SVG와 필터 수가 바뀌지 않는다', () => {
  const once = optimizeCalendarColors(source);
  assert.equal(optimizeCalendarColors(once), once);
});

test('생성기 형식이 바뀌면 잘못된 결과를 저장하지 않고 실패한다', () => {
  assert.throws(() => optimizeCalendarColors('<svg></svg>'), /Could not find/);
  assert.throws(() => optimizeCalendarColors('<svg><g></svg>'), /not closed/);
  assert.throws(() => optimizeCalendarColors('<svg><g><rect></rect></g></svg>'), /Could not replace/);
  assert.throws(() => optimizeCalendarColors(source.replace('repeatCount="indefinite"', 'repeatCount="1"')), /Unexpected/);
});
