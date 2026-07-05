const fs = require('fs');
const path = require('path');

const outputDir = path.resolve(__dirname, '../../profile-3d-contrib');

const languages = [
  { name: 'TypeScript', value: 4318329, color: '#3178c6', label: '4.32 MB' },
  { name: 'Dart', value: 1156344, color: '#00b4ab', label: '1.16 MB' },
  { name: 'C', value: 484848, color: '#9dcfca', label: '484.8 KB' },
  { name: 'JavaScript', value: 274842, color: '#f1e05a', label: '274.8 KB' },
  { name: 'Python', value: 160291, color: '#6b95ac', label: '160.3 KB' },
  { name: 'Others', value: 174773, color: '#89e051', label: '174.8 KB' },
];

const total = languages.reduce((sum, language) => sum + language.value, 0);

function point(cx, cy, radius, angle) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function donutSegment(startAngle, endAngle, outerRadius, innerRadius) {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const outerStart = point(0, 0, outerRadius, startAngle);
  const outerEnd = point(0, 0, outerRadius, endAngle);
  const innerStart = point(0, 0, innerRadius, endAngle);
  const innerEnd = point(0, 0, innerRadius, startAngle);

  return [
    `M${outerStart.x},${outerStart.y}`,
    `A${outerRadius},${outerRadius},0,${largeArc},1,${outerEnd.x},${outerEnd.y}`,
    `L${innerStart.x},${innerStart.y}`,
    `A${innerRadius},${innerRadius},0,${largeArc},0,${innerEnd.x},${innerEnd.y}`,
    'Z',
  ].join('');
}

function detectTextFill(svg, fallback = '#00000f') {
  const contributionText = svg.match(/<text style="font-size: 24px;"[^>]*fill="([^"]+)"/);
  if (contributionText) {
    return contributionText[1];
  }

  const chartText = svg.match(/<g transform="translate\(40, 520\)">[\s\S]*?<text[^>]*fill="([^"]+)"/);
  return chartText ? chartText[1] : fallback;
}

function buildLanguageChart(textFill) {
  const stroke = textFill.toLowerCase() === '#00000f' ? '#ffffff' : '#0b1020';
  const labelX = 292;
  const labelStartY = 46;
  const labelGap = 28;
  const swatchSize = 18;
  const outerRadius = 116;
  const innerRadius = 65;

  let currentAngle = 0;
  const segments = languages.map((language) => {
    const percentage = (language.value / total) * 100;
    const nextAngle = currentAngle + percentage * 3.6;
    const pathData = donutSegment(currentAngle, nextAngle, outerRadius, innerRadius);
    currentAngle = nextAngle;

    return `<path d="${pathData}" style="fill: ${language.color};" stroke="${stroke}" stroke-width="2px"><title>${language.name} ${percentage.toFixed(1)}%</title></path>`;
  });

  const legend = languages.map((language, index) => {
    const y = labelStartY + index * labelGap;
    const percentage = ((language.value / total) * 100).toFixed(1);

    return [
      `<rect x="${labelX}" y="${y - swatchSize / 2}" width="${swatchSize}" height="${swatchSize}" fill="${language.color}" stroke="${stroke}" stroke-width="1px"></rect>`,
      `<text dominant-baseline="middle" x="${labelX + 28}" y="${y}" fill="${textFill}" font-size="17px">${language.name}</text>`,
      `<text dominant-baseline="middle" x="${labelX + 178}" y="${y}" fill="${textFill}" opacity="0.68" font-size="14px">${percentage}%</text>`,
    ].join('');
  });

  return [
    '<g transform="translate(40, 520)">',
    `<g transform="translate(126, 130)">${segments.join('')}</g>`,
    `<g>${legend.join('')}</g>`,
    '</g>',
  ].join('');
}

function rewriteSvg(filePath) {
  const svg = fs.readFileSync(filePath, 'utf8');
  const chartStart = svg.indexOf('<g transform="translate(40, 520)">');
  const chartEnd = svg.indexOf('<g><text style="font-size: 32px; font-weight: bold;"');

  if (chartStart === -1 || chartEnd === -1 || chartEnd <= chartStart) {
    throw new Error(`Could not find language chart block in ${filePath}`);
  }

  const textFill = detectTextFill(svg);
  const updated = `${svg.slice(0, chartStart)}${buildLanguageChart(textFill)}${svg.slice(chartEnd)}`;
  fs.writeFileSync(filePath, updated);
}

const svgFiles = fs
  .readdirSync(outputDir)
  .filter((fileName) => fileName.endsWith('.svg'))
  .map((fileName) => path.join(outputDir, fileName));

svgFiles.forEach(rewriteSvg);
console.log(`Rewrote language chart in ${svgFiles.length} SVG files.`);
