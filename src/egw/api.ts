/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */
import { request as _request } from "undici";
import { Do, Task } from "ftld";

import { log } from "../index";
import { env } from "../env";
import { DomainError } from "../domain-error";

import {
  AbbreviationResponse,
  BiblePreviewResponse,
  BibliographyDtoPaginatedResponseOneBased,
  BibliographyOrder,
  BibliographySortField,
  BookCoverType,
  BookDto,
  BookDtoPaginatedResponseFixed,
  BookShortDto,
  BookTranslationDto,
  BookTypeLocal,
  CheckJsonFileHashDto,
  CheckJsonFileHashOptions,
  ContentDirection,
  ContentVersionDto,
  ExportDto,
  FolderDto,
  GetCategoriesResponse,
  GetTitleTreeResponse,
  LanguageDto,
  ParaByRefCode,
  ParagraphDto,
  ParaIdUtilOutput,
  PublicationTranslationPreviewResponse,
  ResourcesDto,
  TocDto,
  TrackDto,
  TranslationDetailsDto,
  TranslationSectionDto,
} from "./types";

class EGWFailedToGetTokenError extends DomainError {}

const tokenUrl = "https://cpanel.egwwritings.org/o/token";

let token: string | undefined;

type Token = {
  access_token: string;
};

function getToken() {
  return Task.from(
    async () => {
      if (token) return token;

      return _request(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: env.EGW_CLIENT_ID,
          client_secret: env.EGW_CLIENT_SECRET,
          grant_type: "client_credentials",
          scope: "writings search",
        }).toString(),
      })
        .then((res) => res.body.json() as Promise<Token>)
        .then((res) => {
          token = res.access_token;
          return res.access_token;
        });
    },
    (e) =>
      new EGWFailedToGetTokenError({
        meta: e,
      })
  );
}

class EGWRequestFailedError extends DomainError {}

const makeRequest = <T>(...args: Parameters<typeof _request>) =>
  Task.from(
    () => _request(...args).then((res) => res.body.json() as T),
    (e) =>
      new EGWRequestFailedError({
        meta: e,
      })
  );

const request = <T>({
  path,
  headers,
  ...options
}: Parameters<typeof _request>[1] & {
  path: string;
}) =>
  Do(function* ($) {
    const token = yield* $(getToken().tapErr((e) => log.error(e)));
    log.info(`got token: ${token.slice(0, 5).concat("...")}`);
    const url = `https://a.egwwritings.org/${path}`;
    const response = yield* $(
      makeRequest<T>(url, {
        ...options,
        headers: {
          ...headers,
          Authorization: `Bearer ${token}`,
          "user-agent": "bible-tools/1.0.0",
        },
      }).tapErr((e) => log.error(e))
    );
    log.info(response, "got response");
    return response;
  });
/**
 * No description
 *
 * @tags Books
 * @name BooksList
 * @summary Retrieves all books
 * @request GET:/content/books
 * @secure
 */
export const booksList = (query?: {
  /** List of Book Ids */
  pubnr?: number[];
  /**
   * Select only books since last update
   * @format date-time
   */
  since?: string;
  /** Book type */
  type?: BookTypeLocal[];
  /** Language code */
  lang?: string;
  /** Return only books with read permissions */
  can_read?: string;
  /** Return only books with mp3 file */
  has_mp3?: string;
  /** Return only books with pdf file */
  has_pdf?: string;
  /** Return only books with epub file */
  has_epub?: string;
  /** Return only books with mobi/kindle file */
  has_mobi?: string;
  /** Return only books, available for online purchase */
  has_book?: string;
  /**
   * Page number
   * @format int32
   */
  page?: number;
  /** Search by book title */
  search?: string;
}) =>
  request<BookDtoPaginatedResponseFixed>({
    path: `/content/books`,
    method: "GET",
    query: query,
  });
/**
 * No description
 *
 * @tags Books
 * @name BooksDetail
 * @summary Retrieves information about book
 * @request GET:/content/books/{bookId}
 * @secure
 */
export const booksDetail = (bookId: number) =>
  request<BookDto>({
    path: `/content/books/${bookId}`,
    method: "GET",
  });
/**
 * No description
 *
 * @tags Content
 * @name BooksChapterDetail
 * @summary Returns chapter content
 * @request GET:/content/books/{bookId}/chapter/{para}
 * @secure
 */
export const booksChapterDetail = (
  bookId: number,
  para: number,
  query?: {
    /** Search highlight terms */
    highlight?: string;
    /** List of translations. "all" for everything */
    trans?: string[];
  }
) =>
  request<ParagraphDto[]>({
    path: `/content/books/${bookId}/chapter/${para}`,
    method: "GET",
    query: query,
  });
/**
 * No description
 *
 * @tags Content
 * @name BooksContentDetail
 * @summary Returns content
 * @request GET:/content/books/{bookId}/content/{para}
 * @secure
 */
export const booksContentDetail = (
  bookId: number,
  para: number,
  query?: {
    /**
     * Number of additional paragraphs
     * @format int32
     */
    limit?: number;
    /** Direction  for fetching additional paragraphs (up/down/both) */
    direction?: ContentDirection;
    /** Search highlight terms */
    highlight?: string;
    /** List of translations. "all" for everything */
    trans?: string[];
  }
) =>
  request<ParagraphDto[]>({
    path: `/content/books/${bookId}/content/${para}`,
    method: "GET",
    query: query,
  });
/**
 * No description
 *
 * @tags Books
 * @name BooksCoverDetail
 * @summary Redirects to a book cover
 * @request GET:/content/books/{bookId}/cover
 */
export const booksCoverDetail = (
  bookId: number,
  query?: {
    /** Cover type */
    type?: BookCoverType;
  }
) =>
  request<any>({
    path: `/content/books/${bookId}/cover`,
    method: "GET",
    query: query,
  });
/**
 * No description
 *
 * @tags Books
 * @name BooksDownloadDetail
 * @summary Redirects to an offline book
 * @request GET:/content/books/{bookId}/download
 * @secure
 */
export const booksDownloadDetail = (bookId: number) =>
  request<any>({
    path: `/content/books/${bookId}/download`,
    method: "GET",
  });
/**
 * No description
 *
 * @tags Content
 * @name BooksResourcesDetail
 * @summary Retrieves list of available resources
 * @request GET:/content/books/{bookId}/resources
 * @secure
 */
export const booksResourcesDetail = (bookId: number) =>
  request<ResourcesDto>({
    path: `/content/books/${bookId}/resources`,
    method: "GET",
  });
/**
 * No description
 *
 * @tags Content
 * @name BooksTocDetail
 * @summary Table of contents
 * @request GET:/content/books/{bookId}/toc
 * @secure
 */
export const booksTocDetail = (bookId: number) =>
  request<TocDto[]>({
    path: `/content/books/${bookId}/toc`,
    method: "GET",
  });
/**
 * No description
 *
 * @tags Content
 * @name BooksTracklistDetail
 * @summary Track list for a book
 * @request GET:/content/books/{bookId}/tracklist
 * @secure
 */
export const booksTracklistDetail = (bookId: number) =>
  request<TrackDto[]>({
    path: `/content/books/${bookId}/tracklist`,
    method: "GET",
  });
/**
 * No description
 *
 * @tags Books
 * @name BooksTranslateDetail
 * @summary Retrieves all translations for a book
 * @request GET:/content/books/{bookId}/translate
 * @secure
 */
export const booksTranslateDetail = (bookId: number) =>
  request<BookTranslationDto[]>({
    path: `/content/books/${bookId}/translate`,
    method: "GET",
  });
/**
 * No description
 *
 * @tags Content
 * @name BooksTranslateDetail2
 * @summary Side-to-side translation
 * @request GET:/content/books/{bookId}/translate/{startPara}-{endPara}/{transBook}
 * @originalName booksTranslateDetail
 * @duplicate
 * @secure
 */
export const booksTranslateDetail2 = (
  bookId: number,
  startPara: number,
  endPara: number,
  transBook: number
) =>
  request<TranslationSectionDto[]>({
    path: `/content/books/${bookId}/translate/${startPara}-${endPara}/${transBook}`,
    method: "GET",
  });
/**
 * No description
 *
 * @tags Books
 * @name BooksAbbreviationsList
 * @summary Retrieves list of book abbreviations
 * @request GET:/content/books/abbreviations
 * @secure
 */
export const booksAbbreviationsList = () =>
  request<AbbreviationResponse>({
    path: `/content/books/abbreviations`,
    method: "GET",
  });
/**
 * No description
 *
 * @tags Tree
 * @name BooksBiblelangList
 * @summary Retrieves language list for folders with existing bibles
 * @request GET:/content/books/biblelang
 * @secure
 */
export const booksBiblelangList = () =>
  request<LanguageDto[]>({
    path: `/content/books/biblelang`,
    method: "GET",
  });
/**
 * No description
 *
 * @tags Books
 * @name BooksByFolderDetail
 * @summary Returns books in a folder
 * @request GET:/content/books/by_folder/{folderId}
 * @secure
 */
export const booksByFolderDetail = (folderId: number) =>
  request<BookDto[]>({
    path: `/content/books/by_folder/${folderId}`,
    method: "GET",
  });
/**
 * No description
 *
 * @tags Tree
 * @name BooksDevotionallangList
 * @summary Retrieves language list for folders with existing devotionals
 * @request GET:/content/books/devotionallang
 * @secure
 */
export const booksDevotionallangList = () =>
  request<LanguageDto[]>({
    path: `/content/books/devotionallang`,
    method: "GET",
  });
/**
 * No description
 *
 * @tags Books
 * @name BooksShortlistList
 * @summary Retrieves short details about all books
 * @request GET:/content/books/shortlist
 * @secure
 */
export const booksShortlistList = (query?: {
  /** Book type */
  type?: BookTypeLocal[];
  /** Book language */
  lang?: string;
  /** Search by book title */
  search?: string;
}) =>
  request<BookShortDto[]>({
    path: `/content/books/shortlist`,
    method: "GET",
    query: query,
  });
/**
 * No description
 *
 * @tags Books
 * @name BooksTranslationsList
 * @summary Retrieves all book translations
 * @request GET:/content/books/translations
 * @secure
 */
export const booksTranslationsList = () =>
  request<TranslationDetailsDto[]>({
    path: `/content/books/translations`,
    method: "GET",
  });
/**
 * No description
 *
 * @tags Books
 * @name BooksUpdatedList
 * @summary Retrieves updated books
 * @request GET:/content/books/updated
 * @secure
 */
export const booksUpdatedList = (query?: {
  /**
   * Page number
   * @format int32
   */
  page?: number;
  /** List of book ids */
  book?: number[];
  /**
   * Updated since...
   * @format date-time
   */
  last?: string;
}) =>
  request<BookDtoPaginatedResponseFixed>({
    path: `/content/books/updated`,
    method: "GET",
    query: query,
  });
/**
 * No description
 *
 * @tags Content
 * @name BooksUpdatedCreate
 * @summary Check if file hash updated
 * @request POST:/content/books/updated
 * @secure
 */
export const booksUpdatedCreate = (data: CheckJsonFileHashOptions) =>
  request<CheckJsonFileHashDto>({
    path: `/content/books/updated`,
    method: "POST",
    body: JSON.stringify(data),
  });
/**
 * No description
 *
 * @tags Books
 * @name BooksUpdatedIdsList
 * @summary Retrieves updated book ids
 * @request GET:/content/books/updated_ids
 * @secure
 */
export const booksUpdatedIdsList = (query?: {
  /** List of book ids */
  book?: number[];
  /**
   * Updated since...
   * @format date-time
   */
  last?: string;
}) =>
  request<number[]>({
    path: `/content/books/updated_ids`,
    method: "GET",
    query: query,
  });
/**
 * No description
 *
 * @tags Categories
 * @name CategoriesList
 * @summary Get books with categories
 * @request GET:/content/categories
 * @deprecated
 * @secure
 */
export const categoriesList = (query?: {
  /** Languages */
  lang?: string[];
  /** Topics codes */
  code?: string[];
}) =>
  request<GetCategoriesResponse[]>({
    path: `/content/categories`,
    method: "GET",
    query: query,
  });
/**
 * No description
 *
 * @tags Export
 * @name ExportCategoriesList
 * @summary Get books with categories
 * @request GET:/content/export/categories
 * @secure
 */
export const exportCategoriesList = (query?: {
  /** Languages */
  lang?: string[];
  /** Topics codes */
  code?: (
    | "christian_lifestyle"
    | "christ_s_life_and_ministry"
    | "church_history"
    | "church_life_and_ministry"
    | "conflict_of_the_ages_series"
    | "devotional_readings"
    | "education"
    | "egw_biography"
    | "evangelism_and_witnessing"
    | "health_and_wellness"
    | "history_of_redemption"
    | "last_day_events"
    | "leadership"
    | "lessons_from_the_bible"
    | "parenting"
    | "publishing"
    | "relationships_and_marriage"
    | "testimonies_for_the_church"
    | "the_life_of_faith_collection"
    | "youth_and_modern_english"
  )[];
}) =>
  request<GetCategoriesResponse[]>({
    path: `/content/export/categories`,
    method: "GET",
    query: query,
  });
/**
 * No description
 *
 * @tags Export
 * @name ExportTitlesList
 * @summary Get title tree
 * @request GET:/content/export/titles
 * @secure
 */
export const exportTitlesList = () =>
  request<GetTitleTreeResponse>({
    path: `/content/export/titles`,
    method: "GET",
  });
/**
 * No description
 *
 * @tags Export
 * @name ExportTreeList
 * @summary Returns dump
 * @request GET:/content/export/tree
 * @secure
 */
export const exportTreeList = () =>
  request<ExportDto>({
    path: `/content/export/tree`,
    method: "GET",
  });
/**
 * No description
 *
 * @tags Tree
 * @name LanguagesList
 * @summary Returns list of all languages, that contain books
 * @request GET:/content/languages
 * @secure
 */
export const languagesList = (query?: {
  /**
   * Include languages with mp3 only
   * @default false
   */
  has_mp3?: boolean;
}) =>
  request<LanguageDto[]>({
    path: `/content/languages`,
    method: "GET",
    query: query,
  });
/**
 * No description
 *
 * @tags Tree
 * @name LanguagesBibliographyDetail
 * @summary Returns bibliography for a language
 * @request GET:/content/languages/{lang}/bibliography
 * @secure
 */
export const languagesBibliographyDetail = (
  lang: string,
  query?: {
    /** Sort field */
    sort?: BibliographySortField;
    /** Order field (asc/desc) */
    order?: BibliographyOrder;
    /**
     * Page number
     * @format int32
     */
    page?: number;
    /** Search for publication name */
    search_title?: string;
    /** Search for publication code */
    search_code?: string;
    /** Search for publication year */
    search_pub_year?: string;
    /** Search for author name */
    search_author?: string;
    /** Search for publisher */
    search_publisher?: string;
  }
) =>
  request<BibliographyDtoPaginatedResponseOneBased>({
    path: `/content/languages/${lang}/bibliography`,
    method: "GET",
    query: query,
  });
/**
 * No description
 *
 * @tags Tree
 * @name LanguagesFoldersDetail
 * @summary Returns list of folders for language
 * @request GET:/content/languages/{lang}/folders
 * @secure
 */
export const languagesFoldersDetail = (lang: string) =>
  request<FolderDto[]>({
    path: `/content/languages/${lang}/folders`,
    method: "GET",
  });
/**
 * No description
 *
 * @tags Mirror
 * @name MirrorsList
 * @summary Returns list of alive available
 * @request GET:/content/mirrors
 */
export const mirrorsList = () =>
  request<string[]>({
    path: `/content/mirrors`,
    method: "GET",
  });
/**
 * No description
 *
 * @tags Preview
 * @name PreviewDetail
 * @summary Retrieves translations details for a single paragraph
 * @request GET:/content/preview/{bookId}.{elementId}
 * @secure
 */
export const previewDetail = (
  bookId: number,
  elementId: number,
  query?: {
    /** List of languages */
    lang?: string[];
  }
) =>
  request<PublicationTranslationPreviewResponse>({
    path: `/content/preview/${bookId}.${elementId}`,
    method: "GET",
    query: query,
  });
/**
 * No description
 *
 * @tags Preview
 * @name PreviewBibleDetail
 * @summary Retrieves all bible translations
 * @request GET:/content/preview/bible/{bookId}
 * @secure
 */
export const previewBibleDetail = (
  bookId: number,
  query?: {
    /** Paragraph Id */
    para?: number[];
    /** Bible IDs to return */
    pubnr?: number[];
  }
) =>
  request<BiblePreviewResponse>({
    path: `/content/preview/bible/${bookId}`,
    method: "GET",
    query: query,
  });
/**
 * No description
 *
 * @tags Utilities
 * @name UtilitiesLinkList
 * @summary Retrieves paraId by link
 * @request GET:/content/utilities/link
 * @deprecated
 * @secure
 */
export const utilitiesLinkList = (query: { link: string }) =>
  request<string | null>({
    path: `/content/utilities/link`,
    method: "GET",
    query: query,
  });
/**
 * No description
 *
 * @tags Utilities
 * @name UtilitiesParaidList
 * @summary Retrieves paraId by paragraph details
 * @request GET:/content/utilities/paraid
 * @deprecated
 * @secure
 */
export const utilitiesParaidList = (query?: {
  /** Book type */
  "Common.type"?: string;
  /** Language code */
  "Common.lang"?: string;
  /** Book code */
  "Common.code"?: string;
  /**
   * Book ID
   * @format int32
   */
  "Common.book_id"?: number;
  /** Page number [for type=book] */
  "Book.page"?: string;
  /** Paragraph number [for type=book] */
  "Book.paragraph"?: string;
  /** Bible book name/code (e.g Genesis) [for type=bible] */
  "Bible.bible_code"?: string;
  /** Chapter number [for type=bible] */
  "Bible.chapter"?: string;
  /** Verse number [for type=bible] */
  "Bible.verse"?: string;
  /** Year [for type=periodical] */
  "Periodical.year"?: string;
  /** Month [for type=periodical] */
  "Periodical.month"?: string;
  /** Day [for type=periodical] */
  "Periodical.day"?: string;
}) =>
  request<ParaIdUtilOutput>({
    path: `/content/utilities/paraid`,
    method: "GET",
    query: query,
  });
/**
 * @description <p>Get links for old reference codes</p> <p>Sample request for application/x-www-form-urlencoded:</p> ``` <pre>lang=en&data=[{"1":"AA","2":"9","3":"1"},{"1":"AA","2":"10","3":"2"},{"1":"AA","2":"10","3":"5"}]</pre> ``` <p>or sample request for application/json:</p> ``` <pre> { "lang": "en", "data": [ { "1":"AA", "2":"9", "3":"1" }, { "1":"AA", "2":"10", "3":"2" }, { "1":"AA", "2":"10", "3":"5" } ] } </pre> ```
 *
 * @tags Utilities
 * @name UtilitiesRefcodesOldCreate
 * @summary Retrieves paragraph references by reference codes
 * @request POST:/content/utilities/refcodes_old
 * @deprecated
 * @secure
 */
export const utilitiesRefcodesOldCreate = () =>
  request<ParaByRefCode>({
    path: `/content/utilities/refcodes_old`,
    method: "POST",
  });
/**
 * No description
 *
 * @tags Content
 * @name VersionList
 * @summary Get content version
 * @request GET:/content/version
 */
export const versionList = () =>
  request<ContentVersionDto>({
    path: `/content/version`,
    method: "GET",
  });
