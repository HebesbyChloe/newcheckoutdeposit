// Collection-related GraphQL queries

export const getCollectionsQuery = `
  query getCollections($first: Int!) {
    collections(first: $first) {
      edges {
        node {
          id
          title
          handle
        }
      }
    }
  }
`;

// Query to get products by collection handle
export const getProductsByCollectionQuery = `
  query getProductsByCollection($handle: String!, $first: Int!) {
    collection(handle: $handle) {
      id
      title
      handle
      products(first: $first) {
        edges {
          node {
            id
            title
            handle
            description
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            images(first: 1) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            variants(first: 1) {
              edges {
                node {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  compareAtPrice {
                    amount
                    currencyCode
                  }
                  availableForSale
                }
              }
            }
            collections(first: 10) {
              edges {
                node {
                  id
                  title
                  handle
                }
              }
            }
            metafields(identifiers: [
              { namespace: "custom", key: "shape" },
              { namespace: "custom", key: "cut_grade" },
              { namespace: "custom", key: "color" },
              { namespace: "custom", key: "clarity" },
              { namespace: "custom", key: "grading_lab" },
              { namespace: "custom", key: "video_external_url" },
              { namespace: "custom", key: "carat" },
              { namespace: "custom", key: "diamond_carat" },
              { namespace: "custom", key: "diamond_color" },
              { namespace: "custom", key: "diamond_shape" },
              { namespace: "custom", key: "diamond_cut" },
              { namespace: "custom", key: "diamond_clarity" },
              { namespace: "custom", key: "diamond_grading_lab" },
              { namespace: "custom", key: "certification" }
            ]) {
              key
              namespace
              value
              type
            }
          }
        }
      }
    }
  }
`;

// Fallback query without metafields
export const getProductsByCollectionQueryWithoutMetafields = `
  query getProductsByCollection($handle: String!, $first: Int!) {
    collection(handle: $handle) {
      id
      title
      handle
      products(first: $first) {
        edges {
          node {
            id
            title
            handle
            description
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            images(first: 1) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            variants(first: 1) {
              edges {
                node {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  compareAtPrice {
                    amount
                    currencyCode
                  }
                  availableForSale
                }
              }
            }
            collections(first: 10) {
              edges {
                node {
                  id
                  title
                  handle
                }
              }
            }
          }
        }
      }
    }
  }
`;

