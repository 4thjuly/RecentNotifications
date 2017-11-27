/*-----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
//var azure = require('botbuilder-azure');

// Setup Restify Server
var server = restify.createServer();
// server.use(restify.queryParser());  

server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    stateEndpoint: process.env.BotStateEndpoint,
    openIdMetadata: process.env.BotOpenIdMetadata 
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot. 
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */
// var tableClient = new azure.AzureTableClient('RecentNotifications', 'recentnotifications', 'gYlzP+BVBQZgUIliiZHq+fSmZT42FLlUDl4S1g/HzE4ImrMhT5y6DhlGPBJfxCmetiUqw5SSEdk3Mcoh435Nxg==');
// var tableStorage = new azure.AzureBotStorage({ gzipData: false }, tableClient);

// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot (connector, function (session) {
    var message = session.message;
    console.log('--- Version: 0.4   ---');
    console.log(JSON.stringify(message, null, 4));
    console.log('Id: ' + message.address.user.id);
    console.log('Source: ' + message.source);
    for (var i = 0; i < message.entities.length; i++) {
        var entity = message.entities[i];
        if ('email' in entity) {
            console.log('Email: ' + entity.email);
            console.log('Name: ' + entity.name.GivenName + ' ' + entity.name.FamilyName); 
        }
    }
    var msg = 'Notification: ' + session.userData.lastMsg + ' => ' + message.text;
    console.log(msg);
    session.userData.lastMsg = message.text; // TODO - replace in production
    //session.send(msg);
    session.say(msg, "You're last message was, " + message.text);  
});
//}).set('storage', tableStorage);

// server.get("/api/oauthcallback", function (req, res, next) {  
//     console.log("OAUTH CALLBACK");  
//     var authCode = req.query.code,  
//     address = JSON.parse(req.query.state),  
//     oauth = getOAuthClient();  
    
//     oauth.getToken(authCode, function (err, tokens) {  
//         if (!err) {  
//             bot.beginDialog(address, "/oauth-success", tokens);  
//         }  
//         res.send(200, {});  
//     });  
// });  