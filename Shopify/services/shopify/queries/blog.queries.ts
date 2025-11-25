// Blog and Articles GraphQL queries

export const blogsQuery = `
  query getBlogs($first: Int!) {
    blogs(first: $first) {
      edges {
        node {
          id
          title
          handle
          url
        }
      }
    }
  }
`;

export const articlesQuery = `
  query getArticles($blogHandle: String!, $first: Int!) {
    blog(handle: $blogHandle) {
      id
      title
      handle
      articles(first: $first) {
        edges {
          node {
            id
            title
            handle
            excerpt
            excerptHtml
            publishedAt
            author {
              name
            }
            image {
              url
              altText
            }
            url
          }
        }
      }
    }
  }
`;

export const articleQuery = `
  query getArticle($blogHandle: String!, $articleHandle: String!) {
    blog(handle: $blogHandle) {
      articleByHandle(handle: $articleHandle) {
        id
        title
        handle
        content
        contentHtml
        excerpt
        excerptHtml
        publishedAt
        author {
          name
        }
        image {
          url
          altText
        }
        url
        tags
      }
    }
  }
`;

