import { ApolloClient, gql, HttpLink, ApolloLink, InMemoryCache } from 'apollo-boost'
import { getAccessToken, isLoggedIn } from "./auth";

const endpointURL = "http://localhost:9000/graphql";

const authLink = new ApolloLink((operation, forward) => {
    if( isLoggedIn() ) {
    // request.headers["Authorization"] = 'Bearer ' + getAccessToken();
      operation.setContext({
        headers: {
          'authorization': 'Bearer ' + getAccessToken()
        }
      })
  }
  return forward(operation)
})
const client = new ApolloClient({
  link: ApolloLink.from([
    authLink,
    new HttpLink({
      uri: endpointURL
    })
  ]),
  cache: new InMemoryCache()
})

// async function graphqlRequest(query, variables={}) {
//   const request = {
//     method: 'POST',
//     headers: {'content-type': 'application/json'},
//     body: JSON.stringify({ query, variables })
//   };
//   if( isLoggedIn() ) {
//     request.headers["Authorization"] = 'Bearer ' + getAccessToken();
//   }
//     const response = await fetch(endpointURL, request)
//     const responseBody = await response.json();
//     if ( responseBody.errors) {
//       const message = responseBody.errors.map(err => err.message).join('./n')
//       throw new Error(message);
//     }
//     return responseBody.data;
// }

// old version query
// export async function loadJob(id) {
//   const response = await fetch(endpointURL, {
//       method: 'POST',
//       headers: {'content-type': 'application/json'},
//       body: JSON.stringify({
//           query: `query  JobQuery($id: ID!) {
//             job(id: $id) {
//               id
//               title
//               company {
//                 id
//                 name
//               }
//               description
//             }
//           }`,
//           variables: {id}
//           })
//       })
//   const responseBody = await response.json();
//   return responseBody.data.job;
// }

//fragments
const jobDetailFragment = gql`
fragment JobDetail on Job {
      id
      title
      company {
        id
        name
      }
      description
}
`;
//gql tags list
const jobQuery =  gql`
query  JobQuery($id: ID!) {
  job(id: $id) {
   ...JobDetail
  }
}
${jobDetailFragment}
`;

const companyQuery = gql`
  query CompanyQuery ($id: ID!){
    company(id: $id) {
    id
    name
    description
    jobs {
      id
      title
    }
    }
  }`;

const createJobMutation =gql`
mutation CreateJob($input: CreateJobInput) {
  job: createJob(input: $input) {
    ...JobDetail
  }
}
${jobDetailFragment}
`;

const jobsQuery = gql`
query jobsQuery{
 jobs {
    id
    title
    company {
      id
      name
    }
  }
}`;
//new version query
export async function loadJob(id) {
  const {data: { job } } = await client.query({query: jobQuery, variables: { id }})
  return job;
}

export async function loadCompany(id) {
  const { data : { company } } = await client.query({query: companyQuery, variables: { id }})
  return company;
}

export async function loadJobs() {
      const { data: { jobs } } = await client.query({query: jobsQuery, fetchPolicy: 'no-cache'})
  return jobs;
}

//Mutation
export async function createJob(input) {
  const { data: { job } } =await client.mutate({
    mutation: createJobMutation, 
    variables: {input},
    update: (cache, { data }) => {
      cache.writeQuery({
        query: jobQuery,
        variables: { id: data.job.id },
        data
      })
    }
  })
  return job
}