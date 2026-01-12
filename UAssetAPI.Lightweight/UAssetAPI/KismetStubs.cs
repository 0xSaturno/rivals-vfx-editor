using UAssetAPI.UnrealTypes;

namespace UAssetAPI.Kismet.Bytecode
{
    /// <summary>
    /// Stub for Kismet expression token. Full Kismet bytecode parsing has been removed from this lightweight build.
    /// </summary>
    public enum EExprToken : byte
    {
        EX_Nothing = 0x00,
        EX_EndOfScript = 0x53
    }

    /// <summary>
    /// Stub for Kismet expression. Full Kismet bytecode parsing has been removed from this lightweight build.
    /// </summary>
    public class KismetExpression
    {
        public EExprToken Token;
    }

    /// <summary>
    /// Stub for Kismet property pointer. Full Kismet bytecode parsing has been removed from this lightweight build.
    /// </summary>
    public class KismetPropertyPointer
    {
        public FFieldPath New;
        public FPackageIndex Old;

        public KismetPropertyPointer() { }
        public KismetPropertyPointer(FFieldPath path) { New = path; }
        public KismetPropertyPointer(FPackageIndex index) { Old = index; }
    }
}
