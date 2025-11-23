import { MalfunctionSeverity } from './malfunction';

export interface MalfunctionTypeNode {
  text: string;
  data?: MalfunctionSeverity;
  children?: MalfunctionTypesTree;
}

export type MalfunctionTypesTree = Record<string, MalfunctionTypeNode>;


