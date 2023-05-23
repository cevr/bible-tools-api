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

/** Abbreviation details */
export interface Abbreviation {
  /** List of abbreviations */
  abbreviations?: string[] | null;
  /**
   * Paragraph Reference
   * Paragraph ID (null if not found)
   * @pattern ^\d+\.\d+$
   */
  link?: string | null;
  /** Publication title */
  title?: string | null;
  /** Publication year */
  pub_year?: string | null;
}

/** Abbreviation details response */
export interface AbbreviationResponse {
  /** EGW Abbreviations */
  egw?: Abbreviation[] | null;
  /** Bible Abbreviations */
  bible?: Abbreviation[] | null;
}

/** Bible link preview */
export interface BiblePreviewResponse {
  /** List of paragraphs */
  paragraphs?: ParagraphPreviewDto[] | null;
}

/** Bibliography */
export interface BibliographyDto {
  /**
   * Book Id
   * @format int32
   */
  book_id?: number;
  /** Book Code */
  code?: string | null;
  /** Book Title */
  title?: string | null;
  /** Author */
  author?: string | null;
  /** Publisher */
  publisher?: string | null;
  /** Year of publication (can be empty) */
  pub_year?: string | null;
}

/** Represents generic response for a paginated list */
export interface BibliographyDtoPaginatedResponseOneBased {
  /**
   * Total count of entries
   * @format int32
   */
  count?: number;
  /**
   * Items per page
   * @format int32
   */
  ipp?: number;
  /** Uri of the previous page. Null for the first page */
  previous?: string | null;
  /** Uri of the next page. Null for the last page. */
  next?: string | null;
  /** Page contents */
  results?: BibliographyDto[] | null;
}

/** Order of bibliography list */
export type BibliographyOrder = "asc" | "desc";

/** Bibliography sorting */
export type BibliographySortField = "default" | "code" | "title" | "author" | "publisher" | "pub_year";

/** Cover info */
export interface BookCoverDto {
  /** Small cover (112x164) */
  small?: string | null;
  /** Large cover (409x600) */
  large?: string | null;
}

/** Book cover type */
export type BookCoverType = "small" | "medium" | "large" | "huge" | "reader";

/** Book */
export interface BookDto {
  /**
   * Book Id
   * @format int32
   */
  book_id?: number;
  /** Book Code */
  code?: string | null;
  /** Language Code */
  lang?: string | null;
  type?: BookType;
  /** Book subtype (E.g Devotional) */
  subtype?: string | null;
  /** Book title */
  title?: string | null;
  /** First para_id */
  first_para?: string | null;
  /** Book author */
  author?: string | null;
  /** Annotation/description */
  description?: string | null;
  /**
   * Page count
   * @format int32
   */
  npages?: number;
  /** ISBN Code */
  isbn?: string | null;
  /** Publisher name */
  publisher?: string | null;
  /** Year of publication (can be empty) */
  pub_year?: string | null;
  /** Purchase link */
  buy_link?: string | null;
  /**
   * Folder Id
   * @format int32
   */
  folder_id?: number;
  /** Folder color group */
  folder_color_group?: FolderColorGroup;
  /** Cover info */
  cover?: BookCoverDto;
  /** File info */
  files?: BookFilesDto;
  /** Download link */
  download?: string | null;
  /**
   * Last modified timestamp
   * @format date-time
   */
  last_modified?: string;
  permission_required?: PermissionRequired;
  /**
   * Global ordering
   * @format int32
   */
  sort?: number;
  /** Book has mp3 files */
  is_audiobook?: boolean;
  /** Book has embedded resources (images/videos) */
  has_resources?: boolean;
  /** Bibliography reference / cite */
  cite?: string | null;
  /** List of languages the book translated into */
  translated_into?: string[] | null;
  /** Linked books */
  book_series?: number[] | null;
  /**
   * Obsolete nelements field
   * @deprecated
   * @format int32
   */
  nelements?: number;
}

/** Fixed paginated response Task #14 */
export interface BookDtoPaginatedResponseFixed {
  /**
   * Total count of entries
   * @format int32
   */
  count?: number;
  /**
   * Items per page
   * @format int32
   */
  ipp?: number;
  /** Uri of the previous page. Null for the first page */
  previous?: string | null;
  /** Uri of the next page. Null for the last page. */
  next?: string | null;
  /** Page contents */
  results?: BookDto[] | null;
}

/** File info */
export interface BookFilesDto {
  /** Mp3 file uri */
  mp3?: string | null;
  /** Pdf file uri */
  pdf?: string | null;
  /** ePub file uri */
  epub?: string | null;
  /** Kindle file uri */
  mobi?: string | null;
}

/** Short book info */
export interface BookShortDto {
  /**
   * Book Id
   * @format int32
   */
  pubnr?: number;
  book_type?: BookType;
  /** Book Subtype */
  book_subtype?: string | null;
  /** Language */
  lang?: string | null;
  /** Book Title */
  title?: string | null;
}

/** Translation info */
export interface BookTranslationDto {
  /**
   * Book Id
   * @format int32
   */
  pubnr?: number;
  /** Language */
  lang?: string | null;
  /** Book Code */
  code?: string | null;
  /** Book Title */
  title?: string | null;
}

export type BookType = "book" | "bible" | "periodical" | "manuscript" | "scriptindex" | "topicalindex" | "dictionary";

/** Book types local. -> BookType(DTO) */
export type BookTypeLocal =
  | "book"
  | "bible"
  | "periodical"
  | "manuscript"
  | "scriptindex"
  | "topicalindex"
  | "dictionary";

/** Category book item */
export interface CategoryBookItem {
  /**
   * Book Id
   * @format int32
   */
  book_id?: number;
  /**
   * Book Id in English
   * @format int32
   */
  book_id_en?: number;
  /** Code */
  code?: string | null;
  /** Code En */
  code_en?: string | null;
  /** Lang */
  lang?: string | null;
  type?: BookType;
  /** Book subtype */
  subtype?: string | null;
  /** Folder color group */
  folder_color_group?: FolderColorGroup;
  /** Title */
  title?: string | null;
  /** First para */
  first_para?: string | null;
  /** Year of publication (can be empty) */
  pub_year?: string | null;
  permission_required?: PermissionRequired;
}

/** Updated download books response */
export interface CheckJsonFileHashDto {
  /** Updated books list */
  updated?: CheckJsonFileHashItem[] | null;
}

/** Updated download book info */
export interface CheckJsonFileHashItem {
  /**
   * Book Id
   * @format int32
   */
  book_id?: number;
  /**
   * File size
   * @format int32
   */
  size?: number;
}

/** Check if file hash updated request */
export interface CheckJsonFileHashOptions {
  /** Books and Hash for check */
  books?: CheckJsonFileHashOptionsItem[] | null;
}

/** Book info */
export interface CheckJsonFileHashOptionsItem {
  /**
   * Book Id
   * @format int32
   */
  book_id?: number;
  /** Hash */
  hash?: string | null;
}

/** Direction for content retrieval */
export type ContentDirection = "down" | "up" | "both";

/** Content version */
export interface ContentVersionDto {
  /** Version */
  version?: string | null;
}

/** Bible export info */
export interface ExportBibleDto {
  /**
   * Book Id
   * @format int32
   */
  pubnr?: number;
  /** Language code */
  lang?: string | null;
  /** Book Code */
  refcode?: string | null;
}

/** Export info */
export interface ExportDto {
  /** List of available languages */
  languages?: ExportLanguageDto[] | null;
  /** List of books in each folder */
  folders?: Record<string, BookDto[]>;
  /** List of bible versions */
  bibles?: ExportBibleDto[] | null;
  /** Available mirrors */
  mirrors?: string[] | null;
  /** List of purchased books */
  purchased?: number[] | null;
}

/** Language list for export */
export interface ExportLanguageDto {
  /** Language code */
  code?: string | null;
  /** Language name */
  name?: string | null;
  /** Language text direction */
  direction?: TextDirection;
  /**
   * Books count in language
   * @format int32
   */
  book_count?: number;
  /**
   * Audio books count in language
   * @format int32
   */
  audiobook_count?: number;
  /** List of folders within a language */
  folders?: FolderDto[] | null;
}

/** Folder color group */
export type FolderColorGroup = "egwwritings" | "bible" | "apl" | "reference";

/** Folder info */
export interface FolderDto {
  /**
   * Folder Id
   * @format int32
   */
  folder_id?: number;
  /** Folder name */
  name?: string | null;
  /** Css/image class */
  add_class?: string | null;
  /**
   * Count of (visible) books in a folder
   * @format int32
   */
  nbooks?: number;
  /**
   * Count of (visible) books with mp3 in a folder
   * @format int32
   */
  naudiobooks?: number;
  /**
   * Global sort
   * @format int32
   */
  sort?: number;
  /** List of child folders */
  children?: FolderDto[] | null;
}

/** Get books with categories response */
export interface GetCategoriesResponse {
  /** Category name */
  category_name?: string | null;
  /** Category code */
  category_code?: string | null;
  /** Books list */
  books?: CategoryBookItem[] | null;
}

/** Title tree response */
export interface GetTitleTreeResponse {
  /** List of tree categories */
  categories?: TitleTreeCategoryResponse[] | null;
}

/** Language info */
export interface LanguageDto {
  /** Language code */
  code?: string | null;
  /** Language name */
  name?: string | null;
  /** Language text direction */
  direction?: TextDirection;
  /**
   * Books count in language
   * @format int32
   */
  book_count?: number;
  /**
   * Audio books count in language
   * @format int32
   */
  audiobook_count?: number;
}

/** Paragraph references */
export interface ParaByRefCode {
  /** List of paragraph references */
  result?: (string | null)[];
}

/** Paragraph info */
export interface ParaIdUtilOutput {
  /**
   * Paragraph Reference
   * Paragraph ID (null if not found)
   * @pattern ^\d+\.\d+$
   */
  para_id?: string | null;
  /** Language code */
  lang?: string | null;
}

/** Paragraph */
export interface ParagraphDto {
  /**
   * Paragraph Reference
   * Paragraph ID (null if not found)
   * @pattern ^\d+\.\d+$
   */
  para_id?: string | null;
  /**
   * Paragraph Reference
   * Paragraph ID (null if not found)
   * @pattern ^\d+\.\d+$
   */
  id_prev?: string | null;
  /**
   * Paragraph Reference
   * Paragraph ID (null if not found)
   * @pattern ^\d+\.\d+$
   */
  id_next?: string | null;
  /** Reference code 1 */
  refcode_1?: string | null;
  /** Reference code 2 */
  refcode_2?: string | null;
  /** Reference code 3 */
  refcode_3?: string | null;
  /** Reference code 4 */
  refcode_4?: string | null;
  /** Short reference code */
  refcode_short?: string | null;
  /** Long/full reference code */
  refcode_long?: string | null;
  /** Element type (html tag name) */
  element_type?: string | null;
  /** Element subtype (html class name) */
  element_subtype?: string | null;
  /** Paragraph contents */
  content?: string | null;
  /**
   * Paragraph order
   * @format int32
   */
  puborder?: number;
  /** List of translations to other languages */
  translations?: ParagraphTranslationDto[] | null;
}

/** Paragraph preview for bible hovers */
export interface ParagraphPreviewDto {
  /**
   * Paragraph Reference
   * Paragraph ID (null if not found)
   * @pattern ^\d+\.\d+$
   */
  source?: string | null;
  /**
   * Paragraph Reference
   * Paragraph ID (null if not found)
   * @pattern ^\d+\.\d+$
   */
  para_id?: string | null;
  /** Short refcode */
  refcode_short?: string | null;
  /** Paragraph content */
  content?: string | null;
}

/** Translation info */
export interface ParagraphTranslationDto {
  /**
   * Paragraph Reference
   * Paragraph ID (null if not found)
   * @pattern ^\d+\.\d+$
   */
  para_id?: string | null;
  /** Language code */
  lang?: string | null;
  /** Reference code */
  refcode?: string | null;
}

/** Paragraph preview for bible hovers */
export interface ParagraphTranslationPreviewDto {
  /** Paragraph ID */
  para_id?: string | null;
  /** Language code */
  lang?: string | null;
  /**
   * Chapter id
   * @format int32
   */
  chapter_id?: number;
  /**
   * Paragraph order
   * @format int32
   */
  puborder?: number;
  /** Short reference code */
  refcode_short?: string | null;
  /** Long/full reference code */
  refcode_long?: string | null;
  /** Element type (html tag name) */
  element_type?: string | null;
  /** Element subtype (html class name) */
  element_subtype?: string | null;
  /** Paragraph contents */
  content?: string | null;
}

export type PermissionRequired = "hidden" | "public" | "authenticated" | "purchased";

/** Bible link preview */
export interface PublicationTranslationPreviewResponse {
  /** Paragraph preview for bible hovers */
  original?: ParagraphTranslationPreviewDto;
  /** List of translated paragraphs */
  translations?: ParagraphTranslationPreviewDto[] | null;
}

/** Resources list */
export interface ResourcesDto {
  /** List of embedded images */
  pictures?: number[] | null;
  /** List of embedded videos */
  videos?: number[] | null;
}

/** Language text direction */
export type TextDirection = "ltr" | "rtl";

/** Single title tree book */
export interface TitleTreeBookResponse {
  /** Category book item */
  original?: CategoryBookItem;
  /** Available translations */
  translations?: CategoryBookItem[] | null;
}

/** Title tree category */
export type TitleTreeCategoryEnum = "books" | "devotionals" | "bibleCommentary" | "bible";

/** Title tree category */
export interface TitleTreeCategoryResponse {
  /** Title tree category */
  category?: TitleTreeCategoryEnum;
  /** List of books */
  books?: TitleTreeBookResponse[] | null;
}

/** Table of contents */
export interface TocDto {
  /**
   * Paragraph Reference
   * Paragraph ID (null if not found)
   * @pattern ^\d+\.\d+$
   */
  para_id?: string | null;
  /**
   * Entry level
   * @format int32
   */
  level?: number;
  /** Title */
  title?: string | null;
  /** Refcode short */
  refcode_short?: string | null;
  /**
   * Paragraph Reference
   * Paragraph ID (null if not found)
   * @pattern ^\d+\.\d+$
   */
  dup?: string | null;
  /** Corresponding mp3 file (if available) */
  mp3?: string | null;
  /**
   * Chapter/start paragraph order
   * @format int32
   */
  puborder?: number;
}

/** Mp3 Track */
export interface TrackDto {
  /**
   * Paragraph Reference
   * Paragraph ID (null if not found)
   * @pattern ^\d+\.\d+$
   */
  para_id?: string | null;
  /** Track title */
  title?: string | null;
  /** Track mp3 path */
  mp3?: string | null;
  /** List of included chapters */
  chapters?: (string | null)[];
}

/** Book details */
export interface TranslationDetailsDto {
  /**
   * English/original book id
   * @format int32
   */
  book_id?: number;
  /** List of translated book ids */
  translations?: number[] | null;
}

/** Section of translation response */
export interface TranslationSectionDto {
  /** Original paragraphs */
  original?: ParagraphDto[] | null;
  /** Translated paragraphs */
  trans?: ParagraphDto[] | null;
}
