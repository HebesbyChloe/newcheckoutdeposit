/**
 * Typesense Gateway Constants
 * Centralized constants for Typesense integration
 */

/**
 * Default collection type
 */
export const DEFAULT_COLLECTION: 'natural' | 'labgrown' = 'labgrown';

/**
 * Search strategy field names for itemId matching
 */
export const ITEM_ID_FIELDS = [
  'id',
  'itemId',
  'item_id',
  'Item ID #',
] as const;

/**
 * Request timeout in milliseconds
 */
export const TIMEOUT_MS = 30000; // 30 seconds

/**
 * Default items per page
 */
export const DEFAULT_PER_PAGE = 10;

/**
 * Maximum items per page
 */
export const MAX_PER_PAGE = 250;

/**
 * Default page number
 */
export const DEFAULT_PAGE = 1;

/**
 * Default sort order
 */
export const DEFAULT_SORT_BY = 'updated_at:desc';

/**
 * Default query string for "match all"
 */
export const DEFAULT_QUERY = '*';

/**
 * Default query fields
 */
export const DEFAULT_QUERY_BY = 'title,description';

