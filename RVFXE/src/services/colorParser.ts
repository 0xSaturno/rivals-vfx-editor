/**
 * Color parameter extraction from JSON asset files.
 * Handles multiple UAsset JSON format types.
 */
import type { ColorParam, FilterDictionary } from '@/types';

/**
 * Check if a parameter name matches the filter dictionary rules.
 */
export function paramMatchesFilter(paramName: string, filterDictionary: FilterDictionary): boolean {
  if (!filterDictionary) return false;

  const paramNameLower = (paramName || '').toLowerCase();
  const includeKeywords = (filterDictionary.include_keywords || []).map(k => String(k).toLowerCase());
  const excludeKeywords = (filterDictionary.exclude_keywords || []).map(k => String(k).toLowerCase());

  // include requires at least one include keyword (if include list empty => allow all)
  const hasIncludeKeyword = includeKeywords.length === 0
    ? true
    : includeKeywords.some(keyword => paramNameLower.includes(keyword));

  // substring exclusions (JSON-driven)
  const hasExcludedKeyword = excludeKeywords.some(keyword => paramNameLower.includes(keyword));

  // debug: show why a param is rejected
  if (!hasIncludeKeyword || hasExcludedKeyword) {
    console.debug('[paramMatchesFilter] excluded', {
      paramName,
      hasIncludeKeyword,
      hasExcludedKeyword,
      includeKeywords,
      excludeKeywords,
    });
  }

  return hasIncludeKeyword && !hasExcludedKeyword;
}

/**
 * Get the color property names from the filter dictionary, with fallbacks.
 */
function getColorPropertyNames(filterDictionary: FilterDictionary): string[] {
  return filterDictionary?.color_property_names || [
    'ColorAndOpacity', 'SpecifiedColor', 'BaseColor', 'HighlightColor',
    'FontTopColor', 'FontButtomColor', 'VectorParameter', 'ShadowColor',
    'ContentColor', 'OutlineColor', 'Color', 'TextColor', 'BackgroundColor',
  ];
}

/**
 * Recursively search a nested object tree for color properties.
 */
function findColorsRecursive(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentObject: any,
  currentPath: (string | number)[],
  fileName: string,
  parentName: string,
  allParams: ColorParam[],
  relativePath: string,
  filterDictionary: FilterDictionary
): void {
  if (!currentObject || typeof currentObject !== 'object') return;

  const colorNames = getColorPropertyNames(filterDictionary);
  const isColorProperty = colorNames.includes(currentObject.Name) && currentObject.StructType === 'LinearColor';
  const colorValue = currentObject?.Value?.[0]?.Value;

  if (isColorProperty && colorValue && typeof colorValue.R !== 'undefined') {
    const paramName = `${parentName} - ${currentObject.Name}`;

    if (!paramMatchesFilter(paramName, filterDictionary)) return;

    const id = `${relativePath}-${parentName}-${currentObject.Name}-${allParams.length}`;
    const path = [...currentPath, 'Value', 0, 'Value'];

    const sanitizedRgba = {
      R: parseFloat(colorValue.R) || 0,
      G: parseFloat(colorValue.G) || 0,
      B: parseFloat(colorValue.B) || 0,
      A: parseFloat(colorValue.A) || 0,
    };

    allParams.push({ id, fileName, paramName, path, rgba: sanitizedRgba, relativePath });
    console.debug('[findColorsRecursive] Found color:', paramName, sanitizedRgba);
  } else {
    if (Array.isArray(currentObject)) {
      currentObject.forEach((item, index) => {
        findColorsRecursive(item, [...currentPath, index], fileName, parentName, allParams, relativePath, filterDictionary);
      });
    } else {
      for (const key in currentObject) {
        if (Object.prototype.hasOwnProperty.call(currentObject, key)) {
          findColorsRecursive(currentObject[key], [...currentPath, key], fileName, parentName, allParams, relativePath, filterDictionary);
        }
      }
    }
  }
}

/**
 * Parse a JSON asset file and extract all color parameters.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseJsonAndExtractColors(
  json: any,
  fileName: string,
  relativePath: string,
  allParams: ColorParam[],
  filterDictionary: FilterDictionary,
  addDebugLog: (msg: string) => void
): void {
  const firstExport = Array.isArray(json?.Exports) ? json.Exports[0] : null;
  const firstExportData = firstExport?.Data;

  if (typeof firstExportData === 'string') {
    console.warn(`Unsupported RawExport JSON for color extraction: ${fileName}`, {
      relativePath,
      exportType: firstExport?.$type,
      objectName: firstExport?.ObjectName,
    });
    addDebugLog(`Unsupported RawExport JSON: ${fileName} (${firstExport?.ObjectName || 'unknown export'})`);
    return;
  }

  // FORMAT TYPE 1: VFX Material File (original format)
  const vectorParamsArray = Array.isArray(firstExportData)
    ? firstExportData.find((p: any) => p.Name === 'VectorParameterValues')
    : null;

  if (vectorParamsArray && vectorParamsArray.Value) {
    vectorParamsArray.Value.forEach((param: any, paramIndex: number) => {
      const paramInfo = param?.Value?.find((p: any) => p.Name === 'ParameterInfo');
      const paramName = paramInfo?.Value?.find((p: any) => p.Name === 'Name')?.Value;

      if (paramName) {
        if (!paramMatchesFilter(paramName, filterDictionary)) return;

        const paramValueObj = param?.Value?.find((p: any) => p.Name === 'ParameterValue');
        const linearColor = paramValueObj?.Value?.find((p: any) => p.Name === 'ParameterValue')?.Value;

        if (linearColor) {
          const id = `${relativePath}-${paramName}-${paramIndex}`;
          const vectorParamIndex = firstExportData.findIndex((p: any) => p.Name === 'VectorParameterValues');
          const path: (string | number)[] = [
            'Exports', 0, 'Data',
            vectorParamIndex,
            'Value', paramIndex, 'Value',
            param.Value.findIndex((p: any) => p.Name === 'ParameterValue'),
            'Value', 0, 'Value',
          ];

          const sanitizedRgba = {
            R: parseFloat(linearColor.R) || 0,
            G: parseFloat(linearColor.G) || 0,
            B: parseFloat(linearColor.B) || 0,
            A: parseFloat(linearColor.A) || 0,
          };

          allParams.push({ id, fileName, paramName, path, rgba: sanitizedRgba, relativePath });
        }
      }
    });
  }
  // FORMAT TYPE 2: RichText blueprints support
  else if (firstExport?.$type === 'UAssetAPI.ExportTypes.DataTableExport, UAssetAPI' && firstExport?.Table?.Data) {
    const tableData = firstExport.Table.Data;
    const tablePath: (string | number)[] = ['Exports', 0, 'Table', 'Data'];

    tableData.forEach((row: any, rowIndex: number) => {
      if (row.StructType === 'RichTextStyleRow') {
        const styleName = row.Name;
        const rowPath = [...tablePath, rowIndex, 'Value'];
        findColorsRecursive(row.Value, rowPath, fileName, styleName, allParams, relativePath, filterDictionary);
      }
    });
  }
  // FORMAT TYPE 3: Generic Blueprint support
  else if (Array.isArray(json?.Exports)) {
    json.Exports.forEach((exportItem: any, exportIndex: number) => {
      if (Array.isArray(exportItem.Data)) {
        const parentName = exportItem.ObjectName || `Export_${exportIndex}`;
        const basePath: (string | number)[] = ['Exports', exportIndex, 'Data'];
        findColorsRecursive(exportItem.Data, basePath, fileName, parentName, allParams, relativePath, filterDictionary);
      } else if (typeof exportItem.Data === 'string') {
        console.warn(`Skipping RawExport entry during generic color scan: ${fileName}`, {
          relativePath,
          exportIndex,
          exportType: exportItem?.$type,
          objectName: exportItem?.ObjectName,
        });
      }
    });
  }

  console.debug(`[parseJsonAndExtractColors] Extracted ${allParams.length} params from ${fileName}`);
}
