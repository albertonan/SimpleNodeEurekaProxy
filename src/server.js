const express = require('express')
const eurekaHelper = require('./eureka.js');
const config = require('./environment/config');
const axios = require('axios');

const app = express()
const port = config.port;

app.use(express.json());

///Get all the calls
app.all('/*', (req, resp) => {
  let apiCalled = req.url.split('/')[1]
  //Call api by name
  makeCallToApp(apiCalled, req.headers, req.method, req.path, req.body, resp)
})


//Start the server
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

//Eureka register
var eurekaClient = eurekaHelper.registerWithEureka('proxy', config.port);

function makeCallToApp(appName, headers, method, path, data, resp) {
  console.log("Make Call To App " + appName)
  //Get instances of the app by name
  let instance = eurekaClient.getInstancesByAppId(appName)
  let app = null;
  if (instance && instance.length > 0) {
    app = instance[0]
  } else {
    return resp.status(500).send({
      error: 'Didn\'t find the service ' + appName
    })
  }
  path = path.replace(`/${appName}`, "")

  //Add the essential headers to the request
  let newHeaders = {}
  if (headers["content-type"]) newHeaders["Content-Type"] = headers["content-type"]
  if (headers["authorization"]) newHeaders["Authorization"] = headers["authorization"]
  if (headers["host"]) newHeaders["Host"] = headers["host"]

  //Make the request
  axios({
    method: method,
    headers: newHeaders,
    url: `http://${app.ipAddr}:${app.port['$']}${path}`,
    data: data
  }).then(res2 => {
    //iterate json res2.headers and add to resp.headers
    for (let key in res2.headers) {
      resp.set(key, res2.headers[key])
    }
    resp.send(res2.data)
  }).catch(error => {
    if (error.response) {
      // Request made and server responded
      resp.status(error.response.status).send(error.response.data)
    } else {
      resp.status(500).send({
        error: 'Error connecting with service ' + appName,
        data: error
      })
      console.log(error)
    }
  });

}




