/**
 * @license
 * Copyright 2021 Justin Braaten
 * Copyright 2023 Abimael Ribeiro de Souza
 * Copyright 2026 Tiago José Ferreira
 *
 * Licenciado sob a Licença Apache, Versão 2.0 (a "Licença");
 * você não pode utilizar este arquivo em desacordo com a Licença.
 * Você pode obter uma cópia da Licença em:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Salvo quando exigido pela legislação aplicável ou acordado por escrito,
 * o software distribuído sob esta Licença é fornecido "NO ESTADO EM QUE SE ENCONTRA",
 * SEM GARANTIAS OU CONDIÇÕES DE QUALQUER NATUREZA, sejam elas expressas ou implícitas.
 * Consulte a Licença para as disposições específicas que regem as permissões
 * e limitações sob a Licença.
 */

  // ########################## PROGRESSÃO DESMATAMENTO ANO A ANO ###########################
   
  // Parâmetros para exportação da imagem
 
  var inputInitChipWidth = 1;                                // Área de corte da imagem; De 1 a 50km
  var crsExportImage = 'EPSG:31980';                         // CRS para exportação
  var processFolder = 'EarthEngine';                         // Pasta para armazenamento no Google Drive
 
  // Parâmetros do estudo
 
  var featTable = ee.FeatureCollection(table);
  var featTable2 = (typeof table2 !== 'undefined') ? ee.FeatureCollection(table2) : null;
  var inputStartYear = 2000;                     // Ano inicial
  var inputEndYear = 2021;                       // Ano final
  var aoiCircleBuffer = 4;                       // Buffer para média do índice de vegetação (m)
  var inputCloudPercent = 50;                    // Percentual de nuvem aceitável
  var legendLabelDano = 'Dano Ambiental';        // Legenda para dano ambiental
  var legendLabelAreaImovel = 'Área Imóvel';     // Legenda para área imóvel
 
  // Parâmetros de visualização no aplicativo
 
  var zoomLevelAoi = 10;                          // Zoom
  var inputDimension = '350';                     // Tamanho do card da imagem
 
 
  // #############################################################################
  // ### IMPORT MODULES ###
  // #############################################################################

  // RGB time series charting module: https://github.com/jdbcode/ee-rgb-timeseries
  var rgbTs = require('users/jstnbraaten/modules:rgb-timeseries/rgb-timeseries.js');
 
  // #############################################################################
  // ### GET URL PARAMS ###
  // #############################################################################
 
  // Obtém o centroide do conjunto de feições para inicializar o mapa
  var baseGeometry = featTable2 ? featTable2.geometry() : featTable.geometry();
  var centroide = baseGeometry.centroid();
  var infoCentroide = ee.List(centroide.coordinates()).getInfo(0);
 
  console.log('Longitude: ' + infoCentroide[0] + ' Latitude ' + infoCentroide[1]);
 
  // Inicializa parâmetros de URL para persistir estado do app
  var initRun = 'true';
  var runUrl = ui.url.get('run', initRun);
  ui.url.set('run', runUrl);
 
  // Longitude inicial baseada no centroide
  var initLon = infoCentroide[0];
  var lonUrl = ui.url.get('lon', initLon);
  var lonNumber = parseFloat(lonUrl);
  var lonDiff = Math.abs(lonNumber - initLon);
  if (isNaN(lonNumber) || lonDiff > 0.001) {
    lonUrl = initLon;
  }
  ui.url.set('lon', lonUrl);

  // Latitude inicial baseada no centroide
  var initLat = infoCentroide[1];
  var latUrl = ui.url.get('lat', initLat);
  var latNumber = parseFloat(latUrl);
  var latDiff = Math.abs(latNumber - initLat);
  if (isNaN(latNumber) || latDiff > 0.001) {
    latUrl = initLat;
  }
  ui.url.set('lat', latUrl);
 
  // Janela temporal padrão para composição anual
  var initFrom = '05-01';
  var fromUrl = ui.url.get('from', initFrom);
  ui.url.set('from', fromUrl);
 
  var initTo = '10-31';
  var toUrl = ui.url.get('to', initTo);
  ui.url.set('to', toUrl);
 
  // Índice de vegetação padrão para a série temporal
  var initIndex = 'NDVI';
  var indexUrl = ui.url.get('index', initIndex);
  ui.url.set('index', indexUrl);
 
  // Composição RGB padrão usada nos cards
  var initRgb = 'Cor natural simulada: SWIR1/NIR/GREEN (b6,b5,b3)'; //Cor natural simulada: SWIR1/NIR/GREEN (b6,b5,b3)
  var rgbUrl = ui.url.get('rgb', initRgb);
  ui.url.set('rgb', rgbUrl);
 
  var initChipWidth = inputInitChipWidth; // Zoom da imagem
  var chipWidthUrl = ui.url.get('chipwidth', initChipWidth);
  ui.url.set('chipwidth', chipWidthUrl);
 
  // #############################################################################
  // ### DEFINE UI ELEMENTS ###
  // #############################################################################
 
  // Estilos gerais da interface
  var CONTROL_PANEL_WIDTH = '270px';
  var CONTROL_PANEL_WIDTH_HIDE = '160px';
  var textFont = {fontSize: '12px'};
  var headerFont = {
    fontSize: '13px', fontWeight: 'bold', margin: '4px 8px 0px 8px'};
  var sectionFont = {
    fontSize: '16px', color: '808080', margin: '16px 8px 0px 8px'};
  var infoFont = {fontSize: '11px', color: '505050'};
 
  // Painel principal de controles
  var controlPanel = ui.Panel({
    style: {position: 'top-left', width: CONTROL_PANEL_WIDTH_HIDE,
      maxHeight: '90%'
    }});
 
  // Painel de informações
  var infoElements = ui.Panel(
    {style: {shown: false, margin: '0px -8px 0px -8px'}});
 
  // Painel de elementos de configuração
  var controlElements = ui.Panel(
    {style: {shown: false, margin: '0px -8px 0px -8px'}});
 
  // Texto instrucional inicial
  var instr = ui.Label('Click em uma localização',
    {fontSize: '12px', color: '303030', margin: '0px 0px 6px 0px'});
 
  // Botão para mostrar/ocultar o painel de informações
  var infoButton = ui.Button(
    {label: 'Sobre ❯', style: {margin: '0px 4px 0px 0px'}});
 
  // Botão para mostrar/ocultar o painel de opções
  var controlButton = ui.Button(
    {label: 'Opções ❯', style: {margin: '0px 0px 0px 10px'}});
 
  // Container dos botões de navegação do painel
  var buttonPanel = ui.Panel(
    [infoButton, controlButton],
    ui.Panel.Layout.Flow('horizontal'),
    {stretch: 'horizontal', margin: '0px 0px 0px 0px'});
 
  // Rótulo de seção de opções
  var optionsLabel = ui.Label('Opções', sectionFont);
  optionsLabel.style().set('margin', '16px 8px 2px 8px');
 
  // Rótulo de seção de informações
  var infoLabel = ui.Label('About', sectionFont);
 
  // Texto descritivo do aplicativo
  var aboutLabel = ui.Label(
    'This app shows a Landsat time series chart and image chips for selected ' +
    'locations within image composites. Images are median annual composites ' +
    'generated for a given time window (can cross the new year). Time series ' +
    'point colors are defined by RGB assignment to selected bands where ' +
    'intensity is based on the area-weighted mean pixel value within a 45 m ' +
    'radius circle around the clicked point in the map.',
    infoFont);
 
  var appCodeLink = ui.Label({
    value: 'App source code',
    style: {fontSize: '11px', color: '505050', margin: '-4px 8px 0px 8px'},
    targetUrl: 'https://github.com/jdbcode/ee-rgb-timeseries/blob/main/landsat-timeseries-explorer.js'
  });
 
  // Seção de intervalo de datas para a composição anual
  var dateSectionLabel = ui.Label(
    'Intervalo para composição (mês-dia)', headerFont);
  var startDayLabel = ui.Label('De:', textFont);
  var startDayBox = ui.Textbox({value: ui.url.get('from'), style: textFont});
  startDayBox.style().set('stretch', 'horizontal');
 
  var endDayLabel = ui.Label('Para:', textFont);
  var endDayBox = ui.Textbox({value: ui.url.get('to'), style: textFont});
  endDayBox.style().set('stretch', 'horizontal');
 
  var datePanel = ui.Panel([
      dateSectionLabel,
      ui.Panel([startDayLabel, startDayBox, endDayLabel, endDayBox],
      ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'})
    ], null, {margin: '0px'});
 
  // Seletor do índice exibido no eixo Y do gráfico
  var indexLabel = ui.Label('Y-axis index (bandas para LC08)', headerFont);
  var indexList = ['NBR', 'NDVI', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7'];
  var indexSelect = ui.Select(
    {items: indexList, value: ui.url.get('index'), style: {stretch: 'horizontal'}});
  var indexPanel = ui.Panel(
    [indexLabel, indexSelect], null, {stretch: 'horizontal'});
 
  // Seletor de composição RGB para visualização
  var rgbLabel = ui.Label({value: 'Visualização RGB', style: headerFont});
  var rgbList = [
    'Cor natural simulada: SWIR1/NIR/GREEN (b6,b5,b3)',
    'Cor natural simulada: RED/GREEN/BLUE (b4,b3,b2)',
    'Infravermelho: NIR/RED/GREEN (b5,b4,b3)',
    'Falsa cor: NIR/SWIR1/RED'
  ];
  var rgbSelect = ui.Select({
    items: rgbList, placeholder: ui.url.get('rgb'),
    value: ui.url.get('rgb'), style: {stretch: 'horizontal'}
  });
  var rgbPanel = ui.Panel([rgbLabel, rgbSelect], null, {stretch: 'horizontal'});
 
  // Configurações de região de visualização dos cards
  var regionWidthLabel = ui.Label(
    {value: 'Área de visualização da imagem (km)', style: headerFont});
  var regionWidthSlider = ui.Slider({
    min: 1, max: 50 , value: parseInt(ui.url.get('chipwidth')),
    step: 1, style: {stretch: 'horizontal'}
  });
  var regionWidthPanel = ui.Panel(
    [regionWidthLabel, regionWidthSlider], null, {stretch: 'horizontal'});

  var startYearLabel = ui.Label('Ano inicial', textFont);
  var startYearBox = ui.Textbox({value: inputStartYear, style: textFont});
  startYearBox.style().set('stretch', 'horizontal');

  var endYearLabel = ui.Label('Ano final', textFont);
  var endYearBox = ui.Textbox({value: inputEndYear, style: textFont});
  endYearBox.style().set('stretch', 'horizontal');

  var bufferLabel = ui.Label('Buffer (m)', textFont);
  var bufferBox = ui.Textbox({value: aoiCircleBuffer, style: textFont});
  bufferBox.style().set('stretch', 'horizontal');

  var zoomLabel = ui.Label('Zoom', textFont);
  var zoomBox = ui.Textbox({value: zoomLevelAoi, style: textFont});
  zoomBox.style().set('stretch', 'horizontal');

  var dimensionLabel = ui.Label('Dimensão do card', textFont);
  var dimensionBox = ui.Textbox({value: inputDimension, style: textFont});
  dimensionBox.style().set('stretch', 'horizontal');

  var crsLabel = ui.Label('CRS exportação', textFont);
  var crsBox = ui.Textbox({value: crsExportImage, style: textFont});
  crsBox.style().set('stretch', 'horizontal');

  var folderLabel = ui.Label('Pasta Drive', textFont);
  var folderBox = ui.Textbox({value: processFolder, style: textFont});
  folderBox.style().set('stretch', 'horizontal');
 
  var cloudLabel = ui.Label('% Nuvem máx', textFont);
  var cloudBox = ui.Textbox({value: inputCloudPercent, style: textFont});
  cloudBox.style().set('stretch', 'horizontal');

  var legendTitle = ui.Label('Legenda', headerFont);
  var legendLabel1 = ui.Label('Rótulo 1', textFont);
  var legendBox1 = ui.Textbox({value: legendLabelDano, style: textFont});
  legendBox1.style().set('stretch', 'horizontal');

  var legendLabel2 = ui.Label('Rótulo 2', textFont);
  var legendBox2 = ui.Textbox({value: legendLabelAreaImovel, style: textFont});
  legendBox2.style().set('stretch', 'horizontal');

  var legendColor1 = ui.Label('', {backgroundColor: 'red', padding: '6px', margin: '0px 6px 0px 0px'});
  var legendColor2 = ui.Label('', {backgroundColor: '0000ff', padding: '6px', margin: '0px 6px 0px 0px'});
  var legendItem1 = ui.Panel([legendColor1, legendBox1], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'});
  var legendItem2 = ui.Panel([legendColor2, legendBox2], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'});

  var dmsTitle = ui.Label('Coordenadas (DMS)', headerFont);
  var dmsLabelNorth = ui.Label('', textFont);
  var dmsLabelSouth = ui.Label('', textFont);
  var dmsLabelWest = ui.Label('', textFont);
  var dmsLabelEast = ui.Label('', textFont);
  var dmsPanel = ui.Panel([dmsTitle, dmsLabelNorth, dmsLabelSouth, dmsLabelWest, dmsLabelEast], null, {stretch: 'horizontal'});

  var legendPanel = ui.Panel([legendTitle, legendItem1, legendItem2, dmsPanel], null, {margin: '0px'});

  var exportPanel = ui.Panel([
    ui.Panel([startYearLabel, startYearBox], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'}),
    ui.Panel([endYearLabel, endYearBox], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'}),
    ui.Panel([bufferLabel, bufferBox], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'}),
    ui.Panel([zoomLabel, zoomBox], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'}),
    ui.Panel([dimensionLabel, dimensionBox], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'}),
    ui.Panel([crsLabel, crsBox], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'}),
    ui.Panel([folderLabel, folderBox], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'}),
    ui.Panel([cloudLabel, cloudBox], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'})
  ], null, {margin: '0px'});
 
  // Mensagem de espera enquanto os cards são processados
  var waitMsgImgPanel = ui.Label({
    value: '⚙️' + ' Processando. Por favor, espere um instante...',
    style: {
      stretch: 'horizontal',
      textAlign: 'center',
      backgroundColor: 'd3d3d3'
    }
  });
 
  // Painel do gráfico temporal
  var chartPanel = ui.Panel({style: {height: '40%'}});
 
  // Painel dos cards de imagens
  var imgCardPanel = ui.Panel({
    layout: ui.Panel.Layout.flow('horizontal', true),
    style: {width: '897px', backgroundColor: 'd3d3d3'}
  });
 
  // Mapa principal do app
  var map = ui.Map();

  // Indicador de norte no mapa
  var northPanel = ui.Panel({style: {position: 'top-right', padding: '6px 8px', backgroundColor: 'ffffffcc'}});
  var northLabel = ui.Label('N', {fontWeight: 'bold', fontSize: '14px', margin: '0px 0px 2px 0px'});
  var northArrow = ui.Label('▲', {fontSize: '16px', margin: '0px'});
  northPanel.add(northLabel);
  northPanel.add(northArrow);
  map.add(northPanel);
 
  // Painel dividido entre mapa e gráfico
  var mapChartSplitPanel = ui.Panel(ui.SplitPanel({
    firstPanel: map, //
    secondPanel: chartPanel,
    orientation: 'vertical',
    wipe: false,
  }));
 
  // Painel final com mapa, gráfico e cards
  var splitPanel = ui.SplitPanel(mapChartSplitPanel, imgCardPanel);
 
  // Botão para aplicar alterações de parâmetros
  var submitButton = ui.Button(
    {label: 'Submeter alterações', style: {stretch: 'horizontal', shown: false}});
 
 
 
  // #############################################################################
  // ### DEFINE INITIALIZING CONSTANTS ###
  // #############################################################################
 
  // Cores dos elementos de interesse no mapa
  var AOI_COLOR = 'yellow';
  var AOI_AREA = 'red';
 
  // Parâmetros padrão de visualização dos mosaicos
  var VIS_PARAMS = {
    bands: ['B6', 'B5', 'B3'],
    min: [0.05, 0.05, 0.05],
    max: [0.5, 0.5, 0.5]
  };
 
  // Parâmetros de visualização por composição RGB
  var RGB_PARAMS = {
    'Cor natural simulada: SWIR1/NIR/GREEN (b6,b5,b3)': {
      bands: ['B6', 'B5', 'B3'],
      min: [0.05, 0.05 , 0.05],
      max: [0.5, 0.5, 0.5],
      gamma: [1, 1, 1]
    },
    'Cor natural simulada: RED/GREEN/BLUE (b4,b3,b2)': {
      bands: ['B4', 'B3', 'B2'],
      min: [0.05, 0.05, 0.05],
      max: [0.4, 0.4, 0.4],
      gamma: [1.2, 1.2, 1.2]
    },
    'Infravermelho: NIR/RED/GREEN (b5,b4,b3)': {
      bands: ['B5', 'B4', 'B3'],
      min: [0.05, 0.05, 0.05],
      max: [0.6, 0.4, 0.4],
      gamma: [1, 1, 1]
    },
    'Falsa cor: NIR/SWIR1/RED': {
      bands: ['B5', 'B6', 'B3'],
      min: [0.05, 0.05, 0.05],
      max: [0.6, 0.5, 0.4],
      gamma: [1, 1, 1]
    }
  };
 
  // Estado do ponto clicado e das coordenadas atuais
  var COORDS = null;
  var CLICKED = false;
 
  // Configurações do gráfico e redução espacial
  var OPTIONAL_PARAMS = {
    reducer: ee.Reducer.mean(),
    scale: 30,
    crs: 'EPSG:4674',
    chartParams: {
      pointSize: 14,
      legend: {position: 'none'},
      hAxis: {title: 'Data', titleTextStyle: {italic: false, bold: true}},
      vAxis: {title: indexSelect.getValue(),titleTextStyle: {italic: false, bold: true}
      },
      explorer: {}
    }
  };
 
 
  // #############################################################################
  // ### DEFINE FUNCTIONS ###
  // #############################################################################
 
  // Converte string "MM-DD" em objeto com mês e dia
  function parseMonthDay(value) {
    var parts = value.split('-');
    return {
      month: parseInt(parts[0], 10),
      day: parseInt(parts[1], 10)
    };
  }

  // Calcula o intervalo de datas, considerando virada de ano
  function getDateRange(year, startValue, endValue) {
    var startParts = parseMonthDay(startValue);
    var endParts = parseMonthDay(endValue);
    var startDate = ee.Date.fromYMD(year, startParts.month, startParts.day);
    var endDate = ee.Date.fromYMD(year, endParts.month, endParts.day);
    endDate = ee.Date(
      ee.Algorithms.If(
        endDate.millis().lt(startDate.millis()),
        endDate.advance(1, 'year'),
        endDate
      )
    );
    return {start: startDate, end: endDate.advance(1, 'day')};
  }

  // Máscara de nuvem/sombra baseada em QA_PIXEL para Landsat L2
  function maskL2(image) {
    var qa = image.select('QA_PIXEL');
    var mask = qa.bitwiseAnd(1).eq(0)
      .and(qa.bitwiseAnd(1 << 3).eq(0))
      .and(qa.bitwiseAnd(1 << 4).eq(0))
      .and(qa.bitwiseAnd(1 << 5).eq(0));
    return image.updateMask(mask).copyProperties(image, image.propertyNames());
  }

  // Adiciona índices espectrais NDVI e NBR
  function addIndices(image) {
    var ndvi = image.normalizedDifference(['B5', 'B4']).rename('NDVI');
    var nbr = image.normalizedDifference(['B5', 'B7']).rename('NBR');
    return image.addBands([ndvi, nbr]);
  }

  // Escala e renomeia bandas do Landsat 5/7 (Collection 2 Level-2)
  function prepareL57(image) {
    var scaled = image
      .select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'])
      .multiply(0.0000275)
      .add(-0.2)
      .rename(['B2', 'B3', 'B4', 'B5', 'B6', 'B7']);
    return scaled.copyProperties(image, image.propertyNames());
  }

  // Escala e renomeia bandas do Landsat 8/9 (Collection 2 Level-2)
  function prepareL89(image) {
    var scaled = image
      .select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
      .multiply(0.0000275)
      .add(-0.2)
      .rename(['B2', 'B3', 'B4', 'B5', 'B6', 'B7']);
    return scaled.copyProperties(image, image.propertyNames());
  }

  // Obtém coleção Landsat filtrada e preparada para análise
  function getCollection(datasetId, prepareFn, startDate, endDate, region, maxCloud) {
    return ee.ImageCollection(datasetId)
      .filterDate(startDate, endDate)
      .filterBounds(region)
      .filter(ee.Filter.lte('CLOUD_COVER', maxCloud))
      .map(maskL2)
      .map(prepareFn)
      .map(addIndices);
  }

  /**
   * ee-lcb annual Landsat collection plan.
   */
  // Gera mosaico anual com metadados para o card
  function imgColPlan(year, aoiBox){
    var dateRange = getDateRange(year, startDayBox.getValue(), endDayBox.getValue());
    var maxCloud = parseNumber(cloudBox.getValue(), inputCloudPercent);
    var landsatCol = getCollection('LANDSAT/LT05/C02/T1_L2', prepareL57, dateRange.start, dateRange.end, aoiBox, maxCloud)
      .merge(getCollection('LANDSAT/LE07/C02/T1_L2', prepareL57, dateRange.start, dateRange.end, aoiBox, maxCloud))
      .merge(getCollection('LANDSAT/LC08/C02/T1_L2', prepareL89, dateRange.start, dateRange.end, aoiBox, maxCloud))
      .merge(getCollection('LANDSAT/LC09/C02/T1_L2', prepareL89, dateRange.start, dateRange.end, aoiBox, maxCloud));
    // Seleciona o satélite dominante no ano para exibir apenas um nome no card
    var satHist = ee.Dictionary(landsatCol.aggregate_histogram('SPACECRAFT_ID'));
    var satKeys = satHist.keys().sort();
    var satCounts = satKeys.map(function(key) { return satHist.get(key); });
    var maxCount = ee.List(satCounts).reduce(ee.Reducer.max());
    var maxIndex = ee.List(satCounts).indexOf(maxCount);
    var satelliteText = ee.Algorithms.If(
      landsatCol.size().gt(0),
      ee.String(satKeys.get(maxIndex)),
      'Sem dados'
    );
    var wrsPath = landsatCol.aggregate_array('WRS_PATH').distinct().sort();
    var wrsRow = landsatCol.aggregate_array('WRS_ROW').distinct().sort();
    var orbitPointText = ee.String('Órbita: ')
      .cat(ee.String(wrsPath.join(', ')))
      .cat(' | Ponto: ')
      .cat(ee.String(wrsRow.join(', ')));
    var mosaic = landsatCol.median().clip(aoiBox);
    var timeStart = ee.Date.fromYMD(year, 6, 30).millis();
    return mosaic.set({
      composite_year: year,
      satellites: satelliteText,
      orbit_point: orbitPointText,
      'system:time_start': timeStart
    });
  }

  /**
   * Clears image cards from the image card panel.
   */
  // Remove os cards anteriores do painel
  function clearImgs() {
    imgCardPanel.clear();
  }

  // Converte texto para número com fallback seguro
  function parseNumber(value, fallback) {
    var parsed = Number(value);
    return isNaN(parsed) ? fallback : parsed;
  }

  // Converte graus decimais para DMS com hemisfério
  function degToDms(value, isLat) {
    var abs = Math.abs(value);
    var deg = Math.floor(abs);
    var minFloat = (abs - deg) * 60;
    var min = Math.floor(minFloat);
    var sec = (minFloat - min) * 60;
    var hemi = isLat ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
    return deg + '°' + min + '\'' + sec.toFixed(2) + '"' + hemi;
  }

  // Preenche com zeros à esquerda para largura fixa
  function padLeft(value, width) {
    var text = String(value);
    while (text.length < width) {
      text = '0' + text;
    }
    return text;
  }

  // Formata DMS compacto para rótulos internos
  function formatDmsCompact(value, isLat) {
    var abs = Math.abs(value);
    var deg = Math.floor(abs);
    var minFloat = (abs - deg) * 60;
    var min = Math.floor(minFloat);
    var sec = Math.round((minFloat - min) * 60);
    if (sec === 60) {
      sec = 0;
      min += 1;
    }
    if (min === 60) {
      min = 0;
      deg += 1;
    }
    var hemi = isLat ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
    var degWidth = isLat ? 2 : 3;
    return padLeft(deg, degWidth) + padLeft(min, 2) + padLeft(sec, 2) + hemi;
  }

  // Formata DMS simples usado nos cards
  function formatDmsSimple(value) {
    var abs = Math.abs(value);
    var deg = Math.floor(abs);
    var minFloat = (abs - deg) * 60;
    var min = Math.floor(minFloat);
    var sec = Math.round((minFloat - min) * 60);
    if (sec === 60) {
      sec = 0;
      min += 1;
    }
    if (min === 60) {
      min = 0;
      deg += 1;
    }
    var sign = value < 0 ? '-' : '';
    return sign + deg + '°' + padLeft(min, 2) + '\'' + padLeft(sec, 2) + '"';
  }

  // Atualiza rótulos DMS a partir do retângulo de visualização
  function updateDmsLabels(aoiBox) {
    aoiBox.bounds().coordinates().evaluate(function(coords) {
      if (!coords || !coords.length || !coords[0] || !coords[0].length) {
        dmsLabelNorth.setValue('');
        dmsLabelSouth.setValue('');
        dmsLabelWest.setValue('');
        dmsLabelEast.setValue('');
        return;
      }
      var ring = coords[0];
      var lons = ring.map(function(pt) { return pt[0]; });
      var lats = ring.map(function(pt) { return pt[1]; });
      var minLon = Math.min.apply(null, lons);
      var maxLon = Math.max.apply(null, lons);
      var minLat = Math.min.apply(null, lats);
      var maxLat = Math.max.apply(null, lats);
      dmsLabelNorth.setValue('N: ' + degToDms(maxLat, true));
      dmsLabelSouth.setValue('S: ' + degToDms(minLat, true));
      dmsLabelWest.setValue('W: ' + degToDms(minLon, false));
      dmsLabelEast.setValue('E: ' + degToDms(maxLon, false));
    });
  }

  // Cria moldura do recorte no card
  function createFrameImage(aoiBox) {
    return ee.Image().byte()
      .paint(ee.FeatureCollection(aoiBox), 1, 2)
      .visualize({palette: '000000'});
  }
 
  /**
   * Displays image cards to the card panel.
   */
 
  // Monta e exibe os cards de imagem e exportações para Drive
  function displayBrowseImg(col, aoiBox, aoiCircle, aoiArea, aoiArea2, centroidCoords, areaHaText) {
    clearImgs();
    waitMsgImgPanel.style().set('shown', true);
    imgCardPanel.add(waitMsgImgPanel);
 
    // Coleta metadados para preencher cabeçalhos dos cards
    var dates = col.aggregate_array('composite_year');
    var satellites = col.aggregate_array('satellites');
    var orbitPoints = col.aggregate_array('orbit_point');
   
    // Avalia no servidor para montar a UI com dados locais
    ee.Dictionary({dates: dates, satellites: satellites, orbitPoints: orbitPoints, areaHa: areaHaText, centroid: centroidCoords}).evaluate(function(result) {
      var datesList = (result && result.dates) ? result.dates : [];
      var satellitesList = (result && result.satellites) ? result.satellites : [];
      var orbitPointsList = (result && result.orbitPoints) ? result.orbitPoints : [];
      var areaHaValue = (result && result.areaHa) ? result.areaHa : null;
      var centroid = (result && result.centroid) ? result.centroid : null;
      var dmsLat = (centroid && centroid.length > 1) ? formatDmsSimple(centroid[1]) : '';
      var dmsLon = (centroid && centroid.length > 0) ? formatDmsSimple(centroid[0]) : '';
      var infoText = '';
      // Texto informativo com área e coordenadas do centroide
      if (areaHaValue) {
        infoText = 'Área: ' + areaHaValue + ' ha';
      }
      if (dmsLat && dmsLon) {
        infoText = infoText ? (infoText + ' | ' + dmsLat + ' ' + dmsLon) : (dmsLat + ' ' + dmsLon);
      }
      waitMsgImgPanel.style().set('shown', false);
      // Itera por ano e monta o card correspondente
      datesList.forEach(function(date, index) {
        var img = col.filter(ee.Filter.eq('composite_year', date)).first();
        var satelliteName = satellitesList[index] || 'Sem dados';
        var orbitPointText = orbitPointsList[index] || 'Órbita: - | Ponto: -';
        var visParams = RGB_PARAMS[rgbSelect.getValue()];
        var safeSatellite = satelliteName
          .replace(/[^A-Za-z0-9_]+/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_+|_+$/g, '');
       
        // Camadas vetoriais do dano ambiental e área do imóvel
        var aoiAreaDano = ee.Image()
          .paint(ee.FeatureCollection(aoiArea),20, 2)
          .visualize({palette: AOI_AREA});
        // Composição visual final do card
        var overlay = img.visualize(visParams);
        overlay = overlay.blend(createFrameImage(aoiBox));
        overlay = overlay.blend(aoiAreaDano);
        if (aoiArea2) {
          var aoiArea2Img = ee.Image()
            .paint(ee.FeatureCollection(aoiArea2), 20, 2)
            .visualize({palette: '0000ff'});
          overlay = overlay.blend(aoiArea2Img);
        }
       
        // Miniatura do mosaico anual
        var thumbnail = ui.Thumbnail({
          image: overlay,
          params: {
            region: aoiBox,
            dimensions: dimensionBox.getValue(),
            crs: 'EPSG:4674',
            format: 'PNG'
          }
        });
       
        // Legenda do card com cores das áreas
        var legendRow = ui.Panel({
          layout: ui.Panel.Layout.Flow('horizontal'),
          style: {margin: '2px 4px 2px 8px'}
        });
        var legendLabelA = legendBox1.getValue() || legendLabelDano;
        var legendLabelB = legendBox2.getValue() || legendLabelAreaImovel;
        var legendItemColor1 = ui.Label('', {backgroundColor: 'red', padding: '6px', margin: '0px 6px 0px 0px'});
        var legendItemText1 = ui.Label(legendLabelA, {fontSize: '11px', margin: '0px 10px 0px 0px'});
        legendRow.add(legendItemColor1);
        legendRow.add(legendItemText1);
        if (aoiArea2) {
          var legendItemColor2 = ui.Label('', {backgroundColor: '0000ff', padding: '6px', margin: '0px 6px 0px 0px'});
          var legendItemText2 = ui.Label(legendLabelB, {fontSize: '11px', margin: '0px'});
          legendRow.add(legendItemColor2);
          legendRow.add(legendItemText2);
        }
      
        var infoLabel = infoText ? ui.Label(infoText, {margin: '0px 4px 2px 8px', fontSize: '11px'}) : null;
        // Conjunto de elementos do card
        var imgCardItems = [
          ui.Label(date + ' | ' + satelliteName + ' | ' + orbitPointText,
            {margin: '4px 4px 2px 8px', fontSize: '13px', fontWeight: 'bold'}),
          legendRow,
          thumbnail
        ];
        if (infoLabel) {
          imgCardItems.splice(2, 0, infoLabel);
        }
        var imgCard = ui.Panel(imgCardItems, null, {margin: '4px 0px 0px 4px' , width: 'px'});
       
        imgCardPanel.add(imgCard);
       
        // Exporta o mosaico para o Drive
        var imgExpDrive = img.toFloat()
       
        var exportDescription = 'composite_' + date + (safeSatellite ? '_' + safeSatellite : '');
        var exportToDrive = Export.image.toDrive({
          image: imgExpDrive.select(['B6', 'B5', 'B3']),
          description: exportDescription,
          scale: 30,
          region: aoiBox,
          maxPixels: 9e10,
          crs: crsBox.getValue(),
          folder: folderBox.getValue()
        });
       
      });
    });
 
  }
 
  /**
   * Generates chart and adds image cards to the image panel.
   */
  // Orquestra o processamento de coleção, cards e gráfico
  function renderGraphics(coords) {
    // Get the selected RGB combo vis params.
    var visParams = RGB_PARAMS[rgbSelect.getValue()];
    var currentStartYear = parseInt(startYearBox.getValue(), 10);
    var currentEndYear = parseInt(endYearBox.getValue(), 10);
    var currentBuffer = parseNumber(bufferBox.getValue(), aoiCircleBuffer);
    var currentZoom = parseInt(zoomBox.getValue(), 10);
   
    // Define área de interesse com base no clique
    var point = ee.Geometry.Point(coords);
    var aoiCircle = point.buffer(currentBuffer);
    var aoiBox = point.buffer(regionWidthSlider.getValue()*1000/2).bounds();
    var aoiArea = ee.FeatureCollection(table);
    var aoiArea2 = featTable2;
    var areaGeometry = aoiArea.geometry();
    var areaHaText = areaGeometry.area({maxError: 1, proj: ee.Projection(crsExportImage)}).divide(10000).format('%.2f');
    var areaCentroidCoords = areaGeometry.centroid().coordinates();
   
    // Limpa camadas anteriores do mapa
    map.layers().forEach(function(el) {
      map.layers().remove(el);
    });
   
    var visParamsArea = {color: 'red', fillColor: '00000000', width: 4};
    var areaLabel1 = legendBox1.getValue() || legendLabelDano;
    var areaLabel2 = legendBox2.getValue() || legendLabelAreaImovel;
  
    // Adiciona camadas de referência no mapa
    map.addLayer(aoiArea.style(visParamsArea), {}, areaLabel1);
    if (aoiArea2) {
      map.addLayer(aoiArea2.style({color: '0000ff', fillColor: '00000000', width: 4}), {}, areaLabel2);
    }
    map.addLayer(createFrameImage(aoiBox), {}, 'Moldura');

    map.centerObject(aoiBox, currentZoom);
    updateDmsLabels(aoiBox);
   
    var startYear = isNaN(currentStartYear) ? inputStartYear : currentStartYear;
    var endYear = isNaN(currentEndYear) ? inputEndYear : currentEndYear;
    // Gera coleção anual de mosaicos
    var years = ee.List.sequence(startYear, endYear);
    var col = ee.ImageCollection.fromImages(
      years.map(function(year) { return imgColPlan(year, aoiBox); })
    ).sort('composite_year');
 
    // Exibe cards e gráfico temporal
    displayBrowseImg(col, aoiBox, aoiCircle, aoiArea, aoiArea2, areaCentroidCoords, areaHaText);
    OPTIONAL_PARAMS['chartParams']['vAxis']['title'] = indexSelect.getValue();
   
    // Render the time series chart.
    rgbTs.rgbTimeSeriesChart(col, aoiCircle, indexSelect.getValue(), visParams,
      chartPanel, OPTIONAL_PARAMS);
  }
 
  /**
   * Handles map clicks.
   */
  // Evento de clique no mapa
  function handleMapClick(coords) {
    CLICKED = true;
    COORDS = [coords.lon, coords.lat];
    ui.url.set('run', 'true');
    ui.url.set('lon', COORDS[0]);
    ui.url.set('lat', COORDS[1]);
    renderGraphics(COORDS);
  }
 
  /**
   * Handles submit button click.
   */
  // Evento do botão de submissão das opções
  function handleSubmitClick() {
    renderGraphics(COORDS);
    submitButton.style().set('shown', false);
  }

  /**
   * Sets URL params.
   */
  // Atualiza parâmetros de URL para persistência de estado
  function setParams() {
    ui.url.set('from', startDayBox.getValue());
    ui.url.set('to', endDayBox.getValue());
    ui.url.set('index', indexSelect.getValue());
    ui.url.set('rgb', rgbSelect.getValue());
    ui.url.set('chipwidth', regionWidthSlider.getValue());
  }  
   
  /**
   * Show/hide the submit button.
   */
  // Exibe botão de submissão quando houver alterações
  function showSubmitButton() {
    if(CLICKED) {
      submitButton.style().set('shown', true);
    }
  }
 
  /**
   * Handles options changes.
   */
  // Handler geral de alterações nas opções
  function optionChange() {
    showSubmitButton();
    setParams();
  }
 
  /**
   * Show/hide the control panel.
   */
  var controlShow = false;
  // Alterna visibilidade do painel de opções
  function controlButtonHandler() {
    if(controlShow) {
      controlShow = false;
      controlElements.style().set('shown', false);
      controlButton.setLabel('Opções ❯');
    } else {
      controlShow = true;
      controlElements.style().set('shown', true);
      controlButton.setLabel('Opções ❮');
    }
   
    if(infoShow | controlShow) {
      controlPanel.style().set('width', CONTROL_PANEL_WIDTH);
    } else {
      controlPanel.style().set('width', CONTROL_PANEL_WIDTH_HIDE);
    }
  }

  var infoShow = false;
  // Alterna visibilidade do painel de informações
  function infoButtonHandler() {
    if(infoShow) {
      infoShow = false;
      infoElements.style().set('shown', false);
      infoButton.setLabel('Sobre ❯');
    } else {
      infoShow = true;
      infoElements.style().set('shown', true);
      infoButton.setLabel('Sobre ❮');
    }

    if(infoShow | controlShow) {
      controlPanel.style().set('width', CONTROL_PANEL_WIDTH);
    } else {
      controlPanel.style().set('width', CONTROL_PANEL_WIDTH_HIDE);
    }
  }

  // Monta a hierarquia de painéis
  infoElements.add(infoLabel);
  infoElements.add(aboutLabel);
  infoElements.add(appCodeLink);

  controlElements.add(optionsLabel);
  controlElements.add(datePanel);
  controlElements.add(indexPanel);
  controlElements.add(rgbPanel);
  controlElements.add(regionWidthPanel);
  controlElements.add(exportPanel);
  controlElements.add(legendPanel);
  controlElements.add(submitButton);

  controlPanel.add(instr);
  controlPanel.add(buttonPanel);
  controlPanel.add(infoElements);
  controlPanel.add(controlElements);

  map.add(controlPanel);

  // Eventos de interface
  infoButton.onClick(infoButtonHandler);
  controlButton.onClick(controlButtonHandler);
  startDayBox.onChange(optionChange);
  endDayBox.onChange(optionChange);
  rgbSelect.onChange(optionChange);
  indexSelect.onChange(optionChange);
  regionWidthSlider.onChange(optionChange);
  startYearBox.onChange(optionChange);
  endYearBox.onChange(optionChange);
  bufferBox.onChange(optionChange);
  zoomBox.onChange(optionChange);
  dimensionBox.onChange(optionChange);
  crsBox.onChange(optionChange);
  folderBox.onChange(optionChange);
  cloudBox.onChange(optionChange);
  legendBox1.onChange(optionChange);
  legendBox2.onChange(optionChange);
  submitButton.onClick(handleSubmitClick);
  map.onClick(handleMapClick);

  // Ajustes visuais do mapa
  map.style().set('cursor', 'crosshair');
  map.setOptions('SATELLITE');
  map.setControlVisibility(
    {layerList: true, fullscreenControl: false, zoomControl: false});

  // Renderização final do app
  ui.root.clear();
  ui.root.add(splitPanel);

  // Reexecuta ao abrir com parâmetros na URL
  if(ui.url.get('run')) {
    CLICKED = true;
    COORDS = [ui.url.get('lon'), ui.url.get('lat')];
    renderGraphics(COORDS);
  }
