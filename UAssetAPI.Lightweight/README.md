# UAssetAPI - Lightweight

A lightweight fork of [UAssetAPI](https://github.com/atenfyr/UAssetAPI) - a low-level .NET library for reading and writing Unreal Engine game assets.

## What's Different?

This is a **stripped-down version** of UAssetAPI that retains only the essential features:

- **JSON ↔ UAsset conversion** - Full support for serializing/deserializing assets to/from JSON
- **Usmap loading** - Support for unversioned game files with .usmap mappings
- **Parallel batch processing** - New `BatchProcessor` class for processing multiple files concurrently

### Removed Components

The following have been removed to reduce size and dependencies:

- **Kismet bytecode parsing** - Blueprint bytecode is preserved as raw bytes instead of being parsed
- **PAK file support** - No repak integration (removed ~6.5MB of native binaries)
- **Ace Combat 7 encryption** - Game-specific decryption removed

## Usage

### Basic UAsset to JSON

```csharp
using UAssetAPI;
using UAssetAPI.Unversioned;

// Load usmap for unversioned assets
var mappings = new Usmap("path/to/mappings.usmap");

// Read and convert to JSON
var asset = new UAsset("path/to/asset.uasset", EngineVersion.VER_UE5_3, mappings);
string json = asset.SerializeJson(isFormatted: true);
File.WriteAllText("output.json", json);
```

### JSON to UAsset

```csharp
string json = File.ReadAllText("asset.json");
var asset = UAsset.DeserializeJson(json);
asset.Write("output.uasset");
```

### Parallel Batch Processing

```csharp
using UAssetAPI;

// Configure batch options
var options = new BatchProcessOptions
{
    MaxDegreeOfParallelism = Environment.ProcessorCount,
    EngineVersion = EngineVersion.VER_UE5_3,
    Mappings = new Usmap("mappings.usmap"),
    FormatJson = true,
    ProgressCallback = (result, current, total) =>
    {
        Console.WriteLine($"[{current}/{total}] {(result.Success ? "OK" : "FAIL")}: {result.InputPath}");
    }
};

// Convert all .uasset files in a directory to JSON
var results = BatchProcessor.ConvertDirectoryToJson(
    inputDirectory: @"C:\Game\Content",
    outputDirectory: @"C:\Output\Json",
    recursive: true,
    options: options
);

// Or convert specific files
string[] files = { "asset1.uasset", "asset2.uasset", "asset3.uasset" };
var results2 = BatchProcessor.UAssetToJson(files, outputDirectory: null, options);

// Async version available
var results3 = await BatchProcessor.UAssetToJsonAsync(files, options: options);
```

### Convert JSON back to UAsset (batch)

```csharp
var results = BatchProcessor.ConvertDirectoryToUAsset(
    inputDirectory: @"C:\Output\Json",
    outputDirectory: @"C:\Output\Assets",
    recursive: true,
    options: options
);
```

## Building

```bash
dotnet build -c Release
```

Output: `UAssetAPI\bin\Release\net8.0\UAssetAPI.dll`

## Dependencies

- .NET 8.0
- Newtonsoft.Json 13.0.3
- ZstdSharp.Port 0.8.1

## License

UAssetAPI is distributed under the MIT license. See [LICENSE](./LICENSE) for more information.

Based on [UAssetAPI](https://github.com/atenfyr/UAssetAPI) by Atenfyr.
