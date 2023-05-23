import { request } from "undici";
import { Do, Task, AsyncTask } from "ftld";

import { log } from "./index";
import { DomainError } from "./domain-error";

interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
  _links: {
    self: string;
    git: string;
    html: string;
  };
}

export class GithubCouldNotGetError extends DomainError {}

function get<T>(path: string) {
  const url = `https://raw.githubusercontent.com/cevr/cms/main/${path}`;
  return Task.from(
    () => {
      return request(url, {
        headers: {
          "user-agent": "cvr-bible-tools",
        },
      }).then((res) => res.body.json()) as Promise<T>;
    },
    (err) =>
      new GithubCouldNotGetError({
        message: `Could not fetch ${url}`,
        meta: err,
      })
  ).tapErr((err) => log.error(err));
}

export class GithubCouldNotGetDirError extends DomainError {}

function getDir<T>(path: string) {
  return Do(function* ($) {
    const url = `https://api.github.com/repos/cevr/cms/contents/${path}`;
    const paths = yield* $(
      Task.from(
        () => {
          return request(url, {
            headers: {
              "user-agent": "cvr-bible-tools",
            },
          })
            .then((res) => res.body.json())
            .then((res) => [res].flat() as GitHubFile[]) as Promise<
            GitHubFile[]
          >;
        },
        (err) => {
          log.error(`path: Could not fetch ${url}`);
          log.error(err);
          return new GithubCouldNotGetDirError({
            meta: err,
            message: `Could not fetch ${url}`,
          });
        }
      )
    );

    let count = 0;
    const files = yield* $(
      Task.sequential(
        paths.map((file) =>
          get<T>(`${path}/${file.name}`)
            .tap(() => {
              count++;
              log.info(`${path}: Loaded ${count}/${paths.length} files`);
            })
            .tapErr(() => {
              log.error(`${path}: Failed to load ${file.name}`);
            })
        )
      )
    );
    return files as T[];
  });
}

export const Github = {
  get,
  getDir,
};
