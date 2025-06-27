OK, I'm not sure how you implemented the text examples. 

But I need to be able to do real-life test examples. 

Like for example, let's use the CLI 

The CLI must search locally at least some OpenAPI config files 
On the actual codebase,  the node module is installed. 
It won't find them. 
Then it needs to be able to have some functionality that asks me if I want to add one. 

Say I add one. One like this 

https://api.wallapop.com/api/v3/search?

Then the system should perhaps ask me for if it's GET or POST. 
What would be the header we have to add Before every request 

And what parameters could we add? 

And perhaps even an example parameter 

Then the CLI could run an actual query 

And from that reply, perhaps deduce a format

All this ending in an Open API format YAML file. 

And then the next time the CLI or even just the MCP is run, it should detect this as one of our APIs.

And be able to use it in both tools. 