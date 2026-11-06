declare module "clipper-lib" {
  type IntPoint = { X: number; Y: number };
  class ClipperOffset {
    constructor(miterLimit?: number, arcTolerance?: number);
    AddPath(path: IntPoint[], joinType: number, endType: number): void;
    Execute(solution: IntPoint[][], delta: number): void;
  }
  const ClipperLib: {
    ClipperOffset: typeof ClipperOffset;
    JoinType: { jtSquare: number; jtRound: number; jtMiter: number };
    EndType: { etClosedPolygon: number; etClosedLine: number; etOpenButt: number; etOpenSquare: number; etOpenRound: number };
  };
  export default ClipperLib;
}
