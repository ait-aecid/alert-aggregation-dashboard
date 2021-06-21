import { IRouter } from '../../../../src/core/server';
import { Client } from '@elastic/elasticsearch';
// import fs from 'fs';
// import yml from 'js-yaml';


export function defineRoutes(router: IRouter) {

  // let config = yml.safeLoad(fs.readFileSync('/etc/kibana/kibana.yml', 'utf8'));
  // let elasticHost = config.elasticsearch.hosts;

  // const client = new Client({
  //     node: "elasticHost",
  //     maxRetries: 5,
  //     requestTimeout: 60000,
  //     sniffOnStart: true
  // });

  router.get({
    path: '/data',
    validate: false,
  }, async (context, request, response) => {
    try {
      const client = context.core.elasticsearch.client.asCurrentUser;
      var error = null;
      var data = [];
      let { body } = request.url.query;
      const query = JSON.parse(body);
      const index = query.index;

      const indexExists = await client.indices.exists({
        index: index
      });

      if (indexExists.body) {
        data = await client.search(query).then(resp => {
          return resp.body;
        }).catch((error) => {
          console.log(error.meta.body.error)  
        });
      } else {
        error = "Index with name '" 
          + index
          + "' does not exist in your elasticsearch instance."
      };
              
      return response.ok({
        body: {
          data: data,
          error: error,
        },
      });
    } catch (error) {
      console.log(error);
    };
  });

};
