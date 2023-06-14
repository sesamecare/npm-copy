import debugModule from 'debug';
import registryFetch, { AuthOptions } from 'npm-registry-fetch';
import diff from 'lodash.difference';
import omitby from 'lodash.omitby';
import { publish } from 'libnpmpublish';

const debug = debugModule('npm-copy');

export interface VersionInfo {
  versions: string[];
  response: ReturnType<typeof JSON.parse>;
}

export interface RepoSpec extends AuthOptions {
  url: string;
}

export async function getVersionInfo(registry: string, auth: Partial<AuthOptions>, module: string): Promise<VersionInfo> {
  const response = await registryFetch.json(`/${module}`, {
    registry,
    forceAuth: auth,
  });
  const versions = Object.entries(response.time as Record<string, unknown>).sort(([, timeA], [, timeB]) => {
    return Date.parse(timeA as string) - Date.parse(timeB as string);
  }).map(([key]) => key);
  return {
    versions,
    response,
  };
}

export async function syncVersion(from: RepoSpec, to: RepoSpec, fromInfo: VersionInfo, toInfo: VersionInfo, version: string) {
  const manifest = fromInfo.response.versions[version];
  const dist = manifest.dist;
  const tarball = await registryFetch(dist.tarball, {
    registry: from.url,
    forceAuth: from,
  }).then((r) => r.blob()).then((b) => b.arrayBuffer());
  const cleanManifest = omitby(manifest, (v, k) => k.startsWith('_') || k === 'dist') as Parameters<typeof publish>[0];
  await publish(cleanManifest, Buffer.from(tarball), {
    registry: to.url,
    forceAuth: to,
  });
}

export async function copyModule({ from, to, module, verbose, limit }: {
  from: RepoSpec;
  to: RepoSpec;
  module: string;
  verbose?: boolean;
  limit?: number;
}) {
  const { url: fromUrl, ...fromAuth } = from;
  const { url: toUrl, ...toAuth } = to;
  const fromInfo = await getVersionInfo(fromUrl, fromAuth, module);

  const toInfo = await getVersionInfo(toUrl, toAuth, module).catch((error) => {
    if (error.statusCode === 404) {
      return { versions: [], response: {} };
    }
    throw error;
  });
  const fromVersions = limit ? fromInfo.versions.slice(-limit) : fromInfo.versions;
  const toPublish = diff(fromVersions, toInfo.versions);

  if (toPublish.length === 0) {
    (verbose ? console.log : debug)('No new versions of %s to publish', module);
    return;
  }
  (verbose ? console.log : debug)('%s needs to copy %s', module, toPublish.join(', '));
  await toPublish.reduce((promise, version) => promise.then(() => syncVersion(from, to, fromInfo, toInfo, version)), Promise.resolve());
}