# Geo_analise — Scripts Google Earth Engine

Este repositório contém scripts do Google Earth Engine (GEE) para análise de séries temporais de desmatamento e geração de cartões de imagem com exportação para o Google Drive.

## Scripts

### Script_Anual_LandSat.js
- **Objetivo**: gerar composições anuais (mediana) com Landsat 5/7/8/9 para cada ano do intervalo, usando uma janela de meses/dias configurável (pode cruzar o ano).
- **Fonte de dados**: Landsat Collection 2 L2 (`LANDSAT/LT05/LE07/LC08/LC09`).
- **Entrada principal**: `table` (FeatureCollection do dano ambiental) e `table2` opcional (área do imóvel).
- **Parâmetros-chave**: ano inicial/final, janela “mês-dia”, % máximo de nuvem, buffer de média, zoom e dimensões do card.
- **Saídas**: cards por ano, gráfico de séries temporais (NDVI/NBR) e exportação Drive das bandas `B6/B5/B3`.

### Script_mensal_copernicus.js
- **Objetivo**: gerar composições mensais (mediana) com Sentinel‑2 SR para cada mês/ano do intervalo informado.
- **Fonte de dados**: `COPERNICUS/S2_SR_HARMONIZED`.
- **Entrada principal**: `table` e `table2` opcional.
- **Parâmetros-chave**: ano/mês inicial e final, % máximo de nuvem, buffer de média, zoom e dimensões do card.
- **Saídas**: cards por mês, gráfico de séries temporais (NDVI/NBR) e exportação Drive das bandas `B11/B8/B3`.

### Script_diario_semanal_copernicus.js
- **Objetivo**: listar **imagens disponíveis** no período informado (sem agregação diária/semanal), exibindo cada cena individualmente.
- **Fonte de dados**: `COPERNICUS/S2_SR_HARMONIZED`.
- **Entrada principal**: `table` e `table2` opcional.
- **Parâmetros-chave**: data inicial/final (AAAA-MM-DD), % máximo de nuvem, buffer de média, zoom e dimensões do card.
- **Saídas**: cards por imagem disponível, gráfico de séries temporais (NDVI/NBR) e exportação Drive das bandas `B11/B8/B3`.

## Como usar (resumo)
- Abra o script desejado no GEE Code Editor.
- Defina `table` (e `table2` se aplicável) com seus assets.
- Ajuste as opções no painel do app e clique no mapa para gerar a série temporal e os cards.

