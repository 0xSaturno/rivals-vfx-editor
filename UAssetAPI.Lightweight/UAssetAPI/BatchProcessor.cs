using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using UAssetAPI.UnrealTypes;
using UAssetAPI.Unversioned;

namespace UAssetAPI
{
    /// <summary>
    /// Result of a batch processing operation for a single file.
    /// </summary>
    public class BatchProcessResult
    {
        public string InputPath { get; set; }
        public string OutputPath { get; set; }
        public bool Success { get; set; }
        public string ErrorMessage { get; set; }
        public Exception Exception { get; set; }
        public TimeSpan ProcessingTime { get; set; }
    }

    /// <summary>
    /// Options for batch processing operations.
    /// </summary>
    public class BatchProcessOptions
    {
        /// <summary>
        /// Maximum degree of parallelism. Default is Environment.ProcessorCount.
        /// </summary>
        public int MaxDegreeOfParallelism { get; set; } = Environment.ProcessorCount;

        /// <summary>
        /// Engine version to use for parsing assets.
        /// </summary>
        public EngineVersion EngineVersion { get; set; } = EngineVersion.UNKNOWN;

        /// <summary>
        /// Usmap mappings for unversioned assets.
        /// </summary>
        public Usmap Mappings { get; set; }

        /// <summary>
        /// Custom serialization flags.
        /// </summary>
        public CustomSerializationFlags CustomSerializationFlags { get; set; } = CustomSerializationFlags.None;

        /// <summary>
        /// Whether to format JSON output with indentation.
        /// </summary>
        public bool FormatJson { get; set; } = true;

        /// <summary>
        /// Whether to overwrite existing output files.
        /// </summary>
        public bool OverwriteExisting { get; set; } = true;

        /// <summary>
        /// Progress callback invoked after each file is processed.
        /// </summary>
        public Action<BatchProcessResult, int, int> ProgressCallback { get; set; }

        /// <summary>
        /// Cancellation token for stopping the batch operation.
        /// </summary>
        public CancellationToken CancellationToken { get; set; } = CancellationToken.None;
    }

    /// <summary>
    /// Provides parallel batch processing for UAsset files.
    /// </summary>
    public static class BatchProcessor
    {
        /// <summary>
        /// Converts multiple UAsset files to JSON in parallel.
        /// </summary>
        /// <param name="inputPaths">Array of input .uasset file paths.</param>
        /// <param name="outputDirectory">Output directory for JSON files. If null, outputs alongside input files.</param>
        /// <param name="options">Batch processing options.</param>
        /// <returns>Array of results for each processed file.</returns>
        public static BatchProcessResult[] UAssetToJson(string[] inputPaths, string outputDirectory = null, BatchProcessOptions options = null)
        {
            options ??= new BatchProcessOptions();
            var results = new ConcurrentBag<BatchProcessResult>();
            int processedCount = 0;
            int totalCount = inputPaths.Length;

            var parallelOptions = new ParallelOptions
            {
                MaxDegreeOfParallelism = options.MaxDegreeOfParallelism,
                CancellationToken = options.CancellationToken
            };

            Parallel.ForEach(inputPaths, parallelOptions, inputPath =>
            {
                var result = ProcessUAssetToJson(inputPath, outputDirectory, options);
                results.Add(result);

                int current = Interlocked.Increment(ref processedCount);
                options.ProgressCallback?.Invoke(result, current, totalCount);
            });

            return results.ToArray();
        }

        /// <summary>
        /// Converts multiple UAsset files to JSON in parallel (async version).
        /// </summary>
        public static async Task<BatchProcessResult[]> UAssetToJsonAsync(string[] inputPaths, string outputDirectory = null, BatchProcessOptions options = null)
        {
            return await Task.Run(() => UAssetToJson(inputPaths, outputDirectory, options));
        }

        /// <summary>
        /// Converts multiple JSON files to UAsset in parallel.
        /// </summary>
        /// <param name="inputPaths">Array of input .json file paths.</param>
        /// <param name="outputDirectory">Output directory for UAsset files. If null, outputs alongside input files.</param>
        /// <param name="options">Batch processing options.</param>
        /// <returns>Array of results for each processed file.</returns>
        public static BatchProcessResult[] JsonToUAsset(string[] inputPaths, string outputDirectory = null, BatchProcessOptions options = null)
        {
            options ??= new BatchProcessOptions();
            var results = new ConcurrentBag<BatchProcessResult>();
            int processedCount = 0;
            int totalCount = inputPaths.Length;

            var parallelOptions = new ParallelOptions
            {
                MaxDegreeOfParallelism = options.MaxDegreeOfParallelism,
                CancellationToken = options.CancellationToken
            };

            Parallel.ForEach(inputPaths, parallelOptions, inputPath =>
            {
                var result = ProcessJsonToUAsset(inputPath, outputDirectory, options);
                results.Add(result);

                int current = Interlocked.Increment(ref processedCount);
                options.ProgressCallback?.Invoke(result, current, totalCount);
            });

            return results.ToArray();
        }

        /// <summary>
        /// Converts multiple JSON files to UAsset in parallel (async version).
        /// </summary>
        public static async Task<BatchProcessResult[]> JsonToUAssetAsync(string[] inputPaths, string outputDirectory = null, BatchProcessOptions options = null)
        {
            return await Task.Run(() => JsonToUAsset(inputPaths, outputDirectory, options));
        }

        /// <summary>
        /// Finds all .uasset files in a directory recursively.
        /// </summary>
        public static string[] FindUAssetFiles(string directory, bool recursive = true)
        {
            var searchOption = recursive ? SearchOption.AllDirectories : SearchOption.TopDirectoryOnly;
            return Directory.GetFiles(directory, "*.uasset", searchOption);
        }

        /// <summary>
        /// Finds all .json files in a directory recursively.
        /// </summary>
        public static string[] FindJsonFiles(string directory, bool recursive = true)
        {
            var searchOption = recursive ? SearchOption.AllDirectories : SearchOption.TopDirectoryOnly;
            return Directory.GetFiles(directory, "*.json", searchOption);
        }

        /// <summary>
        /// Converts all UAsset files in a directory to JSON.
        /// </summary>
        public static BatchProcessResult[] ConvertDirectoryToJson(string inputDirectory, string outputDirectory = null, bool recursive = true, BatchProcessOptions options = null)
        {
            var files = FindUAssetFiles(inputDirectory, recursive);
            return UAssetToJson(files, outputDirectory, options);
        }

        /// <summary>
        /// Converts all JSON files in a directory to UAsset.
        /// </summary>
        public static BatchProcessResult[] ConvertDirectoryToUAsset(string inputDirectory, string outputDirectory = null, bool recursive = true, BatchProcessOptions options = null)
        {
            var files = FindJsonFiles(inputDirectory, recursive);
            return JsonToUAsset(files, outputDirectory, options);
        }

        private static BatchProcessResult ProcessUAssetToJson(string inputPath, string outputDirectory, BatchProcessOptions options)
        {
            var result = new BatchProcessResult { InputPath = inputPath };
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();

            try
            {
                string outputPath;
                if (string.IsNullOrEmpty(outputDirectory))
                {
                    outputPath = Path.ChangeExtension(inputPath, ".json");
                }
                else
                {
                    var fileName = Path.GetFileNameWithoutExtension(inputPath) + ".json";
                    outputPath = Path.Combine(outputDirectory, fileName);
                }

                result.OutputPath = outputPath;

                if (!options.OverwriteExisting && File.Exists(outputPath))
                {
                    result.Success = true;
                    result.ErrorMessage = "Skipped - file already exists";
                    return result;
                }

                var asset = new UAsset(inputPath, options.EngineVersion, options.Mappings, options.CustomSerializationFlags);
                string json = asset.SerializeJson(options.FormatJson);

                Directory.CreateDirectory(Path.GetDirectoryName(outputPath) ?? ".");
                File.WriteAllText(outputPath, json);

                result.Success = true;
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.ErrorMessage = ex.Message;
                result.Exception = ex;
            }
            finally
            {
                stopwatch.Stop();
                result.ProcessingTime = stopwatch.Elapsed;
            }

            return result;
        }

        private static BatchProcessResult ProcessJsonToUAsset(string inputPath, string outputDirectory, BatchProcessOptions options)
        {
            var result = new BatchProcessResult { InputPath = inputPath };
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();

            try
            {
                string outputPath;
                if (string.IsNullOrEmpty(outputDirectory))
                {
                    outputPath = Path.ChangeExtension(inputPath, ".uasset");
                }
                else
                {
                    var fileName = Path.GetFileNameWithoutExtension(inputPath) + ".uasset";
                    outputPath = Path.Combine(outputDirectory, fileName);
                }

                result.OutputPath = outputPath;

                if (!options.OverwriteExisting && File.Exists(outputPath))
                {
                    result.Success = true;
                    result.ErrorMessage = "Skipped - file already exists";
                    return result;
                }

                string json = File.ReadAllText(inputPath);
                var asset = UAsset.DeserializeJson(json);

                if (options.Mappings != null)
                    asset.Mappings = options.Mappings;

                Directory.CreateDirectory(Path.GetDirectoryName(outputPath) ?? ".");
                asset.Write(outputPath);

                result.Success = true;
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.ErrorMessage = ex.Message;
                result.Exception = ex;
            }
            finally
            {
                stopwatch.Stop();
                result.ProcessingTime = stopwatch.Elapsed;
            }

            return result;
        }
    }
}
