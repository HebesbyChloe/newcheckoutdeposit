// Shop-related GraphQL queries

// Shop Information
export const shopQuery = `
  query getShop {
    shop {
      id
      name
      description
      email
      currencyCode
      paymentSettings {
        acceptedCardBrands
        supportedDigitalWallets
        countryCode
        currencyCode
      }
      primaryDomain {
        url
        host
      }
      plan {
        displayName
        partnerDevelopment
        shopifyPlus
      }
    }
  }
`;

// Menu/Navigation
export const menuQuery = `
  query getMenu($handle: String!) {
    menu(handle: $handle) {
      id
      handle
      title
      items {
        id
        title
        url
        type
        items {
          id
          title
          url
          type
        }
      }
    }
  }
`;

// Localization
export const localizationQuery = `
  query getLocalization {
    localization {
      availableCountries {
        isoCode
        name
        currency {
          isoCode
          name
        }
      }
      country {
        isoCode
        name
        currency {
          isoCode
          name
        }
      }
    }
  }
`;

