So let's summarize the thing. We need an MCP (Model Context Protocol ) server that will give AI the structure of one or several APIs. And by structure, I mean full URLs, headers required, and results format, arguments (aka parameters), Argument types and If they are mandatory or not.  method if it's POST or GET. 

This MCP server is allowed to retrieve all that from file and serve it as the MCP format to the AI. 

But it also has a CLI for humans to be able to add new apis or edit current APIs schemas. 

This MCP always starts by scanning certain types of YAML config files in a given directory 

This is an NPM module, so it should check perhaps check that directory from where it is installed Or better yet, have a configured directory Because if for example we have two spaces which are back-end front-end, it would be useful to only have those yaml config files in one space. But still, it could be installed on both ends so that they both get access to this API specs through the MPC MCP. 

The MCP should be also allowed to import remote YAML config files from other APIs like online APIs or APIs with HTTP that are running. I mean any API that's using the OpenAPI stuff 

Should use seven contexts NCP to get the last version to be sure to have the last functioning versions of libraries it's going to use. 