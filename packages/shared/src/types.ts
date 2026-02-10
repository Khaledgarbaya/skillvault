export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    updatedAt: string;
  };
  user: User;
}

export interface Skill {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  repositoryUrl: string | null;
  visibility: "public" | "private";
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SkillVersion {
  id: string;
  skillId: string;
  version: string;
  versionMajor: number;
  versionMinor: number;
  versionPatch: number;
  contentHash: string;
  tarballKey: string;
  skillMdContent: string | null;
  frontmatter: string | null;
  fileCount: number;
  totalSizeBytes: number;
  status: "active" | "deprecated" | "yanked";
  deprecationMessage: string | null;
  yankReason: string | null;
  publishedBy: string;
  createdAt: string;
}

export interface ScanResult {
  id: string;
  skillVersionId: string;
  engineVersion: string;
  status: "pending" | "running" | "completed" | "failed";
  secretsStatus: "pass" | "fail" | "warn" | null;
  secretsFindings: string | null;
  permissionsStatus: "pass" | "fail" | "warn" | null;
  permissionsFindings: string | null;
  networkStatus: "pass" | "fail" | "warn" | null;
  networkFindings: string | null;
  filesystemStatus: "pass" | "fail" | "warn" | null;
  filesystemFindings: string | null;
  overallStatus: "pass" | "fail" | "warn" | null;
  createdAt: string;
}

export interface ApiToken {
  id: string;
  userId: string;
  name: string;
  tokenHash: string;
  scopes: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface InstallEvent {
  id: string;
  skillVersionId: string;
  agentType: string;
  createdAt: string;
}
