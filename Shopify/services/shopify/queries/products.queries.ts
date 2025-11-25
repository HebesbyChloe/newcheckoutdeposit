// Product-related GraphQL queries

export const getProductsQuery = `
  query getProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
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
`;

export const getProductQuery = `
  query getProduct($handle: String!) {
    product(handle: $handle) {
      id
      title
      description
      handle
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      images(first: 5) {
        edges {
          node {
            url
            altText
          }
        }
      }
      media(first: 10) {
        edges {
          node {
            mediaContentType
            ... on MediaImage {
              image {
                url
                altText
              }
            }
            ... on Video {
              sources {
                url
                mimeType
              }
              preview {
                image {
                  url
                  altText
                }
              }
            }
          }
        }
      }
      variants(first: 10) {
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
`;

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
export const getProductsQueryWithoutMetafields = `
  query getProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
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
`;

// Fallback query for product without metafields
export const getProductQueryWithoutMetafields = `
  query getProduct($handle: String!) {
    product(handle: $handle) {
      id
      title
      description
      handle
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      images(first: 5) {
        edges {
          node {
            url
            altText
          }
        }
      }
      media(first: 10) {
        edges {
          node {
            mediaContentType
            ... on MediaImage {
              image {
                url
                altText
              }
            }
            ... on Video {
              sources {
                url
                mimeType
              }
            }
          }
        }
      }
      variants(first: 10) {
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
`;

// Search products query
export const searchProductsQuery = `
  query searchProducts($query: String!, $first: Int!) {
    products(first: $first, query: $query) {
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
`;

