using System;
using System.IO;
using UAssetAPI.CustomVersions;
using UAssetAPI.FieldTypes;
using UAssetAPI.Kismet.Bytecode;
using UAssetAPI.UnrealTypes;

namespace UAssetAPI.ExportTypes
{
    /// <summary>
    /// Base export for all UObject types that contain fields.
    /// </summary>
    public class StructExport : FieldExport
    {
        /// <summary>
        /// Struct this inherits from, may be null
        /// </summary>
        public FPackageIndex SuperStruct;

        /// <summary>
        /// List of child fields
        /// </summary>
        public FPackageIndex[] Children;

        /// <summary>
        /// Properties serialized with this struct definition
        /// </summary>
        public FProperty[] LoadedProperties;

        /// <summary>
        /// The bytecode instructions contained within this struct.
        /// </summary>
        public KismetExpression[] ScriptBytecode;

        /// <summary>
        /// Bytecode size in total in deserialized memory. Filled out in lieu of <see cref="ScriptBytecode"/> if an error occurs during bytecode parsing.
        /// </summary>
        public int ScriptBytecodeSize;

        /// <summary>
        /// Raw binary bytecode data. Filled out in lieu of <see cref="ScriptBytecode"/> if an error occurs during bytecode parsing.
        /// </summary>
        public byte[] ScriptBytecodeRaw;

        public StructExport(Export super) : base(super)
        {

        }

        public StructExport(UAsset asset, byte[] extras) : base(asset, extras)
        {

        }

        public StructExport()
        {

        }

        public override void Read(AssetBinaryReader reader, int nextStarting)
        {
            base.Read(reader, nextStarting);

            SuperStruct = new FPackageIndex(reader.ReadInt32());

            if (Asset.GetCustomVersion<FFrameworkObjectVersion>() < FFrameworkObjectVersion.RemoveUField_Next)
            {
                var firstChild = new FPackageIndex(reader.ReadInt32());
                Children = firstChild.IsNull() ? Array.Empty<FPackageIndex>() : new[] { firstChild };
            }
            else
            {
                int numIndexEntries = reader.ReadInt32();
                Children = new FPackageIndex[numIndexEntries];
                for (int i = 0; i < numIndexEntries; i++)
                {
                    Children[i] = new FPackageIndex(reader.ReadInt32());
                }
            }

            if (Asset.GetCustomVersion<FCoreObjectVersion>() >= FCoreObjectVersion.FProperties)
            {
                int numProps = reader.ReadInt32();
                LoadedProperties = new FProperty[numProps];
                for (int i = 0; i < numProps; i++)
                {
                    LoadedProperties[i] = MainSerializer.ReadFProperty(reader);
                }
            }
            else
            {
                LoadedProperties = [];
            }

            ScriptBytecodeSize = reader.ReadInt32(); // # of bytes in total in deserialized memory
            int scriptStorageSize = reader.ReadInt32(); // # of bytes in total
            long startedReading = reader.BaseStream.Position;

            // Kismet bytecode parsing removed in lightweight build - always read raw bytes
            ScriptBytecode = null;
            ScriptBytecodeRaw = reader.ReadBytes(scriptStorageSize);
        }

        public override void Write(AssetBinaryWriter writer)
        {
            base.Write(writer);

            writer.Write(SuperStruct.Index);

            if (Asset.GetCustomVersion<FFrameworkObjectVersion>() < FFrameworkObjectVersion.RemoveUField_Next)
            {
                if (Children.Length == 0) 
                {
                    writer.Write(0);
                }
                else
                {
                    writer.Write(Children[0].Index);
                }
            }
            else
            {
                writer.Write(Children.Length);
                for (int i = 0; i < Children.Length; i++)
                {
                    writer.Write(Children[i].Index);
                }
            }

            if (Asset.GetCustomVersion<FCoreObjectVersion>() >= FCoreObjectVersion.FProperties)
            {
                writer.Write(LoadedProperties.Length);
                for (int i = 0; i < LoadedProperties.Length; i++)
                {
                    MainSerializer.WriteFProperty(LoadedProperties[i], writer);
                }
            }

            // Kismet bytecode serialization removed in lightweight build - always write raw bytes
            writer.Write(ScriptBytecodeSize);
            writer.Write(ScriptBytecodeRaw?.Length ?? 0);
            if (ScriptBytecodeRaw != null && ScriptBytecodeRaw.Length > 0)
                writer.Write(ScriptBytecodeRaw);
        }
    }
}
