// Product Recommendations GraphQL query

export const productRecommendationsQuery = `
  query productRecommendations($productId: ID!) {
    productRecommendations(productId: $productId) {
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
            price {
              amount
              currencyCode
            }
            availableForSale
          }
        }
      }
    }
  }
`;

