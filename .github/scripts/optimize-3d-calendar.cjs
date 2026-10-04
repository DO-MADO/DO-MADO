const filterId = 'domado-calendar-hue';
const sharedFilter = `<defs><filter id="${filterId}" x="-1%" y="-1%" width="102%" height="102%" color-interpolation-filters="sRGB"><feColorMatrix in="SourceGraphic" type="hueRotate" values="0"><animate attributeName="values" from="0" to="360" dur="10s" repeatCount="indefinite" calcMode="linear"></animate></feColorMatrix></filter></defs>`;

function optimizeCalendarColors(svg) {
  if (svg.includes(`id="${filterId}"`)) {
    return svg;
  }

  // 생성기 0.7.1의 첫 번째 그룹은 기여 막대이며, 뒤의 통계·언어 차트는 제외한다.
  const start = svg.indexOf('<g>');
  if (start === -1) {
    throw new Error('Could not find contribution blocks.');
  }
  const groups = /<g(?:\s[^>]*)?>|<\/g>/g;
  groups.lastIndex = start;
  let depth = 0;
  let end;
  let match;
  while ((match = groups.exec(svg))) {
    depth += match[0] === '</g>' ? -1 : 1;
    if (depth === 0) {
      end = groups.lastIndex;
      break;
    }
  }
  if (end === undefined) {
    throw new Error('Contribution blocks are not closed.');
  }

  let removed = 0;
  const blocks = svg.slice(start, end).replace(/<rect\b([^>]*)>([\s\S]*?)<\/rect>/g, (rect, attributes, contents) => {
    const animation = contents.match(/<animate\b[^>]*\battributeName="fill"[^>]*(?:\/>|>\s*<\/animate>)/);
    if (!animation) {
      return rect;
    }
    const firstColor = animation[0].match(/\bvalues="([^";]+)/);
    if (!firstColor || !animation[0].includes('repeatCount="indefinite"')) {
      throw new Error('Unexpected contribution color animation.');
    }

    removed += 1;
    // 원본은 fill 속성 없이 애니메이션으로만 색을 지정하므로 첫 색을 명시한다.
    const otherAttributes = attributes.replace(/\sfill="[^"]*"/, '');
    return `<rect${otherAttributes} fill="${firstColor[1]}">${contents.replace(animation[0], '')}</rect>`;
  });
  if (removed === 0 || blocks.includes('attributeName="fill"')) {
    throw new Error('Could not replace contribution color animations.');
  }

  const filteredBlocks = blocks.replace('<g>', `<g filter="url(#${filterId})">`);
  return `${svg.slice(0, start)}${sharedFilter}${filteredBlocks}${svg.slice(end)}`;
}

module.exports = { optimizeCalendarColors };
