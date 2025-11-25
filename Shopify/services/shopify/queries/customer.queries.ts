// Customer-related GraphQL queries and mutations

// Customer mutations and queries
export const customerCreateMutation = `
  mutation customerCreate($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer {
        id
        email
        firstName
        lastName
      }
      customerUserErrors {
        field
        message
        code
      }
    }
  }
`;

export const customerAccessTokenCreateMutation = `
  mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
    customerAccessTokenCreate(input: $input) {
      customerAccessToken {
        accessToken
        expiresAt
      }
      customerUserErrors {
        field
        message
        code
      }
    }
  }
`;

export const customerAccessTokenDeleteMutation = `
  mutation customerAccessTokenDelete($customerAccessToken: String!) {
    customerAccessTokenDelete(customerAccessToken: $customerAccessToken) {
      deletedAccessToken
      deletedCustomerAccessTokenId
      userErrors {
        field
        message
      }
    }
  }
`;

export const customerQuery = `
  query getCustomer($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      id
      firstName
      lastName
      email
      phone
      defaultAddress {
        id
        firstName
        lastName
        address1
        address2
        city
        province
        country
        zip
        phone
      }
      addresses(first: 10) {
        edges {
          node {
            id
            firstName
            lastName
            address1
            address2
            city
            province
            country
            zip
            phone
          }
        }
      }
      orders(first: 10) {
        edges {
          node {
            id
            name
            orderNumber
            totalPrice {
              amount
              currencyCode
            }
            fulfillmentStatus
            financialStatus
            processedAt
            lineItems(first: 10) {
              edges {
                node {
                  title
                  quantity
                  variant {
                    title
                    price {
                      amount
                      currencyCode
                    }
                  }
                  originalTotalPrice {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const customerUpdateMutation = `
  mutation customerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) {
    customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
      customer {
        id
        firstName
        lastName
        email
        phone
      }
      customerAccessToken {
        accessToken
        expiresAt
      }
      customerUserErrors {
        field
        message
        code
      }
    }
  }
`;

// Password reset mutations
export const customerRecoverMutation = `
  mutation customerRecover($email: String!) {
    customerRecover(email: $email) {
      customerUserErrors {
        field
        message
        code
      }
    }
  }
`;

export const customerResetByUrlMutation = `
  mutation customerResetByUrl($resetUrl: URL!, $password: String!) {
    customerResetByUrl(resetUrl: $resetUrl, password: $password) {
      customer {
        id
        email
      }
      customerAccessToken {
        accessToken
        expiresAt
      }
      customerUserErrors {
        field
        message
        code
      }
    }
  }
`;

// Address management mutations
export const customerAddressCreateMutation = `
  mutation customerAddressCreate($customerAccessToken: String!, $address: MailingAddressInput!) {
    customerAddressCreate(customerAccessToken: $customerAccessToken, address: $address) {
      customerAddress {
        id
        firstName
        lastName
        address1
        address2
        city
        province
        country
        zip
        phone
      }
      customerUserErrors {
        field
        message
        code
      }
    }
  }
`;

export const customerAddressUpdateMutation = `
  mutation customerAddressUpdate($customerAccessToken: String!, $id: ID!, $address: MailingAddressInput!) {
    customerAddressUpdate(customerAccessToken: $customerAccessToken, id: $id, address: $address) {
      customerAddress {
        id
        firstName
        lastName
        address1
        address2
        city
        province
        country
        zip
        phone
      }
      customerUserErrors {
        field
        message
        code
      }
    }
  }
`;

export const customerAddressDeleteMutation = `
  mutation customerAddressDelete($customerAccessToken: String!, $id: ID!) {
    customerAddressDelete(customerAccessToken: $customerAccessToken, id: $id) {
      deletedCustomerAddressId
      customerUserErrors {
        field
        message
        code
      }
    }
  }
`;

