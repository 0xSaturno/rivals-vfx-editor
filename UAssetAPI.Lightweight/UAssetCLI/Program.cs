using System.Text.Json;
using UAssetAPI;
using UAssetAPI.UnrealTypes;
using UAssetAPI.Unversioned;

namespace UAssetCLI;

class Program
{
    static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = false,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    static int Main(string[] args)
    {
        if (args.Length == 0)
        {
            PrintUsage();
            return 1;
        }

        var command = args[0].ToLowerInvariant();

        try
        {
            return command switch
            {
                "to-json" => HandleToJson(args),
                "from-json" => HandleFromJson(args),
                "batch-to-json" => HandleBatchToJson(args),
                "batch-from-json" => HandleBatchFromJson(args),
                "version" => HandleVersion(),
                "--help" or "-h" or "help" => PrintUsage(),
                _ => PrintUsage()
            };
        }
        catch (Exception ex)
        {
            OutputError(99, $"Unexpected error: {ex.Message}", ex.ToString());
            return 99;
        }
    }

    static int PrintUsage()
    {
        Console.WriteLine(@"
UAssetCLI - Convert Unreal Engine assets to/from JSON (Lightweight)

Usage:
  UAssetCLI <command> [options]

Commands:
  to-json <input.uasset> <output.json> [--usmap <path>]
      Convert a .uasset file to JSON

  from-json <input.json> <output.uasset> [--usmap <path>]
      Convert a JSON file back to .uasset

  batch-to-json <input-list.txt> <output-dir> [--usmap <path>]
      Convert multiple .uasset files to JSON (for 100+ files)
      Input list: one .uasset path per line (or: inputPath,outputRelPath)

  batch-from-json <input-list.txt> <output-dir> [--usmap <path>]
      Convert multiple JSON files back to .uasset
      Input list: one JSON path per line (or: jsonPath,outputName)

  version
      Display version information

Options:
  --usmap, -u <path>    Path to .usmap mapping file (required for Marvel Rivals)
  --help, -h            Show this help message
");
        return 1;
    }

    static string? GetOptionValue(string[] args, params string[] optionNames)
    {
        for (int i = 0; i < args.Length - 1; i++)
        {
            if (optionNames.Contains(args[i].ToLowerInvariant()))
            {
                return args[i + 1];
            }
        }
        return null;
    }

    static Usmap? LoadUsmap(string? usmapPath)
    {
        if (string.IsNullOrEmpty(usmapPath) || !File.Exists(usmapPath))
            return null;

        return new Usmap(usmapPath);
    }

    static int HandleToJson(string[] args)
    {
        if (args.Length < 3)
        {
            OutputError(1, "Usage: UAssetCLI to-json <input.uasset> <output.json> [--usmap <path>]");
            return 1;
        }

        var inputPath = args[1];
        var outputPath = args[2];
        var usmapPath = GetOptionValue(args, "--usmap", "-u");

        if (!File.Exists(inputPath))
        {
            OutputError(2, $"Input file not found: {inputPath}");
            return 2;
        }

        try
        {
            var usmap = LoadUsmap(usmapPath);
            var asset = new UAsset(inputPath, EngineVersion.VER_UE5_3, usmap);

            string json = asset.SerializeJson(Newtonsoft.Json.Formatting.Indented);

            // Ensure output directory exists
            var outputDir = Path.GetDirectoryName(outputPath);
            if (!string.IsNullOrEmpty(outputDir))
                Directory.CreateDirectory(outputDir);

            File.WriteAllText(outputPath, json);

            OutputSuccess(new
            {
                inputPath,
                outputPath,
                cached = false
            });
            return 0;
        }
        catch (Exception ex)
        {
            OutputError(4, $"Parse error: {ex.Message}", ex.ToString());
            return 4;
        }
    }

    static int HandleFromJson(string[] args)
    {
        if (args.Length < 3)
        {
            OutputError(1, "Usage: UAssetCLI from-json <input.json> <output.uasset> [--usmap <path>]");
            return 1;
        }

        var inputPath = args[1];
        var outputPath = args[2];
        var usmapPath = GetOptionValue(args, "--usmap", "-u");

        if (!File.Exists(inputPath))
        {
            OutputError(2, $"Input file not found: {inputPath}");
            return 2;
        }

        try
        {
            var usmap = LoadUsmap(usmapPath);
            string json = File.ReadAllText(inputPath);
            var asset = UAsset.DeserializeJson(json);
            if (usmap != null) asset.Mappings = usmap;

            // Ensure output directory exists
            var outputDir = Path.GetDirectoryName(outputPath);
            if (!string.IsNullOrEmpty(outputDir))
                Directory.CreateDirectory(outputDir);

            asset.Write(outputPath);

            OutputSuccess(new
            {
                inputPath,
                outputPath
            });
            return 0;
        }
        catch (Exception ex)
        {
            OutputError(5, $"Write error: {ex.Message}", ex.ToString());
            return 5;
        }
    }

    static int HandleBatchToJson(string[] args)
    {
        if (args.Length < 3)
        {
            OutputError(1, "Usage: UAssetCLI batch-to-json <input-list.txt> <output-dir> [--usmap <path>]");
            return 1;
        }

        var inputListPath = args[1];
        var outputDir = args[2];
        var usmapPath = GetOptionValue(args, "--usmap", "-u");

        if (!File.Exists(inputListPath))
        {
            OutputError(2, $"Input list file not found: {inputListPath}");
            return 2;
        }

        try
        {
            var inputPaths = File.ReadAllLines(inputListPath)
                .Where(line => !string.IsNullOrWhiteSpace(line))
                .ToList();

            Directory.CreateDirectory(outputDir);

            // Load usmap ONCE for the entire batch
            var usmap = LoadUsmap(usmapPath);

            int succeeded = 0;
            int failed = 0;
            int completed = 0; // Atomic counter for progress
            int total = inputPaths.Count;
            var results = new List<object>();
            var lockObj = new object();

            // Parallel processing for performance
            Parallel.ForEach(inputPaths, new ParallelOptions { MaxDegreeOfParallelism = Environment.ProcessorCount }, (line, _) =>
            {
                var parts = line.Split(',');
                var inputPath = parts[0].Trim();
                var fileName = Path.GetFileName(inputPath);
                
                var outputSubPath = parts.Length > 1 ? parts[1].Trim() : Path.ChangeExtension(fileName, ".json");
                var outputPath = Path.Combine(outputDir, outputSubPath);
                
                try
                {
                    if (!File.Exists(inputPath))
                    {
                        lock (lockObj)
                        {
                            failed++;
                            results.Add(new { success = false, fileName, error = "File not found" });
                        }
                        var current = Interlocked.Increment(ref completed);
                        OutputProgress(current, total, fileName, false, "File not found");
                        return;
                    }

                    // Ensure directory exists for output
                    var fileOutputDir = Path.GetDirectoryName(outputPath);
                    if (!string.IsNullOrEmpty(fileOutputDir))
                         Directory.CreateDirectory(fileOutputDir);

                    var asset = new UAsset(inputPath, EngineVersion.VER_UE5_3, usmap);
                    string json = asset.SerializeJson(Newtonsoft.Json.Formatting.Indented);
                    File.WriteAllText(outputPath, json);

                    lock (lockObj)
                    {
                        succeeded++;
                        results.Add(new
                        {
                            success = true,
                            fileName,
                            uassetPath = inputPath,
                            jsonPath = outputPath,
                            cached = false
                        });
                    }
                    var currentSuccess = Interlocked.Increment(ref completed);
                    OutputProgress(currentSuccess, total, fileName, false, null);
                }
                catch (Exception ex)
                {
                    lock (lockObj)
                    {
                        failed++;
                        results.Add(new { success = false, fileName, error = ex.Message });
                    }
                    var currentFail = Interlocked.Increment(ref completed);
                    OutputProgress(currentFail, total, fileName, false, ex.Message);
                }
            });

            // Final summary
            Console.WriteLine(JsonSerializer.Serialize(new
            {
                success = true,
                command = "batch-to-json",
                total,
                succeeded,
                failed,
                cachedCount = 0,
                results
            }, JsonOptions));

            return failed > 0 ? 4 : 0;
        }
        catch (Exception ex)
        {
            OutputError(4, $"Batch processing error: {ex.Message}", ex.ToString());
            return 4;
        }
    }

    static int HandleBatchFromJson(string[] args)
    {
        if (args.Length < 3)
        {
            OutputError(1, "Usage: UAssetCLI batch-from-json <input-list.txt> <output-dir> [--usmap <path>]");
            return 1;
        }

        var inputListPath = args[1];
        var outputDir = args[2];
        var usmapPath = GetOptionValue(args, "--usmap", "-u");

        if (!File.Exists(inputListPath))
        {
            OutputError(2, $"Input list file not found: {inputListPath}");
            return 2;
        }

        try
        {
            var inputLines = File.ReadAllLines(inputListPath)
                .Where(line => !string.IsNullOrWhiteSpace(line))
                .ToList();

            Directory.CreateDirectory(outputDir);

            // Load usmap ONCE for the entire batch
            var usmap = LoadUsmap(usmapPath);

            int succeeded = 0;
            int failed = 0;
            int completed = 0; // Atomic counter for progress
            int total = inputLines.Count;
            var results = new List<object>();
            var lockObj = new object();

            Parallel.ForEach(inputLines, new ParallelOptions { MaxDegreeOfParallelism = Environment.ProcessorCount }, (line, _) =>
            {
                // Format: jsonPath or jsonPath,outputName
                var parts = line.Split(',');
                var jsonPath = parts[0].Trim();
                var fileName = Path.GetFileName(jsonPath);
                var outputName = parts.Length > 1 ? parts[1].Trim() : Path.ChangeExtension(fileName, ".uasset");
                var outputPath = Path.Combine(outputDir, outputName);

                try
                {
                    if (!File.Exists(jsonPath))
                    {
                        lock (lockObj)
                        {
                            failed++;
                            results.Add(new { success = false, fileName, error = "File not found" });
                        }
                        var current = Interlocked.Increment(ref completed);
                        OutputProgress(current, total, fileName, false, "File not found");
                        return;
                    }

                    string json = File.ReadAllText(jsonPath);
                    var asset = UAsset.DeserializeJson(json);
                    if (usmap != null) asset.Mappings = usmap;
                    
                    // Ensure output directory exists (for nested folder structures)
                    var outputFileDir = Path.GetDirectoryName(outputPath);
                    if (!string.IsNullOrEmpty(outputFileDir))
                        Directory.CreateDirectory(outputFileDir);
                    
                    asset.Write(outputPath);

                    lock (lockObj)
                    {
                        succeeded++;
                        results.Add(new
                        {
                            success = true,
                            fileName,
                            jsonPath,
                            uassetPath = outputPath
                        });
                    }
                    var currentSuccess = Interlocked.Increment(ref completed);
                    OutputProgress(currentSuccess, total, fileName, false, null);
                }
                catch (Exception ex)
                {
                    lock (lockObj)
                    {
                        failed++;
                        results.Add(new { success = false, fileName, error = ex.Message });
                    }
                    var currentFail = Interlocked.Increment(ref completed);
                    OutputProgress(currentFail, total, fileName, false, ex.Message);
                }
            });

            Console.WriteLine(JsonSerializer.Serialize(new
            {
                success = true,
                command = "batch-from-json",
                total,
                succeeded,
                failed,
                results
            }, JsonOptions));

            return failed > 0 ? 5 : 0;
        }
        catch (Exception ex)
        {
            OutputError(5, $"Batch processing error: {ex.Message}", ex.ToString());
            return 5;
        }
    }

    static int HandleVersion()
    {
        var version = typeof(UAsset).Assembly.GetName().Version;
        Console.WriteLine(JsonSerializer.Serialize(new
        {
            success = true,
            tool = "UAssetCLI",
            uassetApiVersion = version?.ToString() ?? "unknown",
            variant = "Lightweight"
        }, JsonOptions));
        return 0;
    }

    static void OutputProgress(int current, int total, string fileName, bool cached, string? error)
    {
        // JSON-line format for streaming progress (to stderr so it doesn't mix with final output)
        Console.Error.WriteLine(JsonSerializer.Serialize(new
        {
            type = "progress",
            current,
            total,
            fileName,
            cached,
            error
        }, JsonOptions));
    }

    static void OutputSuccess(object data)
    {
        Console.WriteLine(JsonSerializer.Serialize(new
        {
            success = true,
            data
        }, JsonOptions));
    }

    static void OutputError(int exitCode, string message, string? details = null)
    {
        Console.WriteLine(JsonSerializer.Serialize(new
        {
            success = false,
            error = message,
            details
        }, JsonOptions));
    }
}
