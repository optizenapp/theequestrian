export interface EntityMapChunk {
  chunkId: string;
  text: string;
  sourceUrl: string;
  pageTitle: string;
  publisher: string;
  retrieved?: string;
  relevanceScore?: number;
  contentType?: 'definition' | 'evidence' | 'example' | 'statistic' | 'procedure';
}

export interface EntityMapRelation {
  predicate: string;
  targetId?: string;
  targetName: string;
  confidence?: 'declared' | 'inferred';
}

export interface EntityMapEntity {
  entityId: string;
  '@type': string;
  name: string;
  description: string;
  alternateName?: string;
  sameAs?: string;
  maturityStatus?: 'proposed' | 'established' | 'deprecated';
  audienceType?: 'technical' | 'executive' | 'general' | 'regulatory';
  relations?: EntityMapRelation[];
  hasChunks: EntityMapChunk[];
}

export interface EntityMapDocument {
  version: '1.0';
  schema: 'https://entitymap.org/spec/v1.0';
  publisher: {
    name: string;
    url: string;
    sameAs?: string;
  };
  generated: string;
  profile: 'core';
  verificationStatus: 'self-declared';
  entities: EntityMapEntity[];
}
