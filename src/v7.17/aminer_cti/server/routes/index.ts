import { IRouter } from '../../../../src/core/server';

export function defineRoutes(router: IRouter) {

  router.get({
    path: '/data',
    validate: false,
  }, async (context, request, response) => {
    try {
      const client = context.core.elasticsearch.client.asCurrentUser;
      
      var error = null;
      var data = [];

      let params = request.url.searchParams;
      const query = JSON.parse(params.get('body'));
      let index = query.index;

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


}
