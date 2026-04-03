export type AddonStatus = 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';
export type VersionStatus = 'DRAFT' | 'SUBMITTED' | 'CHANGES_REQUESTED' | 'APPROVED' | 'BUILDING' | 'PUBLISHED' | 'FAILED';
export type AddonType = 'WIDGET' | 'CONNECTOR' | 'THEME';

export interface BuildStep {
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  duration?: number;
  logs?: string;
  error?: string;
}

export interface BuildArtifact {
  name: string;
  url: string;
  size: number;
  checksum: string;
}

export interface BuildReport {
  buildId: string;
  status: 'success' | 'failed';
  steps: BuildStep[];
  artifacts: BuildArtifact[];
  duration: number;
  error?: string;
  startedAt: string;
  finishedAt: string;
}

export interface Addon {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  type?: AddonType;
  status: AddonStatus;
  githubRepoId?: number;
  githubRepoUrl?: string;
  githubRepoFullName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddonVersion {
  id: string;
  addonId: string;
  version: string;
  changelog?: string;
  status: VersionStatus;
  downloadUrl?: string;
  fileSize?: number;
  checksum?: string;
  githubPrNumber?: number;
  githubPrUrl?: string;
  submittedAt?: Date;
  createdAt: Date;
  publishedAt?: Date;
  buildReport?: BuildReport;
  buildStartedAt?: Date;
  buildFinishedAt?: Date;
}

export interface AddonWithVersions extends Addon {
  versions: AddonVersion[];
  latestVersion?: AddonVersion;
}

export interface CreateAddonRequest {
  name: string;
  slug: string;
  description?: string;
  createGithubRepo?: boolean;
}

export interface UpdateAddonRequest {
  name?: string;
  description?: string;
  status?: AddonStatus;
}

export interface CreateVersionRequest {
  version: string;
  changelog?: string;
}

export interface PrStatusResponse {
  state: string;
  mergeable: boolean | null;
  reviews: Array<{
    user: string;
    state: string;
    submittedAt?: string;
  }>;
  checks: Array<{
    name: string;
    status: string;
    conclusion: string | null;
  }>;
}
