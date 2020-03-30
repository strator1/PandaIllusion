contextMenu = [
  {
    name: 'Copy data',
    title: 'Copy data',
    fun: function(e) {
      const data = e.trigger.context.data;
      copy(data2text(data));
    }
  }, {
    name: 'Save data',
    title: 'Save data',
    fun: function(e) {
      const data = e.trigger.context.data;
      const text = data2text(data);

      save(e.trigger.context.id + ".csv", text);
    }
  }
];

Array.range = function(length) {
  return Array.from({length: length}, (v, k) => k);
}

function fourierTransform(data, width, height) {
    const data2 = new Array(data.length);
/*
    var sum = 0;
    for (i = 0; i < data.length; i++) {
      sum += data[i];
    }
    const mean = sum / data.length;

    Fourier.transform(data.map(v => v - mean), data2);
*/
    Fourier.transform(data.map(v => v / 255.0), data2);

    return Fourier.shift(data2, [width, height]).map(v => v.magnitude() / data.length);
}

const PLOT_CONFIG = {
  scrollZoom: false,
  staticPlot: true,
  displayModeBar: false
};

const PLOT_LAYOUT = {
  margin: {
    l: 0,
    r: 0,
    t: 0,
    b: 0,
    p: 0
  },
  showlegend: false,
  xaxis: {
    autorange: true,
    showgrid: false,
    zeroline: false,
    showline: false,
    autotick: true,
    ticks: '',
    showticklabels: false
  },
  yaxis: {
    autorange: true,
    showgrid: true,
    zeroline: false,
    showline: false,
    autotick: true,
    ticks: '',
    showticklabels: false
  },
};

function plotLayout(width, height) {
  const layout = jQuery.extend({}, PLOT_LAYOUT);
  layout.width = width;
  layout.height = height;

  return JSON.parse(JSON.stringify(layout));
}

function newTrace(array, color, thickness) {
  return {
    x0: 0,
    dx: 1,
    y: array,
    type: 'scatter',
    mode: 'lines',
    connectgaps: true,
    line: {
      color: color,
      width: thickness
    }
  };
}

function one2threeD(array, width) {
  const temp = [];

  for (i = 0; i < array.length; i++) {
    const x = i % width;
    const y = Math.round(i / width);
    if (temp.length <= x) {
      temp.push([]);
    }
    if (temp[x].length <= y) {
      temp[x].push([]);
    }
    temp[x][y] = array[i];
  }

  return temp;
}

function newHeatmap(data, width) {
  const data2 = one2threeD(data, width);

  return {
    type: "heatmap",
    z: data2,
    colorscale: 'Hot', //"Greys"
    colorbar: {
      x: 0.04,
      xpad: 5,
      ypad: 5,
      thickness: 20,
      lenmode: "pixels",
      len: 150,
      bgcolor: "white",
      bordercolor: "black",
      borderwidth: 0,
      tickfont: {
        size: 10
      }
    }
  };
}

function getImageData(canvasId) {
  const canvas = document.getElementById(canvasId);
  return canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
}

function putImageData(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  canvas.getContext("2d").putImageData(data, 0, 0);
}

function hexToRgb(hex) {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function(m, r, g, b) {
    return r + r + g + g + b + b;
  });

  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

async function ft(sourceCanvasId, plotId) {
  const data = getImageData(sourceCanvasId).data.filter(function(v, i, a) { return i % 4 == 0; }).map(v => v);
  const sourceCanvas = document.getElementById(sourceCanvasId);

  const data2 = await new Promise(resolve => resolve(fourierTransform(data, sourceCanvas.width, sourceCanvas.height)));

  const heatmap = newHeatmap(data2.map(v => Math.log(v)), sourceCanvas.width);
  Plotly.newPlot(plotId, [heatmap], plotLayout(sourceCanvas.width, sourceCanvas.height), PLOT_CONFIG);

  return data2;
}

function normalize(array) {
  var max = 0;
  for (i = 0; i < array.length; i++) {
    if (array[i] > max) {
      max = array[i];
    }
  }
  for (i = 0; i < array.length; i++) {
    array[i] = array[i] / max;
  }

  return array;
}

function aperture(width, height, radius) {
  const data = new Array(width * height);

  const xc = width / 2;
  const yc = height / 2;

  for (i = 0; i < data.length; i++) {
    const x = i % width;
    const y = i / height;
    const x2 = (x-xc)*(x-xc);
    const y2 = (y-yc)*(y-yc);

    data[i] = (Math.sqrt(x2 + y2) <= radius) ? 255 : 0;
    //ellipse:
    // (cos(phi) * (xp-x0) + sin(phi) * (yp-y0))^2 / a^2 + (sin(phi) * (xp-x0) - cos(phi) * (yp-y0))^2 / b^2 <= 1
  }

  return data;
}

function ftPlot(data, width, pcarrier, id, config) {
  const xy90 = new Array(width/2);

  for (y = width/2; y < width; y++) {
    const ys = y - width/2;
    const i = y * width + width/2;

    xy90[ys] = data[i];
  }

  const traces = [
    newTrace(xy90, "rgb(0, 0, 255)", 1),
  ];

  const f = (360.0/Math.PI * Math.atan(config.length / (2.0 * config.distance))) / config.lengthpx;
  traces[0].name = "h";
  traces[0].x0 = 0;
  traces[0].dx = 1.0/(width*f);

  const pl = plotLayout(width, 200);
//  pl.showlegend = true;
  pl.xaxis.title = "cpd";
  pl.xaxis.showgrid = true;
  pl.xaxis.zeroline = true;
  pl.xaxis.ticks = "outside";
  pl.xaxis.showticklabels = true;
  pl.xaxis.tickmode = "auto";
  pl.xaxis.nticks = 20;
  pl.yaxis.showgrid = true;
  pl.yaxis.zeroline = true;
  pl.yaxis.ticks = "outside";
  pl.yaxis.showticklabels = true;
  pl.margin.b = 40;
  pl.margin.l = 40;
  pl.shapes = Array
    .range(Math.floor(1/f/2/(config.lengthpx * Math.PI / (360.0 * pcarrier * Math.atan(config.length / (2.0 * config.distance))))))
    .map(k => k * config.lengthpx * Math.PI / (360.0 * pcarrier * Math.atan(config.length / (2.0 * config.distance))))
    .flatMap(cpd => 
      ({
        type: 'line',
        xref: 'x',
        yref: 'paper',
        x0: cpd,
        y0: 0,
        x1: cpd,
        y1: 1,
        line: {
          color: '#aaaaaa',
          width: 1
        }
      })
    );

  Plotly.newPlot(id, traces, pl, PLOT_CONFIG);
}

function zoom(panda, zoomLevel) {
  const temp = document.createElement("canvas");
  temp.width = panda.original_img.naturalWidth;
  temp.height = panda.original_img.naturalHeight;
  const ctx2 = temp.getContext("2d");
  ctx2.imageSmoothingEnabled = false;
  ctx2.setTransform(zoomLevel, 0, 0, zoomLevel, temp.width / 2, temp.height / 2);
  ctx2.drawImage(panda.original_img, -temp.width / 2, -temp.height / 2);

  const img = new Image();
  img.onload = function() {
    panda.img = img;
  };
  img.src = temp.toDataURL();
  img.width = temp.width;
  img.height = temp.height;
  img.naturalWidth = temp.width;
  img.naturalHeight = temp.height;
}

function copy(text) {
  navigator.clipboard.writeText(text);
}

function save(filename, text) {
  saveAs(new Blob([text], {type: 'text/plain'}), filename);
}

function data2text(data) {
  var result;
  if (data[0].type == 'scatter') {
    result = "trace\tf\tmagnitude\n" + data.map(d => d.y.map((y, j, arr) => [d.name, d.x0 + d.dx * j, y].join('\t')).join('\n')).join('\n');
  } else if (data[0].type == 'heatmap') {
    const f = (180.0/Math.PI * 2.0 * Math.atan(config.length / (2.0 * config.distance))) / config.lengthpx;

    const text = new Array(data[0].z.length * data[0].z[0].length);

    const yl = data[0].z.length / 2;
    const xl = data[0].z[0].length / 2;
    const yf = 1.0 / (data[0].z.length * f);
    const xf = 1.0 / (data[0].z[0].length * f)

    for (y = 0, i = 0; y < data[0].z.length; y++) {
      const yy = (y - yl) * yf;
      for (x = 0; x < data[0].z[0].length; x++, i++) {
        const xx = (x - xl) * xf;
        const v = data[0].z[y][x];
        text[i] = yy + '\t' + xx + '\t' + v;
      }
    }

    result = "xf\tyf\tlog magnitude\n" + text.join('\n');
  }

  const lang = (navigator.languages && navigator.languages.length) ? navigator.languages[0] : navigator.userLanguage || navigator.language || navigator.browserLanguage || 'en';
  if (lang.startsWith('de')) {
    result = result.replace(/\./g, ',');
  }

  return result;
}