import { AsyncTask, Result, SyncTask, Task, UnknownError } from "ftld";
import { z } from "zod";
import { promises as fsOriginal } from "node:fs";

export const wrapZod =
  <T extends z.Schema>(schema: T) =>
  <E = z.ZodIssue[]>(
    value: unknown,
    onErr: (issues: z.ZodIssue[]) => E = (issues) => issues as E
  ): Result<E, z.infer<T>> => {
    const res = schema.safeParse(value);
    if (res.success) {
      return Result.Ok(res.data);
    }
    return Result.Err(onErr(res.error.errors));
  };

type Taskify = {
  // this is so we preserve the types of the original api if it includes overloads
  <A extends Record<string, unknown>>(obj: A): {
    [K in keyof A]: A[K] extends {
      (...args: infer P1): infer R1;
      (...args: infer P2): infer R2;
      (...args: infer P3): infer R3;
      (...args: infer P4): infer R4;
      (...args: infer P5): infer R5;
    }
      ? {
          (...args: P1): R1 extends Promise<infer RP1>
            ? AsyncTask<UnknownError, RP1>
            : SyncTask<UnknownError, R1>;
          (...args: P2): R2 extends Promise<infer RP2>
            ? AsyncTask<UnknownError, RP2>
            : SyncTask<UnknownError, R2>;
          (...args: P3): R3 extends Promise<infer RP3>
            ? AsyncTask<UnknownError, RP3>
            : SyncTask<UnknownError, R3>;
          (...args: P4): R4 extends Promise<infer RP4>
            ? AsyncTask<UnknownError, RP4>
            : SyncTask<UnknownError, R4>;
          (...args: P5): R5 extends Promise<infer RP5>
            ? AsyncTask<UnknownError, RP5>
            : SyncTask<UnknownError, R5>;
        }
      : A[K] extends {
          (...args: infer P1): infer R1;
          (...args: infer P2): infer R2;
          (...args: infer P3): infer R3;
          (...args: infer P4): infer R4;
        }
      ? {
          (...args: P1): R1 extends Promise<infer RP1>
            ? AsyncTask<UnknownError, RP1>
            : SyncTask<UnknownError, R1>;
          (...args: P2): R2 extends Promise<infer RP2>
            ? AsyncTask<UnknownError, RP2>
            : SyncTask<UnknownError, R2>;
          (...args: P3): R3 extends Promise<infer RP3>
            ? AsyncTask<UnknownError, RP3>
            : SyncTask<UnknownError, R3>;
          (...args: P4): R4 extends Promise<infer RP4>
            ? AsyncTask<UnknownError, RP4>
            : SyncTask<UnknownError, R4>;
        }
      : A[K] extends {
          (...args: infer P1): infer R1;
          (...args: infer P2): infer R2;
          (...args: infer P3): infer R3;
        }
      ? {
          (...args: P1): R1 extends Promise<infer RP1>
            ? AsyncTask<UnknownError, RP1>
            : SyncTask<UnknownError, R1>;
          (...args: P2): R2 extends Promise<infer RP2>
            ? AsyncTask<UnknownError, RP2>
            : SyncTask<UnknownError, R2>;
          (...args: P3): R3 extends Promise<infer RP3>
            ? AsyncTask<UnknownError, RP3>
            : SyncTask<UnknownError, R3>;
        }
      : A[K] extends {
          (...args: infer P1): infer R1;
          (...args: infer P2): infer R2;
        }
      ? {
          (...args: P1): R1 extends Promise<infer RP1>
            ? AsyncTask<UnknownError, RP1>
            : SyncTask<UnknownError, R1>;
          (...args: P2): R2 extends Promise<infer RP2>
            ? AsyncTask<UnknownError, RP2>
            : SyncTask<UnknownError, R2>;
        }
      : A[K] extends { (...args: infer P1): infer R1 }
      ? {
          (...args: P1): R1 extends Promise<infer RP1>
            ? AsyncTask<UnknownError, RP1>
            : SyncTask<UnknownError, R1>;
        }
      : A[K];
  } & {};

  <
    A extends {
      (...args: any[]): any;
      (...args: any[]): any;
      (...args: any[]): any;
    }
  >(
    fn: A
  ): A extends {
    (...args: infer P1): infer R1;
    (...args: infer P2): infer R2;
    (...args: infer P3): infer R3;
  }
    ? {
        (...args: P1): R1 extends Promise<infer RP1>
          ? AsyncTask<UnknownError, RP1>
          : SyncTask<UnknownError, R1>;
        (...args: P2): R2 extends Promise<infer RP2>
          ? AsyncTask<UnknownError, RP2>
          : SyncTask<UnknownError, R2>;
        (...args: P3): R3 extends Promise<infer RP3>
          ? AsyncTask<UnknownError, RP3>
          : SyncTask<UnknownError, R3>;
      }
    : never;
  <
    A extends {
      (...args: any[]): any;
      (...args: any[]): any;
    }
  >(
    fn: A
  ): A extends {
    (...args: infer P1): infer R1;
    (...args: infer P2): infer R2;
  }
    ? {
        (...args: P1): R1 extends Promise<infer RP1>
          ? AsyncTask<UnknownError, RP1>
          : SyncTask<UnknownError, R1>;
        (...args: P2): R2 extends Promise<infer RP2>
          ? AsyncTask<UnknownError, RP2>
          : SyncTask<UnknownError, R2>;
      }
    : never;
  <
    A extends {
      (...args: any[]): any;
    }
  >(
    fn: A
  ): A extends {
    (...args: infer P1): infer R1;
  }
    ? {
        (...args: P1): R1 extends Promise<infer RP1>
          ? AsyncTask<UnknownError, RP1>
          : SyncTask<UnknownError, R1>;
      }
    : never;
};

const taskify: Taskify = (fnOrRecord: any): any => {
  if (fnOrRecord instanceof Function) {
    return (...args: any[]) => {
      return Task.from(() => fnOrRecord(...args));
    };
  }

  return Object.fromEntries(
    Object.entries(fnOrRecord).map(([key, value]) => {
      if (value instanceof Function) {
        return [
          key,
          (...args: any[]) => {
            return Task.from(() => value(...args));
          },
        ];
      }
      return [key, value];
    })
  );
};

export const chunk = <T>(arr: T[], size: number): T[][] => {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
};

export const chunkByByteLength = <T>(arr: T[], size: number): string[] => {
  const chunks: string[] = [];
  let currentChunk: T[] = [];
  let currentChunkByteLength = 0;
  for (const item of arr) {
    const json = JSON.stringify(item);
    const itemByteLength = Buffer.byteLength(json);
    if (currentChunkByteLength + itemByteLength > size) {
      chunks.push(JSON.stringify(currentChunk));
      currentChunk = [];
      currentChunkByteLength = 0;
    }
    currentChunk.push(item);
    currentChunkByteLength += itemByteLength;
  }
  if (currentChunk.length > 0) {
    chunks.push(JSON.stringify(currentChunk));
  }
  return chunks;
};

export const fs = taskify(fsOriginal);
